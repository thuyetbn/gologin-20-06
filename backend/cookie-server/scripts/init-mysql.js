#!/usr/bin/env node

/**
 * MySQL Database Initialization Script
 * Khởi tạo database và tables cho Cookie Server
 */

import { MySQLDatabase } from '../database/mysql-database.js';
import serverConfig from '../config/server-config.js';
import crypto from 'crypto';

async function initializeDatabase() {
  console.log('🚀 Initializing MySQL Database for Cookie Server\n');

  try {
    // Tạo database instance
    const db = new MySQLDatabase(serverConfig.database.mysql);
    
    console.log('📡 Connecting to MySQL...');
    await db.initialize();
    
    console.log('✅ Database initialized successfully!\n');

    // Tạo admin user mặc định
    console.log('👤 Creating default admin user...');
    
    const adminUser = await db.createUser({
      username: 'admin',
      email: 'admin@localhost',
      isAdmin: true
    });

    console.log(`✅ Admin user created:`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   API Key: ${adminUser.api_key}`);
    console.log(`   ID: ${adminUser.id}\n`);

    // Tạo test profile
    console.log('📁 Creating test profile...');
    
    const testProfile = await db.createProfile({
      userId: adminUser.id,
      name: 'Test Profile',
      description: 'Default test profile for development',
      gologinProfileId: 'test-profile-001',
      settings: {
        autoSync: true,
        syncInterval: 300000,
        maxCookies: 10000
      }
    });

    console.log(`✅ Test profile created:`);
    console.log(`   Name: ${testProfile.name}`);
    console.log(`   ID: ${testProfile.id}`);
    console.log(`   GoLogin ID: ${testProfile.gologin_profile_id}\n`);

    // Thêm sample cookies
    console.log('🍪 Adding sample cookies...');
    
    const sampleCookies = [
      {
        name: 'session_id',
        value: 'abc123def456',
        domain: '.example.com',
        path: '/',
        expires: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true,
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: 'user_pref',
        value: 'dark_mode=true',
        domain: '.example.com',
        path: '/',
        expires: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'csrf_token',
        value: crypto.randomBytes(32).toString('hex'),
        domain: 'app.example.com',
        path: '/api',
        expires: Date.now() + (24 * 60 * 60 * 1000), // 1 day
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
      }
    ];

    const cookieResult = await db.saveCookies(testProfile.id, sampleCookies);
    console.log(`✅ Sample cookies added: ${cookieResult.savedCount} cookies\n`);

    // Thêm sample browser history
    console.log('📚 Adding sample browser history...');
    
    const sampleHistory = [
      {
        url: 'https://www.google.com',
        title: 'Google',
        visitCount: 15,
        lastVisitTime: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        url: 'https://github.com',
        title: 'GitHub',
        visitCount: 8,
        lastVisitTime: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        url: 'https://stackoverflow.com',
        title: 'Stack Overflow',
        visitCount: 23,
        lastVisitTime: Date.now() - (30 * 60 * 1000) // 30 minutes ago
      }
    ];

    const historyResult = await db.saveBrowserHistory(testProfile.id, sampleHistory);
    console.log(`✅ Sample history added: ${historyResult.savedCount} items\n`);

    // Hiển thị thống kê
    console.log('📊 Database Statistics:');
    
    const cookieCount = await db.getCookieCount(testProfile.id);
    const historyCount = await db.getBrowserHistoryCount(testProfile.id);
    
    console.log(`   Cookies: ${cookieCount}`);
    console.log(`   History: ${historyCount}`);
    console.log(`   Profiles: 1`);
    console.log(`   Users: 1\n`);

    // Hiển thị connection info
    console.log('🔗 Connection Information:');
    console.log(`   Host: ${serverConfig.database.mysql.host}`);
    console.log(`   Port: ${serverConfig.database.mysql.port}`);
    console.log(`   Database: ${serverConfig.database.mysql.database}`);
    console.log(`   User: ${serverConfig.database.mysql.user}\n`);

    // Đóng connection
    await db.close();
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test API: curl http://localhost:3001/health');
    console.log(`3. Use API Key: ${adminUser.api_key}`);
    console.log('4. Check logs: tail -f logs/cookie-server.log\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check MySQL is running: sudo systemctl status mysql');
    console.error('2. Check database exists: mysql -u root -p -e "SHOW DATABASES;"');
    console.error('3. Check user permissions: mysql -u cookie_user -p cookie_server');
    console.error('4. Check .env configuration');
    console.error('5. Check network connectivity\n');
    
    process.exit(1);
  }
}

async function testConnection() {
  console.log('🔍 Testing MySQL Connection...\n');

  try {
    const db = new MySQLDatabase(serverConfig.database.mysql);
    
    // Test basic connection
    console.log('📡 Testing basic connection...');
    await db.initialize();
    console.log('✅ Basic connection successful');

    // Test queries
    console.log('📊 Testing queries...');
    const [result] = await db.execute('SELECT VERSION() as version, NOW() as current_time');
    console.log(`✅ MySQL Version: ${result[0].version}`);
    console.log(`✅ Current Time: ${result[0].current_time}`);

    // Test tables
    console.log('📋 Checking tables...');
    const [tables] = await db.execute('SHOW TABLES');
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    // Test sample data
    if (tables.length > 0) {
      console.log('📊 Checking sample data...');
      
      try {
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [profiles] = await db.execute('SELECT COUNT(*) as count FROM profiles');
        const [cookies] = await db.execute('SELECT COUNT(*) as count FROM cookies');
        
        console.log(`✅ Users: ${users[0].count}`);
        console.log(`✅ Profiles: ${profiles[0].count}`);
        console.log(`✅ Cookies: ${cookies[0].count}`);
      } catch (error) {
        console.log('ℹ️  No sample data found (this is normal for fresh installation)');
      }
    }

    await db.close();
    console.log('\n✅ Connection test completed successfully!');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('\n🔍 Common Issues:');
    console.error('1. MySQL server not running');
    console.error('2. Wrong credentials in .env file');
    console.error('3. Database does not exist');
    console.error('4. User does not have proper permissions');
    console.error('5. Network/firewall issues\n');
    
    process.exit(1);
  }
}

async function resetDatabase() {
  console.log('⚠️  RESETTING DATABASE - ALL DATA WILL BE LOST!\n');
  
  // Confirm reset
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question('Are you sure you want to reset the database? (yes/no): ', resolve);
  });
  
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Database reset cancelled');
    return;
  }

  try {
    const db = new MySQLDatabase(serverConfig.database.mysql);
    await db.initialize();

    console.log('🗑️  Dropping all tables...');
    
    // Get all tables
    const [tables] = await db.execute('SHOW TABLES');
    
    // Disable foreign key checks
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop all tables
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      await db.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`   Dropped table: ${tableName}`);
    }
    
    // Re-enable foreign key checks
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    await db.close();
    
    console.log('✅ Database reset completed');
    console.log('💡 Run "npm run init-db" to recreate tables and sample data\n');

  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'init':
    initializeDatabase();
    break;
  case 'test':
    testConnection();
    break;
  case 'reset':
    resetDatabase();
    break;
  default:
    console.log('🗄️  MySQL Database Management\n');
    console.log('Usage:');
    console.log('  node scripts/init-mysql.js init   - Initialize database with sample data');
    console.log('  node scripts/init-mysql.js test   - Test database connection');
    console.log('  node scripts/init-mysql.js reset  - Reset database (WARNING: deletes all data)\n');
    console.log('Examples:');
    console.log('  npm run init-db');
    console.log('  npm run test-db');
    console.log('  npm run reset-db\n');
    break;
}
