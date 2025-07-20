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

  // Register IPC handlers for browser info and manual operations
  registerIpcHandlers();

  // Background browser check disabled to prevent Chrome auto-restart
  // startBackgroundBrowserCheck();
  console.log('⚠️ Background browser check disabled to prevent Chrome auto-launch');

  console.log('✅ Browser Auto-Update Service initialized');
}

/**
 * Start browser check in background without blocking app startup - DISABLED
 */
/*
function startBackgroundBrowserCheck(): void {
  // Run browser check in background after app has loaded and stabilized
  setImmediate(() => {
    setTimeout(() => {
      console.log('🔍 [Background] Starting browser check...');
      autoCheckAndUpdateBrowser().catch(error => {
        console.error('🔥 Background browser check failed:', error);
        // Retry after 30 seconds if failed
        setTimeout(() => {
          console.log('🔄 [Background] Retrying browser check...');
          autoCheckAndUpdateBrowser().catch(retryError => {
            console.error('🔥 Background browser check retry failed:', retryError);
          });
        }, 30000);
      });
    }, 15000); // Wait 15 seconds to let app fully load and stabilize
  });
  
  console.log('🚀 Background browser check scheduled (15s delay)');
}
*/

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
    
    // Load saved version info first
    const savedVersionInfo = await browserService.loadBrowserVersionInfo();
    let majorVersion = browserService.getMajorVersion(); // fallback
    let version = 'Unknown';
    
    if (savedVersionInfo) {
      majorVersion = savedVersionInfo.majorVersion;
      version = savedVersionInfo.version;
    }
    
    const storagePath = join(homedir(), '.gologin', 'browser');
    const isInstalled = await browserService.checkBrowserExists(majorVersion);
    const executablePath = isInstalled ? browserService.getBrowserExecutablePath(majorVersion) : 'Not installed';
    
    // Try to get current browser version if not from saved info
    if (version === 'Unknown') {
      try {
        if (isInstalled) {
          version = await browserService.getCurrentBrowserVersion(majorVersion);
        }
      } catch (error) {
        console.warn('Failed to get browser version:', error);
      }
    }
    
    return {
      version,
      majorVersion,
      storagePath,
      isInstalled,
      executablePath
    };
  });

  // Manual check for browser updates (for testing and immediate check)
  ipcMain.handle('browser:check-for-updates', async (): Promise<{
    success: boolean;
    hasUpdate: boolean;
    updateInfo?: {
      currentVersion: string;
      latestVersion: string;
      currentMajorVersion: string;
      latestMajorVersion: string;
    };
    message: string;
  }> => {
    if (!browserService) throw new Error('Browser service not initialized');
    
    try {
      console.log('🔍 [Manual] Checking for browser updates...');
      
      // Load saved version info first
      const savedVersionInfo = await browserService.loadBrowserVersionInfo();
      let currentMajorVersion = browserService.getMajorVersion();
      let currentVersion = 'Unknown';
      
      if (savedVersionInfo) {
        currentMajorVersion = savedVersionInfo.majorVersion;
        currentVersion = savedVersionInfo.version;
      }
      
      // Check if browser exists
      const browserExists = await browserService.checkBrowserExists(currentMajorVersion);
      
      if (!browserExists) {
        console.log('📦 [Manual] Browser not found - will trigger download');
        
        // Notify frontend about update availability for new install
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('browser-update-available', {
            currentVersion: 'Not installed',
            latestVersion: 'Latest version',
            currentMajorVersion: '0',
            latestMajorVersion: currentMajorVersion
          });
        }
        
        return {
          success: true,
          hasUpdate: true,
          updateInfo: {
            currentVersion: 'Not installed',
            latestVersion: 'Latest version',
            currentMajorVersion: '0',
            latestMajorVersion: currentMajorVersion
          },
          message: 'Browser not installed - update dialog shown'
        };
      }
      
      // Check for updates
      const latestMajorVersion = await browserService.getLatestMajorVersion();
      const latestVersionInfo = await browserService.getLatestVersionInfoAsync();
      
      const hasUpdate = currentMajorVersion !== latestMajorVersion;
      
      if (hasUpdate) {
        console.log(`🆕 [Manual] New browser version available! Current: ${currentVersion} (${currentMajorVersion}), Latest: ${latestVersionInfo?.latestVersion} (${latestMajorVersion})`);
        
        const updateInfo = {
          currentVersion,
          latestVersion: latestVersionInfo?.latestVersion || latestMajorVersion,
          currentMajorVersion,
          latestMajorVersion
        };
        
        // Notify frontend about update availability
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('browser-update-available', updateInfo);
        }
        
        return {
          success: true,
          hasUpdate: true,
          updateInfo,
          message: 'Update available - dialog shown'
        };
      } else {
        console.log('✅ [Manual] Browser is already up to date');
        return {
          success: true,
          hasUpdate: false,
          message: 'Browser is already up to date'
        };
      }
      
    } catch (error) {
      console.error('❌ [Manual] Browser check failed:', error);
      return {
        success: false,
        hasUpdate: false,
        message: `Check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
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
 * Auto check and update browser if newer version available - DISABLED
   */
/*
async function autoCheckAndUpdateBrowser(): Promise<void> {
  if (!browserService) return;

  try {
    console.log('🔍 [Background] Checking for browser updates...');
    
    // Load saved version info first (fast operation)
    const savedVersionInfo = await browserService.loadBrowserVersionInfo();
    let currentMajorVersion = browserService.getMajorVersion(); // fallback
    let currentVersion = 'Unknown';
    
    if (savedVersionInfo) {
      currentMajorVersion = savedVersionInfo.majorVersion;
      currentVersion = savedVersionInfo.version;
      console.log(`📋 [Background] Using saved version info: ${currentVersion} (${currentMajorVersion})`);
    } else {
      console.log(`📋 [Background] No saved version info, using fallback: ${currentMajorVersion}`);
    }
    
    // Check if browser exists (fast local check)
    const browserExists = await browserService.checkBrowserExists(currentMajorVersion);
    
    if (!browserExists) {
      console.log('📦 [Background] Browser not found, downloading latest version silently...');
      
      // Download browser silently in background without blocking
      browserService.downloadBrowserSilently().then(() => {
        console.log('✅ [Background] Browser downloaded and installed successfully');
      }).catch(error => {
        console.error('❌ [Background] Browser download failed:', error);
      });
      
    } else {
      // Check for updates (potentially slow network call)
      try {
        const latestMajorVersion = await browserService.getLatestMajorVersion();
        const latestVersionInfo = await browserService.getLatestVersionInfoAsync();
        
        const hasUpdate = currentMajorVersion !== latestMajorVersion;
        
        if (hasUpdate) {
          console.log(`🆕 [Background] New browser version available! Current: ${currentVersion} (${currentMajorVersion}), Latest: ${latestVersionInfo?.latestVersion} (${latestMajorVersion})`);
          
          // Notify frontend about update availability (non-blocking)
          setImmediate(() => {
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('browser-update-available', {
                currentVersion,
                latestVersion: latestVersionInfo?.latestVersion,
                currentMajorVersion,
                latestMajorVersion
              });
            }
          });
        } else {
          console.log('✅ [Background] Browser is already up to date');
        }
      } catch (networkError) {
        console.warn('⚠️ [Background] Failed to check for updates (network issue):', networkError);
        // Don't fail the entire process for network issues
      }
    }
    
  } catch (error) {
    console.error('❌ [Background] Browser auto-check failed:', error);
  }
}
*/

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
    'browser:check-for-updates',
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
