import { app, BrowserWindow, Menu, MenuItem } from "electron";
import { join } from "node:path";
import { prepareNext } from "sc-prepare-next";
import { cleanupEnhancedBrowserServiceHandlers, initializeEnhancedBrowserServiceHandlers } from "./browser-service-handlers.js";
import { PORT } from "./constants/index.js";
import { getDatabase, closeDatabase } from "./database/index.js";
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

  // Enable right-click context menu for input fields
  win.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Cắt', role: 'cut', enabled: params.editFlags.canCut }));
      menu.append(new MenuItem({ label: 'Sao chép', role: 'copy', enabled: params.editFlags.canCopy }));
      menu.append(new MenuItem({ label: 'Dán', role: 'paste', enabled: params.editFlags.canPaste }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Chọn tất cả', role: 'selectAll', enabled: params.editFlags.canSelectAll }));
      menu.popup();
    } else if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Sao chép', role: 'copy' }));
      menu.popup();
    }
  });

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

  // Step 3: Prepare frontend and create window
  await prepareNext("./src", PORT);
  createWindow();

  console.log('✅ [Startup] App window created successfully');

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* ++++++++++ Events ++++++++++ */

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

let cleanedUp = false;
app.on("before-quit", (event) => {
  if (!cleanedUp) {
    event.preventDefault();
    cleanupAllHandlers()
      .catch((err) => console.error('Cleanup error:', err))
      .finally(() => {
        cleanedUp = true;
        app.quit();
      });
  }
});

async function cleanupAllHandlers(): Promise<void> {
  console.log('🧹 Cleaning up all services...');
  cleanupProfileHandlers();
  cleanupGeneralHandlers();
  cleanupAutoUpdater();
  cleanupEnhancedBrowserServiceHandlers();
  await closeDatabase();
}
