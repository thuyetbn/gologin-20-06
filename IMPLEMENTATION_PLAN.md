# 🚀 Implementation Plan - Step by Step

## 📅 **Timeline Overview**

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Setup & Utilities | 2-3 days | 🔄 Ready |
| Phase 2: Token Management | 1-2 days | ⏳ Pending |
| Phase 3: Handler Refactoring | 3-4 days | ⏳ Pending |
| Phase 4: Testing & Cleanup | 2-3 days | ⏳ Pending |
| **Total** | **8-12 days** | |

---

## 📋 **Phase 1: Setup & Utilities (Days 1-3)**

### **Day 1: Project Setup**

#### **Morning: Install Dependencies**
```bash
# Install required packages
yarn add winston zod
yarn add -D @types/winston

# Create directory structure
mkdir backend/handlers
mkdir backend/utils
mkdir backend/__tests__
```

#### **Afternoon: Create Utility Files**

**Task 1.1: Create Logger** ✅
```bash
# Create file
touch backend/utils/logger.ts
```
- Copy code from `REFACTORING_GUIDE.md` section "File: backend/utils/logger.ts"
- Test: `yarn build:backend`
- Verify: Check logs directory created

**Task 1.2: Create Validation** ✅
```bash
touch backend/utils/validation.ts
```
- Copy code from `REFACTORING_GUIDE.md`
- Test validation schemas with sample data
- Verify: No TypeScript errors

**Task 1.3: Create Error Handler** ✅
```bash
touch backend/utils/error-handler.ts
```
- Copy code from `REFACTORING_GUIDE.md`
- Test error classes
- Verify: Error handling works

**Task 1.4: Create Retry Utility** ✅
```bash
touch backend/utils/retry.ts
```
- Copy code from `REFACTORING_GUIDE.md`
- Test retry logic
- Verify: Exponential backoff works

---

### **Day 2: Handler Files - Part 1**

#### **Morning: Group Handlers**

**Task 2.1: Create Group Handlers** ✅
```bash
touch backend/handlers/group-handlers.ts
```
- Copy code from `REFACTORING_GUIDE.md`
- Import logger, validation, error-handler
- Test: Build and verify no errors

**Task 2.2: Create Proxy Handlers** ✅
```bash
touch backend/handlers/proxy-handlers.ts
```

**Code:**
```typescript
import { ipcMain } from 'electron';
import store from '../store';
import { logger } from '../utils/logger';
import { handleIpcError } from '../utils/error-handler';
import { ProxySchema } from '../utils/validation';
import { z } from 'zod';

export function registerProxyHandlers() {
  // Get all proxies
  ipcMain.handle("proxies:get", async () => {
    try {
      return store.get("proxies", []);
    } catch (error) {
      logger.error('Error loading proxies:', error);
      return handleIpcError(error);
    }
  });

  // Set proxies
  ipcMain.handle("proxies:set", async (_event, proxies) => {
    try {
      // Validate array of proxies
      const ProxyArraySchema = z.array(ProxySchema);
      const validated = ProxyArraySchema.parse(proxies);
      
      store.set("proxies", validated);
      logger.info(`Updated ${validated.length} proxies`);
      return { success: true };
    } catch (error) {
      logger.error('Error setting proxies:', error);
      return handleIpcError(error);
    }
  });

  logger.info('✅ Proxy handlers registered');
}

export function unregisterProxyHandlers() {
  ipcMain.removeHandler("proxies:get");
  ipcMain.removeHandler("proxies:set");
  logger.info('✅ Proxy handlers unregistered');
}
```

**Task 2.3: Create Settings Handlers** ✅
```bash
touch backend/handlers/settings-handlers.ts
```

**Code:**
```typescript
import { ipcMain } from 'electron';
import store from '../store';
import { logger } from '../utils/logger';
import { handleIpcError } from '../utils/error-handler';
import { SettingsSchema } from '../utils/validation';

export function registerSettingsHandlers() {
  // Get settings
  ipcMain.handle("settings:get", async () => {
    try {
      return store.get();
    } catch (error) {
      logger.error('Error loading settings:', error);
      return handleIpcError(error);
    }
  });

  // Set settings
  ipcMain.handle("settings:set", async (_event, settings) => {
    try {
      const validated = SettingsSchema.parse(settings);
      store.set(validated);
      logger.info('Settings updated');
      return { success: true };
    } catch (error) {
      logger.error('Error setting settings:', error);
      return handleIpcError(error);
    }
  });

  logger.info('✅ Settings handlers registered');
}

export function unregisterSettingsHandlers() {
  ipcMain.removeHandler("settings:get");
  ipcMain.removeHandler("settings:set");
  logger.info('✅ Settings handlers unregistered');
}
```

---

### **Day 3: Handler Files - Part 2**

#### **Morning: Profile Handlers (Complex)**

**Task 3.1: Create Profile Handlers Skeleton** ✅
```bash
touch backend/handlers/profile-handlers.ts
```
- Copy basic structure from `REFACTORING_GUIDE.md`
- Don't implement full logic yet (will use GoLoginService later)
- Just create handler registration structure

**Task 3.2: Test Current Setup** ✅
```bash
yarn build:backend
```
- Verify all files compile
- Check for TypeScript errors
- Fix any import issues

---

## 📋 **Phase 2: Token Management (Days 4-5)**

### **Day 4: Token Manager**

**Task 4.1: Create Token Manager** ✅
```bash
touch backend/services/token-manager.ts
```
- Copy code from `REFACTORING_GUIDE.md`
- Integrate with EncryptionService
- Test token rotation logic

**Task 4.2: Migrate Existing Tokens** ✅
```typescript
// Create migration script
touch backend/scripts/migrate-tokens.ts
```

**Code:**
```typescript
import { TokenManager } from '../services/token-manager';

const EXISTING_TOKENS = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
];

async function migrateTokens() {
  const tokenManager = TokenManager.getInstance();
  
  for (let i = 0; i < EXISTING_TOKENS.length; i++) {
    await tokenManager.addToken(EXISTING_TOKENS[i], `Token ${i + 1}`);
  }
  
  console.log('✅ Tokens migrated successfully');
}

migrateTokens().catch(console.error);
```

**Task 4.3: Update GoLoginService** ✅
- Modify `backend/services/gologin-service.ts`
- Replace hardcoded token with TokenManager
- Test token rotation

---

### **Day 5: Token Management UI (Optional)**

**Task 5.1: Create Token IPC Handlers** ✅
```bash
touch backend/handlers/token-handlers.ts
```

**Code:**
```typescript
import { ipcMain } from 'electron';
import { TokenManager } from '../services/token-manager';
import { logger } from '../utils/logger';
import { handleIpcError } from '../utils/error-handler';

const tokenManager = TokenManager.getInstance();

export function registerTokenHandlers() {
  // Get token count
  ipcMain.handle("tokens:count", async () => {
    try {
      return { success: true, count: tokenManager.getTokenCount() };
    } catch (error) {
      return handleIpcError(error);
    }
  });

  // Add token
  ipcMain.handle("tokens:add", async (_event, token: string, name: string) => {
    try {
      await tokenManager.addToken(token, name);
      logger.info(`Token added: ${name}`);
      return { success: true };
    } catch (error) {
      return handleIpcError(error);
    }
  });

  // Remove token
  ipcMain.handle("tokens:remove", async (_event, index: number) => {
    try {
      await tokenManager.removeToken(index);
      logger.info(`Token removed at index: ${index}`);
      return { success: true };
    } catch (error) {
      return handleIpcError(error);
    }
  });

  logger.info('✅ Token handlers registered');
}
```

---

## 📋 **Phase 3: Handler Refactoring (Days 6-8)**

### **Day 6: Update GoLoginService Integration**

**Task 6.1: Fix GoLoginService Imports** ✅
- Update `backend/services/gologin-service.ts`
- Add TokenManager integration
- Fix retry logic to use new utility

**Task 6.2: Implement Profile Handlers** ✅
- Complete `backend/handlers/profile-handlers.ts`
- Use GoLoginService for all operations
- Test each handler individually

---

### **Day 7: Refactor Main index.ts**

**Task 7.1: Backup Current index.ts** ✅
```bash
cp backend/index.ts backend/index.ts.backup
```

**Task 7.2: Create New index.ts** ✅
- Copy structure from `REFACTORING_GUIDE.md`
- Import all handler registration functions
- Remove old IPC handler code
- Keep only app initialization logic

**Task 7.3: Test All Functionality** ✅
```bash
yarn build:backend
yarn dev
```
- Test profile creation
- Test profile launch
- Test group CRUD
- Test proxy management
- Test settings

---

### **Day 8: Cleanup & Optimization**

**Task 8.1: Remove Duplicate Code** ✅
- Remove old retry functions from index.ts
- Remove hardcoded tokens
- Clean up unused imports

**Task 8.2: Update Exports** ✅
```typescript
// backend/handlers/index.ts
export * from './profile-handlers';
export * from './group-handlers';
export * from './proxy-handlers';
export * from './settings-handlers';
export * from './token-handlers';
```

**Task 8.3: Final Build & Test** ✅
```bash
yarn build:backend
yarn build:frontend
yarn build
```

---

## 📋 **Phase 4: Testing & Documentation (Days 9-10)**

### **Day 9: Testing**

**Task 9.1: Manual Testing Checklist** ✅
- [ ] Create profile
- [ ] Launch profile
- [ ] Stop profile
- [ ] Update profile
- [ ] Delete profile
- [ ] Export cookies
- [ ] Import cookies
- [ ] Create group
- [ ] Update group
- [ ] Delete group
- [ ] Update proxies
- [ ] Update settings
- [ ] Token rotation on API failure

**Task 9.2: Error Handling Tests** ✅
- [ ] Invalid input validation
- [ ] Network errors
- [ ] Database errors
- [ ] File system errors

---

### **Day 10: Documentation & Cleanup**

**Task 10.1: Update README** ✅
- Document new structure
- Add development guide
- Add troubleshooting section

**Task 10.2: Code Review** ✅
- Check for console.log → logger
- Check for any types
- Check for missing error handling
- Check for unused imports

**Task 10.3: Performance Check** ✅
- Measure query times
- Check memory usage
- Verify no memory leaks

---

## ✅ **Success Checklist**

- [ ] All utilities created and tested
- [ ] All handlers created and registered
- [ ] TokenManager implemented and working
- [ ] GoLoginService integrated
- [ ] index.ts refactored (< 300 lines)
- [ ] All features working
- [ ] No hardcoded tokens
- [ ] Proper error handling
- [ ] Logging implemented
- [ ] Input validation working
- [ ] Build successful
- [ ] Manual testing passed
- [ ] Documentation updated

---

## 🎯 **Next Steps After Completion**

1. **Add Unit Tests** (Week 2)
2. **Performance Optimization** (Week 3)
3. **Database Migrations** (Week 4)
4. **CI/CD Setup** (Week 5)

---

**Ready to start? Begin with Phase 1, Day 1!** 🚀
