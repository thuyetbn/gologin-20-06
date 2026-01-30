# 🔐 GoLogin Manager - ThuyetBN

> Advanced Browser Profile Management Tool

---

## 📋 Tổng quan

GoLogin Manager là một công cụ quản lý profile browser mạnh mẽ, được phát triển bởi ThuyetBN. Hỗ trợ tạo và quản lý nhiều browser profile với các tính năng anti-detect tiên tiến và enhanced browser stability.

## ✨ Tính năng chính

- 🚀 **Browser Profile Management**: Tạo, quản lý và chạy browser profiles với anti-detect
- 🔧 **Enhanced Browser Stability**: Improved error handling và connection reliability
- 🌍 **Multi-Platform**: Hỗ trợ Windows, macOS, và Linux
- 📊 **Advanced Monitoring**: Real-time monitoring và logging
- 🎨 **Modern UI**: Built với Next.js, React, và Tailwind CSS

## 🏗️ Công nghệ sử dụng

<div align="center">
 <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20.x-44883e">
 <img alt="Electron" src="https://img.shields.io/badge/Electron-36.3.2-46816e">
 <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8.3-blue">
 <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15.3.3-black">
 <img alt="React" src="https://img.shields.io/badge/React-19.0.0-61DAFB">
 <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3.4.1-06B6D4">
</div>

## 🚀 Quick Start

### Windows
```bash
git clone https://github.com/thuyetbn/gologin-20-06.git
cd gologin-20-06
yarn install
yarn dev
```

### macOS
```bash
git clone https://github.com/thuyetbn/gologin-20-06.git
cd gologin-20-06
chmod +x setup-macos.sh
./setup-macos.sh
```

### Linux
```bash
git clone https://github.com/thuyetbn/gologin-20-06.git
cd gologin-20-06
yarn install
yarn build
yarn dist:linux
```

## 📚 Hướng dẫn chi tiết

- 🍎 **[macOS Build Guide](BUILD_MACOS_GUIDE.md)** - Hướng dẫn đầy đủ cho macOS
- ⚡ **[Quick Start macOS](QUICK_START_MACOS.md)** - Hướng dẫn nhanh cho macOS
- 📦 **[macOS Dependencies](MACOS_DEPENDENCIES_GUIDE.md)** - Thư viện và dependencies cho macOS

## 🛠️ Development Scripts

```bash
# Development
yarn dev                    # Start development server
yarn build                  # Build frontend + backend

# Distribution
yarn dist                   # Build for current platform
yarn dist:mac              # Build for macOS (current architecture)
yarn dist:mac:universal    # Build universal macOS (Intel + Apple Silicon)
yarn dist:mac:x64          # Build for Intel Macs only
yarn dist:mac:arm64        # Build for Apple Silicon only
yarn dist:win              # Build for Windows
yarn dist:linux            # Build for Linux

# Utilities
yarn clean                  # Clean build cache
yarn electron-rebuild      # Rebuild native modules
```

## 📦 Build Requirements

### Minimum System Requirements
- **RAM**: 8GB (khuyến nghị 16GB)
- **Storage**: 5GB dung lượng trống
- **Node.js**: 18.x hoặc 20.x
- **Yarn**: 1.22.x

### Platform Specific
- **Windows**: Windows 10 trở lên
- **macOS**: macOS 10.15 (Catalina) trở lên
- **Linux**: Ubuntu 18.04 trở lên hoặc equivalent

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
ELECTRON_IS_DEV=false
BROWSER_DOWNLOAD_PATH=./browsers
PROFILE_PATH=./profiles
DATABASE_PATH=./database.db
LOG_LEVEL=info
```

### Browser Settings
- Hỗ trợ Orbita Browser (Chrome-based)
- Auto-download và setup browser
- Enhanced stability flags cho Windows
- Port diagnostics và zombie process cleanup

## 🎯 Recent Updates

### v1.0.0 (Latest)
- ✅ Enhanced browser stability và error handling
- ✅ Added port diagnostics và zombie process cleanup for Windows
- ✅ Improved spawnBrowser method với better logging
- ✅ Improved browser startup process với retry logic
- ✅ Fixed build issues và type compatibility
- ✅ Added macOS build support với universal binary
- ✅ Added new dependencies: portfinder, is-port-reachable, node-fetch
- ✅ Removed workflow editor features to simplify the application

## 📁 Project Structure

```
gologin-20-06/
├── backend/                 # Backend services
│   ├── gologin/            # GoLogin core logic
│   ├── services/           # Application services
│   └── index.ts            # Main backend entry
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── pages/             # Next.js pages
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── assets/                 # Icons và entitlements
├── docs/                   # Documentation
└── scripts/               # Build scripts
```

## 🐛 Troubleshooting

### Common Issues
1. **Browser connection errors**: Check port availability và firewall
2. **Build failures**: Ensure correct Node.js version và dependencies
3. **Permission errors**: Run as administrator hoặc fix ownership
4. **Native module errors**: Run `yarn electron-rebuild`

### Platform Specific
- **Windows**: Disable antivirus temporarily during build
- **macOS**: Install Xcode Command Line Tools
- **Linux**: Install build-essential và other dependencies

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**ThuyetBN**
- GitHub: [@thuyetbn](https://github.com/thuyetbn)
- Email: thuyetbn@gmail.com

## 🙏 Acknowledgments

- GoLogin team for the core browser technology
- Electron community for the framework
- Next.js team for the React framework
- All contributors và testers

## 📞 Support

Có vấn đề hoặc cần hỗ trợ?
- 🐛 [Create an Issue](https://github.com/thuyetbn/gologin-20-06/issues)
- 📧 Email: thuyetbn@gmail.com
- 💬 Discussions: GitHub Discussions

---

<div align="center">
  Made with ❤️ by ThuyetBN
</div>
