import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
  authTag: string;
}

export interface SecureCredential {
  id: string;
  type: 'gologin_token' | 'proxy_password' | 'api_key' | 'other';
  name: string;
  encryptedValue: EncryptedData;
  createdAt: Date;
  lastUsed?: Date;
  metadata?: Record<string, any>;
}

/**
 * 🔐 Encryption Service - Secure credential storage with AES-256-GCM
 * Provides secure storage for sensitive data like API tokens, passwords, etc.
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly saltLength = 32; // 256 bits
  // private readonly tagLength = 16;  // 128 bits (reserved for future use)
  private credentialsFile: string;

  private constructor() {
    this.credentialsFile = join(app.getPath('userData'), 'secure-credentials.enc');
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate encryption key from master password + salt
   */
  private async deriveKey(masterPassword: string, salt: Buffer): Promise<Buffer> {
    return scryptAsync(masterPassword, salt, this.keyLength) as Promise<Buffer>;
  }

  /**
   * Get machine-specific master password
   */
  private getMasterPassword(): string {
    // Use machine-specific identifier + app name for master password
    const machineId = require('os').hostname() + require('os').userInfo().username;
    const appName = app.getName();
    return `${appName}-${machineId}-encryption-key`;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    try {
      const masterPassword = this.getMasterPassword();
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);
      
      // Derive key from master password + salt
      const key = await this.deriveKey(masterPassword, salt);
      
      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const masterPassword = this.getMasterPassword();
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // Derive key from master password + salt
      const key = await this.deriveKey(masterPassword, salt);
      
      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store encrypted credential securely
   */
  async storeCredential(
    id: string,
    type: SecureCredential['type'],
    name: string,
    value: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const encryptedValue = await this.encrypt(value);
      
      const credential: SecureCredential = {
        id,
        type,
        name,
        encryptedValue,
        createdAt: new Date(),
        metadata
      };
      
      // Load existing credentials
      const credentials = await this.loadCredentials();
      
      // Update or add credential
      const existingIndex = credentials.findIndex(c => c.id === id);
      if (existingIndex >= 0) {
        credentials[existingIndex] = credential;
      } else {
        credentials.push(credential);
      }
      
      // Save credentials
      await this.saveCredentials(credentials);
      
      console.log(`🔐 Credential '${name}' stored securely with ID: ${id}`);
    } catch (error) {
      throw new Error(`Failed to store credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and decrypt credential
   */
  async getCredential(id: string): Promise<string | null> {
    try {
      const credentials = await this.loadCredentials();
      const credential = credentials.find(c => c.id === id);
      
      if (!credential) {
        return null;
      }
      
      // Update last used timestamp
      credential.lastUsed = new Date();
      await this.saveCredentials(credentials);
      
      // Decrypt and return value
      const decryptedValue = await this.decrypt(credential.encryptedValue);
      console.log(`🔐 Credential '${credential.name}' retrieved securely`);
      
      return decryptedValue;
    } catch (error) {
      console.error(`Failed to retrieve credential ${id}:`, error);
      return null;
    }
  }

  /**
   * List all stored credentials (without decrypting values)
   */
  async listCredentials(): Promise<Omit<SecureCredential, 'encryptedValue'>[]> {
    try {
      const credentials = await this.loadCredentials();
      return credentials.map(({ encryptedValue, ...rest }) => rest);
    } catch (error) {
      console.error('Failed to list credentials:', error);
      return [];
    }
  }

  /**
   * Delete credential by ID
   */
  async deleteCredential(id: string): Promise<boolean> {
    try {
      const credentials = await this.loadCredentials();
      const filteredCredentials = credentials.filter(c => c.id !== id);
      
      if (filteredCredentials.length === credentials.length) {
        return false; // Credential not found
      }
      
      await this.saveCredentials(filteredCredentials);
      console.log(`🔐 Credential with ID '${id}' deleted securely`);
      return true;
    } catch (error) {
      console.error(`Failed to delete credential ${id}:`, error);
      return false;
    }
  }

  /**
   * Update credential value
   */
  async updateCredential(id: string, newValue: string): Promise<boolean> {
    try {
      const credentials = await this.loadCredentials();
      const credentialIndex = credentials.findIndex(c => c.id === id);
      
      if (credentialIndex < 0) {
        return false; // Credential not found
      }
      
      const credential = credentials[credentialIndex];
      credential.encryptedValue = await this.encrypt(newValue);
      credential.lastUsed = new Date();
      
      await this.saveCredentials(credentials);
      console.log(`🔐 Credential '${credential.name}' updated securely`);
      return true;
    } catch (error) {
      console.error(`Failed to update credential ${id}:`, error);
      return false;
    }
  }

  /**
   * Load credentials from encrypted file
   */
  private async loadCredentials(): Promise<SecureCredential[]> {
    try {
      await fs.access(this.credentialsFile);
      const encryptedFileData = await fs.readFile(this.credentialsFile, 'utf8');
      
      if (!encryptedFileData.trim()) {
        return [];
      }
      
      const fileEncryptedData: EncryptedData = JSON.parse(encryptedFileData);
      const decryptedData = await this.decrypt(fileEncryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      console.error('Failed to load credentials:', error);
      return [];
    }
  }

  /**
   * Save credentials to encrypted file
   */
  private async saveCredentials(credentials: SecureCredential[]): Promise<void> {
    try {
      const credentialsJson = JSON.stringify(credentials, null, 2);
      const encryptedData = await this.encrypt(credentialsJson);
      const encryptedFileData = JSON.stringify(encryptedData, null, 2);
      
      await fs.writeFile(this.credentialsFile, encryptedFileData, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import credentials from another system (with validation)
   */
  async importCredentials(
    credentialsData: Array<{
      id: string;
      type: SecureCredential['type'];
      name: string;
      value: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const cred of credentialsData) {
      try {
        // Validate credential data
        if (!cred.id || !cred.name || !cred.value || !cred.type) {
          errors.push(`Invalid credential data: ${cred.id || 'unknown'}`);
          skipped++;
          continue;
        }
        
        // Check if credential already exists
        const existing = await this.getCredential(cred.id);
        if (existing) {
          errors.push(`Credential already exists: ${cred.id}`);
          skipped++;
          continue;
        }
        
        // Store credential
        await this.storeCredential(cred.id, cred.type, cred.name, cred.value, cred.metadata);
        imported++;
      } catch (error) {
        errors.push(`Failed to import ${cred.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }
    }
    
    return { imported, skipped, errors };
  }

  /**
   * Export credentials (encrypted) for backup
   */
  async exportCredentials(): Promise<string> {
    try {
      const credentials = await this.loadCredentials();
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        version: '1.0',
        credentials: credentials.map(({ encryptedValue, ...rest }) => rest) // Don't export encrypted values
      }, null, 2);
    } catch (error) {
      throw new Error(`Failed to export credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credential file integrity
   */
  async validateIntegrity(): Promise<{ valid: boolean; error?: string }> {
    try {
      const credentials = await this.loadCredentials();
      
      // Basic validation
      if (!Array.isArray(credentials)) {
        return { valid: false, error: 'Invalid credentials format' };
      }
      
      // Validate each credential structure
      for (const cred of credentials) {
        if (!cred.id || !cred.type || !cred.name || !cred.encryptedValue) {
          return { valid: false, error: `Invalid credential structure: ${cred.id || 'unknown'}` };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear all credentials (use with caution)
   */
  async clearAllCredentials(): Promise<void> {
    try {
      await fs.unlink(this.credentialsFile);
      console.log('🔐 All credentials cleared securely');
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw new Error(`Failed to clear credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
} 