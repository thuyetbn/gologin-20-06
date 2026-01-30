/**
 * IPC Handlers for Browser-Use integration
 */
import { ipcMain } from 'electron';
import { cleanupBrowserUseService, getBrowserUseService } from '../services/browser-use-service';

export function initializeBrowserUseHandlers(): void {
  const service = getBrowserUseService();

  // Start Browser-Use service
  ipcMain.handle('browser-use:start', async () => {
    console.log('🚀 Starting Browser-Use service...');
    const success = await service.start();
    return { success };
  });

  // Stop Browser-Use service
  ipcMain.handle('browser-use:stop', async () => {
    console.log('🛑 Stopping Browser-Use service...');
    await service.stop();
    return { success: true };
  });

  // Health check
  ipcMain.handle('browser-use:health', async () => {
    const healthy = await service.healthCheck();
    return { healthy };
  });

  // Get service status
  ipcMain.handle('browser-use:status', async () => {
    const status = await service.getStatus();
    return status;
  });

  // Run a task on a profile
  ipcMain.handle('browser-use:run-task', async (_event, request: {
    profileId: string;
    cdpUrl: string;
    task: string;
    llmProvider?: 'google' | 'anthropic';  // Only free Google and paid Anthropic
    model?: string;
    maxSteps?: number;
    useVision?: boolean;
  }) => {
    console.log(`🤖 Running Browser-Use task on profile ${request.profileId}`);
    console.log(`   Task: ${request.task.substring(0, 100)}...`);
    
    const result = await service.runTask(request);
    
    if (result.success) {
      console.log(`✅ Task completed successfully`);
    } else {
      console.error(`❌ Task failed: ${result.error}`);
    }
    
    return result;
  });

  // Connect agent to profile (persistent)
  ipcMain.handle('browser-use:connect', async (_event, profileId: string, cdpUrl: string, llmProvider?: string) => {
    console.log(`🔗 Connecting Browser-Use agent to profile ${profileId}`);
    const success = await service.connectToProfile(profileId, cdpUrl, llmProvider);
    return { success };
  });

  // Disconnect agent from profile
  ipcMain.handle('browser-use:disconnect', async (_event, profileId: string) => {
    console.log(`🔌 Disconnecting Browser-Use agent from profile ${profileId}`);
    const success = await service.disconnectProfile(profileId);
    return { success };
  });

  console.log('✅ Browser-Use IPC handlers initialized');
}

export function cleanupBrowserUseHandlers(): void {
  cleanupBrowserUseService();
  
  // Remove handlers
  ipcMain.removeHandler('browser-use:start');
  ipcMain.removeHandler('browser-use:stop');
  ipcMain.removeHandler('browser-use:health');
  ipcMain.removeHandler('browser-use:status');
  ipcMain.removeHandler('browser-use:run-task');
  ipcMain.removeHandler('browser-use:connect');
  ipcMain.removeHandler('browser-use:disconnect');
  
  console.log('🧹 Browser-Use handlers cleaned up');
}
