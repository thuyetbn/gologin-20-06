# 📦 macOS Build Dependencies Guide

## 🆕 Thư viện mới được thêm vào

### Dependencies (Production)
```json
{
  "portfinder": "^1.0.32",        // Tìm port available tự động
  "is-port-reachable": "^5.0.0", // Kiểm tra port có thể kết nối được không
  "node-fetch": "^3.3.2"         // HTTP client hiện đại cho Node.js
}
```

### DevDependencies (Development)
```json
{
  "electron-rebuild": "^3.2.9"    // Rebuild native modules cho Electron
}
```

## 🔧 Scripts mới được thêm

### Build Scripts
```bash
yarn dist:mac              # Build cho architecture hiện tại
yarn dist:mac:universal    # Build universal binary (Intel + Apple Silicon)
yarn dist:mac:x64          # Build cho Intel Macs only
yarn dist:mac:arm64        # Build cho Apple Silicon only
yarn dist:win              # Build cho Windows
yarn dist:linux            # Build cho Linux
```

### Utility Scripts
```bash
yarn clean                 # Clean build cache
yarn electron-rebuild      # Rebuild native modules
```

## 📋 Chi tiết từng thư viện

### 1. portfinder (^1.0.32)
**Mục đích**: Tự động tìm port available
```javascript
import portfinder from 'portfinder';

// Tìm port từ 3000-4000
const port = await portfinder.getPortPromise({
  port: 3000,
  stopPort: 4000
});
```

### 2. is-port-reachable (^5.0.0)
**Mục đích**: Kiểm tra port có thể kết nối được không
```javascript
import isPortReachable from 'is-port-reachable';

// Kiểm tra port 8080
const isReachable = await isPortReachable(8080, { host: 'localhost' });
```

### 3. node-fetch (^3.3.2)
**Mục đích**: HTTP client hiện đại
```javascript
import fetch from 'node-fetch';

// Thay thế request library cũ
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

### 4. electron-rebuild (^3.2.9)
**Mục đích**: Rebuild native modules cho Electron
```bash
# Rebuild tất cả native modules
yarn electron-rebuild

# Rebuild với force
yarn electron-rebuild --force

# Rebuild cho specific version
yarn electron-rebuild --version=36.3.2
```

## 🏗️ Build Configuration Updates

### macOS Configuration
```json
{
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip", 
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "assets/icon.icns",
    "artifactName": "${productName}-${version}-macOS-${arch}.${ext}",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "notarize": false,
    "entitlements": "assets/entitlements.mac.plist",
    "entitlementsInherit": "assets/entitlements.mac.plist"
  }
}
```

### Files Configuration
```json
{
  "files": [
    "dist/**/*",
    "out/**/*", 
    "!dist/**/*.ts",
    "!dist/tsconfig.json",
    "!out/**/*.map"
  ]
}
```

## 🚀 Cách sử dụng

### 1. Cài đặt dependencies
```bash
# Cài đặt tất cả dependencies
yarn install

# Hoặc chạy script tự động
chmod +x install-macos-deps.sh
./install-macos-deps.sh
```

### 2. Build cho macOS
```bash
# Build cho architecture hiện tại
yarn dist:mac

# Build universal binary (khuyến nghị)
yarn dist:mac:universal

# Build cho Intel Macs
yarn dist:mac:x64

# Build cho Apple Silicon
yarn dist:mac:arm64
```

### 3. Troubleshooting
```bash
# Nếu gặp lỗi native modules
yarn electron-rebuild

# Clean và reinstall
yarn clean
yarn install

# Force rebuild
yarn electron-rebuild --force
```

## 📁 Output Files

Sau khi build thành công, bạn sẽ có:
- `out/GoLogin Manager-1.0.0-macOS-x64.dmg` - Intel version
- `out/GoLogin Manager-1.0.0-macOS-arm64.dmg` - Apple Silicon version  
- `out/GoLogin Manager-1.0.0-macOS-universal.dmg` - Universal version
- `out/GoLogin Manager-1.0.0-macOS-x64.zip` - Intel ZIP
- `out/GoLogin Manager-1.0.0-macOS-arm64.zip` - Apple Silicon ZIP

## 🔍 Kiểm tra build

```bash
# Kiểm tra file đã tạo
ls -la out/

# Test app
open "out/mac/GoLogin Manager.app"

# Mount DMG để test
hdiutil attach "out/GoLogin Manager-1.0.0-macOS-universal.dmg"
```

## ⚠️ Lưu ý quan trọng

1. **Architecture**: Universal binary sẽ chạy trên cả Intel và Apple Silicon
2. **Code Signing**: Cần Developer ID certificate để distribute
3. **Notarization**: Cần notarize app để tránh Gatekeeper warnings
4. **Entitlements**: File entitlements.mac.plist cần thiết cho hardened runtime
5. **Icons**: Cần icon.icns file trong assets folder

## 🎯 Best Practices

- Luôn build universal binary để tương thích tối đa
- Test trên cả Intel và Apple Silicon Macs
- Sử dụng electron-rebuild khi update Electron version
- Clean build cache thường xuyên
- Monitor bundle size để tối ưu performance
