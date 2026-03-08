import { app, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import console from "node:console";
import { getDatabase } from "../database/index.js";
import { Settings } from "../interfaces/index.js";
import { tokenService } from "../services/token-service.js";
import store from "../store.js";

const fs = require('fs').promises;

/**
 * Register all general-purpose IPC handlers:
 * proxies, groups, tokens, settings, dialog, database, shell
 */
export function initializeGeneralHandlers(): void {
  // ── Proxies ──
  ipcMain.handle("proxies:get", async () => {
    console.log('🔄 [Store] Loading proxies data');
    return store.get("proxies", []);
  });

  ipcMain.handle("proxies:set", async (_event, proxies) => {
    store.set("proxies", proxies);
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
    const { Group } = await getDatabase();

    if (groupData.Name && groupData.Name.length > 30) {
      throw new Error("Group name must be 30 characters or less.");
    }

    try {
      const group = await Group.create(groupData);
      const result = group.toJSON();
      return result.Id;
    } catch (error: any) {
      console.error('Error creating group:', error);
      throw error;
    }
  });

  ipcMain.handle("groups:update", async (_event, groupData) => {
    const { Group } = await getDatabase();
    const { Id, ...data } = groupData;

    if (data.Name && data.Name.length > 30) {
      throw new Error("Group name must be 30 characters or less.");
    }

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
    const { Group } = await getDatabase();

    try {
      const result = await Group.destroy({ where: { Id: groupId } });
      if (result > 0) {
        return true;
      } else {
        console.warn(`Group deletion failed: No rows affected for group ${groupId}`);
        return false;
      }
    } catch (error: any) {
      console.error(`Error deleting group ${groupId}:`, error);
      throw error;
    }
  });

  // ── Tokens ──
  ipcMain.handle("tokens:get", async () => {
    return await tokenService.getTokens();
  });

  ipcMain.handle("tokens:add", async (_event, { name, token }: { name: string; token: string }) => {
    return await tokenService.addToken(name, token);
  });

  ipcMain.handle("tokens:update", async (_event, { index, name, token }: { index: number; name: string; token: string }) => {
    return await tokenService.updateToken(index, name, token);
  });

  ipcMain.handle("tokens:delete", async (_event, index: number) => {
    return await tokenService.deleteToken(index);
  });

  ipcMain.handle("tokens:reload", async () => {
    await tokenService.reload();
    return await tokenService.getTokens();
  });

  // ── Settings ──
  ipcMain.handle("settings:get", async () => {
    return store.get();
  });

  ipcMain.handle("settings:set", async (_event, settings: Settings) => {
    store.set(settings);
    return true;
  });

  // ── Dialog ──
  ipcMain.handle("dialog:open", async (_event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
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
  ipcMain.handle('data:setupDatabase', async (_event, dataPath: string) => {
    try {
      const normalizedDataPath = dataPath;
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
  ipcMain.handle('shell:open-path', async (_event, shellPath: string) => {
    try {
      await shell.openPath(shellPath);
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
