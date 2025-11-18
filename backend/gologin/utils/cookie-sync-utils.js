import { promises as fs } from 'fs';
import { join } from 'path';
import { downloadCookies, uploadCookies } from '../browser/browser-user-data-manager.js';
import { getDB, loadCookiesFromFile } from '../cookies/cookies-manager.js';
import { API_URL } from './common.js';

/**
 * Enhanced cookie synchronization utilities for GoLogin
 * Provides seamless integration with existing GoLogin workflow
 */

/**
 * Sync cookies for a GoLogin instance
 * @param {Object} gologinInstance - GoLogin instance
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
export const syncCookiesForProfile = async (gologinInstance, options = {}) => {
  const {
    direction = 'both', // 'upload', 'download', 'both'
    force = false,
    backup = true,
    useCustomServer = false, // Use custom cookie server instead of GoLogin
    customServerConfig = null
  } = options;

  const profileId = gologinInstance.profile_id;
  const accessToken = gologinInstance.access_token;
  const profilePath = gologinInstance.profilePath();

  console.log(`🔄 [Cookie Sync] Starting ${direction} sync for profile: ${profileId}`);

  // Initialize custom server client if needed
  let customClient = null;
  if (useCustomServer) {
    try {
      customClient = new CustomCookieClient(customServerConfig);
      console.log(`🔗 [Cookie Sync] Using custom server: ${customClient.serverUrl}`);
    } catch (error) {
      console.error(`❌ [Cookie Sync] Failed to initialize custom server client:`, error);
      throw new Error(`Custom server initialization failed: ${error.message}`);
    }
  }

  const result = {
    profileId,
    direction,
    upload: null,
    download: null,
    success: false,
    error: null,
    serverType: useCustomServer ? 'custom' : 'gologin'
  };

  try {
    // Backup local cookies if requested
    if (backup && (direction === 'download' || direction === 'both')) {
      await backupLocalCookies(profileId, profilePath);
    }

    // Download from server
    if (direction === 'download' || direction === 'both') {
      console.log(`📥 [Cookie Sync] Downloading cookies from server...`);
      if (useCustomServer) {
        result.download = await downloadCookiesFromCustomServer(profileId, customClient, profilePath);
      } else {
        result.download = await downloadCookiesForProfile(profileId, accessToken, profilePath);
      }
    }

    // Upload to server
    if (direction === 'upload' || direction === 'both') {
      console.log(`📤 [Cookie Sync] Uploading cookies to server...`);
      if (useCustomServer) {
        result.upload = await uploadCookiesToCustomServer(profileId, customClient, profilePath);
      } else {
        result.upload = await uploadCookiesForProfile(profileId, accessToken, profilePath);
      }
    }

    result.success = true;
    console.log(`✅ [Cookie Sync] Sync completed successfully`);

  } catch (error) {
    result.error = error.message;
    console.error(`❌ [Cookie Sync] Sync failed:`, error);
  }

  return result;
};

/**
 * Upload cookies from local profile to server
 */
export const uploadCookiesForProfile = async (profileId, accessToken, profilePath) => {
  try {
    const cookiesFilePath = getCookiesFilePath(profileId, profilePath);
    
    // Check if cookies file exists
    try {
      await fs.access(cookiesFilePath);
    } catch {
      return {
        success: false,
        message: 'No local cookies file found',
        cookieCount: 0
      };
    }

    // Load cookies from local SQLite database
    const localCookies = await loadCookiesFromFile(cookiesFilePath);
    
    if (!localCookies || localCookies.length === 0) {
      return {
        success: false,
        message: 'No cookies found in local database',
        cookieCount: 0
      };
    }

    // Convert to server format
    const serverFormatCookies = localCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expirationDate,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: mapSameSiteFromNumber(cookie.sameSite)
    }));

    // Upload using existing GoLogin function
    await uploadCookies({
      cookies: serverFormatCookies,
      profileId,
      ACCESS_TOKEN: accessToken,
      API_BASE_URL: API_URL
    });

    return {
      success: true,
      message: 'Cookies uploaded successfully',
      cookieCount: localCookies.length
    };

  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Download cookies from server to local profile
 */
export const downloadCookiesForProfile = async (profileId, accessToken, profilePath) => {
  try {
    // Download from server using existing GoLogin function
    const downloadResponse = await downloadCookies({
      profileId,
      ACCESS_TOKEN: accessToken,
      API_BASE_URL: API_URL
    });

    const serverCookies = JSON.parse(downloadResponse).body || [];
    
    if (!serverCookies || serverCookies.length === 0) {
      return {
        success: false,
        message: 'No cookies found on server',
        cookieCount: 0
      };
    }

    // Write to local SQLite database
    const cookiesFilePath = getCookiesFilePath(profileId, profilePath);
    await writeCookiesToLocalDatabase(cookiesFilePath, serverCookies);

    return {
      success: true,
      message: 'Cookies downloaded successfully',
      cookieCount: serverCookies.length
    };

  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

/**
 * Get local cookies information
 */
export const getLocalCookiesInfo = async (profileId, profilePath) => {
  try {
    const cookiesFilePath = getCookiesFilePath(profileId, profilePath);
    
    // Check if file exists
    try {
      await fs.access(cookiesFilePath);
    } catch {
      return {
        exists: false,
        count: 0,
        path: cookiesFilePath,
        domains: [],
        lastModified: null
      };
    }

    // Get file stats
    const stats = await fs.stat(cookiesFilePath);
    
    // Load cookies to get count and domains
    const cookies = await loadCookiesFromFile(cookiesFilePath);
    const domains = [...new Set(cookies.map(c => c.domain))];

    return {
      exists: true,
      count: cookies.length,
      path: cookiesFilePath,
      domains,
      lastModified: stats.mtime,
      size: stats.size
    };

  } catch (error) {
    throw new Error(`Failed to get local cookies info: ${error.message}`);
  }
};

/**
 * Backup local cookies
 */
export const backupLocalCookies = async (profileId, profilePath) => {
  try {
    const cookiesFilePath = getCookiesFilePath(profileId, profilePath);
    const backupPath = `${cookiesFilePath}.backup.${Date.now()}`;
    
    try {
      await fs.access(cookiesFilePath);
      await fs.copyFile(cookiesFilePath, backupPath);
      console.log(`📋 [Cookie Backup] Created backup: ${backupPath}`);
      return backupPath;
    } catch {
      console.log(`📋 [Cookie Backup] No cookies file to backup`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [Cookie Backup] Backup failed:`, error);
    throw error;
  }
};

/**
 * Write cookies to local SQLite database
 */
const writeCookiesToLocalDatabase = async (cookiesFilePath, cookies) => {
  try {
    // Ensure directory exists
    const cookiesDir = join(cookiesFilePath, '..');
    await fs.mkdir(cookiesDir, { recursive: true });

    // Create empty file if it doesn't exist
    try {
      await fs.access(cookiesFilePath);
    } catch {
      await fs.writeFile(cookiesFilePath, '', { mode: 0o666 });
    }

    const db = await getDB(cookiesFilePath, false);
    
    // Clear existing cookies
    await db.run('DELETE FROM cookies');
    
    // Insert new cookies
    for (const cookie of cookies) {
      const creationTime = Date.now() * 1000; // Chrome uses microseconds
      const expirationTime = cookie.expires ? cookie.expires * 1000000 : 0;
      
      await db.run(`
        INSERT INTO cookies (
          creation_utc, host_key, top_frame_site_key, name, value, encrypted_value,
          path, expires_utc, is_secure, is_httponly, last_access_utc, has_expires,
          is_persistent, priority, samesite, source_scheme, source_port, is_same_party
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        creationTime, // creation_utc
        cookie.domain, // host_key
        '', // top_frame_site_key
        cookie.name, // name
        '', // value (empty for encrypted cookies)
        cookie.value, // encrypted_value
        cookie.path || '/', // path
        expirationTime, // expires_utc
        cookie.secure ? 1 : 0, // is_secure
        cookie.httpOnly ? 1 : 0, // is_httponly
        creationTime, // last_access_utc
        cookie.expires ? 1 : 0, // has_expires
        cookie.expires ? 1 : 0, // is_persistent
        1, // priority (medium)
        mapSameSiteToNumber(cookie.sameSite), // samesite
        cookie.secure ? 2 : 1, // source_scheme (1=http, 2=https)
        cookie.secure ? 443 : 80, // source_port
        0 // is_same_party
      ]);
    }

    await db.close();
    console.log(`✅ [Cookie Write] Successfully wrote ${cookies.length} cookies to database`);

  } catch (error) {
    console.error(`❌ [Cookie Write] Failed to write cookies:`, error);
    throw error;
  }
};

/**
 * Get cookies file path for profile
 */
const getCookiesFilePath = (profileId, profilePath) => {
  if (profilePath) {
    return join(profilePath, 'Default', 'Network', 'Cookies');
  }
  
  // Default path in temp directory
  const tmpdir = process.env.TEMP || process.env.TMP || '/tmp';
  return join(tmpdir, `gologin_profile_${profileId}`, 'Default', 'Network', 'Cookies');
};

/**
 * Map SameSite from number to string
 */
const mapSameSiteFromNumber = (value) => {
  switch (value) {
    case 2: return 'Strict';
    case 1: return 'Lax';
    case 0: return 'None';
    default: return 'Lax';
  }
};

/**
 * Map SameSite from string to number
 */
const mapSameSiteToNumber = (value) => {
  switch (value) {
    case 'Strict': return 2;
    case 'Lax': return 1;
    case 'None': return 0;
    default: return 1;
  }
};

/**
 * Upload cookies to custom server
 */
export const uploadCookiesToCustomServer = async (profileId, customClient, profilePath) => {
  try {
    const cookiesFilePath = getCookiesFilePath(profileId, profilePath);

    // Check if cookies file exists
    try {
      await fs.access(cookiesFilePath);
    } catch {
      return {
        success: false,
        message: 'No local cookies file found',
        cookieCount: 0
      };
    }

    // Load cookies from local SQLite database
    const localCookies = await loadCookiesFromFile(cookiesFilePath);

    if (!localCookies || localCookies.length === 0) {
      return {
        success: false,
        message: 'No cookies found in local database',
        cookieCount: 0
      };
    }

    // Convert to custom server format
    const serverFormatCookies = localCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expirationDate,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: mapSameSiteFromNumber(cookie.sameSite)
    }));

    // Ensure profile exists on custom server
    let profile = await customClient.getProfile(profileId);
    if (!profile) {
      profile = await customClient.createProfile({
        id: profileId,
        name: `Profile ${profileId}`,
        description: 'Auto-created profile for cookie sync',
        gologinProfileId: profileId
      });
    }

    // Upload using custom client
    const result = await customClient.uploadCookies(profileId, serverFormatCookies);

    return {
      success: true,
      message: 'Cookies uploaded to custom server successfully',
      cookieCount: localCookies.length,
      serverType: 'custom'
    };

  } catch (error) {
    throw new Error(`Custom server upload failed: ${error.message}`);
  }
};

/**
 * Download cookies from custom server
 */
export const downloadCookiesFromCustomServer = async (profileId, customClient, profilePath) => {
  try {
    // Download from custom server
    const downloadResult = await customClient.downloadCookies(profileId);

    if (!downloadResult.success || !downloadResult.cookies || downloadResult.cookies.length === 0) {
      return {
        success: false,
        message: 'No cookies found on custom server',
        cookieCount: 0
      };
    }

    // Write to local SQLite database
    const cookiesFilePath = getCookiesFilePath(profileId, profilePath);
    await writeCookiesToLocalDatabase(cookiesFilePath, downloadResult.cookies);

    return {
      success: true,
      message: 'Cookies downloaded from custom server successfully',
      cookieCount: downloadResult.cookies.length,
      serverType: 'custom'
    };

  } catch (error) {
    throw new Error(`Custom server download failed: ${error.message}`);
  }
};

/**
 * Enhanced GoLogin class methods
 * Add these methods to the existing GoLogin class
 */
export const enhanceGoLoginWithCookieSync = (GoLoginClass) => {
  // Add cookie sync methods to GoLogin prototype
  GoLoginClass.prototype.uploadCookies = async function(options = {}) {
    if (options.useCustomServer) {
      const customClient = new CustomCookieClient(options.customServerConfig);
      return uploadCookiesToCustomServer(this.profile_id, customClient, this.profilePath());
    }
    return uploadCookiesForProfile(this.profile_id, this.access_token, this.profilePath(), options);
  };

  GoLoginClass.prototype.downloadCookies = async function(options = {}) {
    if (options.useCustomServer) {
      const customClient = new CustomCookieClient(options.customServerConfig);
      return downloadCookiesFromCustomServer(this.profile_id, customClient, this.profilePath());
    }
    return downloadCookiesForProfile(this.profile_id, this.access_token, this.profilePath(), options);
  };

  GoLoginClass.prototype.syncCookies = async function(options = {}) {
    return syncCookiesForProfile(this, options);
  };

  GoLoginClass.prototype.getCookiesInfo = async function() {
    return getLocalCookiesInfo(this.profile_id, this.profilePath());
  };

  GoLoginClass.prototype.backupCookies = async function() {
    return backupLocalCookies(this.profile_id, this.profilePath());
  };

  // Custom server specific methods
  GoLoginClass.prototype.setCustomCookieServer = function(serverConfig) {
    this.customCookieServerConfig = serverConfig;
  };

  GoLoginClass.prototype.testCustomCookieServer = async function(serverConfig) {
    try {
      const customClient = new CustomCookieClient(serverConfig || this.customCookieServerConfig);
      return await customClient.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  return GoLoginClass;
};
