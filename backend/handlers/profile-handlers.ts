import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import console from "node:console";
import sqlite3 from 'sqlite3';
import { getDatabase } from "../database/index.js";
import { unixToLDAP } from "../gologin/cookies/cookies-manager.js";
import { tokenService } from "../services/token-service.js";
import { retryWithTokenRotation } from "../utils/retry.js";
import {
  validate,
  profileIdSchema,
  profileCreateSchema,
  profileUpdateSchema,
  importCookieSchema,
} from "../utils/validation.js";
import store from "../store.js";

const { GoLogin, GologinApi } = require('../gologin/gologin.js');
const fs = require('fs').promises;
const verboseSqlite3 = sqlite3.verbose();

// ── Browser Status Management ──

interface BrowserStatus {
  profileId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
  wsUrl?: string;
  port?: number;
  processId?: number;
  startTime?: Date;
  lastActivity?: Date;
  wsConnection?: any;
  errorCount: number;
}

const browserStatusMap = new Map<string, BrowserStatus>();
const runningProfiles = new Map<string, { goLogin: any; port: number; startTime: Date }>();
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

export function getBrowserStatusMap(): Map<string, BrowserStatus> {
  return browserStatusMap;
}

const createSerializableStatus = (status: BrowserStatus) => ({
  profileId: status.profileId,
  status: status.status,
  wsUrl: status.wsUrl,
  port: status.port,
  processId: status.processId,
  startTime: status.startTime,
  lastActivity: status.lastActivity,
  errorCount: status.errorCount
});

const updateBrowserStatus = (profileId: string, updates: Partial<BrowserStatus>) => {
  const current = browserStatusMap.get(profileId) || {
    profileId,
    status: 'stopped' as const,
    errorCount: 0
  };

  const updated = { ...current, ...updates };
  browserStatusMap.set(profileId, updated);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser-status-changed', {
      profileId,
      status: createSerializableStatus(updated)
    });
  }

  console.log(`📊 Browser status updated for ${profileId}:`, updated.status);
};

const cleanupBrowserStatus = (profileId: string) => {
  const status = browserStatusMap.get(profileId);
  if (status?.wsConnection) {
    status.wsConnection.close();
  }
  browserStatusMap.delete(profileId);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser-status-changed', {
      profileId,
      status: { profileId, status: 'stopped', errorCount: 0 }
    });
  }
};

const cleanupRunningProfile = (profileId: string, reason: string = 'Process ended') => {
  if (runningProfiles.has(profileId)) {
    const runningProfile = runningProfiles.get(profileId);
    if (runningProfile) {
      console.log(`Cleaning up profile ${profileId}: ${reason}`);
      runningProfile.goLogin.setActive(false);
      runningProfiles.delete(profileId);
    }
  }
  cleanupBrowserStatus(profileId);
};

const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
};

let lastCleanupTime = 0;
const CLEANUP_THROTTLE_MS = 30000; // 30 seconds

const performManualCleanup = () => {
  const profilesToCleanup = new Set<string>();

  runningProfiles.forEach((data, profileId) => {
    if (data.goLogin.processSpawned) {
      const pid = data.goLogin.processSpawned.pid;
      if (pid && !isProcessRunning(pid)) {
        console.log(`Process ${pid} for profile ${profileId} is no longer running`);
        profilesToCleanup.add(profileId);
      }
    }
  });

  browserStatusMap.forEach((status, profileId) => {
    if (status.status === 'running') {
      const runningProfile = runningProfiles.get(profileId);

      if (!runningProfile) {
        updateBrowserStatus(profileId, { status: 'stopped' });
        return;
      }

      if (status.wsConnection && status.wsConnection.readyState !== 1) {
        console.log(`WebSocket disconnected for profile ${profileId}, checking process...`);
        if (runningProfile.goLogin.processSpawned) {
          const pid = runningProfile.goLogin.processSpawned.pid;
          if (pid && !isProcessRunning(pid)) {
            profilesToCleanup.add(profileId);
          }
        }
      }

      if (status.lastActivity) {
        const hoursSinceActivity = (Date.now() - status.lastActivity.getTime()) / (1000 * 60 * 60);
        if (hoursSinceActivity > 24) {
          console.log(`Profile ${profileId} has been inactive for ${hoursSinceActivity.toFixed(1)} hours`);
          updateBrowserStatus(profileId, { status: 'stopped' });
        }
      }
    }
  });

  profilesToCleanup.forEach(profileId => {
    cleanupRunningProfile(profileId, 'Process died externally');
    updateBrowserStatus(profileId, { status: 'stopped' });
  });

  return profilesToCleanup.size;
};

// ── Helpers ──

function formatDateTime(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds())
  );
}

/**
 * Shared logic for launching a browser profile.
 */
async function launchProfileBrowser(profileId: string): Promise<{
  status: string;
  wsUrl: string;
  port: number;
  processId: number | null;
  profileId: string;
}> {
  const { Profile, profilesPath } = await getDatabase();
  const token = await tokenService.getCurrentToken();
  if (!token) {
    throw new Error("GoLogin token not found. Please configure it in Settings.");
  }

  if (runningProfiles.has(profileId)) {
    const existing = runningProfiles.get(profileId);
    throw new Error(`Profile is already running on port ${existing?.port}`);
  }

  updateBrowserStatus(profileId, {
    profileId,
    status: 'starting',
    startTime: new Date(),
    errorCount: 0
  });

  const goLogin = new GoLogin({ token, profile_id: profileId, tmpdir: profilesPath });
  goLogin.writeCookiesFromServer = false;
  const profile = await Profile.findOne({ where: { Id: profileId } });
  if (!profile) throw new Error("Profile not found");

  let profileData: any;
  try {
    profileData = JSON.parse(profile.get('JsonData') as string);
  } catch {
    throw new Error(`Profile ${profileId} has invalid or missing JsonData`);
  }

  // Ensure navigator exists and resolution is set to 1920x1080
  if (!profileData.navigator) {
    profileData.navigator = {};
  }
  profileData.navigator.resolution = '1920x1080';

  await goLogin.createStartupCustom(true, profileData);

  const wsUrlResult = await goLogin.spawnBrowser();
  const wsUrl = typeof wsUrlResult === 'string' ? wsUrlResult : wsUrlResult?.wsUrl;
  console.log('wsUrl:', wsUrl);
  goLogin.setActive(true);
  (profile as any).LastRunAt = new Date();
  await profile.save();

  runningProfiles.set(profileId, {
    goLogin,
    port: goLogin.port,
    startTime: new Date()
  });

  updateBrowserStatus(profileId, {
    status: 'running',
    wsUrl: wsUrl,
    port: goLogin.port,
    processId: goLogin.processSpawned?.pid || undefined,
    lastActivity: new Date()
  });

  if (goLogin.processSpawned) {
    goLogin.processSpawned.on('exit', (code: number, signal: string) => {
      console.log(`Browser process for profile ${profileId} exited with code ${code}, signal ${signal}`);
      goLogin.sanitizeProfile().then(() => {
        console.log(`🧹 Auto-cleared cache for profile ${profileId}`);
      }).catch(() => { });
      cleanupRunningProfile(profileId, `Process exited (code: ${code}, signal: ${signal})`);
      updateBrowserStatus(profileId, { status: 'stopped' });
    });

    goLogin.processSpawned.on('error', (error: Error) => {
      console.log(`Browser process for profile ${profileId} error:`, error.message);
      cleanupRunningProfile(profileId, `Process error: ${error.message}`);
      updateBrowserStatus(profileId, { status: 'crashed' });
    });
  }

  return {
    status: 'success',
    wsUrl: wsUrl,
    port: goLogin.port,
    processId: goLogin.processSpawned?.pid || null,
    profileId: profileId
  };
}

// ── IPC Handler Registration ──

export function initializeProfileHandlers(): void {
  // ── Get profiles ──
  ipcMain.handle("profiles:get", async () => {
    console.log('🔄 [Database] Loading profiles data');
    try {
      const { Profile } = await getDatabase();
      return await Profile.findAll({ raw: true, nest: true });
    } catch (error) {
      console.error('❌ Error loading profiles:', error);
      return [];
    }
  });

  // ── Create profile ──
  ipcMain.handle("profiles:create", async (_event, profileData) => {
    const validated = await validate(profileCreateSchema, profileData);
    let profileId: string | null = null;

    try {
      const { Profile } = await getDatabase();
      const profilesPath = store.get("dataPath") || app.getPath("userData");
      const access_token = await tokenService.getCurrentToken();

      if (!access_token) {
        throw new Error("GoLogin token not found. Please configure it in Settings.");
      }

      console.log(`Creating profile: ${validated.Name}`);
      profileData.Name = validated.Name; // Use trimmed name from validation

      const profileGologin = await retryWithTokenRotation(
        async (token: string) => {
          const GL = GologinApi({ token });

          if (profileData.os || profileData.navigator) {
            const hasUserAgent = profileData.navigator?.userAgent?.trim();

            if (hasUserAgent) {
              const customOptions: any = {
                os: profileData.os || 'win',
                name: profileData.Name,
              };
              if (profileData.osSpec) {
                customOptions.osSpec = profileData.osSpec;
              }
              if (profileData.navigator) {
                customOptions.navigator = profileData.navigator;
              }
              console.log('🔧 Creating profile with full custom params:', JSON.stringify(customOptions, null, 2));
              try {
                const id = await GL.createProfileWithCustomParams(customOptions);
                if (!id) {
                  throw new Error("Failed to create profile: Invalid response from GoLogin API.");
                }
                return { id };
              } catch (err: any) {
                const errMsg = typeof err?.message === 'object' ? JSON.stringify(err.message) : (err?.message || JSON.stringify(err));
                console.error('❌ createProfileWithCustomParams error details:', errMsg);
                throw new Error(`GoLogin API error: ${errMsg}`);
              }
            } else {
              const { makeRequest } = await import('../gologin/utils/http.js');
              const { API_URL, FALLBACK_API_URL } = await import('../gologin/utils/common.js');

              const quickOptions = {
                os: profileData.os || 'win',
                name: profileData.Name,
                ...(profileData.osSpec?.trim() ? { osSpec: profileData.osSpec } : {}),
              };
              console.log('🔧 Creating profile with quick params (OS only):', JSON.stringify(quickOptions, null, 2));
              const result = await makeRequest(`${API_URL}/browser/quick`, {
                method: 'POST',
                json: quickOptions,
              }, { token, fallbackUrl: `${FALLBACK_API_URL}/browser/quick` });
              if (!result || !result.id) {
                throw new Error("Failed to create profile: Invalid response from GoLogin API.");
              }
              return result;
            }
          }

          const result = await GL.createProfileRandomFingerprint(profileData.Name);
          if (!result || !result.id) {
            throw new Error("Failed to create profile: Invalid response from GoLogin API.");
          }
          return result;
        },
        `Failed to create GoLogin profile for ${profileData.Name}`
      );

      profileId = profileGologin.id;
      console.log(`Profile created with id: ${profileId}`);

      const newJsonData = await retryWithTokenRotation(
        async (token: string) => {
          const goLogin = new GoLogin({ token, profile_id: profileId, tmpdir: profilesPath });
          return await goLogin.getProfile();
        },
        `Failed to get profile data for ${profileId}`
      );
      const existingJsonData = profileData.JsonData ? JSON.parse(profileData.JsonData) : {};

      const JsonData = { ...newJsonData, ...existingJsonData };

      if (profileData.os) {
        JsonData.os = profileData.os;
      }
      if (profileData.osSpec) {
        JsonData.osSpec = profileData.osSpec;
      }
      profileData.JsonData = JSON.stringify(JsonData);

      const currentToken = await tokenService.getCurrentToken();
      const goLogin = new GoLogin({ token: currentToken, profile_id: profileId, tmpdir: profilesPath });

      try {
        const GL = GologinApi({ token: currentToken });
        await GL.deleteProfile(profileId);
      } catch (error: any) {
        console.warn(`Warning: Failed to delete remote profile ${profileId}:`, error.message);
      }

      await goLogin.downloadProfileAndExtract(profileData, true);
      console.log(`Profile downloaded and extracted to: ${goLogin.profilePath()}`);

      try {
        await goLogin.setProfileId(profileId);
        await goLogin.createStartup(true, JsonData);
      } catch (error: any) {
        console.warn(`Warning: Failed to create startup script for ${profileId}:`, error.message);
      }

      try {
        await fs.unlink(path.join(profilesPath, `gologin_${profileId}.zip`));
      } catch (error: any) {
        console.warn(`Warning: Failed to clean up zip file for ${profileId}:`, error.message);
      }

      const now = formatDateTime(new Date());
      profileData.ProfilePath = `gologin_profile_${profileId}`;
      profileData.CreatedAt = now;
      profileData.UpdatedAt = now;
      profileData.Id = profileId;

      try {
        await Profile.create(profileData);
        console.log(`Profile ${profileId} saved to database successfully`);
        return profileId;
      } catch (error: any) {
        throw new Error(`Failed to save profile to database: ${error.message || 'Database error'}`);
      }

    } catch (error: any) {
      if (profileId) {
        try {
          const cleanupToken = await tokenService.getCurrentToken();
          if (cleanupToken) {
            console.log(`Cleaning up failed profile creation: ${profileId}`);
            const cleanupGL = GologinApi({ token: cleanupToken });
            await cleanupGL.deleteProfile(profileId);
          }
        } catch (cleanupError: any) {
          console.warn(`Failed to cleanup profile ${profileId}:`, cleanupError.message);
        }
      }

      console.error('Profile creation failed:', error);
      throw error;
    }
  });

  // ── Launch profile ──
  ipcMain.handle("profiles:launch", async (_event, profileId) => {
    const validatedId = await validate(profileIdSchema, profileId);
    try {
      return await launchProfileBrowser(validatedId);
    } catch (error: any) {
      updateBrowserStatus(validatedId, { status: 'crashed' });
      throw error;
    }
  });

  // ── Stop profile ──
  ipcMain.handle("profiles:stop", async (_event, profileId) => {
    const validatedId = await validate(profileIdSchema, profileId);
    try {
      updateBrowserStatus(validatedId, { status: 'stopping' });

      const runningProfile = runningProfiles.get(validatedId);
      if (!runningProfile) {
        throw new Error(`Profile ${validatedId} is not currently running`);
      }

      const { goLogin } = runningProfile;

      if (goLogin.processSpawned) {
        goLogin.processSpawned.kill('SIGTERM');
        console.log(`Killed process for profile ${validatedId}`);
      }

      try {
        await goLogin.sanitizeProfile();
        console.log(`🧹 Cleared cache for profile ${validatedId}`);
      } catch (cacheError: any) {
        console.warn(`⚠️ Failed to clear cache for profile ${validatedId}:`, cacheError.message);
      }

      cleanupRunningProfile(validatedId, 'Stopped manually');
      cleanupBrowserStatus(validatedId);

      console.log(`Profile ${validatedId} stopped successfully`);
      return { status: 'success', message: 'Profile stopped successfully' };
    } catch (error: any) {
      console.error(`Error stopping profile ${validatedId}:`, error);
      updateBrowserStatus(validatedId, { status: 'crashed' });
      throw new Error(`Failed to stop profile: ${error.message}`);
    }
  });

  // ── Browser status ──
  ipcMain.handle("profiles:getBrowserStatus", async (_event, profileId?: string) => {
    if (profileId) {
      const status = browserStatusMap.get(profileId);
      if (status) {
        return createSerializableStatus(status);
      }
      return { profileId, status: 'stopped', errorCount: 0 };
    }

    const allStatuses: { [key: string]: any } = {};
    browserStatusMap.forEach((status, id) => {
      allStatuses[id] = createSerializableStatus(status);
    });
    return allStatuses;
  });

  ipcMain.handle("profiles:getAllBrowserStatuses", async () => {
    const statuses: any[] = [];
    browserStatusMap.forEach((status) => {
      statuses.push(createSerializableStatus(status));
    });
    return statuses;
  });

  // ── Restart browser ──
  ipcMain.handle("profiles:restartBrowser", async (_event, profileId) => {
    const validatedId = await validate(profileIdSchema, profileId);
    try {
      if (runningProfiles.has(validatedId)) {
        updateBrowserStatus(validatedId, { status: 'stopping' });

        const runningProfile = runningProfiles.get(validatedId);
        if (runningProfile?.goLogin.processSpawned) {
          runningProfile.goLogin.processSpawned.kill('SIGTERM');
        }

        cleanupRunningProfile(validatedId, 'Restarting');
        cleanupBrowserStatus(validatedId);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      return await launchProfileBrowser(validatedId);
    } catch (error: any) {
      console.error(`Error restarting profile ${validatedId}:`, error);
      updateBrowserStatus(validatedId, { status: 'crashed' });
      throw new Error(`Failed to restart profile: ${error.message}`);
    }
  });

  // ── Get running profiles ──
  ipcMain.handle("profiles:getRunning", async () => {
    // Throttle cleanup to at most once every 30s
    const now = Date.now();
    if (now - lastCleanupTime >= CLEANUP_THROTTLE_MS) {
      lastCleanupTime = now;
      const cleanedCount = performManualCleanup();
      if (cleanedCount > 0) {
        console.log(`🧹 Manual cleanup removed ${cleanedCount} dead profiles`);
      }
    }

    // After cleanup, remaining entries are known-alive — no need to recheck isProcessRunning
    const running = Array.from(runningProfiles.entries())
      .map(([profileId, data]) => ({
        profileId,
        port: data.port,
        startTime: data.startTime,
        processId: data.goLogin.processSpawned?.pid || null,
        isProcessAlive: true
      }));

    return running;
  });

  // ── Update profile ──
  ipcMain.handle("profiles:update", async (_event, profileData) => {
    const validated = await validate(profileUpdateSchema, profileData);
    const { Profile } = await getDatabase();
    const { Id, ...data } = validated;

    try {
      if (data.JsonData) {
        try {
          const frontendJsonData = JSON.parse(data.JsonData);
          if (data.Name) {
            frontendJsonData.name = data.Name;
          }
          data.JsonData = JSON.stringify(frontendJsonData);
          console.log(`Using frontend JsonData with merged name for profile ${Id}`);
        } catch (parseError) {
          console.warn(`Failed to parse frontend JsonData for profile ${Id}:`, parseError);
        }
      } else if (data.Name) {
        const profile = await Profile.findOne({ where: { Id } });
        if (profile) {
          const jsonDataStr = profile.get('JsonData') as string;
          if (jsonDataStr) {
            try {
              const jsonData = JSON.parse(jsonDataStr);
              jsonData.name = data.Name;
              data.JsonData = JSON.stringify(jsonData);
              console.log(`Updated profile name in JsonData: ${data.Name}`);
            } catch (parseError) {
              console.warn(`Failed to parse JsonData for profile ${Id}:`, parseError);
            }
          }
        }
      }

      const result = await Profile.update(data, { where: { Id } });
      if (result[0] > 0) {
        return true;
      } else {
        console.warn(`Profile update failed: No rows affected for profile ${Id}`);
        return false;
      }
    } catch (error: any) {
      console.error(`Error updating profile ${Id}:`, error);
      throw error;
    }
  });

  // ── Delete profile ──
  ipcMain.handle("profiles:delete", async (_event, profileId) => {
    const validatedId = await validate(profileIdSchema, profileId);
    const { Profile, profilesPath } = await getDatabase();

    const profile = await Profile.findOne({ where: { Id: validatedId } });
    if (!profile) {
      throw new Error(`Profile with ID ${validatedId} not found.`);
    }

    const profilePath = (profile as any).ProfilePath;

    try {
      if (profilePath) {
        const fullProfilePath = path.join(profilesPath, profilePath);
        console.log(`Attempting to delete profile directory: ${fullProfilePath}`);

        try {
          await fs.access(fullProfilePath);
          await fs.rm(fullProfilePath, { recursive: true, force: true });
          console.log(`Successfully deleted profile directory: ${fullProfilePath}`);
        } catch (dirError: any) {
          if (dirError.code === 'ENOENT') {
            console.log(`Profile directory does not exist: ${fullProfilePath}`);
          } else {
            console.warn(`Failed to delete profile directory ${fullProfilePath}:`, dirError.message);
          }
        }
      }

      const deleteResult = await Profile.destroy({ where: { Id: validatedId } });
      if (deleteResult === 0) {
        throw new Error(`Failed to delete profile ${validatedId} from database`);
      }

      console.log(`Successfully deleted profile ${validatedId} from database`);
      return true;

    } catch (error: any) {
      console.error(`Error deleting profile ${validatedId}:`, error);
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  });

  // ── Export cookies ──
  ipcMain.handle("profiles:exportCookie", async (_event, profileId) => {
    const validatedId = await validate(profileIdSchema, profileId);
    const { profilesPath } = await getDatabase();
    const token = await tokenService.getCurrentToken();
    if (!token) {
      throw new Error("GoLogin token not found. Please configure it in Settings.");
    }

    const goLogin = new GoLogin({ token, profile_id: validatedId, tmpdir: profilesPath });
    const secondaryCookiePath = path.join(profilesPath, `gologin_profile_${validatedId}`, 'Default', 'Network', 'Cookies');
    const cookies = await goLogin.GetCookieCustome(secondaryCookiePath);

    return JSON.stringify(cookies, null, 2);
  });

  // ── Import cookies ──
  ipcMain.handle("profiles:importCookie", async (_event, data) => {
    const { profileId, rawCookies } = await validate(importCookieSchema, data);
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : (typeof rawCookies === 'object' && rawCookies !== null) ? [rawCookies] : null;

    if (!cookies) {
      throw new Error('Cookies must be an array or a single cookie object.');
    }

    const { Profile, profilesPath } = await getDatabase();

    const profile = await Profile.findOne({ where: { Id: profileId } });
    if (!profile || !(profile as any).ProfilePath) {
      throw new Error(`Profile with ID ${profileId} not found or has no path.`);
    }

    let profileJson: any;
    try {
      profileJson = JSON.parse((profile as any).JsonData || '{}');
    } catch {
      profileJson = {};
    }
    let createTableQuery = profileJson.createCookiesTableQuery;

    if (!createTableQuery) {
      console.warn(`'createCookiesTableQuery' not found for profile ${profileId}. Falling back to default schema.`);
      createTableQuery = `CREATE TABLE "cookies" (
      "creation_utc" INTEGER NOT NULL, "host_key" TEXT NOT NULL, "top_frame_site_key" TEXT NOT NULL,
      "name" TEXT NOT NULL, "value" TEXT NOT NULL, "encrypted_value" BLOB NOT NULL, "path" TEXT NOT NULL,
      "expires_utc" INTEGER NOT NULL, "is_secure" INTEGER NOT NULL,
      "last_access_utc" INTEGER NOT NULL, "has_expires" INTEGER NOT NULL, "is_persistent" INTEGER NOT NULL,
      "priority" INTEGER NOT NULL, "samesite" INTEGER NOT NULL, "source_scheme" INTEGER NOT NULL,
      "source_port" INTEGER NOT NULL, "is_same_party" INTEGER NOT NULL, "last_update_utc" INTEGER NOT NULL,
      UNIQUE("host_key","name","path")
    )`;
    }

    const profileDir = path.join(profilesPath, (profile as any).ProfilePath, 'Default');
    const cookieDbPaths = [
      path.join(profileDir, 'Cookies'),
      path.join(profileDir, 'Network', 'Cookies')
    ];

    await fs.mkdir(path.dirname(cookieDbPaths[0]), { recursive: true });
    await fs.mkdir(path.dirname(cookieDbPaths[1]), { recursive: true });

    const writeToDb = (cookieDbPath: string): Promise<{ success: boolean; imported: number }> => {
      return new Promise((resolve, reject) => {
        const cookieDb = new verboseSqlite3.Database(cookieDbPath, verboseSqlite3.OPEN_READWRITE | verboseSqlite3.OPEN_CREATE, (err) => {
          if (err) return reject(new Error(`Failed to open/create cookie DB at ${cookieDbPath}: ${err.message}`));
        });

        const cleanupAndResolve = (error: Error | null, result?: any) => {
          cookieDb.close((closeErr) => {
            if (error) return reject(error);
            if (closeErr) return reject(new Error(`Failed to close cookie DB at ${cookieDbPath}: ${closeErr.message}`));
            resolve(result);
          });
        };

        cookieDb.serialize(() => {
          cookieDb.run('DROP TABLE IF EXISTS cookies', (dropErr) => {
            if (dropErr) return cleanupAndResolve(new Error(`Failed to drop old cookies table: ${dropErr.message}`));

            cookieDb.run(createTableQuery.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE'), (createErr) => {
              if (createErr) return cleanupAndResolve(new Error(`Failed to create fresh cookies table: ${createErr.message}`));
              if (cookies.length === 0) return cleanupAndResolve(null, { success: true, imported: 0 });

              const columnMatch = createTableQuery.match(/\(([^)]+)\)/);
              if (!columnMatch || !columnMatch[1]) {
                return cleanupAndResolve(new Error('Could not parse columns from CREATE TABLE query'));
              }

              const allColumnDefs = columnMatch[1].split(',').map((s: string) => s.trim());
              const columns = allColumnDefs
                .map((def: string) => def.split(/\s+/)[0].replace(/"/g, ''))
                .filter((name: string) => name.toUpperCase() !== 'UNIQUE' && name.toUpperCase() !== 'PRIMARY');

              const placeholders = columns.map(() => '?').join(',');
              const insertQuery = `INSERT OR REPLACE INTO cookies (${columns.join(', ')}) VALUES (${placeholders})`;

              console.log(`Dynamic INSERT query: ${insertQuery}`);
              console.log(`Parsed columns: ${columns.join(', ')}`);

              cookieDb.run('BEGIN TRANSACTION', (err) => {
                if (err) return cleanupAndResolve(new Error(`Transaction begin failed: ${err.message}`));

                const stmt = cookieDb.prepare(insertQuery);
                const sameSiteStringToInt = { no_restriction: 0, lax: 1, strict: 2, unspecified: -1 };
                const nowLdap = unixToLDAP(Date.now() / 1000);

                const getExpiresLdap = (cookie: any) => {
                  const expiresTimestamp = cookie.expires ?? cookie.expirationDate;
                  return (cookie.session || !expiresTimestamp) ? '0' : unixToLDAP(expiresTimestamp);
                };

                const columnValueMapping: { [key: string]: (cookie: any) => any } = {
                  creation_utc: (cookie) => unixToLDAP(cookie.creationDate || (Date.now() / 1000)),
                  host_key: (cookie) => cookie.domain || '',
                  top_frame_site_key: () => '',
                  name: (cookie) => cookie.name || '',
                  value: (cookie) => cookie.value || '',
                  encrypted_value: () => Buffer.from(''),
                  path: (cookie) => cookie.path || '/',
                  expires_utc: (cookie) => getExpiresLdap(cookie),
                  is_secure: (cookie) => cookie.secure ? 1 : 0,
                  is_http_only: (cookie) => cookie.httpOnly ? 1 : 0,
                  is_httponly: (cookie) => cookie.httpOnly ? 1 : 0,
                  last_access_utc: () => nowLdap,
                  has_expires: (cookie) => getExpiresLdap(cookie) !== '0' ? 1 : 0,
                  is_persistent: (cookie) => getExpiresLdap(cookie) !== '0' ? 1 : 0,
                  priority: () => 1,
                  samesite: (cookie) => sameSiteStringToInt[cookie.sameSite as keyof typeof sameSiteStringToInt] ?? -1,
                  source_scheme: (cookie) => cookie.secure ? 2 : 1,
                  source_port: () => -1,
                  is_same_party: () => 0,
                  last_update_utc: () => nowLdap,
                  source_type: () => 0,
                  has_cross_site_ancestor: () => 0,
                };

                for (const cookie of cookies) {
                  const values = columns.map((colName: string) => {
                    const getValue = columnValueMapping[colName];
                    if (getValue) {
                      return getValue(cookie);
                    }
                    console.warn(`No value mapping for column: ${colName}. Using NULL.`);
                    return null;
                  });

                  stmt.run(values, (err) => {
                    if (err) console.error(`Failed to insert cookie ${cookie.name}:`, err.message);
                  });
                }

                stmt.finalize((err) => {
                  if (err) return cleanupAndResolve(new Error(`Statement finalize failed: ${err.message}`));
                  cookieDb.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      cookieDb.run('ROLLBACK');
                      return cleanupAndResolve(new Error(`Transaction commit failed: ${commitErr.message}`));
                    }
                    cleanupAndResolve(null, { success: true, imported: cookies.length });
                  });
                });
              });
            });
          });
        });
      });
    };

    try {
      const writePromises = cookieDbPaths.map(cookieDbPath => writeToDb(cookieDbPath));
      const results = await Promise.all(writePromises);
      const firstResult = results[0];

      if (!firstResult || !firstResult.success) {
        throw new Error('Failed to write cookies to one or more database files.');
      }

      profileJson.cookies = { cookies: rawCookies };
      const newJsonData = JSON.stringify(profileJson);

      const updateResult = await Profile.update({
        JsonData: newJsonData,
        UpdatedAt: new Date().toISOString()
      }, { where: { Id: profileId } });

      if (updateResult[0] > 0) {
        return true;
      } else {
        throw new Error('Failed to update profile JsonData after cookie import');
      }

    } catch (error: any) {
      console.error("Error in profiles:importCookie:", error);
      throw new Error(error.message || 'An unknown error occurred during cookie import.');
    }
  });

  console.log('✅ Profile IPC handlers registered');
}

const PROFILE_HANDLER_CHANNELS = [
  'profiles:get', 'profiles:create', 'profiles:launch', 'profiles:stop',
  'profiles:getBrowserStatus', 'profiles:getAllBrowserStatuses',
  'profiles:restartBrowser', 'profiles:getRunning',
  'profiles:update', 'profiles:delete',
  'profiles:exportCookie', 'profiles:importCookie'
];

export function cleanupProfileHandlers(): void {
  // Kill all running browser processes before cleanup
  runningProfiles.forEach((entry, profileId) => {
    try {
      if (entry.goLogin?.processSpawned?.pid) {
        const pid = entry.goLogin.processSpawned.pid;
        console.log(`🔪 Killing browser process for profile ${profileId} (PID: ${pid})`);
        process.kill(pid, 'SIGTERM');
      }
    } catch (e) {
      // Process may have already exited
    }
  });

  // Cleanup browser connections
  browserStatusMap.forEach((status) => {
    if (status.wsConnection) {
      status.wsConnection.close();
    }
  });
  browserStatusMap.clear();
  runningProfiles.clear();

  PROFILE_HANDLER_CHANNELS.forEach(channel => {
    ipcMain.removeHandler(channel);
  });
  console.log('🛑 Profile IPC handlers cleaned up');
}
