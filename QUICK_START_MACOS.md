# 🍎 GoLogin Manager - Quick Start macOS

## Yêu cầu tối thiểu
- macOS 10.15 (Catalina) hoặc mới hơn
- 8GB RAM (khuyến nghị 16GB)
- 5GB dung lượng trống

## 🚀 Setup nhanh (Tự động)

```bash
# Clone project
git clone https://github.com/thuyetbn/gologin-20-06.git
cd gologin-20-06

# Chạy script setup tự động
chmod +x setup-macos.sh
./setup-macos.sh
```

## 🛠️ Setup thủ công

### 1. Cài đặt dependencies
```bash
# Cài Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Cài Node.js và Yarn
brew install node@20 yarn

# Cài Xcode Command Line Tools
xcode-select --install
```

### 2. Build project
```bash
# Install dependencies
yarn install

# Build project
yarn build
```

## 📦 Build cho Distribution

### Intel Macs
```bash
yarn dist:mac
```

### Apple Silicon (M1/M2/M3)
```bash
yarn dist:mac
```

### Universal Binary (Intel + Apple Silicon)
```bash
yarn dist:mac:universal
```

## 🎯 Output Files

Sau khi build thành công, các file sẽ có trong thư mục `out/`:

- `GoLogin Manager-1.0.0-macOS-x64.dmg` - Intel version
- `GoLogin Manager-1.0.0-macOS-arm64.dmg` - Apple Silicon version
- `GoLogin Manager-1.0.0-macOS-universal.dmg` - Universal version

## 🐛 Troubleshooting

### Lỗi Node.js version
```bash
# Sử dụng nvm để quản lý Node versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### Lỗi Python/gyp
```bash
brew install python@3.11
export PYTHON=$(which python3)
```

### Lỗi native modules
```bash
yarn electron-rebuild --force
```

### Lỗi permissions
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules
```

## 🔧 Development Commands

```bash
# Development mode
yarn dev

# Build only
yarn build

# Clean build cache
yarn clean

# Rebuild native modules
yarn electron-rebuild
```

## 📋 Checklist Build

- [ ] macOS 10.15+ ✓
- [ ] Node.js 20.x ✓
- [ ] Yarn installed ✓
- [ ] Xcode Command Line Tools ✓
- [ ] Dependencies installed ✓
- [ ] Project builds successfully ✓
- [ ] DMG file created ✓

## 🎉 Quick Test

```bash
# Test the built app
open "out/mac/GoLogin Manager.app"
```

---

**Cần hỗ trợ?** Tạo issue trên GitHub hoặc liên hệ: thuyetbn@gmail.com
