# 🚀 HƯỚNG DẪN SETUP COOKIE SERVER TRÊN AAPANEL

Hướng dẫn chi tiết để setup Cookie Server với MySQL trên aaPanel - đơn giản và nhanh chóng.

## **📋 YÊU CẦU**

- ✅ **aaPanel** đã cài đặt
- ✅ **MySQL 5.7+** hoặc **MariaDB 10.3+** 
- ✅ **Node.js 18+** (có thể cài qua aaPanel)
- ✅ **PM2** (để quản lý process)

## **🔧 BƯỚC 1: CÀI ĐẶT MYSQL TRÊN AAPANEL**

### **1.1. Cài đặt MySQL qua aaPanel**
```bash
# Vào aaPanel Web Interface
# App Store → Database → MySQL 5.7/8.0 → Install
# Hoặc MariaDB 10.3+ → Install
```

### **1.2. Tạo Database**
```bash
# Vào aaPanel → Database → Add Database
Database Name: cookie_server
Username: cookie_user  
Password: [tạo password mạnh]
Access: localhost
```

### **1.3. Kiểm tra MySQL**
```bash
# SSH vào server
mysql -u cookie_user -p
# Nhập password và test connection
USE cookie_server;
EXIT;
```

## **🔧 BƯỚC 2: CÀI ĐẶT NODE.JS**

### **2.1. Cài Node.js qua aaPanel**
```bash
# aaPanel → App Store → Runtime → Node.js → Install
# Chọn version 18.x hoặc 20.x
```

### **2.2. Hoặc cài thủ công**
```bash
# SSH vào server
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra version
node --version
npm --version
```

### **2.3. Cài PM2**
```bash
npm install -g pm2
pm2 --version
```

## **🔧 BƯỚC 3: UPLOAD VÀ CẤU HÌNH CODE**

### **3.1. Upload code**
```bash
# Tạo thư mục trong aaPanel File Manager
# Hoặc SSH
mkdir -p /www/wwwroot/cookie-server
cd /www/wwwroot/cookie-server

# Upload code qua File Manager hoặc git
git clone [your-repo] .
# Hoặc upload zip và extract
```

### **3.2. Cài đặt dependencies**
```bash
cd /www/wwwroot/cookie-server/backend/cookie-server
npm install
```

### **3.3. Tạo file .env**
```bash
# Tạo file .env
cp .env.example .env

# Chỉnh sửa .env
nano .env
```

**Nội dung file .env:**
```env
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=cookie_user
DB_PASSWORD=your_mysql_password_here
DB_NAME=cookie_server
DB_CONNECTION_LIMIT=10

# Server Configuration  
COOKIE_SERVER_PORT=3001
COOKIE_SERVER_HOST=0.0.0.0
NODE_ENV=production

# Security (generate với: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_32_characters_here
API_KEY_SECRET=your_api_key_secret_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key

# CORS
ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/www/wwwroot/cookie-server/logs/server.log

# Features
FEATURE_BROWSER_HISTORY=true
FEATURE_SAVED_PASSWORDS=true
FEATURE_BOOKMARKS=true
FEATURE_FULL_BACKUP=true
```

## **🔧 BƯỚC 4: KHỞI TẠO DATABASE**

### **4.1. Chạy script khởi tạo**
```bash
cd /www/wwwroot/cookie-server/backend/cookie-server

# Test database connection
npm run test-db

# Khởi tạo database với sample data
npm run init-db
```

### **4.2. Kiểm tra database**
```bash
mysql -u cookie_user -p cookie_server
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM profiles;
EXIT;
```

## **🔧 BƯỚC 5: CẤU HÌNH PM2**

### **5.1. Tạo file ecosystem.config.js**
```bash
# Tạo file ecosystem.config.js
nano /www/wwwroot/cookie-server/backend/cookie-server/ecosystem.config.js
```

**Nội dung file:**
```javascript
module.exports = {
  apps: [{
    name: 'cookie-server',
    script: 'server.js',
    cwd: '/www/wwwroot/cookie-server/backend/cookie-server',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/www/wwwroot/cookie-server/logs/pm2-error.log',
    out_file: '/www/wwwroot/cookie-server/logs/pm2-out.log',
    log_file: '/www/wwwroot/cookie-server/logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### **5.2. Khởi chạy với PM2**
```bash
cd /www/wwwroot/cookie-server/backend/cookie-server

# Tạo thư mục logs
mkdir -p /www/wwwroot/cookie-server/logs

# Start với PM2
pm2 start ecosystem.config.js

# Kiểm tra status
pm2 status
pm2 logs cookie-server

# Save PM2 config
pm2 save
pm2 startup
```

## **🔧 BƯỚC 6: CẤU HÌNH NGINX (REVERSE PROXY)**

### **6.1. Tạo site trong aaPanel**
```bash
# aaPanel → Website → Add Site
Domain: your-domain.com
Document Root: /www/wwwroot/cookie-server-web
PHP Version: Pure Static
```

### **6.2. Cấu hình Nginx**
```bash
# aaPanel → Website → your-domain.com → Config → Nginx Config
```

**Thêm vào Nginx config:**
```nginx
# API Proxy
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Health check
location /health {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Direct access to port 3001 (optional)
location /direct/ {
    rewrite ^/direct/(.*) /$1 break;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### **6.3. Mở port 3001 (nếu cần truy cập trực tiếp)**
```bash
# aaPanel → Security → Firewall → Add Rule
Port: 3001
Protocol: TCP
Source: All (hoặc specific IPs)
```

## **🔧 BƯỚC 7: CẤU HÌNH SSL (HTTPS)**

### **7.1. Cài SSL qua aaPanel**
```bash
# aaPanel → Website → your-domain.com → SSL
# Chọn Let's Encrypt hoặc upload SSL certificate
# Enable Force HTTPS
```

### **7.2. Cập nhật .env cho HTTPS**
```env
# Cập nhật ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

## **🔧 BƯỚC 8: KIỂM TRA VÀ TEST**

### **8.1. Test server**
```bash
# Test local
curl http://localhost:3001/health

# Test qua domain
curl https://your-domain.com/health
curl https://your-domain.com/api/info
```

### **8.2. Test API với API key**
```bash
# Lấy API key từ database
mysql -u cookie_user -p cookie_server -e "SELECT api_key FROM users WHERE username='admin';"

# Test API
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/profiles
```

### **8.3. Kiểm tra logs**
```bash
# PM2 logs
pm2 logs cookie-server

# Application logs
tail -f /www/wwwroot/cookie-server/logs/server.log

# Nginx logs
tail -f /www/wwwlogs/your-domain.com.log
```

## **🔧 BƯỚC 9: BACKUP VÀ MONITORING**

### **9.1. Setup backup tự động**
```bash
# Tạo script backup
nano /www/wwwroot/cookie-server/backup.sh
```

**Script backup:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backup/cookie-server"
DB_USER="cookie_user"
DB_PASS="your_password"
DB_NAME="cookie_server"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /www/wwwroot/cookie-server

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### **9.2. Cron job cho backup**
```bash
# aaPanel → Cron → Add Task
# Type: Shell Script
# Script: /www/wwwroot/cookie-server/backup.sh
# Schedule: Daily at 2:00 AM
```

### **9.3. Monitoring với aaPanel**
```bash
# aaPanel → Monitoring
# Add process monitoring cho PM2
# Add port monitoring cho 3001
# Setup email alerts
```

## **🔧 MANAGEMENT COMMANDS**

### **PM2 Management**
```bash
# Xem status
pm2 status

# Restart
pm2 restart cookie-server

# Stop
pm2 stop cookie-server

# Xem logs
pm2 logs cookie-server --lines 100

# Monitor
pm2 monit
```

### **Database Management**
```bash
cd /www/wwwroot/cookie-server/backend/cookie-server

# Test connection
npm run test-db

# Reset database
npm run reset-db

# Backup database
mysqldump -u cookie_user -p cookie_server > backup.sql
```

### **Server Management**
```bash
# Check server status
curl https://your-domain.com/health

# View logs
tail -f /www/wwwroot/cookie-server/logs/server.log

# Check processes
ps aux | grep node
```

## **🚨 TROUBLESHOOTING**

### **Common Issues**

**1. Server không start**
```bash
# Check PM2 logs
pm2 logs cookie-server

# Check .env file
cat /www/wwwroot/cookie-server/backend/cookie-server/.env

# Test manual start
cd /www/wwwroot/cookie-server/backend/cookie-server
node server.js
```

**2. Database connection failed**
```bash
# Test MySQL connection
mysql -u cookie_user -p cookie_server

# Check MySQL status in aaPanel
# aaPanel → App Store → MySQL → Status

# Check database exists
mysql -u root -p -e "SHOW DATABASES;"
```

**3. API không accessible**
```bash
# Check Nginx config
nginx -t

# Check port 3001
netstat -tlnp | grep :3001

# Check firewall
iptables -L | grep 3001
```

**4. SSL issues**
```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt
# aaPanel → Website → SSL → Renew
```

## **✅ CHECKLIST HOÀN THÀNH**

- [ ] aaPanel đã cài đặt và hoạt động
- [ ] MySQL/MariaDB đã cài và tạo database
- [ ] Node.js 18+ đã cài đặt
- [ ] PM2 đã cài đặt
- [ ] Code đã upload và dependencies installed
- [ ] File .env đã cấu hình đúng
- [ ] Database đã khởi tạo thành công
- [ ] PM2 đã start server
- [ ] Nginx reverse proxy đã cấu hình
- [ ] SSL certificate đã cài đặt
- [ ] Health check API hoạt động
- [ ] Backup script đã setup
- [ ] Monitoring đã cấu hình

## **🎉 KẾT QUẢ**

Sau khi hoàn thành, bạn sẽ có:

- ✅ **Cookie Server** chạy trên `https://your-domain.com`
- ✅ **API endpoints** accessible qua `/api/`
- ✅ **Health check** tại `/health`
- ✅ **Auto-restart** với PM2
- ✅ **SSL/HTTPS** security
- ✅ **Automated backups**
- ✅ **Monitoring** qua aaPanel

**🔗 URLs:**
- API: `https://your-domain.com/api/`
- Health: `https://your-domain.com/health`
- Direct: `https://your-domain.com:3001/` (nếu mở port)

**🎯 Next Steps:**
1. Test API với GoLogin integration
2. Setup automated backups
3. Configure monitoring alerts
4. Optimize performance settings
