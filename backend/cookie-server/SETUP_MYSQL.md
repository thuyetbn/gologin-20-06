# 🗄️ HƯỚNG DẪN SETUP MYSQL CHO COOKIE SERVER

Hướng dẫn chi tiết để setup Cookie Server với MySQL database.

## **📋 YÊU CẦU HỆ THỐNG**

### **MySQL Server**
- MySQL 8.0+ hoặc MariaDB 10.5+
- Tối thiểu 1GB RAM
- 10GB dung lượng ổ cứng

### **Node.js**
- Node.js 18+ 
- npm hoặc yarn

## **🔧 BƯỚC 1: CÀI ĐẶT MYSQL**

### **Windows**
```bash
# Download MySQL từ https://dev.mysql.com/downloads/mysql/
# Hoặc sử dụng chocolatey
choco install mysql

# Hoặc sử dụng XAMPP
choco install xampp-81
```

### **macOS**
```bash
# Sử dụng Homebrew
brew install mysql

# Khởi động MySQL
brew services start mysql
```

### **Ubuntu/Debian**
```bash
# Cập nhật package list
sudo apt update

# Cài đặt MySQL
sudo apt install mysql-server

# Khởi động MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

### **CentOS/RHEL**
```bash
# Cài đặt MySQL
sudo yum install mysql-server

# Khởi động MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

## **🔐 BƯỚC 2: CẤU HÌNH MYSQL**

### **Bảo mật MySQL**
```bash
# Chạy script bảo mật
sudo mysql_secure_installation

# Thiết lập:
# - Root password: [tạo password mạnh]
# - Remove anonymous users: Y
# - Disallow root login remotely: Y
# - Remove test database: Y
# - Reload privilege tables: Y
```

### **Tạo Database và User**
```sql
-- Đăng nhập MySQL
mysql -u root -p

-- Tạo database
CREATE DATABASE cookie_server CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo user cho ứng dụng
CREATE USER 'cookie_user'@'localhost' IDENTIFIED BY 'your_strong_password';

-- Cấp quyền
GRANT ALL PRIVILEGES ON cookie_server.* TO 'cookie_user'@'localhost';

-- Nếu cần truy cập từ xa
CREATE USER 'cookie_user'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON cookie_server.* TO 'cookie_user'@'%';

-- Áp dụng thay đổi
FLUSH PRIVILEGES;

-- Thoát
EXIT;
```

## **📦 BƯỚC 3: CÀI ĐẶT DEPENDENCIES**

```bash
# Di chuyển vào thư mục cookie-server
cd backend/cookie-server

# Cài đặt dependencies
npm install

# Hoặc với yarn
yarn install
```

## **⚙️ BƯỚC 4: CẤU HÌNH ENVIRONMENT**

Tạo file `.env` trong thư mục `backend/cookie-server/`:

```bash
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=cookie_user
DB_PASSWORD=your_strong_password
DB_NAME=cookie_server
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# Server Configuration
COOKIE_SERVER_PORT=3001
COOKIE_SERVER_HOST=localhost
NODE_ENV=production

# Security
JWT_SECRET=your_jwt_secret_key_here
API_KEY_SECRET=your_api_key_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/cookie-server.log
```

## **🚀 BƯỚC 5: KHỞI CHẠY SERVER**

### **Development Mode**
```bash
# Khởi chạy với nodemon
npm run dev

# Hoặc
yarn dev
```

### **Production Mode**
```bash
# Build và khởi chạy
npm start

# Hoặc
yarn start
```

### **Với PM2 (Production)**
```bash
# Cài đặt PM2
npm install -g pm2

# Khởi chạy với PM2
pm2 start ecosystem.config.js

# Xem logs
pm2 logs cookie-server

# Restart
pm2 restart cookie-server

# Stop
pm2 stop cookie-server
```

## **🔍 BƯỚC 6: KIỂM TRA SETUP**

### **Test Database Connection**
```bash
# Chạy script test
node scripts/test-db-connection.js
```

### **Test API Endpoints**
```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/api/info

# Test với API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3001/api/profiles
```

## **📊 BƯỚC 7: MONITORING VÀ LOGS**

### **MySQL Monitoring**
```sql
-- Kiểm tra connections
SHOW PROCESSLIST;

-- Kiểm tra database size
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'cookie_server'
GROUP BY table_schema;

-- Kiểm tra tables
USE cookie_server;
SHOW TABLES;

-- Kiểm tra table structure
DESCRIBE cookies;
DESCRIBE profiles;
DESCRIBE users;
```

### **Application Logs**
```bash
# Xem logs realtime
tail -f logs/cookie-server.log

# Xem error logs
tail -f logs/error.log

# Với PM2
pm2 logs cookie-server --lines 100
```

## **🔧 TROUBLESHOOTING**

### **Lỗi Connection**
```bash
# Kiểm tra MySQL đang chạy
sudo systemctl status mysql

# Kiểm tra port
netstat -tlnp | grep :3306

# Test connection
mysql -u cookie_user -p -h localhost cookie_server
```

### **Lỗi Permission**
```sql
-- Kiểm tra user permissions
SELECT user, host FROM mysql.user WHERE user = 'cookie_user';

-- Kiểm tra database permissions
SHOW GRANTS FOR 'cookie_user'@'localhost';
```

### **Lỗi Memory**
```bash
# Kiểm tra MySQL memory usage
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"

# Tối ưu MySQL config (/etc/mysql/mysql.conf.d/mysqld.cnf)
[mysqld]
innodb_buffer_pool_size = 512M
max_connections = 100
query_cache_size = 64M
```

## **🔒 BẢO MẬT**

### **MySQL Security**
```sql
-- Đổi password user
ALTER USER 'cookie_user'@'localhost' IDENTIFIED BY 'new_strong_password';

-- Xóa user không cần thiết
DROP USER 'test_user'@'localhost';

-- Kiểm tra users
SELECT user, host, authentication_string FROM mysql.user;
```

### **Firewall**
```bash
# Ubuntu/Debian
sudo ufw allow 3306/tcp
sudo ufw allow 3001/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### **SSL/TLS**
```bash
# Tạo SSL certificates cho MySQL
sudo mysql_ssl_rsa_setup

# Cấu hình SSL trong .env
DB_SSL=true
DB_SSL_CA=/path/to/ca.pem
DB_SSL_CERT=/path/to/client-cert.pem
DB_SSL_KEY=/path/to/client-key.pem
```

## **📈 PERFORMANCE TUNING**

### **MySQL Optimization**
```sql
-- Kiểm tra slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Analyze tables
ANALYZE TABLE cookies, profiles, users, browser_history;

-- Optimize tables
OPTIMIZE TABLE cookies, profiles, users, browser_history;
```

### **Connection Pooling**
```javascript
// Trong .env
DB_CONNECTION_LIMIT=20
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
DB_IDLE_TIMEOUT=300000
```

## **🔄 BACKUP VÀ RESTORE**

### **Backup Database**
```bash
# Full backup
mysqldump -u cookie_user -p cookie_server > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup với compression
mysqldump -u cookie_user -p cookie_server | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u cookie_user -p cookie_server | gzip > $BACKUP_DIR/cookie_server_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### **Restore Database**
```bash
# Restore từ backup
mysql -u cookie_user -p cookie_server < backup_20231201_120000.sql

# Restore từ compressed backup
gunzip < backup_20231201_120000.sql.gz | mysql -u cookie_user -p cookie_server
```

## **✅ CHECKLIST SETUP**

- [ ] MySQL server đã cài đặt và chạy
- [ ] Database `cookie_server` đã tạo
- [ ] User `cookie_user` đã tạo với đúng permissions
- [ ] Dependencies đã cài đặt (`npm install`)
- [ ] File `.env` đã cấu hình đúng
- [ ] Server khởi chạy thành công
- [ ] API endpoints hoạt động
- [ ] Database connection test thành công
- [ ] Logs được ghi đúng
- [ ] Backup strategy đã setup

## **🆘 HỖ TRỢ**

Nếu gặp vấn đề, kiểm tra:

1. **Logs**: `tail -f logs/cookie-server.log`
2. **MySQL Error Log**: `/var/log/mysql/error.log`
3. **Connection**: Test với `mysql -u cookie_user -p`
4. **Ports**: `netstat -tlnp | grep :3001`
5. **Permissions**: `SHOW GRANTS FOR 'cookie_user'@'localhost';`

Server sẽ chạy tại: `http://localhost:3001`
API Documentation: `http://localhost:3001/api/docs`
