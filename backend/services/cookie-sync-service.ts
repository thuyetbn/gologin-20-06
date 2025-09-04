import { promises as fs } from 'fs';
import { join } from 'path';
import { ipcMain } from 'electron';

import { downloadCookies, uploadCookies } from '../gologin/browser/browser-user-data-manager.js';
import { loadCookiesFromFile, getDB, getUniqueCookies } from '../gologin/cookies/cookies-manager.js';
import { API_URL, FALLBACK_API_URL } from '../gologin/utils/common.js';
import { makeRequest } from '../gologin/utils/http.js';

interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface CookieSyncOptions {
  profileId: string;
  accessToken: string;
  profilePath?: string;
  apiBaseUrl?: string;
}

interface CookieSyncResult {
  success: boolean;
  message: string;
  cookieCount?: number;
  error?: string;
}

export class CookieSyncService {
  private static instance: CookieSyncService;

  constructor() {
    if (!CookieSyncService.instance) {
      CookieSyncService.instance = this;
      this.setupIpcHandlers();
    }
    return CookieSyncService.instance;
  }

  private setupIpcHandlers() {
    // Upload cookies to server
    ipcMain.handle('cookies:upload', async (event, options: CookieSyncOptions) => {
      try {
        const result = await this.uploadCookiesToServer(options);
        return { success: true, data: result };
      } catch (error) {
        console.error('Cookie upload error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Download cookies from server
    ipcMain.handle('cookies:download', async (event, options: CookieSyncOptions) => {
      try {
        const result = await this.downloadCookiesFromServer(options);
        return { success: true, data: result };
      } catch (error) {
        console.error('Cookie download error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Sync cookies (download then upload)
    ipcMain.handle('cookies:sync', async (event, options: CookieSyncOptions) => {
      try {
        const downloadResult = await this.downloadCookiesFromServer(options);
        const uploadResult = await this.uploadCookiesToServer(options);
        
        return {
          success: true,
          data: {
            download: downloadResult,
            upload: uploadResult
          }
        };
      } catch (error) {
        console.error('Cookie sync error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Get local cookies info
    ipcMain.handle('cookies:get-local-info', async (event, options: CookieSyncOptions) => {
      try {
        const info = await this.getLocalCookiesInfo(options);
        return { success: true, data: info };
      } catch (error) {
        console.error('Get local cookies info error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Upload cookies từ local profile lên server
   */
  async uploadCookiesToServer(options: CookieSyncOptions): Promise<CookieSyncResult> {
    const { profileId, accessToken, profilePath, apiBaseUrl = API_URL } = options;

    try {
      console.log(`🔄 [Cookie Upload] Starting upload for profile: ${profileId}`);

      // 1. Đọc cookies từ local SQLite database
      const localCookies = await this.readLocalCookies(profileId, profilePath);
      
      if (!localCookies || localCookies.length === 0) {
        return {
          success: false,
          message: 'No cookies found in local profile',
          cookieCount: 0
        };
      }

      console.log(`📊 [Cookie Upload] Found ${localCookies.length} local cookies`);

      // 2. Convert cookies to server format
      const serverFormatCookies = this.convertCookiesToServerFormat(localCookies);

      // 3. Upload to server using existing function
      const uploadResponse = await uploadCookies({
        cookies: serverFormatCookies,
        profileId,
        ACCESS_TOKEN: accessToken,
        API_BASE_URL: apiBaseUrl
      });

      console.log(`✅ [Cookie Upload] Successfully uploaded cookies to server`);

      return {
        success: true,
        message: 'Cookies uploaded successfully',
        cookieCount: localCookies.length
      };

    } catch (error) {
      console.error(`❌ [Cookie Upload] Error:`, error);
      throw new Error(`Failed to upload cookies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download cookies từ server về local profile
   */
  async downloadCookiesFromServer(options: CookieSyncOptions): Promise<CookieSyncResult> {
    const { profileId, accessToken, profilePath, apiBaseUrl = API_URL } = options;

    try {
      console.log(`🔄 [Cookie Download] Starting download for profile: ${profileId}`);

      // 1. Download cookies from server using existing function
      const downloadResponse = await downloadCookies({
        profileId,
        ACCESS_TOKEN: accessToken,
        API_BASE_URL: apiBaseUrl
      });

      const serverCookies = JSON.parse(downloadResponse).body || [];
      
      if (!serverCookies || serverCookies.length === 0) {
        return {
          success: false,
          message: 'No cookies found on server',
          cookieCount: 0
        };
      }

      console.log(`📊 [Cookie Download] Found ${serverCookies.length} server cookies`);

      // 2. Convert server cookies to local format
      const localFormatCookies = this.convertCookiesToLocalFormat(serverCookies);

      // 3. Write cookies to local SQLite database
      await this.writeLocalCookies(profileId, localFormatCookies, profilePath);

      console.log(`✅ [Cookie Download] Successfully downloaded cookies from server`);

      return {
        success: true,
        message: 'Cookies downloaded successfully',
        cookieCount: serverCookies.length
      };

    } catch (error) {
      console.error(`❌ [Cookie Download] Error:`, error);
      throw new Error(`Failed to download cookies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Đọc cookies từ local SQLite database
   */
  private async readLocalCookies(profileId: string, profilePath?: string): Promise<CookieData[]> {
    try {
      const cookiesPath = this.getCookiesFilePath(profileId, profilePath);
      
      // Check if cookies file exists
      try {
        await fs.access(cookiesPath);
      } catch {
        console.log(`📝 [Cookie Read] Cookies file not found: ${cookiesPath}`);
        return [];
      }

      // Load cookies using existing function
      const cookies = await loadCookiesFromFile(cookiesPath);
      
      return cookies.map((cookie: any) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expirationDate,
        httpOnly: Boolean(cookie.httpOnly),
        secure: Boolean(cookie.secure),
        sameSite: this.mapSameSite(cookie.sameSite)
      }));

    } catch (error) {
      console.error(`❌ [Cookie Read] Error reading local cookies:`, error);
      throw error;
    }
  }

  /**
   * Ghi cookies vào local SQLite database
   */
  private async writeLocalCookies(profileId: string, cookies: CookieData[], profilePath?: string): Promise<void> {
    try {
      const cookiesPath = this.getCookiesFilePath(profileId, profilePath);
      
      // Ensure directory exists
      const cookiesDir = join(cookiesPath, '..');
      await fs.mkdir(cookiesDir, { recursive: true });

      // Convert cookies to SQLite format and insert
      const db = await getDB(cookiesPath, false);
      
      // Clear existing cookies
      await db.run('DELETE FROM cookies');
      
      // Insert new cookies
      for (const cookie of cookies) {
        await db.run(`
          INSERT INTO cookies (
            creation_utc, host_key, top_frame_site_key, name, value, encrypted_value,
            path, expires_utc, is_secure, is_httponly, last_access_utc, has_expires,
            is_persistent, priority, samesite, source_scheme, source_port, is_same_party
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          Date.now() * 1000, // creation_utc
          cookie.domain, // host_key
          '', // top_frame_site_key
          cookie.name, // name
          '', // value (empty for encrypted)
          cookie.value, // encrypted_value
          cookie.path, // path
          (cookie.expires || 0) * 1000000, // expires_utc
          cookie.secure ? 1 : 0, // is_secure
          cookie.httpOnly ? 1 : 0, // is_httponly
          Date.now() * 1000, // last_access_utc
          cookie.expires ? 1 : 0, // has_expires
          cookie.expires ? 1 : 0, // is_persistent
          1, // priority
          this.mapSameSiteToNumber(cookie.sameSite), // samesite
          cookie.secure ? 2 : 1, // source_scheme
          cookie.secure ? 443 : 80, // source_port
          0 // is_same_party
        ]);
      }

      await db.close();
      console.log(`✅ [Cookie Write] Successfully wrote ${cookies.length} cookies to local database`);

    } catch (error) {
      console.error(`❌ [Cookie Write] Error writing local cookies:`, error);
      throw error;
    }
  }

  /**
   * Get local cookies information
   */
  async getLocalCookiesInfo(options: CookieSyncOptions): Promise<any> {
    const { profileId, profilePath } = options;
    
    try {
      const cookiesPath = this.getCookiesFilePath(profileId, profilePath);
      
      // Check if file exists
      try {
        await fs.access(cookiesPath);
      } catch {
        return {
          exists: false,
          count: 0,
          path: cookiesPath
        };
      }

      const cookies = await this.readLocalCookies(profileId, profilePath);
      
      return {
        exists: true,
        count: cookies.length,
        path: cookiesPath,
        domains: [...new Set(cookies.map(c => c.domain))],
        lastModified: (await fs.stat(cookiesPath)).mtime
      };

    } catch (error) {
      console.error('Error getting local cookies info:', error);
      throw error;
    }
  }

  // Helper methods
  private getCookiesFilePath(profileId: string, profilePath?: string): string {
    if (profilePath) {
      return join(profilePath, 'Default', 'Network', 'Cookies');
    }
    
    // Default path in temp directory
    const tmpdir = process.env.TEMP || process.env.TMP || '/tmp';
    return join(tmpdir, `gologin_profile_${profileId}`, 'Default', 'Network', 'Cookies');
  }

  private convertCookiesToServerFormat(cookies: CookieData[]): any[] {
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    }));
  }

  private convertCookiesToLocalFormat(serverCookies: any[]): CookieData[] {
    return serverCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite || 'Lax'
    }));
  }

  private mapSameSite(value: number): 'Strict' | 'Lax' | 'None' {
    switch (value) {
      case 2: return 'Strict';
      case 1: return 'Lax';
      case 0: return 'None';
      default: return 'Lax';
    }
  }

  private mapSameSiteToNumber(value?: string): number {
    switch (value) {
      case 'Strict': return 2;
      case 'Lax': return 1;
      case 'None': return 0;
      default: return 1;
    }
  }
}

// Export singleton instance
export const cookieSyncService = new CookieSyncService();
