import { BrowserWindow, ipcMain } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";
import console from "node:console";

let mainWindow: BrowserWindow | null = null;

function sendToRenderer(channel: string, data: any): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Initialize auto-updater with GitHub Releases
 */
export function initializeAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  // Configuration
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // ── Events → send to renderer ──
  autoUpdater.on("checking-for-update", () => {
    console.log("🔍 [Updater] Checking for updates...");
    sendToRenderer("updater:status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    console.log(`🆕 [Updater] Update available: v${info.version}`);
    sendToRenderer("updater:status", {
      status: "available",
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    console.log(`✅ [Updater] App is up to date (v${info.version})`);
    sendToRenderer("updater:status", {
      status: "up-to-date",
      version: info.version,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`⬇️ [Updater] Download: ${progress.percent.toFixed(1)}%`);
    sendToRenderer("updater:status", {
      status: "downloading",
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    console.log(`✅ [Updater] Update downloaded: v${info.version}`);
    sendToRenderer("updater:status", {
      status: "downloaded",
      version: info.version,
    });
  });

  autoUpdater.on("error", (error) => {
    console.error("❌ [Updater] Error:", error.message);
    sendToRenderer("updater:status", {
      status: "error",
      error: error.message,
    });
  });

  // ── IPC Handlers ──
  ipcMain.handle("updater:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        version: result?.updateInfo?.version,
        hasUpdate: result?.updateInfo?.version !== autoUpdater.currentVersion?.version,
      };
    } catch (error: any) {
      console.error("❌ [Updater] Check failed:", error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      console.error("❌ [Updater] Download failed:", error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("updater:install", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle("updater:get-version", () => {
    return autoUpdater.currentVersion?.version || "unknown";
  });

  console.log("✅ [Updater] Auto-updater initialized");
}

export function cleanupAutoUpdater(): void {
  const channels = ["updater:check", "updater:download", "updater:install", "updater:get-version"];
  channels.forEach((ch) => ipcMain.removeHandler(ch));
  mainWindow = null;
  console.log("🛑 [Updater] Auto-updater cleaned up");
}
