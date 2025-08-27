import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path, { join } from "node:path";
import { prepareNext } from "sc-prepare-next";
import sqlite3 from 'sqlite3';
import { cleanupEnhancedBrowserServiceHandlers, initializeEnhancedBrowserServiceHandlers } from "./browser-service-handlers";
import { PORT } from "./constants";
import { getDatabase } from "./database";
import { unixToLDAP } from "./gologin/cookies/cookies-manager";
import { Settings } from "./interfaces";
// TODO: Complete GoLogin service integration later
// import { GoLoginService } from "./services/gologin-service";
import store from "./store";
// Directly require the CommonJS module.
const { GoLogin, GologinApi } = require('./gologin/gologin.js');

const fs = require('fs').promises;

// GoLogin token array for rotation and retry
const GOLOGIN_TOKENS = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODdkMzVhMzZhNjE3M2FmMzkzOTU2NWEiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODdkMzYyOThjZmVlMzc1NjU4OWUxZTkifQ.8ZVr4Hhe43nudQj2FP6o6EAH2ZmVqqALflYsBCiMenk",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MjE0YWM3MzdhMTIwZjRlZDk2OTM2YTYiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODNkYmQzMDllZjNmNzMyNjk1ODA3ZTYifQ.gUN3PNj6BkIwUm9urC3a2IuVniwvltW_OUvJkxXaDeo",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODdkMzlkNGFiZTlkMGQwMDhjNDllMzEiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODdkM2E1YTc4MjU0YWM1ZjkzYjE1ZGMifQ.nAYlAOoV8MxGCaLAWK_GkZdOu5AWFaady1h8ceCfj_A"
];

// Token rotation state
let currentTokenIndex = 0;

/**
 * Get current token for API calls
 */
function getCurrentToken(): string {
  return GOLOGIN_TOKENS[currentTokenIndex];
}

/**
 * Rotate to next token for retry
 */
function rotateToNextToken(): string {
  currentTokenIndex = (currentTokenIndex + 1) % GOLOGIN_TOKENS.length;
  console.log(`🔄 Rotating to token ${currentTokenIndex + 1}/${GOLOGIN_TOKENS.length}`);
  return getCurrentToken();
}

/**
 * Reset token rotation to first token
 */
function resetTokenRotation(): void {
  currentTokenIndex = 0;
}



// Global GL and GologinApi instances
// let GL: any = null;  // Remove unused variable

// TODO: Temporarily disable GoLogin service for credential management testing
// let goLoginService: GoLoginService | null = null;



// Startup log popup window and logging helpers
let startupWindow: BrowserWindow | null = null;
let startupWindowLoaded = false;
const startupLogQueue: Array<{ message: string; level: 'info' | 'success' | 'warning' | 'error'; progress?: number; ts: number }> = [];

function createStartupWindow(): void {
  const win = new BrowserWindow({
    width: 700,
    height: 500,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: true,
    title: 'Initializing...',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  startupWindow = win;

  if (app.isPackaged) {
    win.loadFile(join(__dirname, '..', '..', 'dist', 'frontend', 'startup-logs.html'));
    win.setMenu(null);
  } else {
    // Defer actual page load until Next dev server is ready
    win.loadURL('about:blank');
  }

  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL();
    const isStartupLogsPage = url.includes('/startup-logs') || url.endsWith('startup-logs.html');
    if (isStartupLogsPage) {
      startupWindowLoaded = true;
      for (const item of startupLogQueue.splice(0)) {
        win.webContents.send('startup:log', item);
      }
    }
  });
}

function sendStartupLog(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info', progress?: number) {
  const payload = { message, level, progress, ts: Date.now() };
  if (startupWindow && !startupWindow.isDestroyed() && startupWindowLoaded) {
    startupWindow.webContents.send('startup:log', payload);
  } else {
    startupLogQueue.push(payload);
  }
}

async function checkLocalProfilesAndLog(): Promise<void> {
  try {
    sendStartupLog('🔎 Đang kiểm tra hồ sơ cục bộ (local profiles)...', 'info', 70);
    const { Profile, profilesPath } = await getDatabase();
    const profiles = await Profile.findAll({ raw: true });

    let missing = 0;
    let present = 0;

    for (const profile of profiles as any[]) {
      const dirName = (profile as any).ProfilePath || `gologin_profile_${(profile as any).Id}`;
      const fullPath = path.join(profilesPath, dirName);
      try {
        await fs.access(fullPath);
        present++;
        if (present <= 3) {
          sendStartupLog(`✅ Tìm thấy hồ sơ: ${dirName}`, 'success');
        }
      } catch {
        missing++;
        if (missing <= 5) {
          sendStartupLog(`⚠️ Thiếu hồ sơ: ${dirName}`, 'warning');
        }
      }
    }

    sendStartupLog(`📦 Tổng số hồ sơ: ${profiles.length} | Có: ${present} | Thiếu: ${missing}`, missing > 0 ? 'warning' : 'success', 90);
  } catch (error: any) {
    sendStartupLog(`❌ Lỗi khi kiểm tra hồ sơ cục bộ: ${error.message || error}`, 'error');
  }
}





// Use verbose mode for better debugging
const verboseSqlite3 = sqlite3.verbose();

// WebSocket module - load dynamically to avoid type issues - DISABLED
// let WS: any; // Disabled with WebSocket monitoring
// try {
//   WS = require('ws');
// } catch (e) {
//   console.warn('WebSocket module not available');
// }

// Add global type declaration at the top
declare global {
  var cachedData: {
    profiles: any[];
    groups: any[];
    lastUpdated: number;
  };
}

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

  // Store main window reference
  mainWindow = win;

  // Maximize window automatically
  win.maximize();

  if (app.isPackaged) {
    win.loadFile(join(__dirname, "..", "..", "dist", "frontend", "index.html"));
    win.setMenu(null);
  } else {
    win.loadURL(`http://localhost:${PORT}/`);
    win.webContents.openDevTools();
  }

  // Clean up reference when window is closed
  win.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Pre-initialize database and preload all essential data for instant access
 */
async function initializeCriticalServices(): Promise<void> {
  console.log('🔌 [Startup] Initializing critical services...');

  try {
    // Step 1: Establish database connection (fast mode)
    const { Profile, Group } = await getDatabase(); // Skip sync for speed
    console.log('✅ [Startup] Database connection established (fast mode)');

    // Step 2: Preload ALL essential data into memory for instant access
    console.log('📊 [Startup] Preloading all essential data...');

    const dataLoadPromises = [
      // Load profiles with full data including JsonData for immediate use
      Profile.findAll({
        raw: true,
        nest: true,
        order: [['CreatedAt', 'DESC']] // Latest profiles first
      }).catch((error) => {
        console.warn('Failed to load profiles:', error);
        return [];
      }),

      // Load groups for filtering
      Group.findAll({
        raw: true,
        order: [['Name', 'ASC']] // Alphabetical order
      }).catch((error) => {
        console.warn('Failed to load groups:', error);
        return [];
      }),

      // Load proxies from store
      Promise.resolve(store.get("proxies", [])).catch(() => [])
    ];

    const [profiles, groups, proxies] = await Promise.all(dataLoadPromises);

    // Process profiles to add computed fields
    const processedProfiles = profiles.map((profile: any) => {
      // Parse JsonData for immediate use
      let parsedJsonData = {};
      try {
        if (profile.JsonData && typeof profile.JsonData === 'string') {
          parsedJsonData = JSON.parse(profile.JsonData);
        }
      } catch (e) {
        console.warn(`Failed to parse JsonData for profile ${profile.Id}:`, e);
      }

      return {
        ...profile,
        ParsedJsonData: parsedJsonData,
        // Add display-ready fields
        GroupName: (groups as any[]).find((g: any) => g.Id === profile.GroupId)?.Name || 'No Group',
        LastRunFormatted: profile.LastRunAt ? new Date(profile.LastRunAt).toLocaleString() : 'Never',
        CreatedAtFormatted: profile.CreatedAt ? new Date(profile.CreatedAt).toLocaleString() : 'Unknown'
      };
    });

    console.log(`✅ [Startup] Successfully preloaded:`);
    console.log(`   📁 ${processedProfiles.length} profiles (with parsed data)`);
    console.log(`   📂 ${groups.length} groups`);
    console.log(`   🌐 ${proxies.length} proxies`);

    // Cache ALL data for instant IPC responses with extended information
    (global as any).cachedData = {
      profiles: processedProfiles,
      groups,
      proxies,
      lastUpdated: Date.now(),
      loadTime: Date.now(),
      version: '1.0.0' // For cache versioning
    };

    // Background auto-refresh disabled for better performance
    // Users can manually refresh via cache:refresh or cache:forceRefresh handlers


  } catch (error) {
    console.error('❌ [Startup] Critical services initialization failed:', error);
    // Don't fail app startup for database issues - continue with empty data
    (global as any).cachedData = {
      profiles: [],
      groups: [],

      proxies: [],
      lastUpdated: Date.now(),
      loadTime: Date.now(),
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Background cache refresh function
 */
async function refreshCacheInBackground(): Promise<void> {
  console.log('🔄 [Background] Refreshing cache...');

  try {
    const { Profile, Group } = await getDatabase();
    const [profiles, groups, proxies] = await Promise.all([
      Profile.findAll({ raw: true, nest: true, order: [['CreatedAt', 'DESC']] }),
      Group.findAll({ raw: true, order: [['Name', 'ASC']] }),
      Promise.resolve(store.get("proxies", []))
    ]);

    // Process profiles with computed fields
    const processedProfiles = profiles.map((profile: any) => {
      let parsedJsonData = {};
      try {
        if (profile.JsonData && typeof profile.JsonData === 'string') {
          parsedJsonData = JSON.parse(profile.JsonData);
        }
      } catch (e) {
        // Ignore parse errors for background refresh
      }

      return {
        ...profile,
        ParsedJsonData: parsedJsonData,
        GroupName: (groups as any[]).find((g: any) => g.Id === profile.GroupId)?.Name || 'No Group',
        LastRunFormatted: profile.LastRunAt ? new Date(profile.LastRunAt).toLocaleString() : 'Never',
        CreatedAtFormatted: profile.CreatedAt ? new Date(profile.CreatedAt).toLocaleString() : 'Unknown'
      };
    });

    // Update cache
    if ((global as any).cachedData) {
      (global as any).cachedData.profiles = processedProfiles;
      (global as any).cachedData.groups = groups;
      (global as any).cachedData.proxies = proxies;
      (global as any).cachedData.lastUpdated = Date.now();
    }

    console.log(`✅ [Background] Cache refreshed: ${processedProfiles.length} profiles, ${groups.length} groups, ${proxies.length} proxies`);

  } catch (error) {
    console.error('❌ [Background] Cache refresh failed:', error);
  }
}

/**
 * Initialize all non-critical services in separate background threads
 */

/**
 * When the application is ready, this function is called.
 *
 * It initializes critical services (database), creates the window immediately,
 * then initializes other services in background.
 *
 * @returns {Promise<void>} A Promise that resolves when critical setup is done.
 */
app.whenReady().then(async () => {
  console.log('🚀 [Startup] App ready, starting initialization...');

  // Show startup popup early
  createStartupWindow();
  sendStartupLog('🚀 Bắt đầu khởi tạo ứng dụng...', 'info', 5);

  // Step 1: Initialize critical services (database)
  sendStartupLog('🔌 Kết nối cơ sở dữ liệu...', 'info', 15);
  await initializeCriticalServices();
  sendStartupLog('✅ Cơ sở dữ liệu sẵn sàng', 'success', 35);

  // Browser service
  sendStartupLog('🧩 Khởi tạo dịch vụ trình duyệt...', 'info', 45);
  initializeEnhancedBrowserServiceHandlers();
  sendStartupLog('✅ Dịch vụ trình duyệt đã sẵn sàng', 'success', 55);

  // Local profile check
  await checkLocalProfilesAndLog();

  // Step 2: Prepare frontend and create window
  sendStartupLog('🧱 Chuẩn bị giao diện...', 'info', 60);
  await prepareNext("./src", PORT);
  if (startupWindow && !startupWindow.isDestroyed()) {
    startupWindow.loadURL(`http://localhost:${PORT}/startup-logs`);
  }
  sendStartupLog('✅ Giao diện đã sẵn sàng', 'success', 95);

  // Create main window
  createWindow();
  sendStartupLog('🎉 Hoàn tất khởi tạo!', 'success', 100);

  console.log('✅ [Startup] App window created successfully');

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
  // IPC lắng nghe yêu cầu đóng popup startup
  ipcMain.on('startup:close', () => {
    if (startupWindow && !startupWindow.isDestroyed()) {
      startupWindow.close();
      startupWindow = null;
    }
  });

/* ++++++++++ events ++++++++++ */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Cleanup services before quitting
    cleanupEnhancedBrowserServiceHandlers();
    app.quit();
  }
});

app.on("before-quit", () => {
  // Cleanup services before quitting
  cleanupEnhancedBrowserServiceHandlers();
});

/* ++++++++++ IPC Handlers ++++++++++ */

// Cache status and info handlers
ipcMain.handle("cache:getStatus", async () => {
  if (!(global as any).cachedData) {
    return {
      status: 'not_initialized',
      message: 'Cache not yet initialized'
    };
  }

  const cache = (global as any).cachedData;
  const ageInSeconds = Math.floor((Date.now() - cache.lastUpdated) / 1000);
  const loadTimeSeconds = Math.floor((Date.now() - cache.loadTime) / 1000);

  return {
    status: 'ready',
    version: cache.version || '1.0.0',
    lastUpdated: cache.lastUpdated,
    ageInSeconds,
    loadTimeSeconds,
    profileCount: cache.profiles?.length || 0,
    groupCount: cache.groups?.length || 0,
    proxyCount: cache.proxies?.length || 0,
    hasError: !!cache.error,
    error: cache.error || null,
    message: `Cache ready with ${cache.profiles?.length || 0} profiles, ${cache.groups?.length || 0} groups, ${cache.proxies?.length || 0} proxies`
  };
});

ipcMain.handle("cache:forceRefresh", async () => {
  console.log('🔄 [Manual] Force refreshing cache...');
  try {
    await refreshCacheInBackground();
    return {
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('❌ [Manual] Force refresh failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to refresh cache'
    };
  }
});

// Alias for backward compatibility
ipcMain.handle("cache:refresh", async () => {
  console.log('🔄 [Legacy] Cache refresh requested (redirecting to forceRefresh)...');
  try {
    await refreshCacheInBackground();
    return {
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('❌ [Legacy] Cache refresh failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to refresh cache'
    };
  }
});

// Proxies - Load from cache first
ipcMain.handle("proxies:get", async () => {
  // Return cached proxies if available and recent
  if ((global as any).cachedData && (global as any).cachedData.proxies &&
      (Date.now() - (global as any).cachedData.lastUpdated) < 30000) {
    console.log('📊 [Cache] Returning cached proxies data');
    return (global as any).cachedData.proxies;
  }

  // Fallback to store
  console.log('🔄 [Store] Loading fresh proxies data');
  const proxies = store.get("proxies", []);

  // Update cache
  if ((global as any).cachedData) {
    (global as any).cachedData.proxies = proxies;
    (global as any).cachedData.lastUpdated = Date.now();
  }

  return proxies;
});

// Groups - Optimized with caching
ipcMain.handle("groups:get", async () => {
  // Return cached data if available and recent (< 30 seconds old)
  if ((global as any).cachedData && (Date.now() - (global as any).cachedData.lastUpdated) < 30000) {
    console.log('📊 [Cache] Returning cached groups data');
    return (global as any).cachedData.groups;
  }

  // Fallback to database if cache is stale or missing
  console.log('🔄 [Database] Loading fresh groups data');
  try {
    const { Group } = await getDatabase();
    const groups = await Group.findAll({ raw: true });

    // Update cache
    if ((global as any).cachedData) {
      (global as any).cachedData.groups = groups;
      (global as any).cachedData.lastUpdated = Date.now();
    }

    return groups;
  } catch (error) {
    console.error('❌ Error loading groups:', error);
    return [];
  }
});

ipcMain.handle("groups:create", async (_event, groupData) => {
  const { Group } = await getDatabase();

  // Basic validation
  if (groupData.Name && groupData.Name.length > 30) {
    throw new Error("Group name must be 30 characters or less.");
  }

  try {
    const group = await Group.create(groupData);
    const result = group.toJSON();

    // Update cache immediately
    if ((global as any).cachedData) {
      (global as any).cachedData.groups.push(result);
      (global as any).cachedData.lastUpdated = Date.now();
      console.log('🔄 [Cache] Added new group to cache');
    }

    return result.Id; // Return the ID of the created group
  } catch (error: any) {
    console.error('Error creating group:', error);
    throw error; // Re-throw error for proper error handling
  }
});

ipcMain.handle("groups:update", async (_event, groupData) => {
  const { Group } = await getDatabase();
  const { Id, ...data } = groupData;

  // Basic validation
  if (data.Name && data.Name.length > 30) {
    throw new Error("Group name must be 30 characters or less.");
  }

  try {
    const result = await Group.update(data, { where: { Id } });

    // Check if update was successful (at least 1 row affected)
    if (result[0] > 0) {
      // Update cache immediately if successful
      if ((global as any).cachedData) {
        const groupIndex = (global as any).cachedData.groups.findIndex((g: any) => g.Id === Id);
        if (groupIndex !== -1) {
          (global as any).cachedData.groups[groupIndex] = { ...groupData };
          (global as any).cachedData.lastUpdated = Date.now();
          console.log('🔄 [Cache] Updated group in cache');
        }
      }

      return true; // Return true when successful
    } else {
      console.warn(`Group update failed: No rows affected for group ${Id}`);
      return false; // Return false when no rows were updated
    }
  } catch (error: any) {
    console.error(`Error updating group ${Id}:`, error);
    throw error; // Re-throw error for proper error handling
  }
});

ipcMain.handle("groups:delete", async (_event, groupId) => {
  const { Group } = await getDatabase();

  try {
    const result = await Group.destroy({ where: { Id: groupId } });

    // Check if deletion was successful (at least 1 row affected)
    if (result > 0) {
      // Update cache immediately if successful
      if ((global as any).cachedData) {
        (global as any).cachedData.groups = (global as any).cachedData.groups.filter((g: any) => g.Id !== groupId);
        (global as any).cachedData.lastUpdated = Date.now();
        console.log('🔄 [Cache] Removed group from cache');
      }

      return true; // Return true when successful
    } else {
      console.warn(`Group deletion failed: No rows affected for group ${groupId}`);
      return false; // Return false when no rows were deleted
    }
  } catch (error: any) {
    console.error(`Error deleting group ${groupId}:`, error);
    throw error; // Re-throw error for proper error handling
  }
});

// Profiles - Optimized with caching
ipcMain.handle("profiles:get", async () => {
  // Return cached data if available and recent (< 30 seconds old)
  if ((global as any).cachedData && (Date.now() - (global as any).cachedData.lastUpdated) < 30000) {
    console.log('📊 [Cache] Returning cached profiles data');
    return (global as any).cachedData.profiles;
  }

  // Fallback to database if cache is stale or missing
  console.log('🔄 [Database] Loading fresh profiles data');
  try {
    const { Profile } = await getDatabase();
    const profiles = await Profile.findAll({ raw: true, nest: true });

    // Update cache
    if ((global as any).cachedData) {
      (global as any).cachedData.profiles = profiles;
      (global as any).cachedData.lastUpdated = Date.now();
    }

    return profiles;
  } catch (error) {
    console.error('❌ Error loading profiles:', error);
    return [];
  }
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
    const access_token = getCurrentToken();

    if (!access_token) {
      throw new Error("GoLogin token not found. Please configure it in Settings.");
    }

    // Basic validation of profile name
    if (!profileData.Name || profileData.Name.trim().length === 0) {
      throw new Error("Profile name is required.");
    }

    const trimmedName = profileData.Name.trim();
    if (trimmedName.length > 50) {
      throw new Error("Profile name must be 50 characters or less.");
    }

    profileData.Name = trimmedName;

    console.log(`Creating profile: ${profileData.Name}`);

    // Create profile with token rotation
    const profileGologin = await retryWithTokenRotation(
      async (token: string) => {
        const GL = GologinApi({ token });
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

    // Get profile data with token rotation
    const newJsonData = await retryWithTokenRotation(
      async (token: string) => {
        const goLogin = new GoLogin({token, profile_id: profileId, tmpdir: profilesPath });
        return await goLogin.getProfile();
      },
      `Failed to get profile data for ${profileId}`
    );
     const existingJsonData = profileData.JsonData ? JSON.parse(profileData.JsonData) : {};

    const JsonData = { ...newJsonData, ...existingJsonData };
    profileData.JsonData = JSON.stringify(JsonData);

    // Create GoLogin instance with current token for operations
    const currentToken = getCurrentToken();
    const goLogin = new GoLogin({token: currentToken, profile_id: profileId, tmpdir: profilesPath });

    // Clean up remote profile (we only need local copy)
    try {
      const GL = GologinApi({ token: currentToken });
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
      await goLogin.setProfileId(profileId);
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
      const createdProfile = await Profile.create(profileData);

      // Update cache immediately after successful creation
      if ((global as any).cachedData) {
        const newProfileData = createdProfile.toJSON();
        (global as any).cachedData.profiles.unshift(newProfileData); // Add to beginning (latest first)
        (global as any).cachedData.lastUpdated = Date.now();
        console.log('🔄 [Cache] Added new profile to cache');
      }

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

// Browser Status Monitoring System
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
let mainWindow: BrowserWindow | null = null;
// let lastStatusLog = 0; // Track last status log time - Removed as health monitoring is disabled

// WebSocket monitoring functions - DISABLED
/*
const monitorWebSocketConnection = (profileId: string, wsUrl: string) => {
  const status = browserStatusMap.get(profileId);
  if (!status || !WS) return;

  try {
    const ws = new WS(wsUrl);
    status.wsConnection = ws;

    ws.on('open', () => {
      console.log(`✅ WebSocket connected for profile ${profileId}`);
      updateBrowserStatus(profileId, {
        status: 'running',
        lastActivity: new Date(),
        errorCount: 0
      });
    });

    ws.on('message', (_data: any) => {
      updateBrowserStatus(profileId, { lastActivity: new Date() });
    });

    ws.on('close', (code: number, reason: string) => {
      console.log(`🔌 WebSocket closed for profile ${profileId}: ${code} - ${reason}`);
      updateBrowserStatus(profileId, {
        status: 'stopped',
        wsConnection: undefined
      });
    });

    ws.on('error', (error: Error) => {
      console.error(`❌ WebSocket error for profile ${profileId}:`, error);
      const currentStatus = browserStatusMap.get(profileId);
      if (currentStatus) {
        updateBrowserStatus(profileId, {
          errorCount: currentStatus.errorCount + 1,
          lastActivity: new Date()
        });

        // If too many errors, mark as crashed
        if (currentStatus.errorCount >= 3) {
          updateBrowserStatus(profileId, { status: 'crashed' });
        }
      }
    });

    // WebSocket ping disabled to prevent automatic restarts
    // const pingInterval = setInterval(() => {
    //   if (ws.readyState === 1) { // OPEN state
    //     ws.ping();
    //   } else {
    //     clearInterval(pingInterval);
    //   }
    // }, 30000); // Every 30 seconds

  } catch (error) {
    console.error(`Failed to create WebSocket for profile ${profileId}:`, error);
    updateBrowserStatus(profileId, { status: 'crashed' });
  }
};
*/

// Helper function to create serializable status
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

  // Notify frontend about status change
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

  // Notify frontend
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser-status-changed', {
      profileId,
      status: { profileId, status: 'stopped', errorCount: 0 }
    });
  }
};

// Global store for running profiles (enhanced)
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

  // Also cleanup browser status
  cleanupBrowserStatus(profileId);
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

// Periodic health check for running processes (enhanced) - DISABLED to prevent auto-restart
// NOTE: This was causing automatic Chrome restarts. Replaced with on-demand cleanup only.
console.log('⚠️ Health monitoring interval disabled to prevent auto-restart issues');

// Helper function for manual cleanup (called only when needed)
const performManualCleanup = () => {
  const profilesToCleanup: string[] = [];

  // Check running profiles
  runningProfiles.forEach((data, profileId) => {
    if (data.goLogin.processSpawned) {
      const pid = data.goLogin.processSpawned.pid;
      if (pid && !isProcessRunning(pid)) {
        console.log(`Process ${pid} for profile ${profileId} is no longer running`);
        profilesToCleanup.push(profileId);
      }
    }
  });

  // Check browser statuses - mark as stopped if WebSocket is closed and no process
  browserStatusMap.forEach((status, profileId) => {
    if (status.status === 'running') {
      const runningProfile = runningProfiles.get(profileId);

      // If no running profile but status is running, mark as stopped
      if (!runningProfile) {
        updateBrowserStatus(profileId, { status: 'stopped' });
        return;
      }

      // Check if WebSocket is disconnected
      if (status.wsConnection && status.wsConnection.readyState !== 1) {
        console.log(`WebSocket disconnected for profile ${profileId}, checking process...`);

        // If process is also dead, mark as stopped
        if (runningProfile.goLogin.processSpawned) {
          const pid = runningProfile.goLogin.processSpawned.pid;
          if (pid && !isProcessRunning(pid)) {
            profilesToCleanup.push(profileId);
          }
        }
      }

      // Check for old processes (running more than 24 hours without activity)
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

  return profilesToCleanup.length;
};

// Cleanup all browser statuses when app quits
app.on('before-quit', () => {
  console.log('🧹 Cleaning up all browser connections...');
  browserStatusMap.forEach((status, _profileId) => {
    if (status.wsConnection) {
      status.wsConnection.close();
    }
  });
  browserStatusMap.clear();

  // Cleanup services before quitting
  cleanupEnhancedBrowserServiceHandlers();
});

ipcMain.handle("profiles:launch", async (_event, profileId) => {
  const { Profile, profilesPath } = await getDatabase();
  const token = getCurrentToken();
  if (!token) {
    throw new Error("GoLogin token not found. Please configure it in Settings.");
  }

  if (runningProfiles.has(profileId)) {
    const existing = runningProfiles.get(profileId);
    throw new Error(`Profile is already running on port ${existing?.port}`);
  }

  // Initialize browser status
  updateBrowserStatus(profileId, {
    profileId,
    status: 'starting',
    startTime: new Date(),
    errorCount: 0
  });

  try {
    // Use original GoLogin class instead of GoLoginService
    const goLogin = new GoLogin({token, profile_id: profileId, tmpdir: profilesPath });
    goLogin.writeCookiesFromServer = false;
    const profile = await Profile.findOne({ where: { Id: profileId } });
    if (!profile) throw new Error("Profile not found");

    // Create startup with retry (reduced retry count to prevent multiple launches)

    const profileData = JSON.parse(profile.get('JsonData') as string);
    await retryWithBackoff(
      async () => await goLogin.createStartupCustom(true, profileData),
      1, // maxRetries reduced to 1 to prevent multiple launches
      1000, // baseDelay
      `Failed to create startup for profile ${profileId}`
    );

    // Spawn browser with enhanced retry logic
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

    // Update browser status with connection details
    updateBrowserStatus(profileId, {
      status: 'running',
      wsUrl: wsUrl,
      port: goLogin.port,
      processId: goLogin.processSpawned?.pid || undefined,
      lastActivity: new Date()
    });

    // WebSocket monitoring disabled to prevent auto-restart issues
    // if (wsUrl) {
    //   setTimeout(() => {
    //     monitorWebSocketConnection(profileId, wsUrl);
    //   }, 2000); // Wait 2 seconds for browser to fully start
    // }

    if (goLogin.processSpawned) {
      goLogin.processSpawned.on('exit', (code: number, signal: string) => {
        console.log(`Browser process for profile ${profileId} exited with code ${code}, signal ${signal}`);
        cleanupRunningProfile(profileId, `Process exited (code: ${code}, signal: ${signal})`);
        updateBrowserStatus(profileId, { status: 'stopped' });
      });

      goLogin.processSpawned.on('error', (error: Error) => {
        console.log(`Browser process for profile ${profileId} error:`, error.message);
        cleanupRunningProfile(profileId, `Process error: ${error.message}`);
        updateBrowserStatus(profileId, { status: 'crashed' });
      });

      goLogin.processSpawned.on('close', (code: number, signal: string) => {
        console.log(`Browser process for profile ${profileId} closed with code ${code}, signal ${signal}`);
        cleanupRunningProfile(profileId, `Process closed (code: ${code}, signal: ${signal})`);
        updateBrowserStatus(profileId, { status: 'stopped' });
      });
    }

    return {
      status: 'success',
      wsUrl: wsUrl,
      port: goLogin.port,
      processId: goLogin.processSpawned?.pid || null,
      profileId: profileId
    };

  } catch (error: any) {
    // Update status on error
    updateBrowserStatus(profileId, { status: 'crashed' });
    throw error;
  }
});

ipcMain.handle("profiles:stop", async (_event, profileId) => {
  try {
    // Update status to stopping
    updateBrowserStatus(profileId, { status: 'stopping' });

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
    cleanupBrowserStatus(profileId);

    console.log(`Profile ${profileId} stopped successfully`);
    return { status: 'success', message: 'Profile stopped successfully' };
  } catch (error: any) {
    console.error(`Error stopping profile ${profileId}:`, error);
    updateBrowserStatus(profileId, { status: 'crashed' });
    throw new Error(`Failed to stop profile: ${error.message}`);
  }
  });

// New IPC handlers for browser status monitoring
ipcMain.handle("profiles:getBrowserStatus", async (_event, profileId?: string) => {
  if (profileId) {
    const status = browserStatusMap.get(profileId);
    if (status) {
      return createSerializableStatus(status);
    }
    return { profileId, status: 'stopped', errorCount: 0 };
  }

  // Return all browser statuses
  const allStatuses: { [key: string]: any } = {};
  browserStatusMap.forEach((status, id) => {
    allStatuses[id] = createSerializableStatus(status);
  });

  return allStatuses;
});

ipcMain.handle("profiles:getAllBrowserStatuses", async () => {
  const statuses: any[] = [];
  browserStatusMap.forEach((status, _profileId) => {
    statuses.push(createSerializableStatus(status));
  });
  return statuses;
});

ipcMain.handle("profiles:restartBrowser", async (_event, profileId) => {
  try {
    // Stop first if running
    if (runningProfiles.has(profileId)) {
      updateBrowserStatus(profileId, { status: 'stopping' });

      const runningProfile = runningProfiles.get(profileId);
      if (runningProfile?.goLogin.processSpawned) {
        runningProfile.goLogin.processSpawned.kill('SIGTERM');
      }

      cleanupRunningProfile(profileId, 'Restarting');
      cleanupBrowserStatus(profileId);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start again - reuse launch logic
    const { Profile, profilesPath } = await getDatabase();
    const token = getCurrentToken();
    if (!token) {
      throw new Error("GoLogin token not found. Please configure it in Settings.");
    }

    updateBrowserStatus(profileId, {
      profileId,
      status: 'starting',
      startTime: new Date(),
      errorCount: 0
    });

    const goLogin = new GoLogin({token, profile_id: profileId, tmpdir: profilesPath });
    goLogin.writeCookiesFromServer = false;
    const profile = await Profile.findOne({ where: { Id: profileId } });
    if (!profile) throw new Error("Profile not found");

    await retryWithBackoff(
      async () => await goLogin.createStartupCustom(true, JSON.parse(profile.get('JsonData') as string)),
      1, 1000, `Failed to create startup for profile ${profileId}` // Reduced retry count
    );

    // Spawn browser with same enhanced logic as launch
    const wsUrl = await retryWithBackoff(
      async () => {
        try {
          const url = await goLogin.spawnBrowser();

          if (url && goLogin.port) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              const testResponse = await fetch(`http://127.0.0.1:${goLogin.port}/json/version`, {
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              if (!testResponse.ok) {
                throw new Error(`Browser not responsive on port ${goLogin.port}`);
              }
            } catch (connError: any) {
              console.warn(`Browser connection test failed during restart: ${connError.message}`);
            }
          }

          return url;
        } catch (error: any) {
          console.error(`Browser restart spawn failed:`, {
            error: error.message,
            port: goLogin.port,
            profileId
          });
          throw error;
        }
      },
      3, 3000, `Failed to spawn browser for profile ${profileId}` // Enhanced retry for restart
    );

    goLogin.setActive(true);
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

    // WebSocket monitoring disabled to prevent auto-restart issues
    // if (wsUrl) {
    //   setTimeout(() => {
    //     monitorWebSocketConnection(profileId, wsUrl);
    //   }, 2000);
    // }

    return { status: 'success', message: 'Profile restarted successfully' };
  } catch (error: any) {
    console.error(`Error restarting profile ${profileId}:`, error);
    updateBrowserStatus(profileId, { status: 'crashed' });
    throw new Error(`Failed to restart profile: ${error.message}`);
  }
});

ipcMain.handle("profiles:getRunning", async () => {
  // Run manual cleanup when explicitly requested
  const cleanedCount = performManualCleanup();
  if (cleanedCount > 0) {
    console.log(`🧹 Manual cleanup removed ${cleanedCount} dead profiles`);
  }

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

  try {
    const result = await Profile.update(data, { where: { Id } });

    // Check if update was successful (at least 1 row affected)
    if (result[0] > 0) {
      // Update cache immediately if successful
      if ((global as any).cachedData) {
        const profileIndex = (global as any).cachedData.profiles.findIndex((p: any) => p.Id === Id);
        if (profileIndex !== -1) {
          (global as any).cachedData.profiles[profileIndex] = { ...profileData };
          (global as any).cachedData.lastUpdated = Date.now();
          console.log('🔄 [Cache] Updated profile in cache');
        }
      }

      return true; // Return true when successful
    } else {
      console.warn(`Profile update failed: No rows affected for profile ${Id}`);
      return false; // Return false when no rows were updated
    }
  } catch (error: any) {
    console.error(`Error updating profile ${Id}:`, error);
    throw error; // Re-throw error for proper error handling
  }
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

    // Update cache immediately after successful deletion
    if ((global as any).cachedData) {
      (global as any).cachedData.profiles = (global as any).cachedData.profiles.filter((p: any) => p.Id !== profileId);
      (global as any).cachedData.lastUpdated = Date.now();
      console.log('🔄 [Cache] Removed profile from cache');
    }

    console.log(`Successfully deleted profile ${profileId} from database`);
    return true;

  } catch (error: any) {
    console.error(`Error deleting profile ${profileId}:`, error);
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
});

ipcMain.handle("profiles:exportCookie", async (_event, profileId: string) => {
  const { profilesPath } = await getDatabase();
  const token = getCurrentToken();
  if (!token) {
    throw new Error("GoLogin token not found. Please configure it in Settings.");
  }

  // Use original GoLogin class instead of GoLoginService
  const goLogin = new GoLogin({ token, profile_id: profileId, tmpdir: profilesPath });
  const secondaryCookiePath = path.join(profilesPath, `gologin_profile_${profileId}`, 'Default', 'Network', 'Cookies');
  console.log(secondaryCookiePath)
  // Get cookies with retry mechanism
  const cookies = await retryWithBackoff(
    async () => await goLogin.GetCookieCustome(secondaryCookiePath),
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

  const profileJson = JSON.parse((profile as any).JsonData || '{}');
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

  // Ensure directories exist
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

            // Parse columns from CREATE TABLE query
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

              // Dynamic column value mapping
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
                is_httponly: (cookie) => cookie.httpOnly ? 1 : 0, // for compatibility
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

    // Update profile JsonData
    profileJson.cookies = { cookies: rawCookies };
    const newJsonData = JSON.stringify(profileJson);

    const updateResult = await Profile.update({
      JsonData: newJsonData,
      UpdatedAt: new Date().toISOString()
    }, { where: { Id: profileId } });

    // Return true only if both cookie import and profile update were successful
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

// Proxies SET handler (GET handler is above with cache support)

ipcMain.handle("proxies:set", async (_event, proxies) => {
  // No sanitization - store proxies directly

  store.set("proxies", proxies);
  return true;
});

// Settings
ipcMain.handle("settings:get", async () => {
  return store.get();
});

ipcMain.handle("settings:set", async (_event, settings: Settings) => {
  // Simply store settings without sanitization
  store.set(settings);
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

// Data setup handler - check and copy database if needed
ipcMain.handle('data:setupDatabase', async (_event, dataPath: string) => {
  try {
    // Normalize Windows path - ensure proper drive letter format
    let normalizedDataPath = dataPath;

    const targetDbPath = path.join(normalizedDataPath, 'profile_data.db');
    const sourceDbPath = path.join(__dirname, '..', '..', 'backend', 'database', 'profile_data.db');

    console.log(`Original path: ${dataPath}`);
    console.log(`Normalized path: ${normalizedDataPath}`);
    console.log(`Target DB path: ${targetDbPath}`);
    console.log(`Source DB path: ${sourceDbPath}`);

    // Check if profile_data.db already exists in target directory
    try {
      await fs.access(targetDbPath);
      console.log(`Database already exists at: ${targetDbPath}`);
      return {
        success: true,
        existed: true,
        message: 'Database already exists in the selected directory'
      };
    } catch (error) {
      // File doesn't exist, need to copy
      console.log(`Database not found at: ${targetDbPath}, attempting to copy from source`);
    }

    // Check if source database exists
    try {
      await fs.access(sourceDbPath);
    } catch (error) {
      throw new Error(`Source database not found at: ${sourceDbPath}`);
    }

    // Ensure target directory exists
    await fs.mkdir(normalizedDataPath, { recursive: true });

    // Copy database file
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

// Database test handler
ipcMain.handle('database:test', async () => {
  try {
    console.log("Testing database connection...");
    const { sequelize, profilesPath, Profile, Group } = await getDatabase();

    // Test connection
    await sequelize.authenticate();

    // Get database info
    const storedDataPath = store.get("dataPath") || app.getPath("userData");
    const dbPath = path.join(storedDataPath, "profile_data.db");
    const tables = await sequelize.getQueryInterface().showAllTables();

    // Test basic queries using models
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
        throw error; // Don't retry auth errors
      }

      // Special handling for browser connection errors
      if (error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('EADDRINUSE') ||
          error.message?.includes('port')) {
        console.log(`🔌 Browser connection issue detected: ${error.message}`);

        // For connection errors, add extra delay to let browser stabilize
        if (attempt < maxRetries) {
          const extraDelay = 2000; // Extra 2 seconds for browser issues
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000 + extraDelay;
          console.log(`${errorMessage} (attempt ${attempt}/${maxRetries}). Browser needs more time, retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
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

/**
 * Retry GoLogin operations with token rotation
 * Each retry uses a different token from the pool
 */
export async function retryWithTokenRotation<T>(
  operation: (token: string) => Promise<T>,
  errorMessage: string = 'GoLogin operation failed'
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  resetTokenRotation(); // Start from first token

  for (let attempt = 1; attempt <= GOLOGIN_TOKENS.length; attempt++) {
    const currentToken = getCurrentToken();

    try {
      console.log(`🚀 ${errorMessage} (attempt ${attempt}/${GOLOGIN_TOKENS.length}) with token ${currentTokenIndex + 1}`);
      return await operation(currentToken);
    } catch (error: any) {
      lastError = error;

      // Log the failed token attempt
      console.error(`❌ Token ${currentTokenIndex + 1} failed:`, error.message);

      // Don't retry on certain types of errors
      if (error.message?.includes('Profile name is required') ||
          error.message?.includes('Invalid profile data')) {
        throw error; // Don't retry validation errors
      }

      if (attempt === GOLOGIN_TOKENS.length) {
        break; // Last token, will throw below
      }

      // Rotate to next token for retry
      rotateToNextToken();

      // Small delay between token attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`${errorMessage} after trying all ${GOLOGIN_TOKENS.length} tokens. Last error: ${lastError.message}`);
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

// Cache handlers defined above with enhanced status and force refresh
