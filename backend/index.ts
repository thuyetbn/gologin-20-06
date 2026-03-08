import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { prepareNext } from "sc-prepare-next";
import { cleanupEnhancedBrowserServiceHandlers, initializeEnhancedBrowserServiceHandlers } from "./browser-service-handlers.js";
import { PORT } from "./constants/index.js";
import { getDatabase } from "./database/index.js";
import { cleanupBrowserUseHandlers, initializeBrowserUseHandlers } from "./handlers/browser-use-handlers.js";
import { getBrowserUseService } from "./services/browser-use-service.js";
import { tokenService } from "./services/token-service.js";
import { cleanupGeneralHandlers, initializeGeneralHandlers } from "./handlers/general-handlers.js";
import { cleanupProfileHandlers, initializeProfileHandlers, setMainWindow } from "./handlers/profile-handlers.js";
import { cleanupAutoUpdater, initializeAutoUpdater } from "./services/auto-updater.js";
import console from "node:console";

// Re-export utility functions for other modules
export { retryWithBackoff, retryWithTokenRotation } from "./utils/retry.js";

/**
 * Initialize database connection on startup
 */
async function initializeCriticalServices(): Promise<void> {
  console.log('🔌 [Startup] Initializing critical services...');

  try {
    await getDatabase();
    console.log('✅ [Startup] Database connection established');
  } catch (error) {
    console.error('❌ [Startup] Critical services initialization failed:', error);
  }
}

/**
 * Creates the main application window.
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

  // Store main window reference for profile handlers
  setMainWindow(win);

  // Initialize auto-updater after window is created
  initializeAutoUpdater(win);

  win.maximize();

  if (app.isPackaged) {
    win.loadFile(join(__dirname, "..", "..", "dist", "frontend", "index.html"));
    win.setMenu(null);
  } else {
    win.loadURL(`http://localhost:${PORT}/`);
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    setMainWindow(null);
  });
}

/**
 * App ready - initialize services, register handlers, create window
 */
app.whenReady().then(async () => {
  console.log('🚀 [Startup] App ready, starting initialization...');

  // Step 0: Initialize token service first
  await tokenService.initialize();
  console.log('✅ [Startup] Token service initialized');

  // Step 1: Initialize critical services (database)
  await initializeCriticalServices();

  // Step 2: Register all IPC handlers
  initializeGeneralHandlers();
  initializeProfileHandlers();
  initializeEnhancedBrowserServiceHandlers();
  initializeBrowserUseHandlers();

  // Step 3: Prepare frontend and create window
  await prepareNext("./src", PORT);
  createWindow();

  console.log('✅ [Startup] App window created successfully');

  // Step 4: Initialize background services
  const browserUseSvc = getBrowserUseService();
  browserUseSvc.start().then((started: boolean) => {
    if (started) {
      console.log('✅ [Startup] Browser-Use service started successfully');
    } else {
      console.warn('⚠️ [Startup] Browser-Use service failed to start (will retry on first use)');
    }
  }).catch((error: Error) => {
    console.error('❌ [Startup] Browser-Use service error:', error);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* ++++++++++ Events ++++++++++ */

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    cleanupAllHandlers();
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupAllHandlers();
});

function cleanupAllHandlers(): void {
  console.log('🧹 Cleaning up all services...');
  cleanupProfileHandlers();
  cleanupGeneralHandlers();
  cleanupAutoUpdater();
  cleanupEnhancedBrowserServiceHandlers();
  cleanupBrowserUseHandlers();
}
