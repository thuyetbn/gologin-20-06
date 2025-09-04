/**
 * Browser Data Extractor
 * Extract cookies, history, passwords, and bookmarks from Chrome profile
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export class BrowserDataExtractor {
  constructor(profilePath) {
    this.profilePath = profilePath;
  }

  /**
   * Extract all browser data (cookies, history, passwords, bookmarks)
   */
  async extractAllData() {
    try {
      console.log(`🔍 [Browser Data Extractor] Extracting data from: ${this.profilePath}`);

      const [cookies, history, passwords, bookmarks] = await Promise.all([
        this.extractCookies(),
        this.extractHistory(),
        this.extractPasswords(),
        this.extractBookmarks()
      ]);

      const result = {
        cookies,
        history,
        passwords,
        bookmarks,
        metadata: {
          extractedAt: new Date().toISOString(),
          profilePath: this.profilePath,
          counts: {
            cookies: cookies.length,
            history: history.length,
            passwords: passwords.length,
            bookmarks: bookmarks.length
          }
        }
      };

      console.log(`✅ [Browser Data Extractor] Extracted: ${cookies.length} cookies, ${history.length} history, ${passwords.length} passwords, ${bookmarks.length} bookmarks`);
      
      return result;

    } catch (error) {
      console.error(`❌ [Browser Data Extractor] Failed to extract data:`, error);
      throw error;
    }
  }

  /**
   * Extract cookies from Chrome cookies database
   */
  async extractCookies() {
    try {
      const cookiesPath = join(this.profilePath, 'Default', 'Network', 'Cookies');
      
      // Check if cookies file exists
      try {
        await fs.access(cookiesPath);
      } catch {
        console.log(`📝 [Browser Data Extractor] Cookies file not found: ${cookiesPath}`);
        return [];
      }

      const db = await open({
        filename: cookiesPath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY
      });

      const cookies = await db.all(`
        SELECT 
          name,
          encrypted_value as value,
          host_key as domain,
          path,
          expires_utc,
          is_secure as secure,
          is_httponly as httpOnly,
          samesite,
          creation_utc,
          last_access_utc
        FROM cookies
        ORDER BY host_key, name
      `);

      await db.close();

      return cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires_utc ? Math.floor(cookie.expires_utc / 1000000) : null,
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        sameSite: this.mapSameSite(cookie.samesite),
        creationTime: cookie.creation_utc ? Math.floor(cookie.creation_utc / 1000000) : null,
        lastAccessTime: cookie.last_access_utc ? Math.floor(cookie.last_access_utc / 1000000) : null
      }));

    } catch (error) {
      console.error(`❌ [Browser Data Extractor] Failed to extract cookies:`, error);
      return [];
    }
  }

  /**
   * Extract browser history from Chrome history database
   */
  async extractHistory() {
    try {
      const historyPath = join(this.profilePath, 'Default', 'History');
      
      // Check if history file exists
      try {
        await fs.access(historyPath);
      } catch {
        console.log(`📝 [Browser Data Extractor] History file not found: ${historyPath}`);
        return [];
      }

      const db = await open({
        filename: historyPath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY
      });

      const history = await db.all(`
        SELECT 
          url,
          title,
          visit_count,
          last_visit_time
        FROM urls
        WHERE visit_count > 0
        ORDER BY last_visit_time DESC
        LIMIT 10000
      `);

      await db.close();

      return history.map(item => ({
        url: item.url,
        title: item.title || '',
        visitCount: item.visit_count,
        lastVisitTime: item.last_visit_time ? this.chromeTimeToTimestamp(item.last_visit_time) : null
      }));

    } catch (error) {
      console.error(`❌ [Browser Data Extractor] Failed to extract history:`, error);
      return [];
    }
  }

  /**
   * Extract saved passwords from Chrome login data
   */
  async extractPasswords() {
    try {
      const loginDataPath = join(this.profilePath, 'Default', 'Login Data');
      
      // Check if login data file exists
      try {
        await fs.access(loginDataPath);
      } catch {
        console.log(`📝 [Browser Data Extractor] Login Data file not found: ${loginDataPath}`);
        return [];
      }

      const db = await open({
        filename: loginDataPath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY
      });

      const passwords = await db.all(`
        SELECT 
          origin_url,
          action_url,
          username_element,
          username_value,
          password_element,
          password_value,
          submit_element,
          signon_realm,
          date_created,
          blacklisted_by_user,
          scheme,
          password_type,
          times_used,
          form_data,
          date_synced
        FROM logins
        WHERE blacklisted_by_user = 0
        ORDER BY date_created DESC
      `);

      await db.close();

      return passwords.map(password => ({
        originUrl: password.origin_url,
        actionUrl: password.action_url,
        usernameElement: password.username_element,
        usernameValue: password.username_value,
        passwordElement: password.password_element,
        passwordValue: password.password_value, // This is encrypted by Chrome
        submitElement: password.submit_element,
        signonRealm: password.signon_realm,
        dateCreated: password.date_created ? this.chromeTimeToTimestamp(password.date_created) : null,
        blacklistedByUser: Boolean(password.blacklisted_by_user),
        scheme: password.scheme,
        passwordType: password.password_type,
        timesUsed: password.times_used,
        formData: password.form_data,
        dateSynced: password.date_synced ? this.chromeTimeToTimestamp(password.date_synced) : null
      }));

    } catch (error) {
      console.error(`❌ [Browser Data Extractor] Failed to extract passwords:`, error);
      return [];
    }
  }

  /**
   * Extract bookmarks from Chrome bookmarks file
   */
  async extractBookmarks() {
    try {
      const bookmarksPath = join(this.profilePath, 'Default', 'Bookmarks');
      
      // Check if bookmarks file exists
      try {
        await fs.access(bookmarksPath);
      } catch {
        console.log(`📝 [Browser Data Extractor] Bookmarks file not found: ${bookmarksPath}`);
        return [];
      }

      const bookmarksData = await fs.readFile(bookmarksPath, 'utf8');
      const bookmarksJson = JSON.parse(bookmarksData);

      const bookmarks = [];
      
      // Extract bookmarks from the JSON structure
      const extractFromFolder = (folder, parentId = null) => {
        if (folder.children) {
          folder.children.forEach((item, index) => {
            if (item.type === 'url') {
              bookmarks.push({
                url: item.url,
                title: item.name,
                dateAdded: parseInt(item.date_added),
                dateModified: parseInt(item.date_modified || item.date_added),
                parentId,
                position: index,
                type: 'url'
              });
            } else if (item.type === 'folder') {
              const folderId = `folder_${item.id || Date.now()}_${index}`;
              bookmarks.push({
                url: '',
                title: item.name,
                dateAdded: parseInt(item.date_added),
                dateModified: parseInt(item.date_modified || item.date_added),
                parentId,
                position: index,
                type: 'folder'
              });
              
              // Recursively extract from subfolders
              extractFromFolder(item, folderId);
            }
          });
        }
      };

      // Extract from bookmark bar and other folders
      if (bookmarksJson.roots) {
        if (bookmarksJson.roots.bookmark_bar) {
          extractFromFolder(bookmarksJson.roots.bookmark_bar, 'bookmark_bar');
        }
        if (bookmarksJson.roots.other) {
          extractFromFolder(bookmarksJson.roots.other, 'other');
        }
        if (bookmarksJson.roots.synced) {
          extractFromFolder(bookmarksJson.roots.synced, 'synced');
        }
      }

      return bookmarks.map(bookmark => ({
        ...bookmark,
        dateAdded: bookmark.dateAdded ? this.chromeTimeToTimestamp(bookmark.dateAdded) : null,
        dateModified: bookmark.dateModified ? this.chromeTimeToTimestamp(bookmark.dateModified) : null
      }));

    } catch (error) {
      console.error(`❌ [Browser Data Extractor] Failed to extract bookmarks:`, error);
      return [];
    }
  }

  /**
   * Extract specific data type
   */
  async extractDataType(dataType) {
    switch (dataType) {
      case 'cookies':
        return this.extractCookies();
      case 'history':
        return this.extractHistory();
      case 'passwords':
        return this.extractPasswords();
      case 'bookmarks':
        return this.extractBookmarks();
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Check what data is available in the profile
   */
  async checkAvailableData() {
    const dataFiles = {
      cookies: join(this.profilePath, 'Default', 'Network', 'Cookies'),
      history: join(this.profilePath, 'Default', 'History'),
      passwords: join(this.profilePath, 'Default', 'Login Data'),
      bookmarks: join(this.profilePath, 'Default', 'Bookmarks')
    };

    const availability = {};

    for (const [dataType, filePath] of Object.entries(dataFiles)) {
      try {
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        availability[dataType] = {
          available: true,
          path: filePath,
          size: stats.size,
          lastModified: stats.mtime
        };
      } catch {
        availability[dataType] = {
          available: false,
          path: filePath,
          size: 0,
          lastModified: null
        };
      }
    }

    return availability;
  }

  // Utility methods
  mapSameSite(value) {
    switch (value) {
      case 0: return 'None';
      case 1: return 'Lax';
      case 2: return 'Strict';
      default: return 'Lax';
    }
  }

  chromeTimeToTimestamp(chromeTime) {
    // Chrome time is microseconds since January 1, 1601
    // JavaScript time is milliseconds since January 1, 1970
    const epochDelta = 11644473600000000; // microseconds between 1601 and 1970
    return Math.floor((chromeTime - epochDelta) / 1000); // Convert to milliseconds
  }
}
