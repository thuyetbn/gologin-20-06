# Commit Message

## Update GoLogin SDK from v2.1.24 to v2.1.33

### Summary
Updated GoLogin SDK to latest version (v2.1.33) with 9+ bug fixes and improvements for better browser profile management, proxy handling, and error tracking.

### Changes Made

#### 1. SDK Update
- Replaced `backend/gologin/` with updated code from `backend/gologin-master/src/`
- Updated from version 2.1.24 → 2.1.33
- Copied `fonts.js` and `fonts_config/` to maintain compatibility

#### 2. Import Path Fixes
- Fixed `gologin.js`: `import { fontsCollection } from '../fonts.js'` → `'./fonts.js'`
- Fixed `browser/browser-user-data-manager.js`: `import { fontsCollection } from '../../fonts.js'` → `'../fonts.js'`
- Reason: Code structure changed from `gologin-master/src/` to `backend/gologin/`

#### 3. New Features
- Added `browser/browser-download-manager.js` - Better browser download management with lock mechanism
- Added `utils/sentry.js` - Grouped error tracking with categorization
- Improved parallel profile launch support
- Added configurable proxy check timeout

#### 4. Bug Fixes (from CHANGELOG)
- Fixed Orbita download interruption when opening 2 profiles in parallel
- Fixed custom extension downloading
- Fixed Orbita downloading when major version is skipped
- Fixed languages passing
- Fixed free proxy support on Orbita 135+
- Fixed Sync Data folder cleanup to prevent crashes
- Fixed Socks5 proxy passing
- Fixed viewport compliance with profile resolution

#### 5. Removed Files
- Removed `utils/cookie-sync-utils.js` (not in new SDK)
- Removed `utils/custom-cookie-client.js` (not in new SDK)
- Note: Cookie sync functionality still works via `backend/services/cookie-sync-service.ts`

### Testing
- ✅ Backend build: Success (3.32s)
- ✅ Frontend build: Success (20.09s)
- ✅ TypeScript compilation: No errors
- ✅ Import verification: All imports working correctly
- ✅ GoLogin class instantiation: Working

### Files Modified
- `backend/gologin/gologin.js` - Updated to v2.1.33 + import path fix
- `backend/gologin/browser/browser-user-data-manager.js` - Import path fix
- All other files in `backend/gologin/` - Updated to v2.1.33

### Documentation
- Created `GOLOGIN_UPDATE_SUMMARY.md` with detailed update information

### Breaking Changes
None - All existing code remains compatible

---

**Tested**: ✅ Build successful, imports working  
**Ready for**: Production use

