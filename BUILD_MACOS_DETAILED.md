# 🍎 Hướng dẫn Build GoLogin Manager cho macOS

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn build file `.dmg` và `.zip` để chạy GoLogin Manager trên macOS. Lưu ý rằng **build cho macOS chỉ có thể thực hiện trên macOS**, không thể build trên Windows hoặc Linux.

## 🚀 Quick Start (macOS)

### Bước 1: Clone và Setup
```bash
# Clone repository
git clone https://github.com/thuyetbn/gologin-20-06.git
cd gologin-20-06

# Chạy script setup tự động
chmod +x install-macos-deps.sh
./install-macos-deps.sh
```

### Bước 2: Build cho macOS
```bash
# Build universal binary (Intel + Apple Silicon) - KHUYẾN NGHỊ
yarn dist:mac:universal

# Hoặc build cho architecture cụ thể
yarn dist:mac:x64      # Intel Macs
yarn dist:mac:arm64    # Apple Silicon (M1/M2/M3)
```

## 🛠️ Setup thủ công

### 1. Cài đặt Dependencies
```bash
# Cài Homebrew (nếu chưa có)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Cài Node.js và Yarn
brew install node@20 yarn

# Cài Xcode Command Line Tools
xcode-select --install

# Cài thêm build tools
brew install python@3.11 cmake pkg-config
```

### 2. Setup Project
```bash
# Install dependencies
yarn install

# Rebuild native modules
yarn electron-rebuild

# Build project
yarn build
```

### 3. Build cho Distribution
```bash
# Universal binary (khuyến nghị)
yarn dist:mac:universal

# Hoặc build riêng lẻ
yarn dist:mac:x64
yarn dist:mac:arm64
```

## 📁 Output Files

Sau khi build thành công, bạn sẽ có các file trong thư mục `out/`:

### Universal Binary (Intel + Apple Silicon)
- `GoLogin Manager-1.0.0-macOS-universal.dmg` - DMG installer
- `GoLogin Manager-1.0.0-macOS-universal.zip` - ZIP package

### Intel Macs
- `GoLogin Manager-1.0.0-macOS-x64.dmg` - DMG installer
- `GoLogin Manager-1.0.0-macOS-x64.zip` - ZIP package

### Apple Silicon
- `GoLogin Manager-1.0.0-macOS-arm64.dmg` - DMG installer
- `GoLogin Manager-1.0.0-macOS-arm64.zip` - ZIP package

## 🔍 Test Build

```bash
# Kiểm tra file đã tạo
ls -la out/

# Test app
open "out/mac/GoLogin Manager.app"

# Mount DMG để test
hdiutil attach "out/GoLogin Manager-1.0.0-macOS-universal.dmg"
```

## ⚙️ Configuration

### Build Configuration (package.json)
```json
{
  "build": {
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
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "notarize": false,
      "entitlements": "assets/entitlements.mac.plist",
      "entitlementsInherit": "assets/entitlements.mac.plist"
    }
  }
}
```

### Entitlements (assets/entitlements.mac.plist)
File này cho phép app truy cập các tính năng cần thiết:
- Network access
- File system access
- Camera/microphone (cho browser testing)
- JIT compilation

## 🐛 Troubleshooting

### Lỗi thường gặp

#### 1. Node.js version conflicts
```bash
# Sử dụng nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 2. Python/gyp build errors
```bash
brew install python@3.11
export PYTHON=$(which python3)
```

#### 3. Native module compilation errors
```bash
yarn electron-rebuild --force
```

#### 4. Permission denied errors
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules
```

#### 5. Xcode Command Line Tools not found
```bash
xcode-select --install
# Hoặc
softwareupdate --all --install --force
```

### Lỗi build cụ thể

#### Build fails với "electron-builder install-app-deps"
```bash
# Chạy lại postinstall
yarn postinstall
```

#### Native modules không tương thích
```bash
# Rebuild cho đúng Electron version
yarn electron-rebuild --version=36.3.2
```

#### Hardened Runtime errors
```bash
# Kiểm tra entitlements file
cat assets/entitlements.mac.plist

# Hoặc tạm thời disable
# Trong package.json: "hardenedRuntime": false
```

## 🔐 Code Signing (Optional)

### Developer Certificate
```bash
# List available certificates
security find-identity -v -p codesigning

# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name" "out/mac/GoLogin Manager.app"
```

### Notarization (cho App Store)
```bash
# Upload for notarization
xcrun altool --notarize-app \
  --primary-bundle-id "com.thuyetbn.gologinmanager" \
  --username "your-apple-id@email.com" \
  --password "@keychain:AC_PASSWORD" \
  --file "out/GoLogin Manager-1.0.0-macOS-universal.dmg"
```

## 📦 Distribution

### Tạo DMG installer
```bash
yarn dist:mac:universal
```

### Test installation
```bash
# Mount DMG
hdiutil attach "out/GoLogin Manager-1.0.0-macOS-universal.dmg"

# Copy app to Applications
cp -R "/Volumes/GoLogin Manager/GoLogin Manager.app" /Applications/

# Unmount DMG
hdiutil detach "/Volumes/GoLogin Manager"
```

## 🎯 Best Practices

1. **Luôn build universal binary** để tương thích tối đa
2. **Test trên cả Intel và Apple Silicon Macs**
3. **Sử dụng electron-rebuild** khi update Electron version
4. **Clean build cache** thường xuyên
5. **Monitor bundle size** để tối ưu performance

## 📋 Checklist

- [ ] macOS 10.15+ installed
- [ ] Homebrew installed
- [ ] Node.js 20.x installed
- [ ] Yarn installed
- [ ] Xcode Command Line Tools installed
- [ ] Project dependencies installed
- [ ] Frontend built successfully
- [ ] Backend compiled successfully
- [ ] Electron app built successfully
- [ ] DMG installer created
- [ ] App tested and working

## 🔗 Useful Commands

```bash
# Quick development start
yarn install && yarn dev

# Full production build
yarn build && yarn dist:mac:universal

# Check build output
ls -la out/

# Test app locally
open "out/mac/GoLogin Manager.app"

# Clean build cache
yarn clean && rm -rf node_modules && yarn install
```

## ⚠️ Lưu ý quan trọng

1. **Architecture**: Universal binary sẽ chạy trên cả Intel và Apple Silicon
2. **Code Signing**: Cần Developer ID certificate để distribute
3. **Notarization**: Cần notarize app để tránh Gatekeeper warnings
4. **Entitlements**: File entitlements.mac.plist cần thiết cho hardened runtime
5. **Icons**: Cần icon.icns file trong assets folder

---

**Cần hỗ trợ?** Tạo issue trên GitHub hoặc liên hệ: thuyetbn@gmail.com
