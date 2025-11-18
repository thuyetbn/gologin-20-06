# 🏗️ Custom Cookie Server Guide

## Tổng quan

Custom Cookie Server là một giải pháp độc lập cho việc lưu trữ và đồng bộ hóa cookies, cho phép bạn có toàn quyền kiểm soát dữ liệu thay vì phụ thuộc vào GoLogin server.

## ✨ Tính năng chính

### 🔒 Bảo mật & Quyền riêng tư
- **Dữ liệu riêng tư**: Cookies được lưu trữ trên server của bạn
- **API Key authentication**: Bảo mật với API key
- **Rate limiting**: Chống spam và abuse
- **CORS protection**: Kiểm soát truy cập cross-origin

### 📊 Quản lý dữ liệu
- **SQLite database**: Lưu trữ hiệu quả và đáng tin cậy
- **Backup system**: Tự động backup và restore
- **Profile management**: Quản lý nhiều profiles
- **Sync logging**: Theo dõi tất cả operations

### ⚡ Performance
- **Caching**: Tối ưu hóa truy vấn database
- **Compression**: Giảm bandwidth
- **Batch operations**: Xử lý nhiều cookies cùng lúc
- **Connection pooling**: Quản lý kết nối hiệu quả

## 🚀 Cài đặt và Setup

### 1. Cài đặt Dependencies

```bash
cd backend/cookie-server
npm install
```

### 2. Chạy Setup Script

```bash
npm run setup
```

Setup script sẽ:
- Tạo database và tables
- Tạo admin user
- Generate API key
- Tạo file .env
- Cấu hình systemd service (Linux)

### 3. Khởi động Server

```bash
# Development mode
npm run dev

# Production mode
npm start

# With PM2
npm run pm2:start
```

### 4. Verify Installation

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test API info
curl http://localhost:3001/api/info
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Settings
COOKIE_SERVER_PORT=3001
COOKIE_SERVER_HOST=localhost
NODE_ENV=production

# Database
COOKIE_DB_PATH=/path/to/cookies.db
COOKIE_DB_BACKUP_PATH=/path/to/backups

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Performance
REQUEST_TIMEOUT=30000
BODY_LIMIT=10mb
MAX_COOKIES_PER_REQUEST=10000
```

### Database Configuration

```javascript
// config/server-config.js
export const serverConfig = {
  database: {
    path: process.env.COOKIE_DB_PATH,
    maxConnections: 10,
    busyTimeout: 30000
  },
  // ... other settings
};
```

## 📡 API Reference

### Authentication

Tất cả API endpoints yêu cầu authentication:

```bash
# Using Authorization header
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3001/api/profiles

# Using X-API-Key header
curl -H "X-API-Key: YOUR_API_KEY" \
     http://localhost:3001/api/profiles
```

### Profiles

#### Create Profile
```bash
POST /api/profiles
Content-Type: application/json

{
  "name": "My Profile",
  "description": "Test profile",
  "gologinProfileId": "gologin-profile-id",
  "settings": {}
}
```

#### Get Profile
```bash
GET /api/profiles/{profileId}
```

#### List Profiles
```bash
GET /api/profiles
```

### Cookies

#### Upload Cookies
```bash
POST /api/profiles/{profileId}/cookies
Content-Type: application/json

{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "Lax"
    }
  ],
  "replace": false
}
```

#### Download Cookies
```bash
GET /api/profiles/{profileId}/cookies?domain=example.com&limit=1000
```

#### Delete Cookies
```bash
DELETE /api/profiles/{profileId}/cookies?domain=example.com&name=session_id
```

### Backups

#### Create Backup
```bash
POST /api/profiles/{profileId}/backup
Content-Type: application/json

{
  "name": "Manual Backup"
}
```

#### List Backups
```bash
GET /api/profiles/{profileId}/backups
```

#### Restore Backup
```bash
POST /api/profiles/{profileId}/backups/{backupId}/restore
```

## 💻 Client Usage

### Basic GoLogin Integration

```javascript
import { GoLogin } from './backend/gologin/gologin.js';

const gologin = new GoLogin({
  token: 'gologin-api-token',
  profile_id: 'profile-id'
});

// Configure custom server
const customServerConfig = {
  serverUrl: 'http://localhost:3001',
  apiKey: 'your-custom-server-api-key'
};

// Upload to custom server
const uploadResult = await gologin.uploadCookies({
  useCustomServer: true,
  customServerConfig
});

// Download from custom server
const downloadResult = await gologin.downloadCookies({
  useCustomServer: true,
  customServerConfig
});

// Full sync with custom server
const syncResult = await gologin.syncCookies({
  direction: 'both',
  useCustomServer: true,
  customServerConfig
});
```

### Direct Client Usage

```javascript
import { CustomCookieClient } from './backend/gologin/utils/custom-cookie-client.js';

const client = new CustomCookieClient({
  serverUrl: 'http://localhost:3001',
  apiKey: 'your-api-key'
});

// Test connection
const connectionTest = await client.testConnection();

// Create profile
const profile = await client.createProfile({
  name: 'Test Profile',
  description: 'My test profile'
});

// Upload cookies
const cookies = [
  {
    name: 'test_cookie',
    value: 'test_value',
    domain: '.example.com',
    path: '/'
  }
];

await client.uploadCookies(profile.id, cookies);

// Download cookies
const downloadedCookies = await client.downloadCookies(profile.id);
```

## 🔄 Migration từ GoLogin Server

### 1. Export Cookies từ GoLogin

```javascript
const gologin = new GoLogin({
  token: 'gologin-token',
  profile_id: 'profile-id'
});

// Download from GoLogin server
const gologinCookies = await gologin.downloadCookies();
```

### 2. Import vào Custom Server

```javascript
// Upload to custom server
await gologin.uploadCookies({
  useCustomServer: true,
  customServerConfig: {
    serverUrl: 'http://localhost:3001',
    apiKey: 'custom-server-api-key'
  }
});
```

### 3. Switch Configuration

```javascript
// Update GoLogin instance to use custom server by default
gologin.setCustomCookieServer({
  serverUrl: 'http://localhost:3001',
  apiKey: 'custom-server-api-key'
});

// All subsequent operations will use custom server
await gologin.syncCookies({
  useCustomServer: true
});
```

## 🛠️ Administration

### Admin Dashboard

Access admin dashboard tại: `http://localhost:3001/admin`

Features:
- System statistics
- User management
- Profile overview
- Sync logs
- Backup management

### CLI Commands

```bash
# View logs
npm run logs

# Create backup
npm run db:backup

# Restore backup
npm run db:restore

# Database migration
npm run db:migrate

# Health check
npm run health
```

### Monitoring

```bash
# PM2 monitoring
npm run pm2:logs
pm2 monit

# System stats
curl -H "Authorization: Bearer ADMIN_API_KEY" \
     http://localhost:3001/api/admin/stats
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  cookie-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - COOKIE_DB_PATH=/data/cookies.db
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    restart: unless-stopped
```

### Deploy Commands

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# With docker-compose
docker-compose up -d
```

## 🔒 Security Best Practices

### 1. API Key Management
- Sử dụng strong API keys (32+ characters)
- Rotate API keys định kỳ
- Không commit API keys vào code
- Sử dụng environment variables

### 2. Network Security
- Chạy server behind reverse proxy (nginx)
- Sử dụng HTTPS trong production
- Configure firewall rules
- Limit access by IP nếu cần

### 3. Database Security
- Regular backups
- Encrypt sensitive data
- Monitor access logs
- Use file permissions

### 4. Application Security
- Keep dependencies updated
- Enable rate limiting
- Validate all inputs
- Log security events

## 📊 Performance Tuning

### Database Optimization

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Optimize cache size
PRAGMA cache_size = 10000;

-- Enable foreign keys
PRAGMA foreign_keys = ON;
```

### Server Optimization

```javascript
// config/server-config.js
export const serverConfig = {
  performance: {
    requestTimeout: 30000,
    bodyLimit: '10mb',
    compressionThreshold: 1024,
    cacheTimeout: 300000 // 5 minutes
  }
};
```

### Monitoring Metrics

- Request latency
- Database query time
- Memory usage
- Disk space
- Error rates
- Active connections

## 🚨 Troubleshooting

### Common Issues

#### 1. "Database locked" Error
```bash
# Check for long-running transactions
sqlite3 cookies.db ".timeout 30000"

# Restart server if needed
npm run pm2:restart
```

#### 2. "API key invalid" Error
```bash
# Verify API key in database
sqlite3 cookies.db "SELECT * FROM users WHERE api_key = 'YOUR_KEY';"

# Generate new API key if needed
npm run setup
```

#### 3. High Memory Usage
```bash
# Check process memory
ps aux | grep node

# Restart if needed
npm run pm2:restart

# Check for memory leaks
node --inspect server.js
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=cookie-server:* npm start

# Check specific modules
DEBUG=cookie-server:database npm start
```

## 📈 Roadmap

### Planned Features

- [ ] **Multi-database support**: PostgreSQL, MySQL
- [ ] **Clustering**: Multi-instance deployment
- [ ] **Real-time sync**: WebSocket-based updates
- [ ] **Advanced analytics**: Cookie usage statistics
- [ ] **API versioning**: Backward compatibility
- [ ] **Plugin system**: Custom extensions
- [ ] **GraphQL API**: Alternative to REST
- [ ] **Kubernetes deployment**: Container orchestration

### Version History

- **v1.0.0**: Initial release với SQLite support
- **v1.1.0**: Admin dashboard và backup system
- **v1.2.0**: Performance improvements và monitoring
- **v1.3.0**: Docker support và security enhancements

## 📞 Support

Nếu gặp vấn đề:

1. Check logs: `npm run logs`
2. Verify configuration: `.env` file
3. Test connection: `npm run health`
4. Check documentation
5. Create issue với detailed information

## 📄 License

MIT License - see LICENSE file for details.
