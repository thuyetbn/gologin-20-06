/**
 * Cookie Service Layer
 * Business logic cho cookie operations
 */


export class CookieService {
  constructor(database) {
    this.db = database;
  }

  // Profile management
  async createProfile(profileData) {
    try {
      // Validate required fields
      if (!profileData.name || !profileData.userId) {
        throw new Error('Profile name and user ID are required');
      }

      // Check if profile with same name exists for user
      const existingProfiles = await this.db.getProfilesByUserId(profileData.userId);
      const nameExists = existingProfiles.some(p => p.name === profileData.name);
      
      if (nameExists) {
        throw new Error('Profile with this name already exists');
      }

      const profile = await this.db.createProfile(profileData);
      
      console.log(`✅ Profile created: ${profile.name} (${profile.id})`);
      return profile;
      
    } catch (error) {
      console.error('❌ Failed to create profile:', error);
      throw error;
    }
  }

  async getProfile(profileId, userId) {
    try {
      const profile = await this.db.getProfileById(profileId);
      
      if (!profile) {
        return null;
      }

      // Check ownership
      if (profile.user_id !== userId) {
        throw new Error('Access denied: Profile not owned by user');
      }

      // Add additional info
      const [cookieCount, domains, recentSyncs] = await Promise.all([
        this.db.getCookieCount(profileId),
        this.db.getCookieDomains(profileId),
        this.db.getSyncLogs(profileId, 5)
      ]);

      return {
        ...profile,
        stats: {
          cookieCount,
          domainCount: domains.length,
          domains: domains.slice(0, 10), // Top 10 domains
          recentSyncs
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get profile:', error);
      throw error;
    }
  }

  async getAllProfiles(userId) {
    try {
      const profiles = await this.db.getProfilesByUserId(userId);
      
      // Add stats for each profile
      const profilesWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const [cookieCount, domains] = await Promise.all([
            this.db.getCookieCount(profile.id),
            this.db.getCookieDomains(profile.id)
          ]);

          return {
            ...profile,
            stats: {
              cookieCount,
              domainCount: domains.length
            }
          };
        })
      );

      return profilesWithStats;
      
    } catch (error) {
      console.error('❌ Failed to get profiles:', error);
      throw error;
    }
  }

  async deleteProfile(profileId, userId) {
    try {
      const profile = await this.db.getProfileById(profileId);
      
      if (!profile) {
        return false;
      }

      // Check ownership
      if (profile.user_id !== userId) {
        throw new Error('Access denied: Profile not owned by user');
      }

      const deleted = await this.db.deleteProfile(profileId);
      
      if (deleted) {
        console.log(`✅ Profile deleted: ${profile.name} (${profileId})`);
      }
      
      return deleted;
      
    } catch (error) {
      console.error('❌ Failed to delete profile:', error);
      throw error;
    }
  }

  // Cookie management
  async saveCookies(profileId, userId, cookies, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      // Validate cookies
      const validatedCookies = this.validateCookies(cookies);
      
      // Save cookies
      const result = await this.db.saveCookies(profileId, validatedCookies, options);
      
      // Log the operation
      await this.logSyncOperation(profileId, 'upload', 'completed', result.savedCount);
      
      console.log(`✅ Saved ${result.savedCount} cookies for profile ${profileId}`);
      return result;
      
    } catch (error) {
      // Log failed operation
      await this.logSyncOperation(profileId, 'upload', 'failed', 0, error.message);
      console.error('❌ Failed to save cookies:', error);
      throw error;
    }
  }

  async getCookies(profileId, userId, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      const cookies = await this.db.getCookies(profileId, options);
      
      // Log the operation
      await this.logSyncOperation(profileId, 'download', 'completed', cookies.length);
      
      console.log(`✅ Retrieved ${cookies.length} cookies for profile ${profileId}`);
      return cookies;
      
    } catch (error) {
      // Log failed operation
      await this.logSyncOperation(profileId, 'download', 'failed', 0, error.message);
      console.error('❌ Failed to get cookies:', error);
      throw error;
    }
  }

  async deleteCookies(profileId, userId, filters = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      const deletedCount = await this.db.deleteCookies(profileId, filters);
      
      console.log(`✅ Deleted ${deletedCount} cookies for profile ${profileId}`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Failed to delete cookies:', error);
      throw error;
    }
  }

  // Sync operations
  async getSyncStatus(profileId, userId) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      const [cookieCount, domains, recentSyncs] = await Promise.all([
        this.db.getCookieCount(profileId),
        this.db.getCookieDomains(profileId),
        this.db.getSyncLogs(profileId, 10)
      ]);

      const lastSync = recentSyncs[0];
      const syncStats = recentSyncs.reduce((acc, sync) => {
        acc[sync.status] = (acc[sync.status] || 0) + 1;
        return acc;
      }, {});

      return {
        cookieCount,
        domainCount: domains.length,
        lastSync: lastSync ? {
          direction: lastSync.direction,
          status: lastSync.status,
          timestamp: lastSync.started_at,
          cookiesCount: lastSync.cookies_count
        } : null,
        syncStats,
        recentSyncs: recentSyncs.slice(0, 5)
      };
      
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      throw error;
    }
  }

  async performSync(profileId, userId, direction = 'both') {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      const syncLogId = await this.db.createSyncLog({
        profileId,
        direction,
        status: 'running'
      });

      let result = {
        direction,
        upload: null,
        download: null,
        success: false
      };

      try {
        if (direction === 'upload' || direction === 'both') {
          // For upload, we would typically get cookies from client
          // This is a placeholder for the sync logic
          result.upload = {
            status: 'completed',
            cookiesCount: 0,
            message: 'Upload sync completed'
          };
        }

        if (direction === 'download' || direction === 'both') {
          const cookies = await this.db.getCookies(profileId);
          result.download = {
            status: 'completed',
            cookiesCount: cookies.length,
            message: 'Download sync completed'
          };
        }

        result.success = true;
        
        await this.db.updateSyncLog(syncLogId, {
          status: 'completed',
          cookies_count: (result.upload?.cookiesCount || 0) + (result.download?.cookiesCount || 0)
        });

        console.log(`✅ Sync completed for profile ${profileId}: ${direction}`);
        return result;
        
      } catch (syncError) {
        await this.db.updateSyncLog(syncLogId, {
          status: 'failed',
          error_message: syncError.message
        });
        throw syncError;
      }
      
    } catch (error) {
      console.error('❌ Failed to perform sync:', error);
      throw error;
    }
  }

  // Browser data operations
  async saveBrowserHistory(profileId, userId, historyItems, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      // Validate history items
      const validatedHistory = this.validateHistoryItems(historyItems);

      // Save history
      const result = await this.db.saveBrowserHistory(profileId, validatedHistory, options);

      console.log(`✅ Saved ${result.savedCount} history items for profile ${profileId}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to save browser history:', error);
      throw error;
    }
  }

  async getBrowserHistory(profileId, userId, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      return this.db.getBrowserHistory(profileId, options);

    } catch (error) {
      console.error('❌ Failed to get browser history:', error);
      throw error;
    }
  }

  async saveSavedPasswords(profileId, userId, passwords, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      // Validate passwords
      const validatedPasswords = this.validatePasswords(passwords);

      // Save passwords
      const result = await this.db.saveSavedPasswords(profileId, validatedPasswords, options);

      console.log(`✅ Saved ${result.savedCount} passwords for profile ${profileId}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to save passwords:', error);
      throw error;
    }
  }

  async getSavedPasswords(profileId, userId, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      return this.db.getSavedPasswords(profileId, options);

    } catch (error) {
      console.error('❌ Failed to get saved passwords:', error);
      throw error;
    }
  }

  async saveBookmarks(profileId, userId, bookmarks, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      // Validate bookmarks
      const validatedBookmarks = this.validateBookmarks(bookmarks);

      // Save bookmarks
      const result = await this.db.saveBookmarks(profileId, validatedBookmarks, options);

      console.log(`✅ Saved ${result.savedCount} bookmarks for profile ${profileId}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to save bookmarks:', error);
      throw error;
    }
  }

  async getBookmarks(profileId, userId, options = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      return this.db.getBookmarks(profileId, options);

    } catch (error) {
      console.error('❌ Failed to get bookmarks:', error);
      throw error;
    }
  }

  // Enhanced backup operations
  async createBackup(profileId, userId, backupOptions = {}) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      const {
        name,
        description,
        includeTypes = ['cookies', 'history', 'passwords', 'bookmarks']
      } = backupOptions;

      // Create full backup with all data types
      const backup = await this.db.createFullBackup(
        profileId,
        name || `Full Backup ${new Date().toISOString()}`
      );

      console.log(`✅ Full backup created for profile ${profileId}: ${backup.name}`);
      return backup;

    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  async getBackups(profileId, userId) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      return this.db.getBackups(profileId);
      
    } catch (error) {
      console.error('❌ Failed to get backups:', error);
      throw error;
    }
  }

  async restoreBackup(profileId, backupId, userId) {
    try {
      // Verify profile ownership
      const profile = await this.db.getProfileById(profileId);
      if (!profile || profile.user_id !== userId) {
        throw new Error('Access denied: Profile not found or not owned by user');
      }

      // Get backup data
      const backup = await this.db.getBackupById(backupId);
      if (!backup || backup.profile_id !== profileId) {
        throw new Error('Backup not found or not owned by profile');
      }

      // Create current backup before restore
      await this.createBackup(profileId, userId, `Pre-restore backup ${new Date().toISOString()}`);

      // Restore cookies
      const result = await this.db.saveCookies(profileId, backup.cookies, { replace: true });
      
      console.log(`✅ Backup restored for profile ${profileId}: ${backup.name}`);
      return {
        restoredCount: result.savedCount,
        backupName: backup.name,
        backupDate: backup.created_at
      };
      
    } catch (error) {
      console.error('❌ Failed to restore backup:', error);
      throw error;
    }
  }

  // System operations
  async getSystemStats() {
    try {
      return this.db.getSystemStats();
    } catch (error) {
      console.error('❌ Failed to get system stats:', error);
      throw error;
    }
  }

  // Utility methods
  validateCookies(cookies) {
    if (!Array.isArray(cookies)) {
      throw new Error('Cookies must be an array');
    }

    return cookies.map((cookie, index) => {
      // Required fields
      if (!cookie.name || typeof cookie.name !== 'string') {
        throw new Error(`Cookie ${index}: name is required and must be a string`);
      }

      if (!cookie.domain || typeof cookie.domain !== 'string') {
        throw new Error(`Cookie ${index}: domain is required and must be a string`);
      }

      if (cookie.value === undefined || cookie.value === null) {
        throw new Error(`Cookie ${index}: value is required`);
      }

      // Validate sameSite
      const validSameSite = ['Strict', 'Lax', 'None'];
      if (cookie.sameSite && !validSameSite.includes(cookie.sameSite)) {
        throw new Error(`Cookie ${index}: sameSite must be one of ${validSameSite.join(', ')}`);
      }

      // Validate expires
      if (cookie.expires && isNaN(new Date(cookie.expires).getTime())) {
        throw new Error(`Cookie ${index}: expires must be a valid date`);
      }

      return {
        name: cookie.name,
        value: String(cookie.value),
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: Boolean(cookie.httpOnly),
        secure: Boolean(cookie.secure),
        sameSite: cookie.sameSite || 'Lax'
      };
    });
  }

  validateHistoryItems(historyItems) {
    if (!Array.isArray(historyItems)) {
      throw new Error('History items must be an array');
    }

    return historyItems.map((item, index) => {
      if (!item.url || typeof item.url !== 'string') {
        throw new Error(`History item ${index}: url is required and must be a string`);
      }

      if (item.url.length > 2048) {
        throw new Error(`History item ${index}: url must be less than 2048 characters`);
      }

      if (item.title && typeof item.title !== 'string') {
        throw new Error(`History item ${index}: title must be a string`);
      }

      if (item.visitCount && (!Number.isInteger(item.visitCount) || item.visitCount < 0)) {
        throw new Error(`History item ${index}: visitCount must be a positive integer`);
      }

      return {
        url: item.url,
        title: item.title || '',
        visitCount: item.visitCount || 1,
        lastVisitTime: item.lastVisitTime || Date.now()
      };
    });
  }

  validatePasswords(passwords) {
    if (!Array.isArray(passwords)) {
      throw new Error('Passwords must be an array');
    }

    return passwords.map((password, index) => {
      if (!password.originUrl || typeof password.originUrl !== 'string') {
        throw new Error(`Password ${index}: originUrl is required and must be a string`);
      }

      if (!password.passwordValue || typeof password.passwordValue !== 'string') {
        throw new Error(`Password ${index}: passwordValue is required and must be a string`);
      }

      if (password.usernameValue && typeof password.usernameValue !== 'string') {
        throw new Error(`Password ${index}: usernameValue must be a string`);
      }

      return {
        originUrl: password.originUrl,
        actionUrl: password.actionUrl || '',
        usernameElement: password.usernameElement || '',
        usernameValue: password.usernameValue || '',
        passwordElement: password.passwordElement || '',
        passwordValue: password.passwordValue,
        submitElement: password.submitElement || '',
        signonRealm: password.signonRealm || password.originUrl,
        blacklistedByUser: Boolean(password.blacklistedByUser),
        scheme: password.scheme || 0,
        passwordType: password.passwordType || 0,
        timesUsed: password.timesUsed || 0,
        formData: password.formData || null
      };
    });
  }

  validateBookmarks(bookmarks) {
    if (!Array.isArray(bookmarks)) {
      throw new Error('Bookmarks must be an array');
    }

    return bookmarks.map((bookmark, index) => {
      if (!bookmark.title || typeof bookmark.title !== 'string') {
        throw new Error(`Bookmark ${index}: title is required and must be a string`);
      }

      if (bookmark.type === 'url' && (!bookmark.url || typeof bookmark.url !== 'string')) {
        throw new Error(`Bookmark ${index}: url is required for url type bookmarks`);
      }

      if (bookmark.url && bookmark.url.length > 2048) {
        throw new Error(`Bookmark ${index}: url must be less than 2048 characters`);
      }

      return {
        url: bookmark.url || '',
        title: bookmark.title,
        dateAdded: bookmark.dateAdded || Date.now(),
        dateModified: bookmark.dateModified || Date.now(),
        parentId: bookmark.parentId || null,
        position: bookmark.position || 0,
        type: bookmark.type || 'url'
      };
    });
  }

  async logSyncOperation(profileId, direction, status, cookiesCount = 0, errorMessage = null) {
    try {
      const logData = {
        profileId,
        direction,
        status,
        cookiesCount
      };

      const logId = await this.db.createSyncLog(logData);
      
      if (status === 'failed' && errorMessage) {
        await this.db.updateSyncLog(logId, {
          error_message: errorMessage
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to log sync operation:', error);
      // Don't throw here to avoid masking the original error
    }
  }
}
