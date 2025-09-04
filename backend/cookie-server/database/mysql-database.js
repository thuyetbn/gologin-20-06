/**
 * MySQL Database Layer
 * Quản lý database MySQL cho cookie storage server
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';

export class MySQLDatabase {
  constructor(config) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user || 'root',
      password: config.password || '',
      database: config.database || 'cookie_server',
      charset: 'utf8mb4',
      timezone: '+00:00',
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      ...config
    };
    
    this.pool = null;
  }

  async initialize() {
    try {
      // Create connection pool
      this.pool = mysql.createPool({
        ...this.config,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000
      });

      // Test connection
      const connection = await this.pool.getConnection();
      console.log('✅ MySQL connection established');
      connection.release();

      // Create database if not exists
      await this.createDatabase();
      
      // Create tables
      await this.createTables();
      
      console.log(`✅ MySQL database initialized: ${this.config.database}`);
    } catch (error) {
      console.error('❌ MySQL database initialization failed:', error);
      throw error;
    }
  }

  async createDatabase() {
    try {
      // Connect without database to create it
      const tempPool = mysql.createPool({
        ...this.config,
        database: undefined
      });

      await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await tempPool.end();
      
      console.log(`✅ Database '${this.config.database}' ready`);
    } catch (error) {
      console.error('❌ Failed to create database:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        api_key VARCHAR(64) UNIQUE NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_api_key (api_key),
        INDEX idx_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Profiles table
      `CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        gologin_profile_id VARCHAR(255),
        settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_profiles_user_id (user_id),
        INDEX idx_profiles_gologin_id (gologin_profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Cookies table
      `CREATE TABLE IF NOT EXISTS cookies (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        domain VARCHAR(255) NOT NULL,
        path VARCHAR(255) DEFAULT '/',
        expires_at TIMESTAMP NULL,
        http_only BOOLEAN DEFAULT FALSE,
        secure BOOLEAN DEFAULT FALSE,
        same_site ENUM('Strict', 'Lax', 'None') DEFAULT 'Lax',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        UNIQUE KEY unique_cookie (profile_id, domain, path, name),
        INDEX idx_cookies_profile_id (profile_id),
        INDEX idx_cookies_domain (domain),
        INDEX idx_cookies_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Browser history table
      `CREATE TABLE IF NOT EXISTS browser_history (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        visit_count INT DEFAULT 1,
        last_visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        INDEX idx_history_profile_id (profile_id),
        INDEX idx_history_visit_time (last_visit_time),
        INDEX idx_history_url_hash (profile_id, (SUBSTRING(SHA2(url, 256), 1, 16)))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Saved passwords table
      `CREATE TABLE IF NOT EXISTS saved_passwords (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        origin_url TEXT NOT NULL,
        action_url TEXT,
        username_element VARCHAR(255),
        username_value VARCHAR(255),
        password_element VARCHAR(255),
        password_value TEXT NOT NULL,
        submit_element VARCHAR(255),
        signon_realm TEXT,
        date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        blacklisted_by_user BOOLEAN DEFAULT FALSE,
        scheme INT DEFAULT 0,
        password_type INT DEFAULT 0,
        times_used INT DEFAULT 0,
        form_data JSON,
        date_synced TIMESTAMP NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        INDEX idx_passwords_profile_id (profile_id),
        INDEX idx_passwords_origin_hash (profile_id, (SUBSTRING(SHA2(origin_url, 256), 1, 16))),
        INDEX idx_passwords_username (username_value)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Bookmarks table
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        url TEXT,
        title VARCHAR(500) NOT NULL,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        parent_id VARCHAR(36),
        position INT DEFAULT 0,
        type ENUM('url', 'folder') DEFAULT 'url',
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        INDEX idx_bookmarks_profile_id (profile_id),
        INDEX idx_bookmarks_parent (parent_id),
        INDEX idx_bookmarks_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Sync logs table
      `CREATE TABLE IF NOT EXISTS sync_logs (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        direction ENUM('upload', 'download', 'both') NOT NULL,
        status ENUM('running', 'completed', 'failed') NOT NULL,
        cookies_count INT DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        INDEX idx_sync_logs_profile_id (profile_id),
        INDEX idx_sync_logs_status (status),
        INDEX idx_sync_logs_started (started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Backups table
      `CREATE TABLE IF NOT EXISTS backups (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        backup_type ENUM('full', 'cookies', 'history', 'passwords', 'bookmarks') DEFAULT 'full',
        cookies_data LONGTEXT,
        history_data LONGTEXT,
        passwords_data LONGTEXT,
        bookmarks_data LONGTEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        INDEX idx_backups_profile_id (profile_id),
        INDEX idx_backups_type (backup_type),
        INDEX idx_backups_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const tableSQL of tables) {
      try {
        await this.pool.execute(tableSQL);
      } catch (error) {
        console.error('❌ Failed to create table:', error.message);
        throw error;
      }
    }

    console.log('✅ All tables created successfully');
  }

  // User operations
  async createUser(userData) {
    const id = crypto.randomUUID();
    const apiKey = this.generateApiKey();
    
    const [result] = await this.pool.execute(`
      INSERT INTO users (id, username, email, api_key, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userData.username, userData.email, apiKey, userData.isAdmin || false]);

    return this.getUserById(id);
  }

  async getUserById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async getUserByApiKey(apiKey) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE api_key = ?', [apiKey]);
    return rows[0] || null;
  }

  async getUserByUsername(username) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  }

  // Profile operations
  async createProfile(profileData) {
    const id = crypto.randomUUID();
    
    await this.pool.execute(`
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
    const [rows] = await this.pool.execute('SELECT * FROM profiles WHERE id = ?', [id]);
    const profile = rows[0];
    if (profile && profile.settings) {
      profile.settings = JSON.parse(profile.settings);
    }
    return profile || null;
  }

  async getProfilesByUserId(userId) {
    const [rows] = await this.pool.execute('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    return rows.map(profile => {
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

    await this.pool.execute(`
      UPDATE profiles 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, values);

    return this.getProfileById(id);
  }

  async deleteProfile(id) {
    const [result] = await this.pool.execute('DELETE FROM profiles WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Utility methods
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ MySQL connection pool closed');
    }
  }

  // Cookie operations
  async saveCookies(profileId, cookies, options = {}) {
    const { replace = false } = options;

    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      if (replace) {
        await connection.execute('DELETE FROM cookies WHERE profile_id = ?', [profileId]);
      }

      let savedCount = 0;
      for (const cookie of cookies) {
        const id = crypto.randomUUID();

        await connection.execute(`
          INSERT INTO cookies (
            id, profile_id, name, value, domain, path, expires_at,
            http_only, secure, same_site
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            value = VALUES(value),
            expires_at = VALUES(expires_at),
            http_only = VALUES(http_only),
            secure = VALUES(secure),
            same_site = VALUES(same_site),
            updated_at = CURRENT_TIMESTAMP
        `, [
          id,
          profileId,
          cookie.name,
          cookie.value,
          cookie.domain,
          cookie.path || '/',
          cookie.expires ? new Date(cookie.expires) : null,
          Boolean(cookie.httpOnly),
          Boolean(cookie.secure),
          cookie.sameSite || 'Lax'
        ]);

        savedCount++;
      }

      await connection.commit();
      return { savedCount };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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

    const [rows] = await this.pool.execute(sql, params);

    return rows.map(cookie => ({
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

    const [result] = await this.pool.execute(sql, params);
    return result.affectedRows;
  }

  async getCookieCount(profileId) {
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as count FROM cookies WHERE profile_id = ?',
      [profileId]
    );
    return rows[0].count;
  }

  async getCookieDomains(profileId) {
    const [rows] = await this.pool.execute(
      'SELECT DISTINCT domain FROM cookies WHERE profile_id = ? ORDER BY domain',
      [profileId]
    );
    return rows.map(row => row.domain);
  }

  // Browser history operations
  async saveBrowserHistory(profileId, historyItems, options = {}) {
    const { replace = false } = options;

    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      if (replace) {
        await connection.execute('DELETE FROM browser_history WHERE profile_id = ?', [profileId]);
      }

      let savedCount = 0;
      for (const item of historyItems) {
        const id = crypto.randomUUID();

        await connection.execute(`
          INSERT INTO browser_history (
            id, profile_id, url, title, visit_count, last_visit_time
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            visit_count = visit_count + VALUES(visit_count),
            last_visit_time = GREATEST(last_visit_time, VALUES(last_visit_time))
        `, [
          id,
          profileId,
          item.url,
          item.title || '',
          item.visitCount || 1,
          item.lastVisitTime ? new Date(item.lastVisitTime) : new Date()
        ]);

        savedCount++;
      }

      await connection.commit();
      return { savedCount };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
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

    const [rows] = await this.pool.execute(sql, params);

    return rows.map(item => ({
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
      params.push(new Date(filters.beforeDate));
    }

    const [result] = await this.pool.execute(sql, params);
    return result.affectedRows;
  }

  async getBrowserHistoryCount(profileId) {
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as count FROM browser_history WHERE profile_id = ?',
      [profileId]
    );
    return rows[0].count;
  }

  // Execute raw query (for complex operations)
  async execute(sql, params = []) {
    return this.pool.execute(sql, params);
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }
}
