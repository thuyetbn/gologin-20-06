# 🗄️ Cookie Server với MySQL

Hệ thống Cookie Server được nâng cấp để hỗ trợ MySQL database với khả năng backup toàn bộ dữ liệu browser bao gồm cookies, lịch sử, mật khẩu đã lưu, và bookmarks.

## **🚀 QUICK START**

### **Cách 1: Sử dụng Quick Start Script (Khuyến nghị)**

```bash
# Chạy script tự động setup
./quick-start-mysql.sh

# Hoặc với bash
bash quick-start-mysql.sh
```

Script sẽ tự động:
- ✅ Kiểm tra prerequisites
- ✅ Tạo database và user
- ✅ Cài đặt dependencies
- ✅ Tạo file .env với security keys
- ✅ Khởi tạo database với sample data
- ✅ Khởi chạy server

### **Cách 2: Setup thủ công**

```bash
# 1. Cài đặt dependencies
npm install

# 2. Copy và cấu hình .env
cp .env.example .env
# Chỉnh sửa .env với thông tin MySQL của bạn

# 3. Khởi tạo database
npm run init-db

# 4. Khởi chạy server
npm start
```

### **Cách 3: Sử dụng Docker**

```bash
# Khởi chạy với Docker Compose
docker-compose -f docker-compose.mysql.yml up -d

# Xem logs
docker-compose -f docker-compose.mysql.yml logs -f

# Dừng services
docker-compose -f docker-compose.mysql.yml down
```

## **📦 CÁC TÍNH NĂNG MỚI**

### **🗄️ MySQL Database Support**
- ✅ **Full MySQL 8.0+ compatibility**
- ✅ **Connection pooling** với auto-reconnect
- ✅ **Transaction support** cho data integrity
- ✅ **Optimized indexes** cho performance
- ✅ **UTF8MB4 charset** cho Unicode support

### **🍪 Enhanced Cookie Management**
- ✅ **Bulk operations** với transaction
- ✅ **Domain-based filtering**
- ✅ **Expiration management**
- ✅ **Duplicate handling** với UPSERT

### **📚 Browser History Storage**
- ✅ **URL và title storage**
- ✅ **Visit count tracking**
- ✅ **Last visit time**
- ✅ **Search functionality**

### **🔐 Saved Passwords Management**
- ✅ **Encrypted password storage**
- ✅ **Form data preservation**
- ✅ **Usage statistics**
- ✅ **Origin URL tracking**

### **🔖 Bookmarks Organization**
- ✅ **Hierarchical folder structure**
- ✅ **URL và folder bookmarks**
- ✅ **Position tracking**
- ✅ **Date management**

### **💾 Full Backup System**
- ✅ **Complete browser data backup**
- ✅ **Selective data restore**
- ✅ **Compressed backups**
- ✅ **Automated scheduling**

## **🔧 CẤU HÌNH**

### **Database Configuration**
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=cookie_user
DB_PASSWORD=your_password
DB_NAME=cookie_server
DB_CONNECTION_LIMIT=10
```

### **Security Configuration**
```env
JWT_SECRET=your_jwt_secret_32_chars_min
API_KEY_SECRET=your_api_key_secret_32_chars
ENCRYPTION_KEY=your_32_character_encryption_key
```

### **Feature Flags**
```env
FEATURE_BROWSER_HISTORY=true
FEATURE_SAVED_PASSWORDS=true
FEATURE_BOOKMARKS=true
FEATURE_FULL_BACKUP=true
FEATURE_AUTO_SYNC=true
FEATURE_ENCRYPTION=true
```

## **📊 API ENDPOINTS**

### **Browser History**
```bash
# Lấy lịch sử duyệt web
GET /api/profiles/:id/history?limit=1000&search=github

# Upload lịch sử duyệt web
POST /api/profiles/:id/history
{
  "history": [
    {
      "url": "https://github.com",
      "title": "GitHub",
      "visitCount": 5,
      "lastVisitTime": 1640995200000
    }
  ],
  "replace": false
}
```

### **Saved Passwords**
```bash
# Lấy mật khẩu đã lưu
GET /api/profiles/:id/passwords?decrypt=false

# Upload mật khẩu
POST /api/profiles/:id/passwords
{
  "passwords": [
    {
      "originUrl": "https://example.com",
      "usernameValue": "user@example.com",
      "passwordValue": "encrypted_password",
      "timesUsed": 3
    }
  ],
  "encrypt": true
}
```

### **Bookmarks**
```bash
# Lấy bookmarks
GET /api/profiles/:id/bookmarks?parentId=null

# Upload bookmarks
POST /api/profiles/:id/bookmarks
{
  "bookmarks": [
    {
      "title": "GitHub",
      "url": "https://github.com",
      "type": "url",
      "position": 0
    }
  ]
}
```

### **Full Browser Data**
```bash
# Lấy tất cả dữ liệu
GET /api/profiles/:id/browser-data?types=cookies,history,passwords,bookmarks

# Upload tất cả dữ liệu
POST /api/profiles/:id/browser-data
{
  "cookies": [...],
  "history": [...],
  "passwords": [...],
  "bookmarks": [...],
  "replace": true
}
```

## **🔧 MANAGEMENT COMMANDS**

### **Database Management**
```bash
# Khởi tạo database
npm run init-db

# Test connection
npm run test-db

# Reset database (⚠️ XÓA TẤT CẢ DỮ LIỆU)
npm run reset-db

# Setup MySQL từ đầu
npm run setup-mysql
```

### **Server Management**
```bash
# Development mode
npm run dev

# Production mode
npm start

# Xem logs
npm run logs

# Health check
curl http://localhost:3001/health
```

### **Docker Management**
```bash
# Start all services
docker-compose -f docker-compose.mysql.yml up -d

# Start with admin tools
docker-compose -f docker-compose.mysql.yml --profile admin up -d

# Start with monitoring
docker-compose -f docker-compose.mysql.yml --profile monitoring up -d

# View logs
docker-compose -f docker-compose.mysql.yml logs -f cookie-server

# Stop services
docker-compose -f docker-compose.mysql.yml down
```

## **📈 MONITORING & PERFORMANCE**

### **Health Checks**
```bash
# Server health
curl http://localhost:3001/health

# Database health
curl http://localhost:3001/api/health/database

# API status
curl http://localhost:3001/api/info
```

### **Performance Metrics**
- **Connection pooling** với max 10-20 connections
- **Query optimization** với proper indexes
- **Bulk operations** cho large datasets
- **Memory management** với connection limits
- **Error handling** với retry logic

### **Monitoring Tools**
- **phpMyAdmin**: http://localhost:8080 (với Docker)
- **Prometheus**: http://localhost:9090 (với monitoring profile)
- **Grafana**: http://localhost:3000 (với monitoring profile)

## **🔒 BẢO MẬT**

### **Database Security**
- ✅ **Dedicated user** với limited permissions
- ✅ **Password encryption** cho sensitive data
- ✅ **SQL injection protection**
- ✅ **Connection encryption** (SSL/TLS)

### **API Security**
- ✅ **API key authentication**
- ✅ **Rate limiting**
- ✅ **CORS protection**
- ✅ **Input validation**
- ✅ **Error sanitization**

### **Data Protection**
- ✅ **AES-256 encryption** cho passwords
- ✅ **Secure key storage**
- ✅ **Data anonymization**
- ✅ **Audit logging**

## **🔄 BACKUP & RESTORE**

### **Automated Backups**
```bash
# Tạo full backup
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/profiles/$PROFILE_ID/backups

# List backups
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/profiles/$PROFILE_ID/backups

# Restore backup
curl -X POST -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/profiles/$PROFILE_ID/backups/$BACKUP_ID/restore
```

### **Database Backups**
```bash
# MySQL dump
mysqldump -u cookie_user -p cookie_server > backup.sql

# Restore
mysql -u cookie_user -p cookie_server < backup.sql

# Automated backup script
./scripts/backup-mysql.sh
```

## **🚨 TROUBLESHOOTING**

### **Common Issues**

**1. Connection Failed**
```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u cookie_user -p -h localhost cookie_server

# Check port
netstat -tlnp | grep :3306
```

**2. Permission Denied**
```sql
-- Check user permissions
SHOW GRANTS FOR 'cookie_user'@'localhost';

-- Reset permissions
GRANT ALL PRIVILEGES ON cookie_server.* TO 'cookie_user'@'localhost';
FLUSH PRIVILEGES;
```

**3. Server Won't Start**
```bash
# Check logs
tail -f logs/cookie-server.log

# Check .env file
cat .env | grep DB_

# Test database connection
npm run test-db
```

**4. API Errors**
```bash
# Check API key
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/profiles

# Check server status
curl http://localhost:3001/health

# Check logs for errors
tail -f logs/error.log
```

## **📚 EXAMPLES**

Xem thư mục `examples/` để có các ví dụ chi tiết:

- `full-browser-backup-example.js` - Backup toàn bộ dữ liệu browser
- `mysql-integration-example.js` - Tích hợp với MySQL
- `performance-test-example.js` - Test performance
- `security-example.js` - Bảo mật và encryption

## **🆘 HỖ TRỢ**

### **Logs Location**
- Server logs: `logs/cookie-server.log`
- Error logs: `logs/error.log`
- Access logs: `logs/access.log`
- MySQL logs: `/var/log/mysql/` (hoặc Docker volume)

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=true LOG_LEVEL=debug npm start

# Verbose MySQL logging
DB_DEBUG=true npm start
```

### **Contact**
- Documentation: `./SETUP_MYSQL.md`
- Examples: `./examples/`
- Issues: Check logs và error messages

---

## **✅ CHECKLIST SETUP**

- [ ] MySQL server installed và running
- [ ] Database `cookie_server` created
- [ ] User `cookie_user` created với proper permissions
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Database initialized (`npm run init-db`)
- [ ] Server started successfully
- [ ] Health check passed
- [ ] API endpoints working
- [ ] Sample data loaded
- [ ] Backup system tested

**🎉 Chúc mừng! Cookie Server với MySQL đã sẵn sàng sử dụng!**
