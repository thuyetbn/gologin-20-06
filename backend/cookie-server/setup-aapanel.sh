#!/bin/bash

# Cookie Server Setup Script for aaPanel
# Tự động setup Cookie Server trên aaPanel với MySQL

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

generate_key() {
    openssl rand -hex 32
}

print_status "🚀 Cookie Server aaPanel Setup"
echo "================================"
echo

# Get current directory
CURRENT_DIR=$(pwd)
PROJECT_ROOT="/www/wwwroot/cookie-server"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (sudo)"
    exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists mysql; then
    print_error "MySQL client not found. Please install MySQL through aaPanel first."
    echo "aaPanel → App Store → Database → MySQL 5.7/8.0 → Install"
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js not found. Please install Node.js through aaPanel first."
    echo "aaPanel → App Store → Runtime → Node.js → Install"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current: $(node --version)"
    exit 1
fi

print_success "Prerequisites check passed"

# Get configuration
echo
print_status "Configuration setup..."

read -p "Domain name (e.g., api.yourdomain.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required"
    exit 1
fi

read -p "MySQL root password: " -s MYSQL_ROOT_PASSWORD
echo

read -p "Database name (cookie_server): " DB_NAME
DB_NAME=${DB_NAME:-cookie_server}

read -p "Database user (cookie_user): " DB_USER
DB_USER=${DB_USER:-cookie_user}

read -p "Database password (auto-generate): " DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_password)
    print_status "Generated database password: $DB_PASSWORD"
fi

# Create project directory
print_status "Creating project directory..."
mkdir -p $PROJECT_ROOT
mkdir -p $PROJECT_ROOT/logs
mkdir -p $PROJECT_ROOT/backups

# Copy files
print_status "Copying project files..."
if [ "$CURRENT_DIR" != "$PROJECT_ROOT" ]; then
    cp -r $CURRENT_DIR/* $PROJECT_ROOT/
    cd $PROJECT_ROOT/backend/cookie-server
else
    cd backend/cookie-server
fi

# Create database
print_status "Setting up MySQL database..."

mysql -u root -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
EOF

print_success "Database setup completed"

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Generate security keys
JWT_SECRET=$(generate_key)
API_KEY_SECRET=$(generate_key)
ENCRYPTION_KEY=$(generate_key | cut -c1-32)

# Create .env file
print_status "Creating .env configuration..."

cat > .env << EOF
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# Server Configuration
COOKIE_SERVER_PORT=3001
COOKIE_SERVER_HOST=0.0.0.0
NODE_ENV=production

# Security
JWT_SECRET=$JWT_SECRET
API_KEY_SECRET=$API_KEY_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# CORS
ALLOWED_ORIGINS=https://$DOMAIN_NAME,http://$DOMAIN_NAME

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=$PROJECT_ROOT/logs/server.log
ERROR_LOG_PATH=$PROJECT_ROOT/logs/error.log

# Features
FEATURE_BROWSER_HISTORY=true
FEATURE_SAVED_PASSWORDS=true
FEATURE_BOOKMARKS=true
FEATURE_FULL_BACKUP=true
FEATURE_AUTO_SYNC=true
FEATURE_ENCRYPTION=true
EOF

print_success ".env file created"

# Initialize database
print_status "Initializing database..."
npm run init-db

# Install PM2 if not exists
if ! command_exists pm2; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cookie-server',
    script: 'server.js',
    cwd: '$PROJECT_ROOT/backend/cookie-server',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '$PROJECT_ROOT/logs/pm2-error.log',
    out_file: '$PROJECT_ROOT/logs/pm2-out.log',
    log_file: '$PROJECT_ROOT/logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000
  }]
};
EOF

# Start with PM2
print_status "Starting server with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Create backup script
print_status "Creating backup script..."

cat > $PROJECT_ROOT/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backup/cookie-server"
PROJECT_ROOT="/www/wwwroot/cookie-server"

# Read database config from .env
source $PROJECT_ROOT/backend/cookie-server/.env

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup application files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz $PROJECT_ROOT --exclude="$PROJECT_ROOT/node_modules" --exclude="$PROJECT_ROOT/logs"

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x $PROJECT_ROOT/backup.sh

# Create Nginx configuration template
print_status "Creating Nginx configuration template..."

cat > $PROJECT_ROOT/nginx-config.txt << EOF
# Add this to your Nginx site configuration in aaPanel
# Website → $DOMAIN_NAME → Config → Nginx Config

# API Proxy
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Health check
location /health {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}

# Direct access (optional)
location /direct/ {
    rewrite ^/direct/(.*) /\$1 break;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF

# Test server
print_status "Testing server..."
sleep 5

if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    print_success "Server is running successfully"
else
    print_warning "Server may still be starting up"
fi

# Get API key
API_KEY=$(mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -sN -e "SELECT api_key FROM users WHERE username='admin' LIMIT 1;" 2>/dev/null || echo "")

echo
print_success "🎉 Setup completed successfully!"
echo
echo "📊 Server Information:"
echo "  Project Path:   $PROJECT_ROOT"
echo "  Server URL:     http://localhost:3001"
echo "  Domain:         https://$DOMAIN_NAME (after Nginx setup)"
echo "  Health Check:   http://localhost:3001/health"
echo
echo "🗄️ Database Information:"
echo "  Host:           localhost"
echo "  Port:           3306"
echo "  Database:       $DB_NAME"
echo "  User:           $DB_USER"
echo "  Password:       $DB_PASSWORD"
echo
echo "🔑 Security Keys:"
echo "  JWT Secret:     $JWT_SECRET"
echo "  API Key Secret: $API_KEY_SECRET"
echo "  Encryption Key: $ENCRYPTION_KEY"
if [ ! -z "$API_KEY" ]; then
echo "  Admin API Key:  $API_KEY"
fi
echo
echo "🔧 Next Steps:"
echo "1. Setup Nginx reverse proxy in aaPanel:"
echo "   - Website → Add Site → Domain: $DOMAIN_NAME"
echo "   - Config → Nginx Config → Add content from: $PROJECT_ROOT/nginx-config.txt"
echo
echo "2. Setup SSL certificate:"
echo "   - Website → $DOMAIN_NAME → SSL → Let's Encrypt"
echo
echo "3. Setup firewall (if needed):"
echo "   - Security → Firewall → Add Rule → Port 3001"
echo
echo "4. Setup backup cron job:"
echo "   - Cron → Add Task → Shell Script: $PROJECT_ROOT/backup.sh"
echo "   - Schedule: Daily at 2:00 AM"
echo
echo "🔧 Management Commands:"
echo "  PM2 Status:     pm2 status"
echo "  PM2 Logs:       pm2 logs cookie-server"
echo "  PM2 Restart:    pm2 restart cookie-server"
echo "  View Logs:      tail -f $PROJECT_ROOT/logs/server.log"
echo "  Test Database:  cd $PROJECT_ROOT/backend/cookie-server && npm run test-db"
echo "  Manual Backup:  $PROJECT_ROOT/backup.sh"
echo
echo "🔗 Test Commands:"
echo "  Health Check:   curl http://localhost:3001/health"
if [ ! -z "$API_KEY" ]; then
echo "  API Test:       curl -H \"Authorization: Bearer $API_KEY\" http://localhost:3001/api/profiles"
fi
echo
print_success "Cookie Server is ready to use!"
