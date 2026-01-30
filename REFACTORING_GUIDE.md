# 🔨 Backend Refactoring Guide

## 📌 **Quick Start**

Đây là hướng dẫn chi tiết để refactor backend theo từng bước cụ thể.

---

## 🎯 **Step 1: Create Modular Structure**

### **1.1 Create Handler Files**

#### **File: `backend/handlers/profile-handlers.ts`**
```typescript
import { ipcMain } from 'electron';
import { GoLoginService } from '../services/gologin-service';
import { getDatabase } from '../database';
import { logger } from '../utils/logger';
import { handleIpcError } from '../utils/error-handler';
import { ProfileSchema } from '../utils/validation';

const goLoginService = new GoLoginService();

export function registerProfileHandlers() {
  // Get all profiles
  ipcMain.handle("profiles:get", async () => {
    try {
      const { Profile } = await getDatabase();
      return await Profile.findAll({ raw: true, nest: true });
    } catch (error) {
      logger.error('Error loading profiles:', error);
      return handleIpcError(error);
    }
  });

  // Create profile
  ipcMain.handle("profiles:create", async (_event, profileData) => {
    try {
      // Validate input
      const validated = ProfileSchema.parse(profileData);
      
      // Use service
      const result = await goLoginService.createProfile(validated);
      
      logger.info(`Profile created: ${result.profileId}`);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Error creating profile:', error);
      return handleIpcError(error);
    }
  });

  // Launch profile
  ipcMain.handle("profiles:launch", async (_event, profileId: string) => {
    try {
      const result = await goLoginService.launchProfile(profileId);
      logger.info(`Profile launched: ${profileId}`);
      return { success: true, data: result };
    } catch (error) {
      logger.error(`Error launching profile ${profileId}:`, error);
      return handleIpcError(error);
    }
  });

  // Stop profile
  ipcMain.handle("profiles:stop", async (_event, profileId: string) => {
    try {
      await goLoginService.stopProfile(profileId);
      logger.info(`Profile stopped: ${profileId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error stopping profile ${profileId}:`, error);
      return handleIpcError(error);
    }
  });

  // Update profile
  ipcMain.handle("profiles:update", async (_event, profileData) => {
    try {
      const validated = ProfileSchema.partial().parse(profileData);
      const result = await goLoginService.updateProfile(validated);
      logger.info(`Profile updated: ${profileData.Id}`);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Error updating profile:', error);
      return handleIpcError(error);
    }
  });

  // Delete profile
  ipcMain.handle("profiles:delete", async (_event, profileId: string) => {
    try {
      await goLoginService.deleteProfile(profileId);
      logger.info(`Profile deleted: ${profileId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error deleting profile ${profileId}:`, error);
      return handleIpcError(error);
    }
  });

  // Export cookies
  ipcMain.handle("profiles:exportCookie", async (_event, profileId: string) => {
    try {
      const cookies = await goLoginService.exportCookies(profileId);
      return { success: true, data: cookies };
    } catch (error) {
      logger.error(`Error exporting cookies for ${profileId}:`, error);
      return handleIpcError(error);
    }
  });

  // Import cookies
  ipcMain.handle("profiles:importCookie", async (_event, profileId: string, cookiesJson: string) => {
    try {
      await goLoginService.importCookies(profileId, cookiesJson);
      logger.info(`Cookies imported for profile: ${profileId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error importing cookies for ${profileId}:`, error);
      return handleIpcError(error);
    }
  });

  logger.info('✅ Profile handlers registered');
}

export function unregisterProfileHandlers() {
  const handlers = [
    "profiles:get",
    "profiles:create",
    "profiles:launch",
    "profiles:stop",
    "profiles:update",
    "profiles:delete",
    "profiles:exportCookie",
    "profiles:importCookie"
  ];

  handlers.forEach(handler => {
    ipcMain.removeHandler(handler);
  });

  logger.info('✅ Profile handlers unregistered');
}
```

---

#### **File: `backend/handlers/group-handlers.ts`**
```typescript
import { ipcMain } from 'electron';
import { getDatabase } from '../database';
import { logger } from '../utils/logger';
import { handleIpcError } from '../utils/error-handler';
import { GroupSchema } from '../utils/validation';

export function registerGroupHandlers() {
  // Get all groups
  ipcMain.handle("groups:get", async () => {
    try {
      const { Group } = await getDatabase();
      return await Group.findAll({ raw: true });
    } catch (error) {
      logger.error('Error loading groups:', error);
      return handleIpcError(error);
    }
  });

  // Create group
  ipcMain.handle("groups:create", async (_event, groupData) => {
    try {
      const validated = GroupSchema.parse(groupData);
      const { Group } = await getDatabase();
      const group = await Group.create(validated);
      logger.info(`Group created: ${group.get('Id')}`);
      return { success: true, data: group.toJSON() };
    } catch (error) {
      logger.error('Error creating group:', error);
      return handleIpcError(error);
    }
  });

  // Update group
  ipcMain.handle("groups:update", async (_event, groupData) => {
    try {
      const { Id, ...data } = groupData;
      const validated = GroupSchema.partial().parse(data);
      const { Group } = await getDatabase();
      const result = await Group.update(validated, { where: { Id } });
      logger.info(`Group updated: ${Id}`);
      return { success: true, updated: result[0] > 0 };
    } catch (error) {
      logger.error('Error updating group:', error);
      return handleIpcError(error);
    }
  });

  // Delete group
  ipcMain.handle("groups:delete", async (_event, groupId: number) => {
    try {
      const { Group } = await getDatabase();
      const result = await Group.destroy({ where: { Id: groupId } });
      logger.info(`Group deleted: ${groupId}`);
      return { success: true, deleted: result > 0 };
    } catch (error) {
      logger.error('Error deleting group:', error);
      return handleIpcError(error);
    }
  });

  logger.info('✅ Group handlers registered');
}

export function unregisterGroupHandlers() {
  const handlers = ["groups:get", "groups:create", "groups:update", "groups:delete"];
  handlers.forEach(handler => ipcMain.removeHandler(handler));
  logger.info('✅ Group handlers unregistered');
}
```

---

### **1.2 Create Utility Files**

#### **File: `backend/utils/logger.ts`**
```typescript
import winston from 'winston';
import { app } from 'electron';
import { join } from 'path';

const logDir = join(app.getPath('userData'), 'logs');

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'gologin-backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({
      filename: join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Create log directory if it doesn't exist
import { promises as fs } from 'fs';
fs.mkdir(logDir, { recursive: true }).catch(console.error);
```

---

#### **File: `backend/utils/validation.ts`**
```typescript
import { z } from 'zod';

// Profile validation schema
export const ProfileSchema = z.object({
  Name: z.string()
    .min(1, 'Profile name is required')
    .max(50, 'Profile name must be 50 characters or less')
    .trim(),
  GroupId: z.number().int().positive().optional(),
  JsonData: z.string().optional(),
  ProfilePath: z.string().optional(),
  S3Path: z.string().optional()
});

// Group validation schema
export const GroupSchema = z.object({
  Name: z.string()
    .min(1, 'Group name is required')
    .max(30, 'Group name must be 30 characters or less')
    .trim(),
  Sort: z.number().int().optional(),
  CreatedBy: z.number().int().optional()
});

// Proxy validation schema
export const ProxySchema = z.object({
  host: z.string().min(1, 'Proxy host is required'),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  type: z.enum(['http', 'https', 'socks4', 'socks5']).default('http')
});

// Settings validation schema
export const SettingsSchema = z.object({
  dataPath: z.string(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  autoStart: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  checkUpdates: z.boolean().optional(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  maxProfiles: z.number().int().positive().optional(),
  defaultProxy: z.string().optional(),
  backupEnabled: z.boolean().optional(),
  backupInterval: z.number().int().positive().optional()
});

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
```

---

#### **File: `backend/utils/error-handler.ts`**
```typescript
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class GoLoginApiError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'GOLOGIN_API_ERROR', 502, details);
    this.name = 'GoLoginApiError';
  }
}

export function handleIpcError(error: unknown): { success: false; error: string; code?: string; details?: any } {
  if (error instanceof AppError) {
    logger.error(`[${error.code}] ${error.message}`, { details: error.details, stack: error.stack });
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (error instanceof Error) {
    logger.error(`Unexpected error: ${error.message}`, { stack: error.stack });
    return {
      success: false,
      error: error.message
    };
  }

  logger.error('Unknown error:', error);
  return {
    success: false,
    error: 'An unknown error occurred'
  };
}
```

---

#### **File: `backend/utils/retry.ts`**
```typescript
import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponential?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    exponential = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        logger.error(`Failed after ${maxRetries} retries:`, lastError);
        throw lastError;
      }

      const delay = exponential
        ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        : baseDelay;

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: lastError.message
      });

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry with token rotation for GoLogin API
 */
export async function retryWithTokenRotation<T>(
  fn: (token: string) => Promise<T>,
  tokens: string[],
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = tokens.length, ...retryOptions } = options;
  let currentTokenIndex = 0;

  return retryWithBackoff(
    async () => {
      try {
        return await fn(tokens[currentTokenIndex]);
      } catch (error) {
        // Rotate to next token on failure
        currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
        throw error;
      }
    },
    { ...retryOptions, maxRetries }
  );
}
```

---

### **1.3 Update Main index.ts**

#### **File: `backend/index.ts` (Refactored)**
```typescript
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join } from "node:path";
import { prepareNext } from "sc-prepare-next";
import { cleanupEnhancedBrowserServiceHandlers, initializeEnhancedBrowserServiceHandlers } from "./browser-service-handlers";
import { PORT } from "./constants";
import { getDatabase } from "./database";
import store from "./store";
import { logger } from "./utils/logger";

// Import handlers
import { registerProfileHandlers, unregisterProfileHandlers } from "./handlers/profile-handlers";
import { registerGroupHandlers, unregisterGroupHandlers } from "./handlers/group-handlers";
import { registerProxyHandlers, unregisterProxyHandlers } from "./handlers/proxy-handlers";
import { registerSettingsHandlers, unregisterSettingsHandlers } from "./handlers/settings-handlers";

let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window
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

  mainWindow = win;
  win.maximize();

  if (app.isPackaged) {
    win.loadFile(join(__dirname, "..", "..", "dist", "frontend", "index.html"));
    win.setMenu(null);
  } else {
    win.loadURL(`http://localhost:${PORT}/`);
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize database at startup
 */
async function initializeCriticalServices(): Promise<void> {
  logger.info('🔌 Initializing database...');

  try {
    await getDatabase();
    logger.info('✅ Database initialized successfully');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
  }
}

/**
 * Register all IPC handlers
 */
function registerAllHandlers(): void {
  logger.info('📡 Registering IPC handlers...');

  registerProfileHandlers();
  registerGroupHandlers();
  registerProxyHandlers();
  registerSettingsHandlers();

  // Dialog handlers
  ipcMain.handle("dialog:open", async (_event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('dialog:selectFolder', async () => {
    return await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Data Directory'
    });
  });

  // Shell handlers
  ipcMain.handle('shell:openPath', async (_event, path: string) => {
    try {
      const result = await shell.openPath(path);
      return { success: !result, error: result || undefined };
    } catch (error) {
      logger.error('Failed to open path:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  logger.info('✅ All IPC handlers registered');
}

/**
 * Unregister all IPC handlers
 */
function unregisterAllHandlers(): void {
  logger.info('📡 Unregistering IPC handlers...');

  unregisterProfileHandlers();
  unregisterGroupHandlers();
  unregisterProxyHandlers();
  unregisterSettingsHandlers();

  ipcMain.removeHandler("dialog:open");
  ipcMain.removeHandler('dialog:selectFolder');
  ipcMain.removeHandler('shell:openPath');

  logger.info('✅ All IPC handlers unregistered');
}

/**
 * App initialization
 */
app.whenReady().then(async () => {
  logger.info('🚀 App ready, starting initialization...');

  // Initialize critical services
  await initializeCriticalServices();
  initializeEnhancedBrowserServiceHandlers();

  // Register IPC handlers
  registerAllHandlers();

  // Prepare frontend and create window
  await prepareNext("./src", PORT);
  createWindow();

  logger.info('✅ App window created successfully');

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * App cleanup
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    cleanupEnhancedBrowserServiceHandlers();
    unregisterAllHandlers();
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupEnhancedBrowserServiceHandlers();
  unregisterAllHandlers();
});
```

---

## 🎯 **Step 2: Implement Token Management**

#### **File: `backend/services/token-manager.ts`**
```typescript
import { EncryptionService } from './encryption-service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error-handler';

export class TokenManager {
  private static instance: TokenManager;
  private encryptionService: EncryptionService;
  private tokens: string[] = [];
  private currentTokenIndex: number = 0;

  private constructor() {
    this.encryptionService = EncryptionService.getInstance();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Load tokens from secure storage
   */
  async loadTokens(): Promise<void> {
    try {
      const credentials = await this.encryptionService.listCredentials();
      const tokenCredentials = credentials.filter(c => c.type === 'gologin_token');

      this.tokens = [];
      for (const cred of tokenCredentials) {
        const decrypted = await this.encryptionService.decrypt(cred.encryptedValue);
        this.tokens.push(decrypted);
      }

      if (this.tokens.length === 0) {
        throw new AppError('No GoLogin tokens found', 'NO_TOKENS', 404);
      }

      logger.info(`✅ Loaded ${this.tokens.length} GoLogin tokens`);
    } catch (error) {
      logger.error('Failed to load tokens:', error);
      throw error;
    }
  }

  /**
   * Get current token
   */
  getCurrentToken(): string {
    if (this.tokens.length === 0) {
      throw new AppError('No tokens available', 'NO_TOKENS', 404);
    }
    return this.tokens[this.currentTokenIndex];
  }

  /**
   * Rotate to next token
   */
  rotateToNextToken(): string {
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    logger.info(`🔄 Rotated to token ${this.currentTokenIndex + 1}/${this.tokens.length}`);
    return this.getCurrentToken();
  }

  /**
   * Reset to first token
   */
  resetRotation(): void {
    this.currentTokenIndex = 0;
  }

  /**
   * Add new token
   */
  async addToken(token: string, name: string): Promise<void> {
    const encrypted = await this.encryptionService.encrypt(token);
    await this.encryptionService.saveCredential({
      id: `gologin_token_${Date.now()}`,
      type: 'gologin_token',
      name,
      encryptedValue: encrypted,
      createdAt: new Date()
    });

    this.tokens.push(token);
    logger.info(`✅ Added new token: ${name}`);
  }

  /**
   * Remove token by index
   */
  async removeToken(index: number): Promise<void> {
    if (index < 0 || index >= this.tokens.length) {
      throw new AppError('Invalid token index', 'INVALID_INDEX', 400);
    }

    this.tokens.splice(index, 1);

    if (this.currentTokenIndex >= this.tokens.length) {
      this.currentTokenIndex = 0;
    }

    logger.info(`✅ Removed token at index ${index}`);
  }

  /**
   * Get token count
   */
  getTokenCount(): number {
    return this.tokens.length;
  }
}
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Structure** ✅
- [ ] Create `backend/handlers/` directory
- [ ] Create `backend/utils/` directory
- [ ] Create profile-handlers.ts
- [ ] Create group-handlers.ts
- [ ] Create proxy-handlers.ts
- [ ] Create settings-handlers.ts
- [ ] Create logger.ts
- [ ] Create validation.ts
- [ ] Create error-handler.ts
- [ ] Create retry.ts

### **Phase 2: Token Management** 🔄
- [ ] Create token-manager.ts
- [ ] Update GoLoginService to use TokenManager
- [ ] Remove hardcoded tokens from index.ts
- [ ] Add IPC handlers for token management UI

### **Phase 3: Refactor index.ts** 🔄
- [ ] Move all IPC handlers to handler files
- [ ] Update imports
- [ ] Test all functionality
- [ ] Remove old code

### **Phase 4: Testing** ⏳
- [ ] Test profile CRUD
- [ ] Test group CRUD
- [ ] Test browser launch/stop
- [ ] Test cookie export/import
- [ ] Test error handling
- [ ] Test token rotation

---

## 🚀 **Next Steps**

1. **Install Dependencies**:
```bash
yarn add winston zod
yarn add -D @types/winston
```

2. **Create Directory Structure**:
```bash
mkdir backend/handlers
mkdir backend/utils
```

3. **Start Refactoring**:
   - Begin with utility files (logger, validation, error-handler)
   - Then create handler files
   - Finally update index.ts

4. **Test Thoroughly**:
   - Test each handler after creation
   - Ensure no regressions

---

**Ready to start? Let me know which step you want to implement first!** 🎯

