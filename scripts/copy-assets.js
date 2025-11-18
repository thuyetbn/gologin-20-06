const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'backend', 'gologin');
const destDir = path.join(__dirname, '..', 'dist', 'backend', 'gologin');

async function copyAssets() {
  try {
    await fs.copy(sourceDir, destDir);
    console.log('Successfully copied gologin assets.');
  } catch (err) {
    console.error('Error copying gologin assets:', err);
    process.exit(1);
  }
}

copyAssets(); 