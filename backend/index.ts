import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path, { join } from "node:path";
import { prepareNext } from "sc-prepare-next";
import sqlite3 from 'sqlite3';
import { cleanupEnhancedBrowserServiceHandlers, initializeEnhancedBrowserServiceHandlers } from "./browser-service-handlers";
import { PORT } from "./constants";
import { getDatabase } from "./database";
import { unixToLDAP } from "./gologin/cookies/cookies-manager";
import { Settings } from "./interfaces";
import { cleanupEncryptionServiceHandlers, initializeEncryptionServiceHandlers } from "./services/encryption-handlers";
// TODO: Complete GoLogin service integration later
// import { GoLoginService } from "./services/gologin-service";
import store from "./store";
// Directly require the CommonJS module.
const { GoLogin, GologinApi } = require('./gologin/gologin.js');

const fs = require('fs').promises;

// Hardcoded GoLogin token
const GOLOGIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MjE0YWM3MzdhMTIwZjRlZDk2OTM2YTYiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODNkYmQzMDllZjNmNzMyNjk1ODA3ZTYifQ.gUN3PNj6BkIwUm9urC3a2IuVniwvltW_OUvJkxXaDeo";

// Global GL and GologinApi instances
// let GL: any = null;  // Remove unused variable

// TODO: Temporarily disable GoLogin service for credential management testing
// let goLoginService: GoLoginService | null = null;

// Input sanitization functions for security
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

const sanitizePath = (input: string): string => {
  // Remove potentially dangerous path traversal patterns and invalid characters
  return input.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '').trim();
};

const sanitizeProfileName = (input: string): string => {
  // Allow only safe characters for profile names
  return input.replace(/[^a-zA-Z0-9\s\-_\.]/g, '').trim().replace(/\s+/g, ' ');
};

// Use verbose mode for better debugging
const verboseSqlite3 = sqlite3.verbose();

/**
 * Creates the main application window.
 *
 * The window is created with the following options:
 *
 * - `width`: 900
 * - `height`: 700
 * - `webPreferences`:
 *   - `nodeIntegration`: false
 *   - `contextIsolation`: true
 *   - `preload`: the path to the preload script
 *
 * If the application is running in development mode, the window is loaded with
 * the URL "http://localhost:4444/", and the devtools are opened. The window is
 * also maximized.
 *
 * If the application is running in production mode, the window is loaded with
 * the path to the main application HTML file, and the menu is set to null.
 */
function createWindow(): void {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    win.loadFile(join(__dirname, "..", "..", "dist", "frontend", "index.html"));
    win.setMenu(null);
  } else {
    win.loadURL(`http://localhost:${PORT}/`);
    win.webContents.openDevTools();
  }
}

/**
 * When the application is ready, this function is called.
 *
 * It creates a BrowserWindow instance and loads the main application.
 * It also sets up the logging and database connections.
 *
 * @returns {Promise<void>} A Promise that resolves when all the setup is done.
 */
app.whenReady().then(async () => {
  await prepareNext("./src", PORT);
  createWindow();
  
  // Initialize Enhanced Browser Service
  initializeEnhancedBrowserServiceHandlers();
  
  // Initialize Encryption Service
  try {
    initializeEncryptionServiceHandlers();
  } catch (error) {
    console.error('Failed to initialize encryption service:', error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* ++++++++++ events ++++++++++ */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Cleanup services before quitting
    cleanupEnhancedBrowserServiceHandlers();
    cleanupEncryptionServiceHandlers();
    app.quit();
  }
});

app.on("before-quit", () => {
  // Cleanup services before quitting
  cleanupEnhancedBrowserServiceHandlers();
  cleanupEncryptionServiceHandlers();
});

/* ++++++++++ IPC Handlers ++++++++++ */

// Groups
ipcMain.handle("groups:get", async () => {
  const { Group } = await getDatabase();
  return Group.findAll({ raw: true });
});

ipcMain.handle("groups:create", async (_event, groupData) => {
  const { Group } = await getDatabase();
  
  // Sanitize group data
  if (groupData.Name) {
    groupData.Name = sanitizeInput(groupData.Name);
    if (groupData.Name.length > 30) {
      throw new Error("Group name must be 30 characters or less.");
    }
  }
  
  const group = await Group.create(groupData);
  return group.toJSON();
});

ipcMain.handle("groups:update", async (_event, groupData) => {
  const { Group } = await getDatabase();
  const { Id, ...data } = groupData;
  
  // Sanitize group data
  if (data.Name) {
    data.Name = sanitizeInput(data.Name);
    if (data.Name.length > 30) {
      throw new Error("Group name must be 30 characters or less.");
    }
  }
  
  return Group.update(data, { where: { Id } });
});

ipcMain.handle("groups:delete", async (_event, groupId) => {
  const { Group } = await getDatabase();
  return Group.destroy({ where: { Id: groupId } });
});

// Profiles
ipcMain.handle("profiles:get", async () => {
  const { Profile } = await getDatabase();
  return Profile.findAll({ raw: true, nest: true });
});

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

ipcMain.handle("profiles:create", async (_event, profileData) => {
  let profileId: string | null = null;
  let GL: any = null;
  
  try {
    // TODO: Temporarily disabled GoLogin service for credential management testing
    // if (!goLoginService) {
    //   throw new Error("GoLogin service is not available. Please restart the application.");
    // }
    
    const { Profile } = await getDatabase();
    const profilesPath = store.get("dataPath") || app.getPath("userData");
          const access_token = GOLOGIN_TOKEN;
    
    if (!access_token) {
      throw new Error("GoLogin token not found. Please configure it in Settings.");
    }

    // Validate and sanitize profile name
    if (!profileData.Name || profileData.Name.trim().length === 0) {
      throw new Error("Profile name is required.");
    }
    
    const sanitizedName = sanitizeProfileName(profileData.Name);
    if (sanitizedName.length === 0) {
      throw new Error("Profile name contains only invalid characters.");
    }
    if (sanitizedName.length > 50) {
      throw new Error("Profile name must be 50 characters or less.");
    }
    
    profileData.Name = sanitizedName;

    // Use original GoLogin API
    GL = GologinApi({ token: access_token });
    
    console.log(`Creating profile: ${profileData.Name}`);
    
         // Create profile with retry mechanism
     const profileGologin = await retryWithBackoff(
       async () => {
         const result = await GL.createProfileRandomFingerprint(profileData.Name);
         if (!result || !result.id) {
           throw new Error("Failed to create profile: Invalid response from GoLogin API.");
         }
         return result;
       },
       3, // maxRetries
       2000, // baseDelay
       'GoLogin profile creation failed'
     );
     
     profileId = profileGologin.id;

    const goLogin = new GoLogin({token: access_token, profile_id: profileId, tmpdir: profilesPath });
    
    console.log(`Profile created with id: ${profileId}`);
    
         // Get profile data with retry mechanism
     const JsonData = await retryWithBackoff(
       async () => await goLogin.getProfile(),
       3, // maxRetries
       1500, // baseDelay  
       `Failed to get profile data for ${profileId}`
     );
    
    profileData.JsonData = JSON.stringify(JsonData);
    
    // Clean up remote profile (we only need local copy)
    try {
      await GL.deleteProfile(profileId);
    } catch (error: any) {
      console.warn(`Warning: Failed to delete remote profile ${profileId}:`, error.message);
      // Don't fail the entire operation for this
    }
    
         // Download and extract profile with retry
     await retryWithBackoff(
       async () => {
         await goLogin.downloadProfileAndExtract(profileData, true);
         console.log(`Profile downloaded and extracted to: ${goLogin.profilePath()}`);
       },
       3, // maxRetries
       3000, // baseDelay (longer for downloads)
       `Failed to download profile ${profileId}`
     );
    
    // Create startup script
    try {
      await goLogin.createStartup(true, JsonData);
    } catch (error: any) {
      console.warn(`Warning: Failed to create startup script for ${profileId}:`, error.message);
      // Don't fail for this, profile can still work
    }
    
    // Clean up zip file
    try {
      await fs.unlink(path.join(profilesPath, `gologin_${profileId}.zip`));
    } catch (error: any) {
      console.warn(`Warning: Failed to clean up zip file for ${profileId}:`, error.message);
      // Don't fail for cleanup issues
    }
    
    // Save to database
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
    // Cleanup on failure
    if (profileId && GL) {
      try {
        console.log(`Cleaning up failed profile creation: ${profileId}`);
        await GL.deleteProfile(profileId);
      } catch (cleanupError: any) {
        console.warn(`Failed to cleanup profile ${profileId}:`, cleanupError.message);
      }
    }
    
    console.error('Profile creation failed:', error);
    throw error;
  }
});

// Global store for running profiles
const runningProfiles = new Map<string, { goLogin: any; port: number; startTime: Date }>();

// Function to clean up a running profile
const cleanupRunningProfile = (profileId: string, reason: string = 'Process ended') => {
  if (runningProfiles.has(profileId)) {
    const runningProfile = runningProfiles.get(profileId);
    if (runningProfile) {
      console.log(`Cleaning up profile ${profileId}: ${reason}`);
      runningProfile.goLogin.setActive(false);
      runningProfiles.delete(profileId);
    }
  }
};

// Function to check if a process is still running
const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
};

// Periodic health check for running processes
setInterval(() => {
  const profilesToCleanup: string[] = [];
  
  runningProfiles.forEach((data, profileId) => {
    if (data.goLogin.processSpawned) {
      const pid = data.goLogin.processSpawned.pid;
      if (pid && !isProcessRunning(pid)) {
        console.log(`Process ${pid} for profile ${profileId} is no longer running`);
        profilesToCleanup.push(profileId);
      }
    }
  });
  
  profilesToCleanup.forEach(profileId => {
    cleanupRunningProfile(profileId, 'Process died externally');
  });
}, 5000);

ipcMain.handle("profiles:launch", async (_event, profileId) => {
  const { Profile, profilesPath } = await getDatabase();
  const token = GOLOGIN_TOKEN;
  if (!token) {
    throw new Error("GoLogin token not found. Please configure it in Settings.");
  }
  
  if (runningProfiles.has(profileId)) {
    const existing = runningProfiles.get(profileId);
    throw new Error(`Profile is already running on port ${existing?.port}`);
  }
  
  // Use original GoLogin class instead of GoLoginService
  const goLogin = new GoLogin({token, profile_id: profileId, tmpdir: profilesPath });
  goLogin.writeCookiesFromServer = false;
  const profile = await Profile.findOne({ where: { Id: profileId } });
  if (!profile) throw new Error("Profile not found");
  
  // Create startup with retry
  await retryWithBackoff(
    async () => await goLogin.createStartup(true, JSON.parse(profile.get('JsonData') as string)),
    2, // maxRetries (fewer for startup)
    1000, // baseDelay
    `Failed to create startup for profile ${profileId}`
  );
  
  // Spawn browser with retry
  const wsUrl = await retryWithBackoff(
    async () => await goLogin.spawnBrowser(),
    2, // maxRetries
    2000, // baseDelay (longer for browser spawn)
    `Failed to spawn browser for profile ${profileId}`
  );
  console.log('wsUrl:', wsUrl);
  goLogin.setActive(true);
  (profile as any).LastRunAt = new Date();
  profile.save();
  
  runningProfiles.set(profileId, {
    goLogin,
    port: goLogin.port,
    startTime: new Date()
  });
  
  if (goLogin.processSpawned) {
    goLogin.processSpawned.on('exit', (code: number, signal: string) => {
      console.log(`Browser process for profile ${profileId} exited with code ${code}, signal ${signal}`);
      cleanupRunningProfile(profileId, `Process exited (code: ${code}, signal: ${signal})`);
    });
    
    goLogin.processSpawned.on('error', (error: Error) => {
      console.log(`Browser process for profile ${profileId} error:`, error.message);
      cleanupRunningProfile(profileId, `Process error: ${error.message}`);
    });
    
    goLogin.processSpawned.on('close', (code: number, signal: string) => {
      console.log(`Browser process for profile ${profileId} closed with code ${code}, signal ${signal}`);
      cleanupRunningProfile(profileId, `Process closed (code: ${code}, signal: ${signal})`);
    });
  }
  
  return {
    status: 'success', 
    wsUrl: wsUrl, 
    port: goLogin.port, 
    processId: goLogin.processSpawned?.pid || null,
    profileId: profileId
  };
});

ipcMain.handle("profiles:stop", async (_event, profileId) => {
  try {
    const runningProfile = runningProfiles.get(profileId);
    
    if (!runningProfile) {
      throw new Error(`Profile ${profileId} is not currently running`);
    }
    
    const { goLogin } = runningProfile;
    
    if (goLogin.processSpawned) {
      goLogin.processSpawned.kill('SIGTERM');
      console.log(`Killed process for profile ${profileId}`);
    }
    
    cleanupRunningProfile(profileId, 'Stopped manually');
    
    console.log(`Profile ${profileId} stopped successfully`);
    return { status: 'success', message: 'Profile stopped successfully' };
  } catch (error: any) {
    console.error(`Error stopping profile ${profileId}:`, error);
    throw new Error(`Failed to stop profile: ${error.message}`);
  }
});

ipcMain.handle("profiles:getRunning", async () => {
  const profilesToCleanup: string[] = [];
  
  runningProfiles.forEach((data, profileId) => {
    if (data.goLogin.processSpawned) {
      const pid = data.goLogin.processSpawned.pid;
      if (pid && !isProcessRunning(pid)) {
        profilesToCleanup.push(profileId);
      }
    }
  });
  
  profilesToCleanup.forEach(profileId => {
    cleanupRunningProfile(profileId, 'Process died - detected in getRunning');
  });

  const running = Array.from(runningProfiles.entries())
    .filter(([_, data]) => {
      const pid = data.goLogin.processSpawned?.pid;
      return pid && isProcessRunning(pid);
    })
    .map(([profileId, data]) => ({
      profileId,
      port: data.port,
      startTime: data.startTime,
      processId: data.goLogin.processSpawned?.pid || null,
      isProcessAlive: true
    }));
    
  return running;
});

ipcMain.handle("profiles:update", async (_event, profileData) => {
  const { Profile } = await getDatabase();
  const { Id, ...data } = profileData;
  return Profile.update(data, { where: { Id } });
});

ipcMain.handle("profiles:delete", async (_event, profileId) => {
  const { Profile, profilesPath } = await getDatabase();
  
  const profile = await Profile.findOne({ where: { Id: profileId } });
  if (!profile) {
    throw new Error(`Profile with ID ${profileId} not found.`);
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

    const deleteResult = await Profile.destroy({ where: { Id: profileId } });
    
    if (deleteResult === 0) {
      throw new Error(`Failed to delete profile ${profileId} from database`);
    }

    console.log(`Successfully deleted profile ${profileId} from database`);
    return { success: true, message: 'Profile and directory deleted successfully' };

  } catch (error: any) {
    console.error(`Error deleting profile ${profileId}:`, error);
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
});

ipcMain.handle("profiles:exportCookie", async (_event, profileId: string) => {
  const { profilesPath } = await getDatabase();
  const token = GOLOGIN_TOKEN;
  if (!token) {
    throw new Error("GoLogin token not found. Please configure it in Settings.");
  }
  
  // Use original GoLogin class instead of GoLoginService
  const goLogin = new GoLogin({ token, profile_id: profileId, tmpdir: profilesPath });
  
  // Get cookies with retry mechanism
  const cookies = await retryWithBackoff(
    async () => await goLogin.getCookies(),
    3, // maxRetries
    1500, // baseDelay
    `Failed to export cookies for profile ${profileId}`
  );
  
  return JSON.stringify(cookies, null, 2);
});

ipcMain.handle("profiles:importCookie", async (_event, { profileId, rawCookies }) => {
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

  const profileDir = path.join(profilesPath, (profile as any).ProfilePath, 'Default');
  const cookieDbPaths = [
    path.join(profileDir, 'Cookies'),
    path.join(profileDir, 'Network', 'Cookies')
  ];

  await fs.mkdir(path.dirname(cookieDbPaths[0]), { recursive: true });

  const writeToDb = (dbPath: string): Promise<{ success: boolean; imported: number }> => {
    return new Promise((resolve, reject) => {
      const db = new verboseSqlite3.Database(dbPath, (err) => {
        if (err) return reject(new Error(`[DB Open] ${err.message}`));
      });

      db.serialize(() => {
        db.run('DROP TABLE IF EXISTS cookies', (err) => {
          if (err) return reject(new Error(`[DB Drop] ${err.message}`));
        });

        db.run(`
          CREATE TABLE cookies( creation_utc INTEGER NOT NULL, top_frame_site_key TEXT NOT NULL, host_key TEXT NOT NULL, name TEXT NOT NULL, value TEXT NOT NULL, encrypted_value BLOB NOT NULL, path TEXT NOT NULL, expires_utc INTEGER NOT NULL, is_secure INTEGER NOT NULL, is_httponly INTEGER NOT NULL, last_access_utc INTEGER NOT NULL, has_expires INTEGER NOT NULL, is_persistent INTEGER NOT NULL, priority INTEGER NOT NULL, samesite INTEGER NOT NULL, source_scheme INTEGER NOT NULL, source_port INTEGER NOT NULL, is_same_party INTEGER, last_update_utc INTEGER NOT NULL, source_type INTEGER, has_cross_site_ancestor INTEGER);
          )
        `, (err) => {
          if (err) return reject(new Error(`[DB Create] ${err.message}`));
        });

        if (cookies.length > 0) {
          const stmt = db.prepare(`
            INSERT INTO cookies (
              creation_utc, host_key, top_frame_site_key, name, value, encrypted_value, path, expires_utc, 
              is_secure, is_http_only, last_access_utc, has_expires, is_persistent, priority, samesite, 
              source_scheme, source_port, is_same_party, last_update_utc, is_full_site
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const nowLdap = unixToLDAP(Date.now() / 1000);
          const sameSiteMap = { unspecified: -1, no_restriction: 0, lax: 1, strict: 2 };

          for (const cookie of cookies) {
            const expires = cookie.session ? 0 : unixToLDAP(cookie.expirationDate || 0);
            stmt.run(
              unixToLDAP(Date.now() / 1000), cookie.domain || '', '', cookie.name || '', cookie.value || '',
              Buffer.from(''), cookie.path || '/', expires, cookie.secure ? 1 : 0, cookie.httpOnly ? 1 : 0,
              nowLdap, expires !== 0 ? 1 : 0, expires !== 0 ? 1 : 0, 1, 
              sameSiteMap[cookie.sameSite as keyof typeof sameSiteMap] ?? -1,
              cookie.secure ? 2 : 1, -1, 0, nowLdap, 0
            );
          }
          
          stmt.finalize((err) => {
            if (err) return reject(new Error(`[DB Finalize] ${err.message}`));
            db.close((err) => {
              if (err) return reject(new Error(`[DB Close] ${err.message}`));
              resolve({ success: true, imported: cookies.length });
            });
          });
        } else {
           db.close((err) => {
            if (err) return reject(new Error(`[DB Close Empty] ${err.message}`));
            resolve({ success: true, imported: 0 });
          });
        }
      });
    });
  };

  try {
    let firstResult: { success: boolean, imported: number } | null = null;
    for (const dbPath of cookieDbPaths) {
      const result = await writeToDb(dbPath);
      if (!firstResult) {
        firstResult = result;
      }
    }
    
    if (!firstResult || !firstResult.success) {
      throw new Error('Failed to write cookies to one or more database files.');
    }
    
    const profileJson = JSON.parse((profile as any).JsonData || '{}');
    profileJson.cookies = { cookies: rawCookies };
    const newJsonData = JSON.stringify(profileJson);

    await Profile.update({
      JsonData: newJsonData,
      UpdatedAt: new Date().toISOString()
    }, { where: { Id: profileId } });

    return firstResult;

  } catch (error: any) {
    console.error("Error in profiles:importCookie:", error);
    throw new Error(error.message || 'An unknown error occurred during cookie import.');
  }
});

// Proxies
ipcMain.handle("proxies:get", async () => {
  return store.get("proxies", []); // Return empty array if not set
});

ipcMain.handle("proxies:set", async (_event, proxies) => {
  // Sanitize proxy data
  const sanitizedProxies = proxies.map((proxy: any) => ({
    ...proxy,
    name: proxy.name ? sanitizeInput(proxy.name) : proxy.name,
    host: proxy.host ? sanitizeInput(proxy.host) : proxy.host,
    username: proxy.username ? sanitizeInput(proxy.username) : proxy.username,
    // Don't sanitize password to preserve special characters
  }));
  
  store.set("proxies", sanitizedProxies);
  return true;
});

// Settings
ipcMain.handle("settings:get", async () => {
  return store.get();
});

ipcMain.handle("settings:set", async (_event, settings: Settings) => {
  // Sanitize settings data
  const sanitizedSettings = { ...settings };
  
  if (sanitizedSettings.dataPath) {
    sanitizedSettings.dataPath = sanitizePath(sanitizedSettings.dataPath);
  }
  
  if (sanitizedSettings.gologinToken) {
    sanitizedSettings.gologinToken = sanitizeInput(sanitizedSettings.gologinToken);
  }
  
  if (sanitizedSettings.defaultProxy) {
    sanitizedSettings.defaultProxy = sanitizeInput(sanitizedSettings.defaultProxy);
  }
  
  store.set(sanitizedSettings);
  return true;
});

// Dialog
ipcMain.handle("dialog:open", async (_event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(options);
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

/* ++++++++++ code ++++++++++ */
// IPC handlers for Profiles, Groups, etc. will be added here later.

// Python Bridge instance for automation

ipcMain.handle('dialog:selectFolder', async (_event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Data Directory'
  });
  return result;
});

// Utility function for retry mechanism with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain types of errors
      if (error.message?.includes('unauthorized') || 
          error.message?.includes('401') || 
          error.message?.includes('invalid token') ||
          error.message?.includes('Profile name is required')) {
        throw error; // Don't retry auth or validation errors
      }
      
      if (attempt === maxRetries) {
        break; // Last attempt, will throw below
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`${errorMessage} (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`${errorMessage} after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

// Add shell:open-path handler
ipcMain.handle('shell:open-path', async (_event, path: string) => {
  try {
    await shell.openPath(path);
    return { success: true };
  } catch (error) {
    console.error('Failed to open path:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});
