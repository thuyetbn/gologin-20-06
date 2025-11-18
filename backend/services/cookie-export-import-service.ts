/**
 * Cookie Export/Import Service
 * Service để export và import cookies từ/vào GoLogin profiles
 */

import { dialog } from 'electron';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { getChunckedInsertValues, getCookiesFilePath, getDB, loadCookiesFromFile } from '../gologin/cookies/cookies-manager.js';

interface CookieExportFormat {
  version: string;
  exportDate: string;
  profileId: string;
  profileName?: string;
  cookieCount: number;
  cookies: Array<{
    domain: string;
    name: string;
    value: string;
    path: string;
    expires?: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite?: string;
    hostOnly?: boolean;
    session?: boolean;
    expirationDate?: number;
    creationDate?: number;
  }>;
  metadata?: {
    exportedBy?: string;
    notes?: string;
  };
}

interface ExportOptions {
  profileId: string;
  profileName?: string;
  filePath?: string;
  format?: 'json' | 'netscape';
  includeMetadata?: boolean;
}

interface ImportOptions {
  profileId: string;
  filePath?: string;
  replace?: boolean; // Replace all existing cookies or merge
  validateDomains?: boolean;
}

export class CookieExportImportService {
  private tmpdir: string;

  constructor() {
    this.tmpdir = process.env.TEMP || process.env.TMP || '/tmp';
  }

  /**
   * Export cookies from a profile to a JSON file
   */
  async exportCookies(options: ExportOptions): Promise<{ success: boolean; filePath?: string; error?: string; cookieCount?: number }> {
    try {
      console.log(`📤 [Cookie Export] Starting export for profile: ${options.profileId}`);

      // Get cookies file path
      const cookiesFilePath = await getCookiesFilePath(options.profileId, this.tmpdir);

      let cookies: any[] = [];

      // Check if cookies file exists locally
      try {
        await fs.access(cookiesFilePath);
        // Load cookies from local SQLite database
        console.log(`📂 [Cookie Export] Loading cookies from local file: ${cookiesFilePath}`);
        cookies = await loadCookiesFromFile(cookiesFilePath);
      } catch (error) {
        // Profile not started yet, try to download cookies from GoLogin API
        console.log(`⚠️ [Cookie Export] Local cookies file not found. Attempting to download from GoLogin API...`);

        try {
          // Import getCurrentToken from backend/index.ts context
          // For now, we'll need to pass token through options or get it from store
          const store = require('../store').default;
          const settings = store.get('settings') as any;
          const token = settings?.gologinToken;

          if (!token) {
            throw new Error("GoLogin token not found. Please configure it in Settings.");
          }

          // Import GoLogin class
          const { GoLogin } = require('../gologin/gologin.js');
          const goLogin = new GoLogin({ token, profile_id: options.profileId, tmpdir: this.tmpdir });

          // Download cookies from API
          const apiResponse = await goLogin.getCookies(options.profileId);

          if (apiResponse && Array.isArray(apiResponse)) {
            cookies = apiResponse;
            console.log(`✅ [Cookie Export] Downloaded ${cookies.length} cookies from GoLogin API`);
          } else if (apiResponse && apiResponse.body && Array.isArray(apiResponse.body)) {
            cookies = apiResponse.body;
            console.log(`✅ [Cookie Export] Downloaded ${cookies.length} cookies from GoLogin API`);
          } else {
            console.log(`⚠️ [Cookie Export] No cookies found on GoLogin API for profile: ${options.profileId}`);
          }
        } catch (apiError: any) {
          console.error(`❌ [Cookie Export] Failed to download cookies from API:`, apiError);
          throw new Error(`Cannot export cookies: Local file not found and API download failed. ${apiError.message}`);
        }
      }

      if (cookies.length === 0) {
        console.log(`⚠️ [Cookie Export] No cookies found for profile ${options.profileId}`);
      }

      // Prepare export data
      const exportData: CookieExportFormat = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        profileId: options.profileId,
        profileName: options.profileName,
        cookieCount: cookies.length,
        cookies: cookies.map(cookie => ({
          domain: cookie.domain,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path,
          expires: cookie.expirationDate,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          hostOnly: cookie.hostOnly,
          session: cookie.session,
          expirationDate: cookie.expirationDate,
          creationDate: cookie.creationDate,
        })),
      };

      if (options.includeMetadata) {
        exportData.metadata = {
          exportedBy: 'GoLogin Manager',
          notes: `Exported from profile ${options.profileName || options.profileId}`,
        };
      }

      // Determine file path
      let filePath = options.filePath;
      if (!filePath) {
        // Show save dialog
        const result = await dialog.showSaveDialog({
          title: 'Export Cookies',
          defaultPath: `cookies_${options.profileId}_${Date.now()}.json`,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Export canceled by user' };
        }

        filePath = result.filePath;
      }

      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });

      // Write to file
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

      console.log(`✅ [Cookie Export] Successfully exported ${cookies.length} cookies to: ${filePath}`);

      return {
        success: true,
        filePath,
        cookieCount: cookies.length,
      };

    } catch (error) {
      console.error(`❌ [Cookie Export] Export failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during export',
      };
    }
  }

  /**
   * Import cookies from a JSON file to a profile
   */
  async importCookies(options: ImportOptions): Promise<{ success: boolean; error?: string; cookieCount?: number }> {
    try {
      console.log(`📥 [Cookie Import] Starting import for profile: ${options.profileId}`);

      // Determine file path
      let filePath = options.filePath;
      if (!filePath) {
        // Show open dialog
        const result = await dialog.showOpenDialog({
          title: 'Import Cookies',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'Import canceled by user' };
        }

        filePath = result.filePaths[0];
      }

      // Read and parse file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      let importData: CookieExportFormat;

      try {
        importData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error('Invalid JSON format. Please provide a valid cookie export file.');
      }

      // Validate import data structure
      if (!importData.cookies || !Array.isArray(importData.cookies)) {
        throw new Error('Invalid cookie file format. Missing or invalid cookies array.');
      }

      if (importData.cookies.length === 0) {
        throw new Error('No cookies found in the import file.');
      }

      // Validate cookie structure
      const validatedCookies = this.validateAndNormalizeCookies(importData.cookies);

      console.log(`📋 [Cookie Import] Found ${validatedCookies.length} valid cookies to import`);

      // Get cookies file path
      const cookiesFilePath = await getCookiesFilePath(options.profileId, this.tmpdir);

      // Check if cookies file exists
      try {
        await fs.access(cookiesFilePath);
      } catch (error) {
        throw new Error(`Cookies database not found for profile ${options.profileId}. Please start the profile at least once before importing cookies.`);
      }

      // If replace mode, backup and clear existing cookies
      if (options.replace) {
        await this.backupCookies(cookiesFilePath);
        await this.clearCookies(cookiesFilePath);
        console.log(`🗑️ [Cookie Import] Cleared existing cookies (backup created)`);
      }

      // Import cookies to database
      await this.writeCookiesToDatabase(cookiesFilePath, validatedCookies);

      console.log(`✅ [Cookie Import] Successfully imported ${validatedCookies.length} cookies`);

      return {
        success: true,
        cookieCount: validatedCookies.length,
      };

    } catch (error) {
      console.error(`❌ [Cookie Import] Import failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during import',
      };
    }
  }

  /**
   * Validate and normalize cookies from import file
   */
  private validateAndNormalizeCookies(cookies: any[]): any[] {
    const validated = [];

    for (const cookie of cookies) {
      // Required fields
      if (!cookie.domain || !cookie.name) {
        console.warn(`⚠️ [Cookie Import] Skipping invalid cookie: missing domain or name`, cookie);
        continue;
      }

      // Normalize cookie structure
      const normalized = {
        domain: cookie.domain,
        name: cookie.name,
        value: cookie.value || '',
        path: cookie.path || '/',
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        sameSite: cookie.sameSite || 'lax',
        session: cookie.session !== undefined ? Boolean(cookie.session) : false,
        expirationDate: cookie.expirationDate || cookie.expires || 0,
        creationDate: cookie.creationDate || Math.floor(Date.now() / 1000),
      };

      validated.push(normalized);
    }

    return validated;
  }

  /**
   * Write cookies to SQLite database
   */
  private async writeCookiesToDatabase(cookiesFilePath: string, cookies: any[]): Promise<void> {
    const db = await getDB(cookiesFilePath, false); // Open in write mode

    try {
      // Get chunked insert queries
      const insertQueries = getChunckedInsertValues(cookies);

      // Execute all insert queries
      for (const [query, params] of insertQueries) {
        await db.run(query, params);
      }

    } finally {
      await db.close();
    }
  }

  /**
   * Backup cookies before clearing
   */
  private async backupCookies(cookiesFilePath: string): Promise<void> {
    const backupPath = `${cookiesFilePath}.backup.${Date.now()}`;
    await fs.copyFile(cookiesFilePath, backupPath);
    console.log(`💾 [Cookie Import] Backup created: ${backupPath}`);
  }

  /**
   * Clear all cookies from database
   */
  private async clearCookies(cookiesFilePath: string): Promise<void> {
    const db = await getDB(cookiesFilePath, false);

    try {
      await db.run('DELETE FROM cookies');
    } finally {
      await db.close();
    }
  }

  /**
   * Get cookie statistics for a profile
   */
  async getCookieStats(profileId: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const cookiesFilePath = await getCookiesFilePath(profileId, this.tmpdir);

      try {
        await fs.access(cookiesFilePath);
      } catch (error) {
        return {
          success: false,
          error: 'Cookies file not found. Profile may not have been started yet.',
        };
      }

      const cookies = await loadCookiesFromFile(cookiesFilePath);

      // Calculate statistics
      const domains = new Set(cookies.map(c => c.domain));
      const secureCookies = cookies.filter(c => c.secure).length;
      const httpOnlyCookies = cookies.filter(c => c.httpOnly).length;
      const sessionCookies = cookies.filter(c => c.session).length;

      return {
        success: true,
        stats: {
          totalCookies: cookies.length,
          uniqueDomains: domains.size,
          secureCookies,
          httpOnlyCookies,
          sessionCookies,
          persistentCookies: cookies.length - sessionCookies,
        },
      };

    } catch (error) {
      console.error(`❌ [Cookie Stats] Failed to get stats:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default CookieExportImportService;

