# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan dự án

GoLogin Manager là ứng dụng desktop Electron để quản lý browser profile với khả năng anti-detect. Dự án sử dụng tiếng Việt trong documentation và comments.

## Các lệnh thường dùng

```bash
yarn dev                # Build backend + chạy Electron ở chế độ dev
yarn build:frontend     # Build Next.js frontend (next build src)
yarn build:backend      # Compile backend TypeScript + copy assets
yarn build              # Build cả frontend + backend
yarn dist:win           # Đóng gói Windows installer (NSIS)
yarn dist:mac           # Đóng gói macOS (DMG + ZIP)
yarn dist:linux         # Đóng gói Linux (AppImage + deb)
yarn clean              # Xóa out/, dist/, node_modules/.cache
yarn electron-rebuild   # Rebuild native modules (sqlite3) cho Electron
```

**Không có test framework.** Dự án chưa có unit test hay integration test.

## Kiến trúc

Ứng dụng Electron với 2 process:

### Main Process (backend/)
- **`backend/index.ts`** (~58KB) - Entry point chính, tạo BrowserWindow, đăng ký tất cả IPC handlers, quản lý lifecycle
- **`backend/preload.ts`** - Bridge giữa main và renderer qua `contextBridge`, expose `window.api` và `window.electronAPI`
- **`backend/enhanced-browser-service.ts`** - Service chính để launch/stop browser profiles, quản lý Orbita browser instances
- **`backend/browser-service.ts`** - Browser download, health check, backup management
- **`backend/browser-service-handlers.ts`** - IPC handler wrappers cho browser service
- **`backend/handlers/`** - IPC handlers tách riêng (cookie-handlers, browser-use-handlers)
- **`backend/gologin/`** - GoLogin core logic (JavaScript thuần, không phải TypeScript):
  - `gologin.js` - GoLogin class chính, quản lý profile lifecycle, proxy, fingerprint
  - `browser/` - Browser checker, download manager, user data manager
  - `cookies/` - Cookie import/export manager
  - `extensions/` - Extension management
  - `profile/` - Profile archiver, directories cleanup
  - `utils/http.js` - HTTP wrapper dùng `requestretry`
- **`backend/database/`** - SQLite database layer dùng Sequelize ORM
- **`backend/services/`** - Token service, browser-use service, etc.
- **`backend/python-service/`** - Tích hợp Python/browser-use cho AI automation

### Renderer Process (src/)
- Next.js 15 với **Pages Router** (không phải App Router), export static (`output: "export"`)
- Output build vào `dist/frontend/`, asset prefix `./` cho Electron file:// protocol
- UI framework: Radix UI + shadcn/ui + Tailwind CSS + Lucide icons
- Form: react-hook-form + yup validation

**Các trang chính (`src/pages/`):**
- `index.tsx` - Trang chủ
- `profiles.tsx` - Quản lý browser profiles (trang chính)
- `groups.tsx` - Quản lý nhóm profiles
- `proxies.tsx` - Quản lý proxy
- `settings.tsx` - Cài đặt ứng dụng
- `browser-download.tsx` / `browser-management.tsx` - Quản lý browser Orbita
- `cookie-sync.tsx` - Đồng bộ cookies

## IPC Communication

Frontend giao tiếp với backend qua IPC channels được định nghĩa trong `backend/preload.ts`. Các channel theo convention `domain:action`:
- `profiles:launch`, `profiles:stop`, `profiles:create`, `profiles:update`, `profiles:delete`
- `tokens:get`, `tokens:add`, `tokens:update`, `tokens:delete`
- `groups:get`, `groups:create`, `groups:update`, `groups:delete`
- `browser:get-info`, `browser:update-with-progress`
- `browser-use:start`, `browser-use:stop`, `browser-use:run-task`
- `credentials:store`, `credentials:get`, `credentials:list`

Frontend gọi IPC qua `window.api.invoke(channel, args)` (async) hoặc `window.api.send(channel, args)`.

## Lưu ý quan trọng

- **`backend/gologin/` là JavaScript thuần** (`.js`), được include trong backend tsconfig với `allowJs: true`. Đây là core GoLogin SDK, không convert sang TypeScript.
- **Backend compile**: `tsc -p backend` → output vào `dist/backend/`. Sau đó `scripts/copy-assets.js` copy thêm assets vào dist.
- **Frontend compile**: `next build src` → output vào `dist/frontend/` (static export).
- **Electron main entry**: `dist/backend/index.js` (compiled từ `backend/index.ts`).
- **Database**: SQLite file (`database.db`) ở root, dùng Sequelize ORM.
- **Token management**: GoLogin API tokens lưu trong `token.json`, managed bởi `backend/services/token-service.ts` với token rotation logic.
- **Browser automation**: Dùng cả `puppeteer-core` và `playwright-core` cho browser control.
- **Orbita Browser**: Browser Chrome-based custom, được download và quản lý bởi `BrowserService` và `BrowserChecker`.
- **`.cursor/rules/my.mdc`** chứa rules cho Laravel/PHP - **không liên quan** đến dự án này (dự án là Electron/TypeScript/Next.js).
- Backend tsconfig dùng `module: "NodeNext"` và `moduleResolution: "NodeNext"` - import paths cần file extension.
