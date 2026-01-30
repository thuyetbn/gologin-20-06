/**
 * Setup script for Browser-Use Python service
 * Automatically creates venv and installs dependencies
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_SERVICE_PATH = path.join(__dirname, '..', 'backend', 'python-service');
const VENV_PATH = path.join(PYTHON_SERVICE_PATH, 'venv');
const REQUIREMENTS_PATH = path.join(PYTHON_SERVICE_PATH, 'requirements.txt');

// Determine Python executable
function getPythonExecutable() {
  const pythonCommands = process.platform === 'win32' 
    ? ['python', 'python3', 'py'] 
    : ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe' });
      return cmd;
    } catch {
      continue;
    }
  }
  throw new Error('Python not found. Please install Python 3.8+');
}

// Get venv Python path
function getVenvPython() {
  if (process.platform === 'win32') {
    return path.join(VENV_PATH, 'Scripts', 'python.exe');
  }
  return path.join(VENV_PATH, 'bin', 'python');
}

// Get venv pip path
function getVenvPip() {
  if (process.platform === 'win32') {
    return path.join(VENV_PATH, 'Scripts', 'pip.exe');
  }
  return path.join(VENV_PATH, 'bin', 'pip');
}

// Check if venv exists and is valid
function isVenvValid() {
  const venvPython = getVenvPython();
  if (!fs.existsSync(venvPython)) {
    return false;
  }
  try {
    execSync(`"${venvPython}" --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Create virtual environment
function createVenv() {
  console.log('📦 Creating Python virtual environment...');
  const python = getPythonExecutable();
  
  // Remove old venv if exists but invalid
  if (fs.existsSync(VENV_PATH)) {
    console.log('   Removing old venv...');
    fs.rmSync(VENV_PATH, { recursive: true, force: true });
  }
  
  execSync(`${python} -m venv "${VENV_PATH}"`, { 
    stdio: 'inherit',
    cwd: PYTHON_SERVICE_PATH 
  });
  console.log('✅ Virtual environment created');
}

// Install dependencies
function installDependencies() {
  console.log('📥 Installing Python dependencies...');
  const pip = getVenvPip();
  
  // Upgrade pip first
  execSync(`"${pip}" install --upgrade pip`, { 
    stdio: 'inherit',
    cwd: PYTHON_SERVICE_PATH 
  });
  
  // Install requirements
  execSync(`"${pip}" install -r "${REQUIREMENTS_PATH}"`, { 
    stdio: 'inherit',
    cwd: PYTHON_SERVICE_PATH 
  });
  
  console.log('✅ Dependencies installed');
}

// Install Playwright browsers
function installPlaywright() {
  console.log('🎭 Installing Playwright browsers...');
  const python = getVenvPython();
  
  try {
    execSync(`"${python}" -m playwright install chromium`, { 
      stdio: 'inherit',
      cwd: PYTHON_SERVICE_PATH 
    });
    console.log('✅ Playwright browsers installed');
  } catch (error) {
    console.warn('⚠️ Playwright browser installation skipped (may already exist)');
  }
}

// Check if dependencies are installed
function checkDependencies() {
  const python = getVenvPython();
  try {
    execSync(`"${python}" -c "import fastapi; import browser_use; import langchain"`, { 
      stdio: 'pipe',
      cwd: PYTHON_SERVICE_PATH 
    });
    return true;
  } catch {
    return false;
  }
}

// Main setup function
async function setup() {
  console.log('🚀 Setting up Browser-Use Python service...\n');
  
  // Check if Python service directory exists
  if (!fs.existsSync(PYTHON_SERVICE_PATH)) {
    console.error('❌ Python service directory not found:', PYTHON_SERVICE_PATH);
    process.exit(1);
  }
  
  // Check/create venv
  if (!isVenvValid()) {
    createVenv();
  } else {
    console.log('✅ Virtual environment already exists');
  }
  
  // Check/install dependencies
  if (!checkDependencies()) {
    installDependencies();
    installPlaywright();
  } else {
    console.log('✅ Dependencies already installed');
  }
  
  console.log('\n🎉 Browser-Use service setup complete!');
  console.log('   The service will auto-start when you run the app.\n');
}

// Run setup
setup().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});
