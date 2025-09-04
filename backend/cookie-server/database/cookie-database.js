/**
 * Cookie Database Layer
 * Quản lý database cho cookie storage server
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export class CookieDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(this.dbPath), { recursive: true });

      // Open database
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');
      await this.db.exec('PRAGMA journal_mode = WAL');

      // Create tables
      await this.createTables();
      
      console.log(`✅ Database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    // Users table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        api_key TEXT UNIQUE NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Profiles table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        gologin_profile_id TEXT,
        settings JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Cookies table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS cookies (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        domain TEXT NOT NULL,
        path TEXT DEFAULT '/',
        expires_at DATETIME,
        http_only BOOLEAN DEFAULT FALSE,
        secure BOOLEAN DEFAULT FALSE,
        same_site TEXT DEFAULT 'Lax',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        UNIQUE(profile_id, domain, path, name)
      )
    `);

    // Sync logs table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        status TEXT NOT NULL,
        cookies_count INTEGER DEFAULT 0,
        error_message TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      )
    `);

    // Browser history table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS browser_history (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        visit_count INTEGER DEFAULT 1,
        last_visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      )
    `);

    // Saved passwords table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_passwords (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        origin_url TEXT NOT NULL,
        action_url TEXT,
        username_element TEXT,
        username_value TEXT,
        password_element TEXT,
        password_value TEXT NOT NULL,
        submit_element TEXT,
        signon_realm TEXT,
        date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
        blacklisted_by_user BOOLEAN DEFAULT FALSE,
        scheme INTEGER DEFAULT 0,
        password_type INTEGER DEFAULT 0,
        times_used INTEGER DEFAULT 0,
        form_data TEXT,
        date_synced DATETIME,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      )
    `);

    // Bookmarks table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        parent_id TEXT,
        position INTEGER DEFAULT 0,
        type TEXT DEFAULT 'url',
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      )
    `);

    // Backups table (updated to include all data types)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        backup_type TEXT DEFAULT 'full',
        cookies_data TEXT,
        history_data TEXT,
        passwords_data TEXT,
        bookmarks_data TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await this.createIndexes();
  }

  async createIndexes() {
    const indexes = [
      // Cookies indexes
      'CREATE INDEX IF NOT EXISTS idx_cookies_profile_id ON cookies (profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_cookies_domain ON cookies (domain)',
      'CREATE INDEX IF NOT EXISTS idx_cookies_expires ON cookies (expires_at)',

      // History indexes
      'CREATE INDEX IF NOT EXISTS idx_history_profile_id ON browser_history (profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_history_url ON browser_history (url)',
      'CREATE INDEX IF NOT EXISTS idx_history_visit_time ON browser_history (last_visit_time)',

      // Passwords indexes
      'CREATE INDEX IF NOT EXISTS idx_passwords_profile_id ON saved_passwords (profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_passwords_origin ON saved_passwords (origin_url)',
      'CREATE INDEX IF NOT EXISTS idx_passwords_username ON saved_passwords (username_value)',

      // Bookmarks indexes
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_profile_id ON bookmarks (profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks (url)',
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_parent ON bookmarks (parent_id)',

      // Other indexes
      'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_profile_id ON sync_logs (profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_backups_profile_id ON backups (profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_api_key ON users (api_key)'
    ];

    for (const indexSql of indexes) {
      await this.db.exec(indexSql);
    }
  }

  // User operations
  async createUser(userData) {
    const id = crypto.randomUUID();
    const apiKey = this.generateApiKey();
    
    const result = await this.db.run(`
      INSERT INTO users (id, username, email, api_key, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userData.username, userData.email, apiKey, userData.isAdmin || false]);

    return this.getUserById(id);
  }

  async getUserById(id) {
    return this.db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async getUserByApiKey(apiKey) {
    return this.db.get('SELECT * FROM users WHERE api_key = ?', [apiKey]);
  }

  async getUserByUsername(username) {
    return this.db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  // Profile operations
  async createProfile(profileData) {
    const id = crypto.randomUUID();
    
    await this.db.run(`
      INSERT INTO profiles (id, user_id, name, description, gologin_profile_id, settings)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id,
      profileData.userId,
      profileData.name,
      profileData.description,
      profileData.gologinProfileId,
      JSON.stringify(profileData.settings || {})
    ]);

    return this.getProfileById(id);
  }

  async getProfileById(id) {
    const profile = await this.db.get('SELECT * FROM profiles WHERE id = ?', [id]);
    if (profile && profile.settings) {
      profile.settings = JSON.parse(profile.settings);
    }
    return profile;
  }

  async getProfilesByUserId(userId) {
    const profiles = await this.db.all('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    return profiles.map(profile => {
      if (profile.settings) {
        profile.settings = JSON.parse(profile.settings);
      }
      return profile;
    });
  }

  async updateProfile(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    await this.db.run(`
      UPDATE profiles 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, values);

    return this.getProfileById(id);
  }

  async deleteProfile(id) {
    const result = await this.db.run('DELETE FROM profiles WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Cookie operations
  async saveCookies(profileId, cookies, options = {}) {
    const { replace = false } = options;
    
    await this.db.run('BEGIN TRANSACTION');
    
    try {
      if (replace) {
        await this.db.run('DELETE FROM cookies WHERE profile_id = ?', [profileId]);
      }

      let savedCount = 0;
      for (const cookie of cookies) {
        const id = crypto.randomUUID();
        
        await this.db.run(`
          INSERT OR REPLACE INTO cookies (
            id, profile_id, name, value, domain, path, expires_at,
            http_only, secure, same_site
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          profileId,
          cookie.name,
          cookie.value,
          cookie.domain,
          cookie.path || '/',
          cookie.expires ? new Date(cookie.expires).toISOString() : null,
          Boolean(cookie.httpOnly),
          Boolean(cookie.secure),
          cookie.sameSite || 'Lax'
        ]);
        
        savedCount++;
      }

      await this.db.run('COMMIT');
      return { savedCount };
      
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async getCookies(profileId, options = {}) {
    const { domain, limit = 1000, offset = 0 } = options;
    
    let sql = 'SELECT * FROM cookies WHERE profile_id = ?';
    const params = [profileId];
    
    if (domain) {
      sql += ' AND domain = ?';
      params.push(domain);
    }
    
    sql += ' ORDER BY domain, name LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const cookies = await this.db.all(sql, params);
    
    return cookies.map(cookie => ({
      ...cookie,
      expires: cookie.expires_at ? new Date(cookie.expires_at).getTime() : null,
      httpOnly: Boolean(cookie.http_only),
      sameSite: cookie.same_site
    }));
  }

  async deleteCookies(profileId, filters = {}) {
    let sql = 'DELETE FROM cookies WHERE profile_id = ?';
    const params = [profileId];
    
    if (filters.domain) {
      sql += ' AND domain = ?';
      params.push(filters.domain);
    }
    
    if (filters.name) {
      sql += ' AND name = ?';
      params.push(filters.name);
    }
    
    const result = await this.db.run(sql, params);
    return result.changes;
  }

  async getCookieCount(profileId) {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM cookies WHERE profile_id = ?',
      [profileId]
    );
    return result.count;
  }

  async getCookieDomains(profileId) {
    const result = await this.db.all(
      'SELECT DISTINCT domain FROM cookies WHERE profile_id = ? ORDER BY domain',
      [profileId]
    );
    return result.map(row => row.domain);
  }

  // Browser history operations
  async saveBrowserHistory(profileId, historyItems, options = {}) {
    const { replace = false } = options;

    await this.db.run('BEGIN TRANSACTION');

    try {
      if (replace) {
        await this.db.run('DELETE FROM browser_history WHERE profile_id = ?', [profileId]);
      }

      let savedCount = 0;
      for (const item of historyItems) {
        const id = crypto.randomUUID();

        await this.db.run(`
          INSERT OR REPLACE INTO browser_history (
            id, profile_id, url, title, visit_count, last_visit_time
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          id,
          profileId,
          item.url,
          item.title || '',
          item.visitCount || 1,
          item.lastVisitTime ? new Date(item.lastVisitTime).toISOString() : new Date().toISOString()
        ]);

        savedCount++;
      }

      await this.db.run('COMMIT');
      return { savedCount };

    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async getBrowserHistory(profileId, options = {}) {
    const { limit = 1000, offset = 0, search } = options;

    let sql = 'SELECT * FROM browser_history WHERE profile_id = ?';
    const params = [profileId];

    if (search) {
      sql += ' AND (url LIKE ? OR title LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY last_visit_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const history = await this.db.all(sql, params);

    return history.map(item => ({
      ...item,
      lastVisitTime: new Date(item.last_visit_time).getTime(),
      visitCount: item.visit_count
    }));
  }

  async deleteBrowserHistory(profileId, filters = {}) {
    let sql = 'DELETE FROM browser_history WHERE profile_id = ?';
    const params = [profileId];

    if (filters.url) {
      sql += ' AND url = ?';
      params.push(filters.url);
    }

    if (filters.beforeDate) {
      sql += ' AND last_visit_time < ?';
      params.push(new Date(filters.beforeDate).toISOString());
    }

    const result = await this.db.run(sql, params);
    return result.changes;
  }

  async getBrowserHistoryCount(profileId) {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM browser_history WHERE profile_id = ?',
      [profileId]
    );
    return result.count;
  }

  // Saved passwords operations
  async saveSavedPasswords(profileId, passwords, options = {}) {
    const { replace = false, encrypt = true } = options;

    await this.db.run('BEGIN TRANSACTION');

    try {
      if (replace) {
        await this.db.run('DELETE FROM saved_passwords WHERE profile_id = ?', [profileId]);
      }

      let savedCount = 0;
      for (const password of passwords) {
        const id = crypto.randomUUID();

        // Encrypt password if requested
        let encryptedPassword = password.passwordValue;
        if (encrypt && password.passwordValue) {
          encryptedPassword = this.encryptPassword(password.passwordValue);
        }

        await this.db.run(`
          INSERT OR REPLACE INTO saved_passwords (
            id, profile_id, origin_url, action_url, username_element, username_value,
            password_element, password_value, submit_element, signon_realm,
            blacklisted_by_user, scheme, password_type, times_used, form_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          profileId,
          password.originUrl,
          password.actionUrl || '',
          password.usernameElement || '',
          password.usernameValue || '',
          password.passwordElement || '',
          encryptedPassword,
          password.submitElement || '',
          password.signonRealm || password.originUrl,
          Boolean(password.blacklistedByUser),
          password.scheme || 0,
          password.passwordType || 0,
          password.timesUsed || 0,
          password.formData ? JSON.stringify(password.formData) : null
        ]);

        savedCount++;
      }

      await this.db.run('COMMIT');
      return { savedCount };

    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async getSavedPasswords(profileId, options = {}) {
    const { limit = 1000, offset = 0, decrypt = true } = options;

    let sql = 'SELECT * FROM saved_passwords WHERE profile_id = ?';
    const params = [profileId];

    sql += ' ORDER BY date_created DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const passwords = await this.db.all(sql, params);

    return passwords.map(password => {
      let decryptedPassword = password.password_value;
      if (decrypt && password.password_value) {
        try {
          decryptedPassword = this.decryptPassword(password.password_value);
        } catch (error) {
          // If decryption fails, password might not be encrypted
          decryptedPassword = password.password_value;
        }
      }

      return {
        ...password,
        originUrl: password.origin_url,
        actionUrl: password.action_url,
        usernameElement: password.username_element,
        usernameValue: password.username_value,
        passwordElement: password.password_element,
        passwordValue: decryptedPassword,
        submitElement: password.submit_element,
        signonRealm: password.signon_realm,
        dateCreated: password.date_created,
        blacklistedByUser: Boolean(password.blacklisted_by_user),
        timesUsed: password.times_used,
        formData: password.form_data ? JSON.parse(password.form_data) : null
      };
    });
  }

  async deleteSavedPasswords(profileId, filters = {}) {
    let sql = 'DELETE FROM saved_passwords WHERE profile_id = ?';
    const params = [profileId];

    if (filters.originUrl) {
      sql += ' AND origin_url = ?';
      params.push(filters.originUrl);
    }

    if (filters.usernameValue) {
      sql += ' AND username_value = ?';
      params.push(filters.usernameValue);
    }

    const result = await this.db.run(sql, params);
    return result.changes;
  }

  async getSavedPasswordsCount(profileId) {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM saved_passwords WHERE profile_id = ?',
      [profileId]
    );
    return result.count;
  }

  // Bookmarks operations
  async saveBookmarks(profileId, bookmarks, options = {}) {
    const { replace = false } = options;

    await this.db.run('BEGIN TRANSACTION');

    try {
      if (replace) {
        await this.db.run('DELETE FROM bookmarks WHERE profile_id = ?', [profileId]);
      }

      let savedCount = 0;
      for (const bookmark of bookmarks) {
        const id = crypto.randomUUID();

        await this.db.run(`
          INSERT OR REPLACE INTO bookmarks (
            id, profile_id, url, title, date_added, date_modified,
            parent_id, position, type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          profileId,
          bookmark.url,
          bookmark.title,
          bookmark.dateAdded ? new Date(bookmark.dateAdded).toISOString() : new Date().toISOString(),
          bookmark.dateModified ? new Date(bookmark.dateModified).toISOString() : new Date().toISOString(),
          bookmark.parentId || null,
          bookmark.position || 0,
          bookmark.type || 'url'
        ]);

        savedCount++;
      }

      await this.db.run('COMMIT');
      return { savedCount };

    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  async getBookmarks(profileId, options = {}) {
    const { limit = 1000, offset = 0, parentId } = options;

    let sql = 'SELECT * FROM bookmarks WHERE profile_id = ?';
    const params = [profileId];

    if (parentId !== undefined) {
      if (parentId === null) {
        sql += ' AND parent_id IS NULL';
      } else {
        sql += ' AND parent_id = ?';
        params.push(parentId);
      }
    }

    sql += ' ORDER BY position, date_added LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const bookmarks = await this.db.all(sql, params);

    return bookmarks.map(bookmark => ({
      ...bookmark,
      dateAdded: new Date(bookmark.date_added).getTime(),
      dateModified: new Date(bookmark.date_modified).getTime(),
      parentId: bookmark.parent_id
    }));
  }

  async deleteBookmarks(profileId, filters = {}) {
    let sql = 'DELETE FROM bookmarks WHERE profile_id = ?';
    const params = [profileId];

    if (filters.url) {
      sql += ' AND url = ?';
      params.push(filters.url);
    }

    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        sql += ' AND parent_id IS NULL';
      } else {
        sql += ' AND parent_id = ?';
        params.push(filters.parentId);
      }
    }

    const result = await this.db.run(sql, params);
    return result.changes;
  }

  async getBookmarksCount(profileId) {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM bookmarks WHERE profile_id = ?',
      [profileId]
    );
    return result.count;
  }

  // Sync log operations
  async createSyncLog(logData) {
    const id = crypto.randomUUID();
    
    await this.db.run(`
      INSERT INTO sync_logs (id, profile_id, direction, status, cookies_count)
      VALUES (?, ?, ?, ?, ?)
    `, [id, logData.profileId, logData.direction, logData.status, logData.cookiesCount || 0]);

    return id;
  }

  async updateSyncLog(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    await this.db.run(`
      UPDATE sync_logs 
      SET ${setClause}, completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, values);
  }

  async getSyncLogs(profileId, limit = 50) {
    return this.db.all(`
      SELECT * FROM sync_logs 
      WHERE profile_id = ? 
      ORDER BY started_at DESC 
      LIMIT ?
    `, [profileId, limit]);
  }

  // Enhanced backup operations
  async createBackup(profileId, backupData) {
    const id = crypto.randomUUID();

    const {
      name,
      description,
      backupType = 'full',
      cookies = null,
      history = null,
      passwords = null,
      bookmarks = null,
      metadata = {}
    } = backupData;

    await this.db.run(`
      INSERT INTO backups (
        id, profile_id, name, description, backup_type,
        cookies_data, history_data, passwords_data, bookmarks_data, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      profileId,
      name,
      description,
      backupType,
      cookies ? JSON.stringify(cookies) : null,
      history ? JSON.stringify(history) : null,
      passwords ? JSON.stringify(passwords) : null,
      bookmarks ? JSON.stringify(bookmarks) : null,
      JSON.stringify(metadata)
    ]);

    return this.getBackupById(id);
  }

  async createFullBackup(profileId, backupName) {
    try {
      // Get all data for the profile
      const [cookies, history, passwords, bookmarks] = await Promise.all([
        this.getCookies(profileId),
        this.getBrowserHistory(profileId),
        this.getSavedPasswords(profileId, { decrypt: false }), // Keep encrypted
        this.getBookmarks(profileId)
      ]);

      const metadata = {
        createdAt: new Date().toISOString(),
        profileId,
        counts: {
          cookies: cookies.length,
          history: history.length,
          passwords: passwords.length,
          bookmarks: bookmarks.length
        },
        version: '1.0.0'
      };

      const backupData = {
        name: backupName || `Full Backup ${new Date().toISOString()}`,
        description: `Complete backup including ${cookies.length} cookies, ${history.length} history items, ${passwords.length} passwords, and ${bookmarks.length} bookmarks`,
        backupType: 'full',
        cookies,
        history,
        passwords,
        bookmarks,
        metadata
      };

      return this.createBackup(profileId, backupData);

    } catch (error) {
      throw new Error(`Failed to create full backup: ${error.message}`);
    }
  }

  async getBackupById(id) {
    const backup = await this.db.get('SELECT * FROM backups WHERE id = ?', [id]);
    if (backup) {
      // Parse JSON data
      if (backup.cookies_data) {
        backup.cookies = JSON.parse(backup.cookies_data);
        delete backup.cookies_data;
      }
      if (backup.history_data) {
        backup.history = JSON.parse(backup.history_data);
        delete backup.history_data;
      }
      if (backup.passwords_data) {
        backup.passwords = JSON.parse(backup.passwords_data);
        delete backup.passwords_data;
      }
      if (backup.bookmarks_data) {
        backup.bookmarks = JSON.parse(backup.bookmarks_data);
        delete backup.bookmarks_data;
      }
      if (backup.metadata) {
        backup.metadata = JSON.parse(backup.metadata);
      }

      // Add backup type info
      backup.backupType = backup.backup_type;
      delete backup.backup_type;
    }
    return backup;
  }

  async getBackups(profileId) {
    const backups = await this.db.all(`
      SELECT id, profile_id, name, description, backup_type, created_at,
             LENGTH(COALESCE(cookies_data, '')) +
             LENGTH(COALESCE(history_data, '')) +
             LENGTH(COALESCE(passwords_data, '')) +
             LENGTH(COALESCE(bookmarks_data, '')) as total_size,
             CASE WHEN cookies_data IS NOT NULL THEN 1 ELSE 0 END as has_cookies,
             CASE WHEN history_data IS NOT NULL THEN 1 ELSE 0 END as has_history,
             CASE WHEN passwords_data IS NOT NULL THEN 1 ELSE 0 END as has_passwords,
             CASE WHEN bookmarks_data IS NOT NULL THEN 1 ELSE 0 END as has_bookmarks
      FROM backups
      WHERE profile_id = ?
      ORDER BY created_at DESC
    `, [profileId]);

    return backups.map(backup => ({
      ...backup,
      backupType: backup.backup_type,
      totalSize: backup.total_size,
      hasCookies: Boolean(backup.has_cookies),
      hasHistory: Boolean(backup.has_history),
      hasPasswords: Boolean(backup.has_passwords),
      hasBookmarks: Boolean(backup.has_bookmarks)
    }));
  }

  async deleteBackup(id) {
    const result = await this.db.run('DELETE FROM backups WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // System statistics
  async getSystemStats() {
    const [userCount, profileCount, cookieCount, historyCount, passwordCount, bookmarkCount, backupCount] = await Promise.all([
      this.db.get('SELECT COUNT(*) as count FROM users'),
      this.db.get('SELECT COUNT(*) as count FROM profiles'),
      this.db.get('SELECT COUNT(*) as count FROM cookies'),
      this.db.get('SELECT COUNT(*) as count FROM browser_history'),
      this.db.get('SELECT COUNT(*) as count FROM saved_passwords'),
      this.db.get('SELECT COUNT(*) as count FROM bookmarks'),
      this.db.get('SELECT COUNT(*) as count FROM backups')
    ]);

    const recentSyncs = await this.db.all(`
      SELECT COUNT(*) as count, status
      FROM sync_logs
      WHERE started_at > datetime('now', '-24 hours')
      GROUP BY status
    `);

    // Get backup type statistics
    const backupTypes = await this.db.all(`
      SELECT backup_type, COUNT(*) as count
      FROM backups
      GROUP BY backup_type
    `);

    return {
      users: userCount.count,
      profiles: profileCount.count,
      cookies: cookieCount.count,
      history: historyCount.count,
      passwords: passwordCount.count,
      bookmarks: bookmarkCount.count,
      backups: backupCount.count,
      recentSyncs: recentSyncs.reduce((acc, sync) => {
        acc[sync.status] = sync.count;
        return acc;
      }, {}),
      backupTypes: backupTypes.reduce((acc, backup) => {
        acc[backup.backup_type] = backup.count;
        return acc;
      }, {})
    };
  }

  // Encryption/Decryption methods for passwords
  encryptPassword(password) {
    try {
      // Simple encryption using built-in crypto
      // In production, use more robust encryption
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.warn('Password encryption failed, storing as plain text:', error.message);
      return password;
    }
  }

  decryptPassword(encryptedPassword) {
    try {
      if (!encryptedPassword.includes(':')) {
        // Not encrypted, return as is
        return encryptedPassword;
      }

      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);

      const [ivHex, encrypted] = encryptedPassword.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.warn('Password decryption failed, returning encrypted value:', error.message);
      return encryptedPassword;
    }
  }

  // Utility methods
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
