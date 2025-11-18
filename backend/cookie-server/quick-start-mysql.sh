#!/bin/bash

# Quick Start Script for Cookie Server with MySQL
# This script will help you setup the entire system quickly

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate random key
generate_key() {
    openssl rand -hex 32
}

print_status "🚀 Cookie Server MySQL Quick Start"
echo "=================================="
echo

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) found"

# Check MySQL
if ! command_exists mysql; then
    print_warning "MySQL client not found. Please install MySQL first."
    echo
    echo "Installation commands:"
    echo "  Ubuntu/Debian: sudo apt install mysql-server mysql-client"
    echo "  CentOS/RHEL:   sudo yum install mysql-server mysql"
    echo "  macOS:         brew install mysql"
    echo "  Windows:       Download from https://dev.mysql.com/downloads/mysql/"
    echo
    read -p "Do you want to continue with Docker setup instead? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        USE_DOCKER=true
    else
        exit 1
    fi
else
    print_success "MySQL client found"
    USE_DOCKER=false
fi

echo

# Setup method selection
if [ "$USE_DOCKER" = true ]; then
    print_status "🐳 Setting up with Docker..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Docker setup
    print_status "Creating Docker environment..."
    
    # Generate passwords
    MYSQL_ROOT_PASSWORD=$(generate_password)
    DB_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_key)
    API_KEY_SECRET=$(generate_key)
    ENCRYPTION_KEY=$(generate_key | cut -c1-32)
    
    # Create .env file for Docker
    cat > .env << EOF
# Docker Environment Configuration
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
DB_USER=cookie_user
DB_PASSWORD=$DB_PASSWORD
DB_NAME=cookie_server
JWT_SECRET=$JWT_SECRET
API_KEY_SECRET=$API_KEY_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=production
LOG_LEVEL=info
COOKIE_SERVER_PORT=3001
EOF
    
    print_success ".env file created"
    
    # Start Docker services
    print_status "Starting Docker services..."
    docker-compose -f docker-compose.mysql.yml up -d mysql
    
    print_status "Waiting for MySQL to be ready..."
    sleep 30
    
    # Start application
    docker-compose -f docker-compose.mysql.yml up -d cookie-server
    
    print_success "Docker services started"
    
    # Display connection info
    echo
    print_success "🎉 Setup completed successfully!"
    echo
    echo "📊 Connection Information:"
    echo "  Server URL:     http://localhost:3001"
    echo "  Health Check:   http://localhost:3001/health"
    echo "  API Docs:       http://localhost:3001/api/docs"
    echo
    echo "🗄️ Database Information:"
    echo "  Host:           localhost"
    echo "  Port:           3306"
    echo "  Database:       cookie_server"
    echo "  User:           cookie_user"
    echo "  Password:       $DB_PASSWORD"
    echo "  Root Password:  $MYSQL_ROOT_PASSWORD"
    echo
    echo "🔑 Security Keys:"
    echo "  JWT Secret:     $JWT_SECRET"
    echo "  API Key Secret: $API_KEY_SECRET"
    echo "  Encryption Key: $ENCRYPTION_KEY"
    echo
    echo "🐳 Docker Commands:"
    echo "  View logs:      docker-compose -f docker-compose.mysql.yml logs -f"
    echo "  Stop services:  docker-compose -f docker-compose.mysql.yml down"
    echo "  Restart:        docker-compose -f docker-compose.mysql.yml restart"
    echo
    
else
    # Native setup
    print_status "🔧 Setting up with native MySQL..."
    
    # Get MySQL connection details
    echo "Please provide MySQL connection details:"
    read -p "MySQL Host (localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "MySQL Port (3306): " DB_PORT
    DB_PORT=${DB_PORT:-3306}
    
    read -p "MySQL Root Password: " -s MYSQL_ROOT_PASSWORD
    echo
    
    read -p "Database Name (cookie_server): " DB_NAME
    DB_NAME=${DB_NAME:-cookie_server}
    
    read -p "Application User (cookie_user): " DB_USER
    DB_USER=${DB_USER:-cookie_user}
    
    read -p "Application Password (auto-generate): " DB_PASSWORD
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(generate_password)
        print_status "Generated password: $DB_PASSWORD"
    fi
    
    # Test MySQL connection
    print_status "Testing MySQL connection..."
    if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
        print_error "Failed to connect to MySQL. Please check your credentials."
        exit 1
    fi
    
    print_success "MySQL connection successful"
    
    # Create database and user
    print_status "Creating database and user..."
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u root -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
EOF
    
    print_success "Database and user created"
    
    # Generate security keys
    JWT_SECRET=$(generate_key)
    API_KEY_SECRET=$(generate_key)
    ENCRYPTION_KEY=$(generate_key | cut -c1-32)
    
    # Create .env file
    print_status "Creating .env file..."
    
    cat > .env << EOF
# Database Configuration
DB_TYPE=mysql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# Server Configuration
COOKIE_SERVER_PORT=3001
COOKIE_SERVER_HOST=localhost
NODE_ENV=production

# Security
JWT_SECRET=$JWT_SECRET
API_KEY_SECRET=$API_KEY_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/cookie-server.log

# Features
FEATURE_BROWSER_HISTORY=true
FEATURE_SAVED_PASSWORDS=true
FEATURE_BOOKMARKS=true
FEATURE_FULL_BACKUP=true
EOF
    
    print_success ".env file created"
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
    
    # Initialize database
    print_status "Initializing database..."
    npm run init-db
    print_success "Database initialized"
    
    # Start server
    print_status "Starting server..."
    npm start &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test server
    if curl -f http://localhost:3001/health >/dev/null 2>&1; then
        print_success "Server started successfully"
    else
        print_error "Server failed to start"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    # Get API key from database
    API_KEY=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "SELECT api_key FROM users WHERE username='admin' LIMIT 1;")
    
    echo
    print_success "🎉 Setup completed successfully!"
    echo
    echo "📊 Server Information:"
    echo "  Server URL:     http://localhost:3001"
    echo "  Health Check:   http://localhost:3001/health"
    echo "  API Docs:       http://localhost:3001/api/docs"
    echo "  Process ID:     $SERVER_PID"
    echo
    echo "🗄️ Database Information:"
    echo "  Host:           $DB_HOST"
    echo "  Port:           $DB_PORT"
    echo "  Database:       $DB_NAME"
    echo "  User:           $DB_USER"
    echo "  Password:       $DB_PASSWORD"
    echo
    echo "🔑 Admin Credentials:"
    echo "  Username:       admin"
    echo "  API Key:        $API_KEY"
    echo
    echo "🔧 Management Commands:"
    echo "  Stop server:    kill $SERVER_PID"
    echo "  View logs:      tail -f logs/cookie-server.log"
    echo "  Test database:  npm run test-db"
    echo "  Reset database: npm run reset-db"
    echo
fi

# Test API
print_status "Testing API endpoints..."

sleep 2

if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    print_success "✅ Health check passed"
else
    print_warning "⚠️  Health check failed - server may still be starting"
fi

if curl -f http://localhost:3001/api/info >/dev/null 2>&1; then
    print_success "✅ API info endpoint working"
else
    print_warning "⚠️  API info endpoint not responding"
fi

echo
print_success "🎉 Cookie Server setup completed!"
echo
echo "📚 Next Steps:"
echo "1. Test the API with the provided API key"
echo "2. Check the logs for any issues"
echo "3. Read the documentation in SETUP_MYSQL.md"
echo "4. Configure your GoLogin integration"
echo
echo "🔗 Useful Links:"
echo "  Documentation: ./SETUP_MYSQL.md"
echo "  API Examples:  ./examples/"
echo "  Health Check:  curl http://localhost:3001/health"
echo "  API Test:      curl -H \"Authorization: Bearer \$API_KEY\" http://localhost:3001/api/profiles"
echo
