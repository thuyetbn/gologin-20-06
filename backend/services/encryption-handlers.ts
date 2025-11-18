/**
 * 🔐 IPC Handlers for Encryption Service
 * Connects frontend UI with secure credential management
 */

import { ipcMain } from 'electron';
import { EncryptionService, SecureCredential } from './encryption-service';

let encryptionService: EncryptionService | null = null;

/**
 * Initialize Encryption Service IPC handlers
 */
export function initializeEncryptionServiceHandlers(): void {
  encryptionService = EncryptionService.getInstance();
  
  console.log('🔐 Registering Encryption Service IPC handlers...');

  // ========== CREDENTIAL MANAGEMENT ========== //

  /**
   * Store secure credential
   */
  ipcMain.handle('credentials:store', async (_event, data: {
    id: string;
    type: SecureCredential['type'];
    name: string;
    value: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      await encryptionService.storeCredential(data.id, data.type, data.name, data.value, data.metadata);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to store credential:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * Retrieve secure credential
   */
  ipcMain.handle('credentials:get', async (_event, id: string): Promise<string | null> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      return await encryptionService.getCredential(id);
    } catch (error) {
      console.error(`Failed to retrieve credential ${id}:`, error);
      return null;
    }
  });

  /**
   * List all stored credentials (without values)
   */
  ipcMain.handle('credentials:list', async (): Promise<Omit<SecureCredential, 'encryptedValue'>[]> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      return await encryptionService.listCredentials();
    } catch (error) {
      console.error('Failed to list credentials:', error);
      return [];
    }
  });

  /**
   * Update credential value
   */
  ipcMain.handle('credentials:update', async (_event, id: string, newValue: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      const success = await encryptionService.updateCredential(id, newValue);
      return { success };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to update credential ${id}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * Delete credential
   */
  ipcMain.handle('credentials:delete', async (_event, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      const success = await encryptionService.deleteCredential(id);
      return { success };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to delete credential ${id}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // ========== MIGRATION & MANAGEMENT ========== //

  /**
   * Migrate GoLogin token from plain storage to encrypted storage
   */
  ipcMain.handle('credentials:migrate-gologin', async (_event, plainToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      await encryptionService.storeCredential(
        'gologin_token',
        'gologin_token',
        'GoLogin API Token',
        plainToken,
        {
          migratedAt: new Date().toISOString(),
          source: 'electron-store'
        }
      );
      
      console.log('🔐 GoLogin token migrated to secure storage');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to migrate GoLogin token:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * Import credentials from external data
   */
  ipcMain.handle('credentials:import', async (_event, credentialsData: Array<{
    id: string;
    type: SecureCredential['type'];
    name: string;
    value: string;
    metadata?: Record<string, any>;
  }>): Promise<{ imported: number; skipped: number; errors: string[] }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      return await encryptionService.importCredentials(credentialsData);
    } catch (error) {
      console.error('Failed to import credentials:', error);
      return { imported: 0, skipped: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  });

  /**
   * Export credentials for backup (metadata only, no values)
   */
  ipcMain.handle('credentials:export', async (): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      const exportData = await encryptionService.exportCredentials();
      return { success: true, data: exportData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to export credentials:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // ========== VALIDATION & SECURITY ========== //

  /**
   * Validate credential file integrity
   */
  ipcMain.handle('credentials:validate', async (): Promise<{ valid: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      return await encryptionService.validateIntegrity();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to validate credentials:', errorMessage);
      return { valid: false, error: errorMessage };
    }
  });

  /**
   * Get encryption service status
   */
  ipcMain.handle('credentials:status', async (): Promise<{
    available: boolean;
    credentialCount: number;
    lastActivity?: Date;
  }> => {
    try {
      if (!encryptionService) {
        return { available: false, credentialCount: 0 };
      }
      
      const credentials = await encryptionService.listCredentials();
      const lastActivity = credentials.reduce((latest, cred) => {
        const credDate = cred.lastUsed || cred.createdAt;
        return credDate > latest ? credDate : latest;
      }, new Date(0));
      
      return {
        available: true,
        credentialCount: credentials.length,
        lastActivity: lastActivity.getTime() > 0 ? lastActivity : undefined
      };
    } catch (error) {
      console.error('Failed to get credentials status:', error);
      return { available: false, credentialCount: 0 };
    }
  });

  /**
   * Clear all credentials (emergency use only)
   */
  ipcMain.handle('credentials:clear', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      await encryptionService.clearAllCredentials();
      console.log('🔐 All credentials cleared by user request');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to clear credentials:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  // ========== UTILITY HANDLERS ========== //

  /**
   * Test encryption/decryption with sample data
   */
  ipcMain.handle('credentials:test', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!encryptionService) throw new Error('Encryption service not initialized');
      
      const testData = `Test encryption ${Date.now()}`;
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('Encryption test failed: decrypted data does not match original');
      }
      
      console.log('🔐 Encryption test passed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Encryption test failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  console.log('✅ Encryption Service IPC handlers registered');
}

/**
 * Cleanup Encryption Service resources
 */
export function cleanupEncryptionServiceHandlers(): void {
  // Remove IPC handlers
  const handlers = [
    'credentials:store',
    'credentials:get',
    'credentials:list',
    'credentials:update',
    'credentials:delete',
    'credentials:migrate-gologin',
    'credentials:import',
    'credentials:export',
    'credentials:validate',
    'credentials:status',
    'credentials:clear',
    'credentials:test'
  ];

  handlers.forEach(handler => {
    ipcMain.removeAllListeners(handler);
  });

  console.log('🛑 Encryption Service IPC handlers cleaned up');
}

/**
 * Get current encryption service instance (for internal use)
 */
export function getEncryptionServiceInstance(): EncryptionService | null {
  return encryptionService;
} 