# Hướng dẫn Build GoLogin cho macOS

## 📋 Yêu cầu hệ thống

### Phần cứng tối thiểu:
- **CPU**: Intel Core i5 hoặc Apple Silicon (M1/M2/M3)
- **RAM**: 8GB (khuyến nghị 16GB)
- **Storage**: 5GB dung lượng trống
- **macOS**: 10.15 (Catalina) trở lên

### Phần mềm cần thiết:
- **Node.js**: 18.x hoặc 20.x
- **Yarn**: 1.22.x
- **Git**: Latest version
- **Xcode Command Line Tools**

## 🛠️ Bước 1: Cài đặt Dependencies

### 1.1 Cài đặt Homebrew (nếu chưa có)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 1.2 Cài đặt Node.js và Yarn
```bash
# Cài Node.js qua Homebrew
brew install node@20

# Cài Yarn
npm install -g yarn

# Hoặc cài qua Homebrew
brew install yarn
```

### 1.3 Cài đặt Xcode Command Line Tools
```bash
xcode-select --install
```

### 1.4 Verify installations
```bash
node --version    # Should show v20.x.x
yarn --version    # Should show 1.22.x
git --version     # Should show git version
```

## 📦 Bước 2: Clone và Setup Project

### 2.1 Clone repository
```bash
git clone https://github.com/thuyetbn/gologin-20-06.git
cd gologin-20-06
```

### 2.2 Install dependencies
```bash
# Install all dependencies
yarn install

# Nếu gặp lỗi, thử force reinstall
yarn install --force
```

## 🔧 Bước 3: Configuration cho macOS

### 3.1 Update package.json cho macOS
```json
{
  "build": {
    "appId": "com.gologin.manager",
    "productName": "GoLogin Manager",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "backend/**/*",
      "!backend/**/*.ts",
      "!backend/tsconfig.json"
    ],
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
      "entitlements": "assets/entitlements.mac.plist",
      "entitlementsInherit": "assets/entitlements.mac.plist"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

### 3.2 Tạo entitlements file (cho code signing)
```bash
mkdir -p assets
```

### 3.3 Tạo file entitlements.mac.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
</dict>
</plist>
```

## 🚀 Bước 4: Build Process

### 4.1 Development build
```bash
# Start development server
yarn dev

# In another terminal, start electron
yarn electron:dev
```

### 4.2 Production build
```bash
# Build frontend và backend
yarn build

# Build electron app cho macOS
yarn dist:mac

# Hoặc build universal binary (Intel + Apple Silicon)
yarn electron-builder --mac --universal
```

### 4.3 Build commands chi tiết
```bash
# Build chỉ cho Intel Macs
yarn electron-builder --mac --x64

# Build chỉ cho Apple Silicon
yarn electron-builder --mac --arm64

# Build universal binary (khuyến nghị)
yarn electron-builder --mac --universal

# Build và publish
yarn electron-builder --mac --publish=never
```

## 📱 Bước 5: Browser Setup cho macOS

### 5.1 Download Orbita Browser cho macOS
GoLogin sử dụng Orbita browser. Cần download phiên bản macOS:

```bash
# Tạo thư mục browsers
mkdir -p browsers/mac

# Script tự động download browser sẽ được thêm vào backend
```

### 5.2 Update backend cho macOS paths
```javascript
// backend/gologin/browser/browser-checker.js
const getOrbitaPath = () => {
  if (process.platform === 'darwin') {
    return '/Applications/Orbita.app/Contents/MacOS/Orbita';
  }
  // ... other platforms
};
```

## 🔐 Bước 6: Code Signing (Optional)

### 6.1 Developer certificate
```bash
# List available certificates
security find-identity -v -p codesigning

# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name" dist/mac/GoLogin\ Manager.app
```

### 6.2 Notarization (cho App Store)
```bash
# Upload for notarization
xcrun altool --notarize-app \
  --primary-bundle-id "com.gologin.manager" \
  --username "your-apple-id@email.com" \
  --password "@keychain:AC_PASSWORD" \
  --file dist/GoLogin\ Manager-1.0.0.dmg
```

## 🐛 Troubleshooting

### Common Issues:

#### 1. Node.js version conflicts
```bash
# Use nvm to manage Node versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 2. Python/gyp build errors
```bash
# Install Python 3
brew install python@3.11

# Set Python path
export PYTHON=$(which python3)
```

#### 3. Native module compilation errors
```bash
# Rebuild native modules
yarn electron-rebuild

# Or force rebuild
yarn install --force
yarn electron-rebuild --force
```

#### 4. Permission denied errors
```bash
# Fix permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules
```

#### 5. Electron sandbox issues
```bash
# Disable security for development
export ELECTRON_DISABLE_SECURITY_WARNINGS=true
```

## 📦 Bước 7: Distribution

### 7.1 Create DMG installer
```bash
yarn electron-builder --mac --publish=never
```

### 7.2 Output files
Sau khi build thành công, bạn sẽ có:
- `dist/GoLogin Manager-1.0.0.dmg` - DMG installer
- `dist/GoLogin Manager-1.0.0-mac.zip` - ZIP package
- `dist/mac/GoLogin Manager.app` - App bundle

### 7.3 Test installation
```bash
# Mount DMG
hdiutil attach "dist/GoLogin Manager-1.0.0.dmg"

# Copy app to Applications
cp -R "/Volumes/GoLogin Manager/GoLogin Manager.app" /Applications/

# Unmount DMG
hdiutil detach "/Volumes/GoLogin Manager"
```

## 🎯 Quick Start Script

Tạo script tự động setup:

```bash
#!/bin/bash
# setup-macos.sh

echo "🍎 Setting up GoLogin for macOS..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js and Yarn
echo "Installing Node.js and Yarn..."
brew install node@20 yarn

# Install dependencies
echo "Installing project dependencies..."
yarn install

# Build project
echo "Building project..."
yarn build

# Build macOS app
echo "Building macOS application..."
yarn dist:mac

echo "✅ Build completed! Check dist/ folder for output."
```

## 📋 Final Checklist

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
yarn build && yarn dist:mac

# Check build output
ls -la dist/

# Test app locally
open "dist/mac/GoLogin Manager.app"

# Clean build cache
yarn clean && rm -rf node_modules && yarn install
```
