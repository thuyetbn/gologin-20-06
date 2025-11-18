/**
 * Example: Cookie Synchronization with GoLogin
 * 
 * This example demonstrates how to use the new cookie sync features
 * integrated into the GoLogin library.
 */

import { GoLogin } from '../gologin/gologin.js';

// Configuration
const CONFIG = {
  token: process.env.GOLOGIN_API_TOKEN || 'your-api-token-here',
  profile_id: process.env.GOLOGIN_PROFILE_ID || 'your-profile-id-here',
  executablePath: process.env.GOLOGIN_EXECUTABLE_PATH || null
};

/**
 * Example 1: Basic Cookie Upload/Download
 */
async function basicCookieSync() {
  console.log('🚀 Starting Basic Cookie Sync Example...\n');

  const gologin = new GoLogin({
    token: CONFIG.token,
    profile_id: CONFIG.profile_id,
    executablePath: CONFIG.executablePath
  });

  try {
    // 1. Get current local cookies info
    console.log('📊 Getting local cookies info...');
    const cookiesInfo = await gologin.getCookiesInfo();
    console.log('Local cookies:', cookiesInfo);
    console.log('');

    // 2. Upload local cookies to server
    if (cookiesInfo.exists && cookiesInfo.count > 0) {
      console.log('📤 Uploading cookies to server...');
      const uploadResult = await gologin.uploadCookies();
      console.log('Upload result:', uploadResult);
      console.log('');
    } else {
      console.log('⚠️ No local cookies found to upload\n');
    }

    // 3. Download cookies from server
    console.log('📥 Downloading cookies from server...');
    const downloadResult = await gologin.downloadCookies();
    console.log('Download result:', downloadResult);
    console.log('');

    // 4. Check updated local cookies info
    console.log('📊 Getting updated local cookies info...');
    const updatedInfo = await gologin.getCookiesInfo();
    console.log('Updated local cookies:', updatedInfo);

  } catch (error) {
    console.error('❌ Error in basic cookie sync:', error.message);
  }
}

/**
 * Example 2: Full Cookie Synchronization
 */
async function fullCookieSync() {
  console.log('🔄 Starting Full Cookie Sync Example...\n');

  const gologin = new GoLogin({
    token: CONFIG.token,
    profile_id: CONFIG.profile_id,
    executablePath: CONFIG.executablePath
  });

  try {
    // 1. Create backup before sync
    console.log('💾 Creating backup...');
    const backupPath = await gologin.backupCookies();
    if (backupPath) {
      console.log('Backup created:', backupPath);
    } else {
      console.log('No cookies to backup');
    }
    console.log('');

    // 2. Perform full sync (download + upload)
    console.log('🔄 Performing full sync...');
    const syncResult = await gologin.syncCookies({
      direction: 'both', // 'upload', 'download', or 'both'
      force: false,
      backup: true
    });

    console.log('Sync result:', syncResult);
    console.log('');

    // 3. Display sync summary
    if (syncResult.success) {
      console.log('✅ Sync completed successfully!');
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
    console.error('❌ Error in full cookie sync:', error.message);
  }
}

/**
 * Example 3: Cookie Sync with Browser Session
 */
async function cookieSyncWithBrowser() {
  console.log('🌐 Starting Cookie Sync with Browser Example...\n');

  const gologin = new GoLogin({
    token: CONFIG.token,
    profile_id: CONFIG.profile_id,
    executablePath: CONFIG.executablePath,
    uploadCookiesToServer: true,  // Auto-upload cookies on browser close
    writeCookiesFromServer: true  // Auto-download cookies on browser start
  });

  try {
    // 1. Download latest cookies before starting browser
    console.log('📥 Downloading latest cookies from server...');
    const downloadResult = await gologin.downloadCookies();
    console.log('Download result:', downloadResult);
    console.log('');

    // 2. Start browser
    console.log('🚀 Starting browser...');
    const browserResult = await gologin.start();
    console.log('Browser started:', browserResult.wsUrl);
    console.log('');

    // 3. Simulate some browsing time
    console.log('⏳ Simulating browsing session (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. Upload cookies after browsing
    console.log('📤 Uploading cookies after browsing...');
    const uploadResult = await gologin.uploadCookies();
    console.log('Upload result:', uploadResult);
    console.log('');

    // 5. Stop browser
    console.log('🛑 Stopping browser...');
    await gologin.stop();
    console.log('Browser stopped');

  } catch (error) {
    console.error('❌ Error in browser cookie sync:', error.message);
    
    // Ensure browser is stopped on error
    try {
      await gologin.stop();
    } catch (stopError) {
      console.error('Error stopping browser:', stopError.message);
    }
  }
}

/**
 * Example 4: Monitoring Cookie Changes
 */
async function monitorCookieChanges() {
  console.log('👀 Starting Cookie Monitoring Example...\n');

  const gologin = new GoLogin({
    token: CONFIG.token,
    profile_id: CONFIG.profile_id,
    executablePath: CONFIG.executablePath
  });

  try {
    // 1. Get initial state
    console.log('📊 Getting initial cookie state...');
    let initialInfo = await gologin.getCookiesInfo();
    console.log('Initial cookies:', {
      count: initialInfo.count,
      domains: initialInfo.domains?.length || 0,
      lastModified: initialInfo.lastModified
    });
    console.log('');

    // 2. Download from server
    console.log('📥 Downloading from server...');
    await gologin.downloadCookies();

    // 3. Check changes
    console.log('📊 Checking changes after download...');
    let afterDownload = await gologin.getCookiesInfo();
    console.log('After download:', {
      count: afterDownload.count,
      domains: afterDownload.domains?.length || 0,
      countChange: afterDownload.count - initialInfo.count
    });
    console.log('');

    // 4. Upload back to server
    console.log('📤 Uploading back to server...');
    const uploadResult = await gologin.uploadCookies();
    console.log('Upload result:', uploadResult);

  } catch (error) {
    console.error('❌ Error in cookie monitoring:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🍪 GoLogin Cookie Sync Examples\n');
  console.log('='.repeat(50));

  // Validate configuration
  if (!CONFIG.token || CONFIG.token === 'your-api-token-here') {
    console.error('❌ Please set GOLOGIN_API_TOKEN environment variable');
    process.exit(1);
  }

  if (!CONFIG.profile_id || CONFIG.profile_id === 'your-profile-id-here') {
    console.error('❌ Please set GOLOGIN_PROFILE_ID environment variable');
    process.exit(1);
  }

  try {
    // Run examples
    await basicCookieSync();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await fullCookieSync();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await monitorCookieChanges();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Uncomment to test with browser (takes longer)
    // await cookieSyncWithBrowser();

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
  basicCookieSync,
  fullCookieSync,
  cookieSyncWithBrowser,
  monitorCookieChanges
};
