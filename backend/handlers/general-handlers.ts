import { app, dialog, ipcMain, safeStorage, shell } from "electron";
import path from "node:path";
import console from "node:console";
import { getDatabase } from "../database/index.js";
import { Settings } from "../interfaces/index.js";
import { tokenService } from "../services/token-service.js";
import store from "../store.js";
import {
  validate,
  proxiesSetSchema,
  groupCreateSchema,
  groupUpdateSchema,
  groupDeleteSchema,
  tokenAddSchema,
  tokenUpdateSchema,
  tokenDeleteSchema,
  settingsSetSchema,
  shellOpenPathSchema,
  dataSetupSchema,
} from "../utils/validation.js";

const fs = require('fs').promises;

/**
 * Encrypt a proxy password using OS-level safeStorage.
 * Falls back to plaintext if safeStorage is unavailable.
 */
function encryptPassword(password: string): string {
  if (!password) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(password);
      return 'enc:' + encrypted.toString('base64');
    }
  } catch {}
  return password;
}

/**
 * Decrypt a proxy password. Handles both encrypted (enc: prefix) and legacy plaintext.
 */
function decryptPassword(stored: string): string {
  if (!stored) return '';
  if (stored.startsWith('enc:')) {
    try {
      const buffer = Buffer.from(stored.slice(4), 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      return '';
    }
  }
  // Legacy plaintext — return as-is
  return stored;
}

/**
 * Register all general-purpose IPC handlers:
 * proxies, groups, tokens, settings, dialog, database, shell
 */
export function initializeGeneralHandlers(): void {
  // ── Proxies ──
  ipcMain.handle("proxies:get", async () => {
    console.log('🔄 [Store] Loading proxies data');
    const proxies = store.get("proxies", []) as any[];
    // Decrypt passwords before sending to renderer
    return proxies.map((p: any) => ({
      ...p,
      password: decryptPassword(p.password || ''),
    }));
  });

  ipcMain.handle("proxies:set", async (_event, proxies) => {
    const validated = await validate(proxiesSetSchema, proxies);
    // Encrypt passwords before storing
    const encrypted = (validated as any[]).map((p: any) => ({
      ...p,
      password: encryptPassword(p.password || ''),
    }));
    store.set("proxies", encrypted);
    return true;
  });

  // ── Groups ──
  ipcMain.handle("groups:get", async () => {
    console.log('🔄 [Database] Loading groups data');
    try {
      const { Group } = await getDatabase();
      return await Group.findAll({ raw: true });
    } catch (error) {
      console.error('❌ Error loading groups:', error);
      return [];
    }
  });

  ipcMain.handle("groups:create", async (_event, groupData) => {
    const validated = await validate(groupCreateSchema, groupData);
    const { Group } = await getDatabase();

    try {
      const group = await Group.create(validated);
      const result = group.toJSON();
      return result.Id;
    } catch (error: any) {
      console.error('Error creating group:', error);
      throw error;
    }
  });

  ipcMain.handle("groups:update", async (_event, groupData) => {
    const validated = await validate(groupUpdateSchema, groupData);
    const { Group } = await getDatabase();
    const { Id, ...data } = validated;

    try {
      const result = await Group.update(data, { where: { Id } });
      if (result[0] > 0) {
        return true;
      } else {
        console.warn(`Group update failed: No rows affected for group ${Id}`);
        return false;
      }
    } catch (error: any) {
      console.error(`Error updating group ${Id}:`, error);
      throw error;
    }
  });

  ipcMain.handle("groups:delete", async (_event, groupId) => {
    const validatedId = await validate(groupDeleteSchema, groupId);
    const { Group } = await getDatabase();

    try {
      const result = await Group.destroy({ where: { Id: validatedId } });
      if (result > 0) {
        return true;
      } else {
        console.warn(`Group deletion failed: No rows affected for group ${validatedId}`);
        return false;
      }
    } catch (error: any) {
      console.error(`Error deleting group ${validatedId}:`, error);
      throw error;
    }
  });

  // ── Tokens ──
  ipcMain.handle("tokens:get", async () => {
    return await tokenService.getTokens();
  });

  ipcMain.handle("tokens:add", async (_event, data) => {
    const { name, token } = await validate(tokenAddSchema, data);
    return await tokenService.addToken(name, token);
  });

  ipcMain.handle("tokens:update", async (_event, data) => {
    const { index, name, token } = await validate(tokenUpdateSchema, data);
    return await tokenService.updateToken(index, name, token);
  });

  ipcMain.handle("tokens:delete", async (_event, index) => {
    const validatedIndex = await validate(tokenDeleteSchema, index);
    return await tokenService.deleteToken(validatedIndex);
  });

  ipcMain.handle("tokens:reload", async () => {
    await tokenService.reload();
    return await tokenService.getTokens();
  });

  // ── Settings ──
  ipcMain.handle("settings:get", async () => {
    return store.get();
  });

  ipcMain.handle("settings:set", async (_event, settings) => {
    const validated = await validate(settingsSetSchema, settings);
    store.set(validated as Settings);
    return true;
  });

  // ── Dialog ──
  ipcMain.handle("dialog:open", async (_event, options) => {
    // Sanitize options - only allow safe dialog properties
    const safeOptions: Electron.OpenDialogOptions = {};
    if (options?.title && typeof options.title === 'string') safeOptions.title = options.title;
    if (options?.defaultPath && typeof options.defaultPath === 'string') safeOptions.defaultPath = options.defaultPath;
    if (Array.isArray(options?.properties)) {
      const allowedProps = ['openFile', 'openDirectory', 'multiSelections', 'showHiddenFiles'];
      safeOptions.properties = options.properties.filter((p: string) => allowedProps.includes(p)) as Electron.OpenDialogOptions['properties'];
    }
    if (Array.isArray(options?.filters)) {
      safeOptions.filters = options.filters.filter((f: { name?: unknown; extensions?: unknown }) =>
        f && typeof f.name === 'string' && Array.isArray(f.extensions)
      );
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(safeOptions);
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  ipcMain.handle('dialog:selectFolder', async (_event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Data Directory'
    });
    return result;
  });

  // ── Data Setup ──
  ipcMain.handle('data:setupDatabase', async (_event, dataPath) => {
    const validatedPath = await validate(dataSetupSchema, dataPath);
    try {
      const normalizedDataPath = validatedPath;
      const targetDbPath = path.join(normalizedDataPath, 'profile_data.db');
      const sourceDbPath = path.join(__dirname, '..', '..', 'backend', 'database', 'profile_data.db');

      console.log(`Original path: ${dataPath}`);
      console.log(`Normalized path: ${normalizedDataPath}`);
      console.log(`Target DB path: ${targetDbPath}`);
      console.log(`Source DB path: ${sourceDbPath}`);

      try {
        await fs.access(targetDbPath);
        console.log(`Database already exists at: ${targetDbPath}`);
        return {
          success: true,
          existed: true,
          message: 'Database already exists in the selected directory'
        };
      } catch (error) {
        console.log(`Database not found at: ${targetDbPath}, attempting to copy from source`);
      }

      try {
        await fs.access(sourceDbPath);
      } catch (error) {
        throw new Error(`Source database not found at: ${sourceDbPath}`);
      }

      await fs.mkdir(normalizedDataPath, { recursive: true });
      await fs.copyFile(sourceDbPath, targetDbPath);
      console.log(`Database copied successfully from ${sourceDbPath} to ${targetDbPath}`);

      return {
        success: true,
        existed: false,
        message: 'Database copied successfully to the selected directory',
        normalizedPath: normalizedDataPath
      };

    } catch (error: any) {
      console.error('Error setting up database:', error);
      throw new Error(`Failed to setup database: ${error.message}`);
    }
  });

  // ── Database Test ──
  ipcMain.handle('database:test', async () => {
    try {
      console.log("Testing database connection...");
      const { sequelize, profilesPath, Profile, Group } = await getDatabase();

      await sequelize.authenticate();

      const storedDataPath = store.get("dataPath") || app.getPath("userData");
      const dbPath = path.join(storedDataPath, "profile_data.db");
      const tables = await sequelize.getQueryInterface().showAllTables();

      const profileCount = await Profile.count();
      const groupCount = await Group.count();

      console.log(`Database test successful`);
      console.log(`- Path: ${dbPath}`);
      console.log(`- Tables: ${tables.join(', ')}`);
      console.log(`- Profiles: ${profileCount}`);
      console.log(`- Groups: ${groupCount}`);

      return {
        success: true,
        dbPath,
        profilesPath,
        tables,
        profileCount,
        groupCount,
        message: 'Database connection successful'
      };

    } catch (error: any) {
      console.error('Database test failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Database connection failed'
      };
    }
  });

  // ── Shell ──
  ipcMain.handle('shell:open-path', async (_event, shellPath) => {
    const validatedPath = await validate(shellOpenPathSchema, shellPath);
    try {
      await shell.openPath(validatedPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to open path:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  console.log('✅ General IPC handlers registered');
}

const GENERAL_HANDLER_CHANNELS = [
  'proxies:get', 'proxies:set',
  'groups:get', 'groups:create', 'groups:update', 'groups:delete',
  'tokens:get', 'tokens:add', 'tokens:update', 'tokens:delete', 'tokens:reload',
  'settings:get', 'settings:set',
  'dialog:open', 'dialog:selectFolder',
  'data:setupDatabase', 'database:test',
  'shell:open-path'
];

export function cleanupGeneralHandlers(): void {
  GENERAL_HANDLER_CHANNELS.forEach(channel => {
    ipcMain.removeHandler(channel);
  });
  console.log('🛑 General IPC handlers cleaned up');
}
