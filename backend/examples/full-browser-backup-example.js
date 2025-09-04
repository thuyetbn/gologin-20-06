/**
 * Example: Full Browser Data Backup
 * 
 * Demonstrates how to backup cookies, history, passwords, and bookmarks
 * to custom server from Chrome profile
 */

import { GoLogin } from '../gologin/gologin.js';
import { BrowserDataExtractor } from '../gologin/utils/browser-data-extractor.js';
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
 * Example 1: Extract and Backup All Browser Data
 */
async function extractAndBackupAllData() {
  console.log('🚀 Extract and Backup All Browser Data Example\n');

  const gologin = new GoLogin({
    token: CONFIG.gologin.token,
    profile_id: CONFIG.gologin.profile_id,
    executablePath: CONFIG.gologin.executablePath
  });

  try {
    // Get profile path
    const profilePath = gologin.profilePath();
    console.log(`📁 Profile path: ${profilePath}\n`);

    // Create data extractor
    const extractor = new BrowserDataExtractor(profilePath);

    // Check what data is available
    console.log('🔍 Checking available data...');
    const availability = await extractor.checkAvailableData();
    
    for (const [dataType, info] of Object.entries(availability)) {
      console.log(`${info.available ? '✅' : '❌'} ${dataType}: ${info.available ? `${info.size} bytes` : 'Not found'}`);
    }
    console.log('');

    // Extract all data
    console.log('📤 Extracting all browser data...');
    const extractedData = await extractor.extractAllData();
    
    console.log('Extracted data summary:');
    console.log(`🍪 Cookies: ${extractedData.cookies.length}`);
    console.log(`📚 History: ${extractedData.history.length}`);
    console.log(`🔐 Passwords: ${extractedData.passwords.length}`);
    console.log(`🔖 Bookmarks: ${extractedData.bookmarks.length}`);
    console.log('');

    // Create custom server client
    const customClient = new CustomCookieClient(CONFIG.customServer);

    // Test connection
    console.log('🔗 Testing custom server connection...');
    const connectionTest = await customClient.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Custom server connection failed: ${connectionTest.error}`);
    }
    console.log('✅ Custom server connection successful\n');

    // Create or get profile on custom server
    console.log('👤 Setting up profile on custom server...');
    let profile = await customClient.getProfile(CONFIG.gologin.profile_id);
    if (!profile) {
      profile = await customClient.createProfile({
        id: CONFIG.gologin.profile_id,
        name: `GoLogin Profile ${CONFIG.gologin.profile_id}`,
        description: 'Auto-created profile for full browser data backup',
        gologinProfileId: CONFIG.gologin.profile_id
      });
      console.log(`✅ Profile created: ${profile.name}`);
    } else {
      console.log(`✅ Profile found: ${profile.name}`);
    }
    console.log('');

    // Upload all data to custom server
    console.log('📤 Uploading all data to custom server...');
    
    const uploadResults = {};

    // Upload cookies
    if (extractedData.cookies.length > 0) {
      console.log(`📤 Uploading ${extractedData.cookies.length} cookies...`);
      uploadResults.cookies = await customClient.uploadCookies(profile.id, extractedData.cookies);
      console.log(`✅ Cookies uploaded: ${uploadResults.cookies.data.savedCount} saved`);
    }

    // Upload history
    if (extractedData.history.length > 0) {
      console.log(`📤 Uploading ${extractedData.history.length} history items...`);
      const historyResponse = await fetch(`${CONFIG.customServer.serverUrl}/api/profiles/${profile.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.customServer.apiKey}`
        },
        body: JSON.stringify({
          history: extractedData.history,
          replace: true
        })
      });
      uploadResults.history = await historyResponse.json();
      console.log(`✅ History uploaded: ${uploadResults.history.data.savedCount} saved`);
    }

    // Upload passwords
    if (extractedData.passwords.length > 0) {
      console.log(`📤 Uploading ${extractedData.passwords.length} passwords...`);
      const passwordsResponse = await fetch(`${CONFIG.customServer.serverUrl}/api/profiles/${profile.id}/passwords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.customServer.apiKey}`
        },
        body: JSON.stringify({
          passwords: extractedData.passwords,
          replace: true,
          encrypt: true
        })
      });
      uploadResults.passwords = await passwordsResponse.json();
      console.log(`✅ Passwords uploaded: ${uploadResults.passwords.data.savedCount} saved`);
    }

    // Upload bookmarks
    if (extractedData.bookmarks.length > 0) {
      console.log(`📤 Uploading ${extractedData.bookmarks.length} bookmarks...`);
      const bookmarksResponse = await fetch(`${CONFIG.customServer.serverUrl}/api/profiles/${profile.id}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.customServer.apiKey}`
        },
        body: JSON.stringify({
          bookmarks: extractedData.bookmarks,
          replace: true
        })
      });
      uploadResults.bookmarks = await bookmarksResponse.json();
      console.log(`✅ Bookmarks uploaded: ${uploadResults.bookmarks.data.savedCount} saved`);
    }

    console.log('');

    // Create full backup
    console.log('💾 Creating full backup...');
    const backup = await customClient.createBackup(profile.id, `Full Browser Backup ${new Date().toISOString()}`);
    console.log(`✅ Backup created: ${backup.name}`);
    console.log(`📊 Backup ID: ${backup.id}`);
    console.log(`📝 Description: ${backup.description}`);

    return {
      extractedData,
      uploadResults,
      backup,
      profile
    };

  } catch (error) {
    console.error('❌ Error in extract and backup example:', error.message);
    throw error;
  }
}

/**
 * Example 2: Selective Data Backup
 */
async function selectiveDataBackup() {
  console.log('🎯 Selective Data Backup Example\n');

  const gologin = new GoLogin({
    token: CONFIG.gologin.token,
    profile_id: CONFIG.gologin.profile_id,
    executablePath: CONFIG.gologin.executablePath
  });

  try {
    const profilePath = gologin.profilePath();
    const extractor = new BrowserDataExtractor(profilePath);
    const customClient = new CustomCookieClient(CONFIG.customServer);

    // Extract only cookies and history
    console.log('📤 Extracting cookies and history only...');
    const [cookies, history] = await Promise.all([
      extractor.extractCookies(),
      extractor.extractHistory()
    ]);

    console.log(`🍪 Extracted ${cookies.length} cookies`);
    console.log(`📚 Extracted ${history.length} history items\n`);

    // Upload to server
    const profileId = CONFIG.gologin.profile_id;
    
    console.log('📤 Uploading selective data...');
    const response = await fetch(`${CONFIG.customServer.serverUrl}/api/profiles/${profileId}/browser-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.customServer.apiKey}`
      },
      body: JSON.stringify({
        cookies,
        history,
        replace: false // Append to existing data
      })
    });

    const result = await response.json();
    console.log('✅ Selective backup completed:', result.message);

    return result;

  } catch (error) {
    console.error('❌ Error in selective backup example:', error.message);
    throw error;
  }
}

/**
 * Example 3: Restore from Backup
 */
async function restoreFromBackup() {
  console.log('🔄 Restore from Backup Example\n');

  try {
    const customClient = new CustomCookieClient(CONFIG.customServer);
    const profileId = CONFIG.gologin.profile_id;

    // List available backups
    console.log('📋 Listing available backups...');
    const backups = await customClient.getBackups(profileId);
    
    if (backups.length === 0) {
      console.log('❌ No backups found');
      return;
    }

    console.log(`Found ${backups.length} backups:`);
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name} (${backup.created_at})`);
      console.log(`   📊 Size: ${backup.totalSize} bytes`);
      console.log(`   🍪 Cookies: ${backup.hasCookies ? '✅' : '❌'}`);
      console.log(`   📚 History: ${backup.hasHistory ? '✅' : '❌'}`);
      console.log(`   🔐 Passwords: ${backup.hasPasswords ? '✅' : '❌'}`);
      console.log(`   🔖 Bookmarks: ${backup.hasBookmarks ? '✅' : '❌'}`);
    });

    // Restore latest backup
    const latestBackup = backups[0];
    console.log(`\n🔄 Restoring latest backup: ${latestBackup.name}`);
    
    const restoreResult = await customClient.restoreBackup(profileId, latestBackup.id);
    console.log(`✅ Backup restored: ${restoreResult.restoredCount} items restored`);

    return restoreResult;

  } catch (error) {
    console.error('❌ Error in restore example:', error.message);
    throw error;
  }
}

/**
 * Example 4: Monitor Backup Status
 */
async function monitorBackupStatus() {
  console.log('📊 Monitor Backup Status Example\n');

  try {
    const customClient = new CustomCookieClient(CONFIG.customServer);
    const profileId = CONFIG.gologin.profile_id;

    // Get profile with stats
    const profile = await customClient.getProfile(profileId);
    
    if (!profile) {
      console.log('❌ Profile not found');
      return;
    }

    console.log(`👤 Profile: ${profile.name}`);
    console.log(`📊 Statistics:`);
    console.log(`   🍪 Cookies: ${profile.stats.cookieCount}`);
    console.log(`   📚 History: ${profile.stats.historyCount || 0}`);
    console.log(`   🔐 Passwords: ${profile.stats.passwordCount || 0}`);
    console.log(`   🔖 Bookmarks: ${profile.stats.bookmarkCount || 0}`);
    console.log(`   📁 Domains: ${profile.stats.domainCount}`);

    // Get recent sync logs
    if (profile.stats.recentSyncs && profile.stats.recentSyncs.length > 0) {
      console.log(`\n📝 Recent Syncs:`);
      profile.stats.recentSyncs.forEach(sync => {
        console.log(`   ${sync.direction} - ${sync.status} (${sync.started_at})`);
      });
    }

    return profile;

  } catch (error) {
    console.error('❌ Error in monitor example:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🍪 Full Browser Data Backup Examples\n');
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
    await extractAndBackupAllData();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await selectiveDataBackup();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await restoreFromBackup();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await monitorBackupStatus();

    console.log('\n✅ All examples completed successfully!');

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
  extractAndBackupAllData,
  selectiveDataBackup,
  restoreFromBackup,
  monitorBackupStatus
};
