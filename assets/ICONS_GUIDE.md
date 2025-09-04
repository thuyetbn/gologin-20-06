# Icons Guide for GoLogin Manager

## Required Icon Files

For proper distribution on macOS, you need these icon files:

### macOS
- `icon.icns` - macOS icon bundle (required)
- `icon.png` - PNG icon 512x512 or higher

### Windows  
- `icon.ico` - Windows icon file

### Linux
- `icon.png` - PNG icon 512x512 or higher

## Creating Icons

### From PNG to ICNS (macOS)
```bash
# Convert PNG to ICNS using macOS built-in tools
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

### From PNG to ICO (Windows)
You can use online converters or tools like ImageMagick:
```bash
convert icon.png -resize 256x256 icon.ico
```

## Icon Requirements

- **Minimum size**: 512x512 pixels
- **Format**: PNG with transparency
- **Style**: Modern, clean, recognizable
- **Colors**: Should work on both light and dark backgrounds

## Current Status

Currently using placeholder icons. To add proper icons:

1. Create/obtain a 512x512 PNG icon
2. Convert to required formats using above commands
3. Place files in this `assets/` directory
4. Update `package.json` build config if needed

## Recommended Tools

- **macOS**: Built-in `sips` and `iconutil`
- **Cross-platform**: ImageMagick
- **Online**: favicon.io, icoconvert.com
- **Design**: Figma, Sketch, Adobe Illustrator
