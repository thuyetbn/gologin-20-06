#!/bin/bash

# macOS Dependencies Installer for GoLogin Manager
# This script installs all necessary dependencies for building on macOS

set -e

echo "🍎 Installing macOS dependencies for GoLogin Manager..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Step 1: Install Homebrew if not present
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

# Step 2: Install Node.js and Yarn
print_step "Installing Node.js and Yarn..."
brew install node@20 yarn

# Step 3: Install Xcode Command Line Tools
print_step "Checking Xcode Command Line Tools..."
if ! xcode-select -p &> /dev/null; then
    print_warning "Xcode Command Line Tools not found. Installing..."
    xcode-select --install
    print_warning "Please complete the Xcode Command Line Tools installation and run this script again."
    exit 1
else
    print_success "Xcode Command Line Tools are installed"
fi

# Step 4: Install additional build tools
print_step "Installing additional build tools..."
brew install python@3.11 cmake pkg-config

# Step 5: Install project dependencies
print_step "Installing project dependencies..."
yarn install

# Step 6: Install electron-rebuild
print_step "Installing electron-rebuild..."
yarn add -D electron-rebuild

# Step 7: Rebuild native modules
print_step "Rebuilding native modules for macOS..."
yarn electron-rebuild

# Step 8: Create assets directory
print_step "Creating assets directory..."
mkdir -p assets

# Step 9: Set up environment variables
print_step "Setting up environment variables..."
export PYTHON=$(which python3)
export ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Step 10: Test build
print_step "Testing build process..."
yarn build

print_success "✅ All dependencies installed successfully!"
echo ""
echo "🎯 Available build commands:"
echo "  yarn dist:mac              # Build for current architecture"
echo "  yarn dist:mac:universal    # Build universal binary (Intel + Apple Silicon)"
echo "  yarn dist:mac:x64          # Build for Intel Macs only"
echo "  yarn dist:mac:arm64        # Build for Apple Silicon only"
echo ""
echo "🚀 To start development:"
echo "  yarn dev"
echo ""
echo "📦 To build for distribution:"
echo "  yarn dist:mac:universal"
echo ""
print_success "Ready to build! 🎉"
