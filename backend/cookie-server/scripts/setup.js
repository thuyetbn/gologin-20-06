#!/usr/bin/env node

/**
 * Setup Script for Custom Cookie Server
 * Khởi tạo database, tạo admin user, và cấu hình server
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

import { CookieDatabase } from '../database/cookie-database.js';
import serverConfig, { validateConfig, getDefaultAdminConfig } from '../config/server-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ServerSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log('🚀 Custom Cookie Server Setup');
    console.log('=' .repeat(50));

    try {
      // Validate configuration
      console.log('📋 Validating configuration...');
      validateConfig();
      console.log('✅ Configuration is valid');

      // Create directories
      await this.createDirectories();

      // Initialize database
      await this.initializeDatabase();

      // Create admin user
      await this.createAdminUser();

      // Generate environment file
      await this.generateEnvFile();

      // Create systemd service (Linux only)
      if (process.platform === 'linux') {
        await this.createSystemdService();
      }

      console.log('\n🎉 Setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Review the generated .env file');
      console.log('2. Start the server: npm run start');
      console.log('3. Access admin dashboard: http://localhost:3001/admin');
      console.log('4. Use the generated API key for client connections');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async createDirectories() {
    console.log('\n📁 Creating directories...');
    
    const directories = [
      dirname(serverConfig.database.path),
      serverConfig.database.backupPath,
      dirname(serverConfig.logging.file),
      join(__dirname, '..', 'public'),
      join(__dirname, '..', 'data'),
      join(__dirname, '..', 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Created: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        console.log(`📁 Exists: ${dir}`);
      }
    }
  }

  async initializeDatabase() {
    console.log('\n🗄️ Initializing database...');
    
    const db = new CookieDatabase(serverConfig.database.path);
    
    try {
      await db.initialize();
      console.log('✅ Database initialized successfully');
      
      // Test database connection
      const stats = await db.getSystemStats();
      console.log('📊 Database stats:', stats);
      
      await db.close();
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  async createAdminUser() {
    console.log('\n👤 Creating admin user...');
    
    const defaultConfig = getDefaultAdminConfig();
    
    // Ask for admin details
    const username = await this.question(`Admin username (${defaultConfig.username}): `) || defaultConfig.username;
    const email = await this.question(`Admin email (${defaultConfig.email}): `) || defaultConfig.email;
    
    const db = new CookieDatabase(serverConfig.database.path);
    
    try {
      await db.initialize();
      
      // Check if admin user already exists
      const existingUser = await db.getUserByUsername(username);
      if (existingUser) {
        console.log('⚠️ Admin user already exists');
        const overwrite = await this.question('Overwrite existing admin user? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
          console.log('📝 Skipping admin user creation');
          await db.close();
          return;
        }
      }

      // Create admin user
      const adminUser = await db.createUser({
        username,
        email,
        isAdmin: true
      });

      console.log('✅ Admin user created successfully');
      console.log(`📧 Email: ${adminUser.email}`);
      console.log(`🔑 API Key: ${adminUser.api_key}`);
      console.log('⚠️ Save this API key - it won\'t be shown again!');

      // Save API key to file for reference
      const apiKeyFile = join(__dirname, '..', 'data', 'admin-api-key.txt');
      await fs.writeFile(apiKeyFile, `Admin API Key: ${adminUser.api_key}\nCreated: ${new Date().toISOString()}\n`);
      console.log(`💾 API key saved to: ${apiKeyFile}`);

      await db.close();
    } catch (error) {
      await db.close();
      throw new Error(`Admin user creation failed: ${error.message}`);
    }
  }

  async generateEnvFile() {
    console.log('\n📝 Generating environment file...');
    
    const envFile = join(__dirname, '..', '.env');
    
    // Check if .env already exists
    try {
      await fs.access(envFile);
      const overwrite = await this.question('.env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('📝 Skipping .env file generation');
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    const envContent = `# Custom Cookie Server Configuration
# Generated on ${new Date().toISOString()}

# Server Settings
COOKIE_SERVER_PORT=${serverConfig.server.port}
COOKIE_SERVER_HOST=${serverConfig.server.host}
NODE_ENV=${serverConfig.server.env}

# Database Settings
COOKIE_DB_PATH=${serverConfig.database.path}
COOKIE_DB_BACKUP_PATH=${serverConfig.database.backupPath}

# Security Settings
ALLOWED_ORIGINS=${serverConfig.security.allowedOrigins.join(',')}
RATE_LIMIT_WINDOW=${serverConfig.security.rateLimitWindow}
RATE_LIMIT_MAX=${serverConfig.security.rateLimitMax}

# Cookie Settings
MAX_COOKIES_PER_REQUEST=${serverConfig.cookies.maxCookiesPerRequest}
MAX_COOKIE_SIZE=${serverConfig.cookies.maxCookieSize}
MAX_COOKIES_PER_PROFILE=${serverConfig.cookies.maxCookiesPerProfile}

# Backup Settings
AUTO_BACKUP=${serverConfig.backup.autoBackup}
BACKUP_INTERVAL=${serverConfig.backup.backupInterval}
MAX_BACKUPS=${serverConfig.backup.maxBackups}

# Logging Settings
LOG_LEVEL=${serverConfig.logging.level}
LOG_FILE=${serverConfig.logging.file}
LOG_CONSOLE=${serverConfig.logging.enableConsole}

# Admin Settings
ADMIN_ENABLED=${serverConfig.admin.enabled}
ADMIN_USERNAME=${serverConfig.admin.defaultUsername}
ADMIN_EMAIL=${serverConfig.admin.defaultEmail}

# Performance Settings
REQUEST_TIMEOUT=${serverConfig.performance.requestTimeout}
BODY_LIMIT=${serverConfig.performance.bodyLimit}
COMPRESSION_THRESHOLD=${serverConfig.performance.compressionThreshold}

# Integration Settings (Optional)
# GOLOGIN_API_URL=${serverConfig.integration.gologinApiUrl}
# WEBHOOK_URL=
# WEBHOOK_SECRET=
# ENABLE_WEBHOOKS=false
`;

    await fs.writeFile(envFile, envContent);
    console.log(`✅ Environment file created: ${envFile}`);
  }

  async createSystemdService() {
    console.log('\n🔧 Creating systemd service...');
    
    const serviceName = 'custom-cookie-server';
    const serviceFile = `/etc/systemd/system/${serviceName}.service`;
    
    const serviceContent = `[Unit]
Description=Custom Cookie Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=${join(__dirname, '..')}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

    try {
      // Check if running as root
      if (process.getuid && process.getuid() !== 0) {
        console.log('⚠️ Systemd service creation requires root privileges');
        console.log('📝 Service file content saved to: systemd-service.txt');
        
        const serviceFileLocal = join(__dirname, '..', 'systemd-service.txt');
        await fs.writeFile(serviceFileLocal, serviceContent);
        
        console.log('\nTo install the service manually:');
        console.log(`1. sudo cp ${serviceFileLocal} ${serviceFile}`);
        console.log('2. sudo systemctl daemon-reload');
        console.log(`3. sudo systemctl enable ${serviceName}`);
        console.log(`4. sudo systemctl start ${serviceName}`);
        
        return;
      }

      await fs.writeFile(serviceFile, serviceContent);
      console.log(`✅ Systemd service created: ${serviceFile}`);
      
      // Reload systemd and enable service
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('systemctl daemon-reload');
      await execAsync(`systemctl enable ${serviceName}`);
      
      console.log('✅ Service enabled and ready to start');
      console.log(`Start with: sudo systemctl start ${serviceName}`);
      
    } catch (error) {
      console.log('⚠️ Failed to create systemd service:', error.message);
      console.log('📝 You can create it manually using the generated service file');
    }
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new ServerSetup();
  setup.run().catch(console.error);
}

export { ServerSetup };
