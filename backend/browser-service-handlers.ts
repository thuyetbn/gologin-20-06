/**
 * 🔗 Simple Browser Auto-Update Service
 * Automatically checks and updates browser in background when app starts
 */

import { ipcMain } from 'electron';
import { homedir } from 'os';
import { join } from 'path';
import { EnhancedBrowserService } from './enhanced-browser-service';

let browserService: EnhancedBrowserService | null = null;

/**
 * Initialize Simple Browser Auto-Update Service
 */
export function initializeEnhancedBrowserServiceHandlers(): void {
  browserService = new EnhancedBrowserService();
  
  console.log('🔗 Initializing Browser Auto-Update Service...');

  // Auto-check and update browser on app startup
  setTimeout(async () => {
    try {
      await autoCheckAndUpdateBrowser();
    } catch (error) {
      console.error('Browser auto-update failed:', error);
    }
  }, 5000); // Wait 5 seconds after app start

  // Register IPC handlers for browser info and manual operations
  registerIpcHandlers();

  console.log('✅ Browser Auto-Update Service initialized');
}

/**
 * Register IPC handlers for browser management
 */
function registerIpcHandlers(): void {
  // Get browser info
  ipcMain.handle('browser:get-info', async (): Promise<{
    version: string;
    majorVersion: string;
    storagePath: string;
    isInstalled: boolean;
    executablePath: string;
  }> => {
    if (!browserService) throw new Error('Browser service not initialized');
    
    const majorVersion = browserService.getMajorVersion();
    const storagePath = join(homedir(), '.gologin', 'browser');
    const isInstalled = await browserService.checkBrowserExists(majorVersion);
    const executablePath = isInstalled ? browserService.getBrowserExecutablePath(majorVersion) : 'Not installed';
    
    // Get current browser version
    let version = 'Unknown';
    try {
      if (isInstalled) {
        version = await browserService.getCurrentBrowserVersion(majorVersion);
      }
    } catch (error) {
      console.warn('Failed to get browser version:', error);
    }
    
    return {
      version,
      majorVersion,
      storagePath,
      isInstalled,
      executablePath
    };
  });

  // Update browser with progress events
  ipcMain.handle('browser:update-with-progress', async (): Promise<{
    success: boolean;
    message: string;
    newVersion?: string;
  }> => {
    if (!browserService) throw new Error('Browser service not initialized');
    
    try {
      console.log('🔄 Browser update with progress requested...');
      
      // Get main window to send progress events
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      
      if (!mainWindow) {
        throw new Error('No main window found for progress updates');
      }
      
      // Progress callback function
      const sendProgress = (stage: string, progress: number, message: string) => {
        mainWindow.webContents.send('browser-update-progress', {
          stage,
          progress,
          message
        });
      };
      
      // Send initial progress
      sendProgress('checking', 0, 'Đang kiểm tra phiên bản mới nhất...');
      
      // Get latest major version from API
      const majorVersion = await browserService.getLatestMajorVersion();
      console.log('Latest major version for download:', majorVersion);
      
      sendProgress('downloading', 10, 'Bắt đầu tải xuống...');
      
      // Download with progress callbacks
      const browserPath = await browserService.downloadBrowserWithProgress(majorVersion, (progress: number, message?: string) => {
        if (progress <= 80) {
          sendProgress('downloading', progress, message || `Đang tải xuống... ${progress}%`);
        } else if (progress <= 90) {
          sendProgress('extracting', progress, message || 'Đang giải nén...');
        } else {
          sendProgress('installing', progress, message || 'Đang cài đặt...');
        }
      });
      
      console.log('Browser installed at:', browserPath);
      
      // Final progress
      sendProgress('installing', 95, 'Hoàn tất cài đặt...');
      
      // Get new version info
      const newVersion = await browserService.getCurrentBrowserVersion(majorVersion);
      
      sendProgress('completed', 100, 'Cập nhật hoàn thành!');
      
      console.log('✅ Browser update with progress completed successfully');
      
      return {
        success: true,
        message: 'Browser updated successfully',
        newVersion
      };
      
    } catch (error) {
      console.error('❌ Browser update with progress failed:', error);
      
      // Send error progress
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('browser-update-progress', {
          stage: 'error',
          progress: 0,
          message: 'Cập nhật thất bại',
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      return {
        success: false,
        message: `Update failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  });

  console.log('✅ Browser Management IPC handlers registered');
}

/**
 * Auto check and update browser if newer version available
 */
async function autoCheckAndUpdateBrowser(): Promise<void> {
  if (!browserService) return;

  try {
    console.log('🔍 Checking for browser updates...');
    
    // Get current major version
    const majorVersion = browserService.getMajorVersion();
    
    // Check if browser exists
    const browserExists = await browserService.checkBrowserExists(majorVersion);
    
    if (!browserExists) {
      console.log('📦 Browser not found, downloading latest version...');
      
      // Download browser silently in background
      await browserService.downloadBrowserSilently(majorVersion);
      
      console.log('✅ Browser downloaded and installed successfully');
    } else {
      // Check for updates
      const latestMajorVersion = await browserService.getLatestMajorVersion();
      const latestVersionInfo = await browserService.getLatestVersionInfoAsync();
      const currentVersion = await browserService.getCurrentBrowserVersion(majorVersion);
      
      const hasUpdate = majorVersion !== latestMajorVersion;
      
      if (hasUpdate) {
        console.log(`🆕 New browser version available! Current: ${currentVersion} (${majorVersion}), Latest: ${latestVersionInfo?.latestVersion} (${latestMajorVersion})`);
        
        // Notify frontend about update availability
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        if (mainWindow) {
          mainWindow.webContents.send('browser-update-available', {
            currentVersion,
            latestVersion: latestVersionInfo?.latestVersion,
            currentMajorVersion: majorVersion,
            latestMajorVersion
          });
        }
      } else {
        console.log('✅ Browser is already up to date');
      }
    }
    
  } catch (error) {
    console.error('❌ Browser auto-check failed:', error);
  }
}

/**
 * Cleanup Browser Service resources
 */
export function cleanupEnhancedBrowserServiceHandlers(): void {
  if (browserService) {
    browserService.destroy();
    browserService = null;
  }

  // Remove IPC handlers
  const handlers = [
    'browser:get-info',
    'browser:update-with-progress'
  ];

  handlers.forEach(handler => {
    ipcMain.removeAllListeners(handler);
  });

  console.log('🛑 Browser Auto-Update Service cleaned up');
}

/**
 * Get current browser service instance (for internal use)
 */
export function getBrowserServiceInstance(): EnhancedBrowserService | null {
  return browserService;
} 
