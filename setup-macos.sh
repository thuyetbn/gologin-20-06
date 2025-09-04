#!/bin/bash

# GoLogin Manager - macOS Setup Script
# This script automatically sets up the development environment for macOS

set -e  # Exit on any error

echo "🍎 GoLogin Manager - macOS Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
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

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS only!"
    exit 1
fi

# Check macOS version
macos_version=$(sw_vers -productVersion)
print_step "Detected macOS version: $macos_version"

# Step 1: Check and install Homebrew
print_step "Checking Homebrew installation..."
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    print_success "Homebrew is already installed"
fi

# Step 2: Install Node.js
print_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js 20..."
    brew install node@20
    brew link node@20 --force
else
    node_version=$(node --version)
    print_success "Node.js is already installed: $node_version"
    
    # Check if version is compatible
    if [[ ${node_version:1:2} -lt 18 ]]; then
        print_warning "Node.js version is too old. Updating to Node.js 20..."
        brew install node@20
        brew link node@20 --force
    fi
fi

# Step 3: Install Yarn
print_step "Checking Yarn installation..."
if ! command -v yarn &> /dev/null; then
    print_warning "Yarn not found. Installing Yarn..."
    brew install yarn
else
    yarn_version=$(yarn --version)
    print_success "Yarn is already installed: $yarn_version"
fi

# Step 4: Install Xcode Command Line Tools
print_step "Checking Xcode Command Line Tools..."
if ! xcode-select -p &> /dev/null; then
    print_warning "Xcode Command Line Tools not found. Installing..."
    xcode-select --install
    print_warning "Please complete the Xcode Command Line Tools installation and run this script again."
    exit 1
else
    print_success "Xcode Command Line Tools are installed"
fi

# Step 5: Install Git (if not already installed)
print_step "Checking Git installation..."
if ! command -v git &> /dev/null; then
    print_warning "Git not found. Installing Git..."
    brew install git
else
    git_version=$(git --version)
    print_success "Git is already installed: $git_version"
fi

# Step 6: Install project dependencies
print_step "Installing project dependencies..."
if [ -f "package.json" ]; then
    yarn install
    print_success "Dependencies installed successfully"
else
    print_error "package.json not found. Make sure you're in the project directory."
    exit 1
fi

# Step 7: Create assets directory for icons
print_step "Creating assets directory..."
mkdir -p assets
print_success "Assets directory created"

# Step 8: Build the project
print_step "Building the project..."
yarn build
print_success "Project built successfully"

# Step 9: Set up environment variables
print_step "Setting up environment variables..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# GoLogin Manager Environment Variables
NODE_ENV=production
ELECTRON_IS_DEV=false

# Browser settings
BROWSER_DOWNLOAD_PATH=./browsers
PROFILE_PATH=./profiles

# Database
DATABASE_PATH=./database.db

# Logging
LOG_LEVEL=info
EOF
    print_success "Environment file created"
else
    print_warning "Environment file already exists"
fi

# Step 10: Test the installation
print_step "Testing the installation..."
if yarn electron --version &> /dev/null; then
    print_success "Electron is working correctly"
else
    print_error "Electron installation failed"
    exit 1
fi

# Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Available commands:"
echo "  ${BLUE}yarn dev${NC}              - Start development server"
echo "  ${BLUE}yarn build${NC}            - Build the project"
echo "  ${BLUE}yarn dist:mac${NC}         - Build macOS app (current architecture)"
echo "  ${BLUE}yarn dist:mac:universal${NC} - Build universal macOS app (Intel + Apple Silicon)"
echo ""
echo "To start development:"
echo "  ${BLUE}yarn dev${NC}"
echo ""
echo "To build for distribution:"
echo "  ${BLUE}yarn dist:mac${NC}"
echo ""
echo "Build output will be in the 'out' directory."
echo ""
print_success "Ready to develop! 🚀"
