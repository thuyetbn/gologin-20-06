# 🍪 Cookie Synchronization Guide

## Tổng quan

Cookie Synchronization là tính năng mới được tích hợp vào thư viện GoLogin, cho phép đồng bộ hóa cookies giữa local profile và GoLogin server một cách dễ dàng và an toàn.

## ✨ Tính năng chính

### 🔄 Bidirectional Sync
- **Upload**: Đẩy cookies từ local lên server
- **Download**: Tải cookies từ server về local
- **Full Sync**: Đồng bộ hai chiều (download + upload)

### 🔒 Bảo mật
- Mã hóa cookies trong quá trình truyền tải
- Tương thích với Chrome SQLite format
- Backup tự động trước khi download

### 📊 Monitoring
- Thông tin chi tiết về cookies local
- Tracking số lượng cookies và domains
- Lịch sử thay đổi

## 🚀 Cách sử dụng

### 1. Basic Usage

```javascript
import { GoLogin } from './backend/gologin/gologin.js';

const gologin = new GoLogin({
  token: 'your-api-token',
  profile_id: 'your-profile-id'
});

// Upload cookies to server
const uploadResult = await gologin.uploadCookies();
console.log('Uploaded:', uploadResult.cookieCount, 'cookies');

// Download cookies from server
const downloadResult = await gologin.downloadCookies();
console.log('Downloaded:', downloadResult.cookieCount, 'cookies');

// Full synchronization
const syncResult = await gologin.syncCookies({
  direction: 'both',
  backup: true
});
```

### 2. Advanced Usage

```javascript
// Get local cookies information
const cookiesInfo = await gologin.getCookiesInfo();
console.log('Local cookies:', {
  exists: cookiesInfo.exists,
  count: cookiesInfo.count,
  domains: cookiesInfo.domains,
  lastModified: cookiesInfo.lastModified
});

// Create backup before operations
const backupPath = await gologin.backupCookies();
console.log('Backup created:', backupPath);

// Sync with options
const syncResult = await gologin.syncCookies({
  direction: 'upload',    // 'upload', 'download', 'both'
  force: false,           // Force sync even if no changes
  backup: true            // Create backup before download
});
```

### 3. Integration with Browser Session

```javascript
const gologin = new GoLogin({
  token: 'your-api-token',
  profile_id: 'your-profile-id',
  uploadCookiesToServer: true,   // Auto-upload on browser close
  writeCookiesFromServer: true   // Auto-download on browser start
});

// Download latest cookies before starting
await gologin.downloadCookies();

// Start browser
const browserResult = await gologin.start();

// ... browsing session ...

// Upload cookies after browsing
await gologin.uploadCookies();

// Stop browser
await gologin.stop();
```

## 🎯 Frontend Integration

### React Component

```tsx
import { CookieSyncPanel } from '@/components/cookie-sync/cookie-sync-panel';

function MyComponent() {
  return (
    <CookieSyncPanel
      profileId="your-profile-id"
      accessToken="your-api-token"
      profilePath="/path/to/profile" // optional
    />
  );
}
```

### IPC Handlers

```javascript
// Upload cookies
const result = await window.electronAPI.invoke('cookies:upload', {
  profileId: 'profile-id',
  accessToken: 'token',
  profilePath: '/optional/path'
});

// Download cookies
const result = await window.electronAPI.invoke('cookies:download', {
  profileId: 'profile-id',
  accessToken: 'token'
});

// Full sync
const result = await window.electronAPI.invoke('cookies:sync', {
  profileId: 'profile-id',
  accessToken: 'token'
});

// Get local info
const info = await window.electronAPI.invoke('cookies:get-local-info', {
  profileId: 'profile-id'
});
```

## 📋 API Reference

### GoLogin Methods

#### `uploadCookies(options?)`
Upload cookies từ local profile lên server.

**Parameters:**
- `options` (Object, optional): Upload options

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  cookieCount: number
}
```

#### `downloadCookies(options?)`
Download cookies từ server về local profile.

**Parameters:**
- `options` (Object, optional): Download options

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  cookieCount: number
}
```

#### `syncCookies(options?)`
Đồng bộ cookies giữa local và server.

**Parameters:**
- `options.direction` (string): 'upload', 'download', hoặc 'both'
- `options.force` (boolean): Force sync ngay cả khi không có thay đổi
- `options.backup` (boolean): Tạo backup trước khi download

**Returns:**
```javascript
{
  profileId: string,
  direction: string,
  upload: Object | null,
  download: Object | null,
  success: boolean,
  error: string | null
}
```

#### `getCookiesInfo()`
Lấy thông tin về cookies local.

**Returns:**
```javascript
{
  exists: boolean,
  count: number,
  path: string,
  domains: string[],
  lastModified: Date,
  size: number
}
```

#### `backupCookies()`
Tạo backup của cookies local.

**Returns:**
```javascript
string | null  // Đường dẫn file backup hoặc null
```

### IPC Events

#### `cookies:upload`
Upload cookies to server.

#### `cookies:download`
Download cookies from server.

#### `cookies:sync`
Full synchronization.

#### `cookies:get-local-info`
Get local cookies information.

## 🔧 Configuration

### Environment Variables

```bash
# Required
GOLOGIN_API_TOKEN=your-api-token-here
GOLOGIN_PROFILE_ID=your-profile-id-here

# Optional
GOLOGIN_EXECUTABLE_PATH=/path/to/browser
```

### GoLogin Constructor Options

```javascript
const gologin = new GoLogin({
  token: 'api-token',
  profile_id: 'profile-id',
  executablePath: '/path/to/browser',
  uploadCookiesToServer: true,    // Auto-upload on close
  writeCookiesFromServer: true,   // Auto-download on start
  tmpdir: '/custom/temp/dir'      // Custom temp directory
});
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "No cookies found in local profile"
- Đảm bảo profile đã được sử dụng và có cookies
- Kiểm tra đường dẫn profile có đúng không
- Verify cookies file tồn tại: `Default/Network/Cookies`

#### 2. "Failed to upload cookies"
- Kiểm tra API token có hợp lệ không
- Verify network connection
- Check profile permissions

#### 3. "Download failed"
- Kiểm tra profile ID có đúng không
- Verify server có cookies cho profile này không
- Check API token permissions

### Debug Mode

```javascript
// Enable debug logging
process.env.DEBUG = 'gologin*';

// Or specific cookie sync debug
process.env.DEBUG = 'gologin:cookie-sync';
```

### File Locations

```
Profile Directory Structure:
├── Default/
│   ├── Network/
│   │   └── Cookies          # SQLite database
│   ├── Preferences          # Browser preferences
│   └── Bookmarks           # Browser bookmarks
└── First Run               # First run marker
```

## 📊 Performance

### Benchmarks

- **Upload**: ~100-500 cookies/second
- **Download**: ~200-800 cookies/second
- **File Size**: ~1KB per 10 cookies
- **Memory Usage**: ~10MB for 1000 cookies

### Optimization Tips

1. **Batch Operations**: Sync nhiều profiles cùng lúc
2. **Selective Sync**: Chỉ sync khi cần thiết
3. **Backup Management**: Cleanup old backups định kỳ
4. **Network**: Sử dụng stable connection cho large syncs

## 🔮 Roadmap

### Planned Features

- [ ] **Selective Domain Sync**: Chỉ sync cookies của domains cụ thể
- [ ] **Scheduled Sync**: Tự động sync theo lịch trình
- [ ] **Conflict Resolution**: Xử lý conflicts khi cookies khác nhau
- [ ] **Compression**: Nén cookies để giảm bandwidth
- [ ] **Encryption**: End-to-end encryption cho cookies
- [ ] **Audit Log**: Tracking tất cả cookie operations

### Version History

- **v1.0.0**: Initial release với basic upload/download
- **v1.1.0**: Thêm full sync và backup features
- **v1.2.0**: Frontend integration và IPC handlers
- **v1.3.0**: Performance improvements và error handling

## 📞 Support

Nếu gặp vấn đề hoặc cần hỗ trợ:

1. Check documentation này trước
2. Xem examples trong `/backend/examples/`
3. Enable debug mode để xem logs chi tiết
4. Tạo issue với thông tin đầy đủ về lỗi

## 📄 License

Cookie Sync feature được phát triển như một phần của GoLogin library và tuân theo cùng license terms.
