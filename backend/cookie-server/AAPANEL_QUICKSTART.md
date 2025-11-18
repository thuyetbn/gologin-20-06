# 🚀 COOKIE SERVER - AAPANEL QUICK START

Hướng dẫn nhanh để setup Cookie Server trên aaPanel trong 10 phút.

## **⚡ SETUP NHANH (1 COMMAND)**

```bash
# Download và chạy script tự động
wget -O setup.sh https://raw.githubusercontent.com/your-repo/cookie-server/main/setup-aapanel.sh
chmod +x setup.sh
sudo ./setup.sh
```

## **📋 YÊU CẦU TRƯỚC KHI BẮT ĐẦU**

### **1. aaPanel đã cài đặt**
```bash
# Nếu chưa có aaPanel
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh
sudo bash install.sh
```

### **2. Cài MySQL qua aaPanel**
- aaPanel → App Store → Database → **MySQL 8.0** → Install
- Hoặc **MariaDB 10.5+** → Install

### **3. Cài Node.js qua aaPanel**  
- aaPanel → App Store → Runtime → **Node.js 18.x** → Install

## **🔧 SETUP THỦ CÔNG (5 BƯỚC)**

### **Bước 1: Tạo Database**
```bash
# aaPanel → Database → Add Database
Database Name: cookie_server
Username: cookie_user
Password: [tạo password mạnh]
```

### **Bước 2: Upload Code**
```bash
# Tạo thư mục
mkdir -p /www/wwwroot/cookie-server
cd /www/wwwroot/cookie-server

# Upload code (qua File Manager hoặc git)
git clone your-repo .
cd backend/cookie-server
npm install
```

### **Bước 3: Cấu hình .env**
```bash
cp .env.example .env
nano .env
```

**Nội dung .env:**
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=cookie_user
DB_PASSWORD=your_password
DB_NAME=cookie_server

COOKIE_SERVER_PORT=3001
NODE_ENV=production

JWT_SECRET=your_32_char_secret
API_KEY_SECRET=your_32_char_secret  
ENCRYPTION_KEY=your_32_char_key

ALLOWED_ORIGINS=https://yourdomain.com
```

### **Bước 4: Khởi tạo Database**
```bash
npm run init-db
```

### **Bước 5: Start với PM2**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## **🌐 CẤU HÌNH NGINX**

### **1. Tạo Site trong aaPanel**
- Website → Add Site
- Domain: `api.yourdomain.com`
- Document Root: `/www/wwwroot/cookie-server-web`

### **2. Cấu hình Reverse Proxy**
- Website → yourdomain.com → Config → **Nginx Config**
- Thêm vào config:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /health {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
}
```

### **3. Cài SSL**
- Website → yourdomain.com → **SSL** → Let's Encrypt
- Enable **Force HTTPS**

## **✅ KIỂM TRA SETUP**

### **1. Test Server**
```bash
curl http://localhost:3001/health
# Response: {"status":"ok","timestamp":"..."}
```

### **2. Test API**
```bash
# Lấy API key từ database
mysql -u cookie_user -p cookie_server -e "SELECT api_key FROM users WHERE username='admin';"

# Test API
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://yourdomain.com/api/profiles
```

### **3. Test qua Domain**
```bash
curl https://yourdomain.com/health
curl https://yourdomain.com/api/info
```

## **🔧 MANAGEMENT COMMANDS**

### **PM2 Management**
```bash
pm2 status                    # Xem status
pm2 restart cookie-server     # Restart
pm2 logs cookie-server        # Xem logs
pm2 monit                     # Monitor
```

### **Database Management**
```bash
cd /www/wwwroot/cookie-server/backend/cookie-server
npm run test-db              # Test connection
npm run reset-db             # Reset database
```

### **Logs**
```bash
tail -f /www/wwwroot/cookie-server/logs/server.log
tail -f /www/wwwlogs/yourdomain.com.log
pm2 logs cookie-server
```

## **📊 MONITORING**

### **aaPanel Monitoring**
- Monitoring → Add Process → `pm2`
- Monitoring → Add Port → `3001`
- Monitoring → Email Alerts

### **Health Checks**
```bash
# Server health
curl https://yourdomain.com/health

# Database health  
curl https://yourdomain.com/api/health/database

# API status
curl https://yourdomain.com/api/info
```

## **💾 BACKUP SETUP**

### **1. Tạo Backup Script**
```bash
nano /www/wwwroot/cookie-server/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backup/cookie-server"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u cookie_user -p$DB_PASSWORD cookie_server | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /www/wwwroot/cookie-server

echo "Backup completed: $DATE"
```

### **2. Cron Job**
- aaPanel → Cron → Add Task
- Type: **Shell Script**
- Script: `/www/wwwroot/cookie-server/backup.sh`
- Schedule: **Daily 2:00 AM**

## **🚨 TROUBLESHOOTING**

### **Server không start**
```bash
# Check PM2 logs
pm2 logs cookie-server

# Check manual start
cd /www/wwwroot/cookie-server/backend/cookie-server
node server.js
```

### **Database connection failed**
```bash
# Test MySQL
mysql -u cookie_user -p cookie_server

# Check MySQL status
# aaPanel → App Store → MySQL → Status
```

### **API không accessible**
```bash
# Check Nginx config
nginx -t

# Check port
netstat -tlnp | grep :3001

# Check firewall
iptables -L | grep 3001
```

### **SSL issues**
```bash
# Check certificate
openssl s_client -connect yourdomain.com:443

# Renew in aaPanel
# Website → SSL → Renew
```

## **📱 MOBILE ACCESS**

### **API Endpoints**
- **Health**: `https://yourdomain.com/health`
- **API Info**: `https://yourdomain.com/api/info`
- **Profiles**: `https://yourdomain.com/api/profiles`
- **Cookies**: `https://yourdomain.com/api/profiles/:id/cookies`
- **History**: `https://yourdomain.com/api/profiles/:id/history`
- **Passwords**: `https://yourdomain.com/api/profiles/:id/passwords`
- **Bookmarks**: `https://yourdomain.com/api/profiles/:id/bookmarks`

### **Authentication**
```bash
# Header format
Authorization: Bearer YOUR_API_KEY

# Example
curl -H "Authorization: Bearer abc123..." \
     https://yourdomain.com/api/profiles
```

## **🎯 PERFORMANCE TIPS**

### **MySQL Optimization**
```sql
-- aaPanel → Database → Performance
SET GLOBAL innodb_buffer_pool_size = 512M;
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 64M;
```

### **Nginx Optimization**
```nginx
# Add to nginx config
gzip on;
gzip_types text/plain application/json;
client_max_body_size 10M;
```

### **PM2 Optimization**
```javascript
// ecosystem.config.js
{
  instances: 'max',        // Use all CPU cores
  exec_mode: 'cluster',    // Cluster mode
  max_memory_restart: '1G' // Restart if memory > 1GB
}
```

## **✅ CHECKLIST**

- [ ] aaPanel installed
- [ ] MySQL/MariaDB installed via aaPanel
- [ ] Node.js 18+ installed via aaPanel
- [ ] Database created
- [ ] Code uploaded
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` configured
- [ ] Database initialized (`npm run init-db`)
- [ ] PM2 started server
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Health check working
- [ ] API endpoints accessible
- [ ] Backup script created
- [ ] Monitoring configured

## **🎉 HOÀN THÀNH!**

Sau khi hoàn thành checklist, bạn sẽ có:

✅ **Cookie Server** chạy tại `https://yourdomain.com`  
✅ **API endpoints** accessible qua `/api/`  
✅ **Auto-restart** với PM2  
✅ **SSL/HTTPS** security  
✅ **Automated backups**  
✅ **Monitoring** qua aaPanel  

**🔗 Test URLs:**
- Health: `https://yourdomain.com/health`
- API: `https://yourdomain.com/api/info`
- Profiles: `https://yourdomain.com/api/profiles`

**🎯 Next Steps:**
1. Test với GoLogin integration
2. Setup monitoring alerts
3. Optimize performance
4. Configure automated backups
