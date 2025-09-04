/**
 * Example: Using Custom Cookie Server with GoLogin
 * 
 * Demonstrates how to use the custom cookie server instead of GoLogin's server
 */

import { GoLogin } from '../gologin/gologin.js';
import { CustomCookieClient } from '../gologin/utils/custom-cookie-client.js';

// Configuration
const CONFIG = {
  // GoLogin settings
  gologin: {
    token: process.env.GOLOGIN_API_TOKEN || 'your-gologin-token',
    profile_id: process.env.GOLOGIN_PROFILE_ID || 'your-profile-id',
    executablePath: process.env.GOLOGIN_EXECUTABLE_PATH || null
  },
  
  // Custom server settings
  customServer: {
    serverUrl: process.env.CUSTOM_COOKIE_SERVER_URL || 'http://localhost:3001',
    apiKey: process.env.CUSTOM_COOKIE_API_KEY || 'your-custom-server-api-key'
  }
};

/**
 * Example 1: Basic Custom Server Usage
 */
async function basicCustomServerExample() {
  console.log('🚀 Basic Custom Server Example\n');

  const gologin = new GoLogin({
    token: CONFIG.gologin.token,
    profile_id: CONFIG.gologin.profile_id,
    executablePath: CONFIG.gologin.executablePath
  });

  try {
    // Test custom server connection
    console.log('🔗 Testing custom server connection...');
    const connectionTest = await gologin.testCustomCookieServer(CONFIG.customServer);
    
    if (!connectionTest.success) {
      throw new Error(`Custom server connection failed: ${connectionTest.error}`);
    }
    
    console.log('✅ Custom server connection successful');
    console.log(`📊 Server status: ${connectionTest.status}`);
    console.log(`⏱️ Server uptime: ${connectionTest.uptime}s\n`);

    // Upload cookies to custom server
    console.log('📤 Uploading cookies to custom server...');
    const uploadResult = await gologin.uploadCookies({
      useCustomServer: true,
      customServerConfig: CONFIG.customServer
    });
    
    console.log('Upload result:', uploadResult);
    console.log('');

    // Download cookies from custom server
    console.log('📥 Downloading cookies from custom server...');
    const downloadResult = await gologin.downloadCookies({
      useCustomServer: true,
      customServerConfig: CONFIG.customServer
    });
    
    console.log('Download result:', downloadResult);
    console.log('');

  } catch (error) {
    console.error('❌ Error in basic custom server example:', error.message);
  }
}

/**
 * Example 2: Full Sync with Custom Server
 */
async function fullSyncCustomServerExample() {
  console.log('🔄 Full Sync Custom Server Example\n');

  const gologin = new GoLogin({
    token: CONFIG.gologin.token,
    profile_id: CONFIG.gologin.profile_id,
    executablePath: CONFIG.gologin.executablePath
  });

  try {
    // Set custom server configuration
    gologin.setCustomCookieServer(CONFIG.customServer);

    // Perform full sync with custom server
    console.log('🔄 Performing full sync with custom server...');
    const syncResult = await gologin.syncCookies({
      direction: 'both',
      useCustomServer: true,
      customServerConfig: CONFIG.customServer,
      backup: true
    });

    console.log('Sync result:', syncResult);
    console.log('');

    if (syncResult.success) {
      console.log('✅ Full sync completed successfully!');
      if (syncResult.download) {
        console.log(`📥 Downloaded: ${syncResult.download.cookieCount || 0} cookies`);
      }
      if (syncResult.upload) {
        console.log(`📤 Uploaded: ${syncResult.upload.cookieCount || 0} cookies`);
      }
    } else {
      console.log('❌ Sync failed:', syncResult.error);
    }

  } catch (error) {
    console.error('❌ Error in full sync example:', error.message);
  }
}

/**
 * Example 3: Direct Custom Client Usage
 */
async function directCustomClientExample() {
  console.log('🔧 Direct Custom Client Example\n');

  try {
    // Create custom client directly
    const customClient = new CustomCookieClient(CONFIG.customServer);

    // Test connection
    console.log('🔗 Testing direct client connection...');
    const connectionTest = await customClient.testConnection();
    console.log('Connection test:', connectionTest);
    console.log('');

    // Get server info
    console.log('📋 Getting server info...');
    const serverInfo = await customClient.getServerInfo();
    console.log('Server info:', serverInfo);
    console.log('');

    // Create a test profile
    console.log('👤 Creating test profile...');
    const testProfile = await customClient.createProfile({
      name: 'Test Profile',
      description: 'Profile created via direct client',
      gologinProfileId: CONFIG.gologin.profile_id
    });
    console.log('Test profile created:', testProfile);
    console.log('');

    // Upload test cookies
    console.log('🍪 Uploading test cookies...');
    const testCookies = [
      {
        name: 'test_cookie_1',
        value: 'test_value_1',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax'
      },
      {
        name: 'test_cookie_2',
        value: 'test_value_2',
        domain: '.test.com',
        path: '/',
        secure: false,
        httpOnly: true,
        sameSite: 'Strict'
      }
    ];

    const uploadResult = await customClient.uploadCookies(testProfile.id, testCookies);
    console.log('Upload result:', uploadResult);
    console.log('');

    // Download cookies
    console.log('📥 Downloading cookies...');
    const downloadResult = await customClient.downloadCookies(testProfile.id);
    console.log('Download result:', downloadResult);
    console.log('');

    // Create backup
    console.log('💾 Creating backup...');
    const backup = await customClient.createBackup(testProfile.id, 'Test Backup');
    console.log('Backup created:', backup);
    console.log('');

    // List backups
    console.log('📋 Listing backups...');
    const backups = await customClient.getBackups(testProfile.id);
    console.log('Backups:', backups);
    console.log('');

  } catch (error) {
    console.error('❌ Error in direct client example:', error.message);
  }
}

/**
 * Example 4: Browser Session with Custom Server
 */
async function browserSessionCustomServerExample() {
  console.log('🌐 Browser Session Custom Server Example\n');

  const gologin = new GoLogin({
    token: CONFIG.gologin.token,
    profile_id: CONFIG.gologin.profile_id,
    executablePath: CONFIG.gologin.executablePath
  });

  try {
    // Set custom server
    gologin.setCustomCookieServer(CONFIG.customServer);

    // Download latest cookies from custom server before starting
    console.log('📥 Downloading latest cookies from custom server...');
    const downloadResult = await gologin.downloadCookies({
      useCustomServer: true,
      customServerConfig: CONFIG.customServer
    });
    console.log('Download result:', downloadResult);
    console.log('');

    // Start browser
    console.log('🚀 Starting browser...');
    const browserResult = await gologin.start();
    console.log('Browser started:', browserResult.wsUrl);
    console.log('');

    // Simulate browsing session
    console.log('⏳ Simulating browsing session (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Upload cookies to custom server after browsing
    console.log('📤 Uploading cookies to custom server...');
    const uploadResult = await gologin.uploadCookies({
      useCustomServer: true,
      customServerConfig: CONFIG.customServer
    });
    console.log('Upload result:', uploadResult);
    console.log('');

    // Stop browser
    console.log('🛑 Stopping browser...');
    await gologin.stop();
    console.log('Browser stopped');

  } catch (error) {
    console.error('❌ Error in browser session example:', error.message);
    
    // Ensure browser is stopped
    try {
      await gologin.stop();
    } catch (stopError) {
      console.error('Error stopping browser:', stopError.message);
    }
  }
}

/**
 * Example 5: Comparison between GoLogin and Custom Server
 */
async function comparisonExample() {
  console.log('⚖️ Comparison Example: GoLogin vs Custom Server\n');

  const gologin = new GoLogin({
    token: CONFIG.gologin.token,
    profile_id: CONFIG.gologin.profile_id,
    executablePath: CONFIG.gologin.executablePath
  });

  try {
    // Get local cookies info
    const cookiesInfo = await gologin.getCookiesInfo();
    console.log('📊 Local cookies info:', {
      count: cookiesInfo.count,
      domains: cookiesInfo.domains?.length || 0
    });
    console.log('');

    // Upload to GoLogin server
    console.log('📤 Uploading to GoLogin server...');
    const startTime1 = Date.now();
    const gologinUpload = await gologin.uploadCookies();
    const gologinUploadTime = Date.now() - startTime1;
    console.log('GoLogin upload:', gologinUpload);
    console.log(`⏱️ Time: ${gologinUploadTime}ms\n`);

    // Upload to Custom server
    console.log('📤 Uploading to Custom server...');
    const startTime2 = Date.now();
    const customUpload = await gologin.uploadCookies({
      useCustomServer: true,
      customServerConfig: CONFIG.customServer
    });
    const customUploadTime = Date.now() - startTime2;
    console.log('Custom upload:', customUpload);
    console.log(`⏱️ Time: ${customUploadTime}ms\n`);

    // Performance comparison
    console.log('📊 Performance Comparison:');
    console.log(`GoLogin Server: ${gologinUploadTime}ms`);
    console.log(`Custom Server: ${customUploadTime}ms`);
    console.log(`Difference: ${Math.abs(gologinUploadTime - customUploadTime)}ms`);
    console.log(`Winner: ${gologinUploadTime < customUploadTime ? 'GoLogin' : 'Custom'} Server`);

  } catch (error) {
    console.error('❌ Error in comparison example:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🍪 Custom Cookie Server Examples\n');
  console.log('='.repeat(60));

  // Validate configuration
  if (!CONFIG.customServer.apiKey || CONFIG.customServer.apiKey === 'your-custom-server-api-key') {
    console.error('❌ Please set CUSTOM_COOKIE_API_KEY environment variable');
    process.exit(1);
  }

  if (!CONFIG.gologin.token || CONFIG.gologin.token === 'your-gologin-token') {
    console.error('❌ Please set GOLOGIN_API_TOKEN environment variable');
    process.exit(1);
  }

  try {
    // Run examples
    await basicCustomServerExample();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await fullSyncCustomServerExample();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await directCustomClientExample();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await comparisonExample();
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Uncomment to test browser session (takes longer)
    // await browserSessionCustomServerExample();

    console.log('✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  basicCustomServerExample,
  fullSyncCustomServerExample,
  directCustomClientExample,
  browserSessionCustomServerExample,
  comparisonExample
};
