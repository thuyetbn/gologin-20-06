import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import verboseSqlite3 from 'sqlite3';
import { getDatabase } from '../database';
import { loadCookiesFromFile, unixToLDAP } from '../gologin/cookies/cookies-manager.js';

/**
 * Cookie data interface
 */
interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'no_restriction' | 'unspecified';
  expirationDate?: number;
  creationDate?: number;
  session?: boolean;
  hostOnly?: boolean;
}

/**
 * Validate a single cookie
 */
function validateCookie(cookie: any): { valid: boolean; error?: string } {
  if (!cookie || typeof cookie !== 'object') {
    return { valid: false, error: 'Cookie must be an object' };
  }

  if (!cookie.name || typeof cookie.name !== 'string') {
    return { valid: false, error: 'Cookie must have a valid name' };
  }

  if (!cookie.domain || typeof cookie.domain !== 'string') {
    return { valid: false, error: 'Cookie must have a valid domain' };
  }

  // Normalize sameSite value
  if (cookie.sameSite && !['lax', 'strict', 'no_restriction', 'unspecified'].includes(cookie.sameSite)) {
    cookie.sameSite = 'unspecified';
  }

  return { valid: true };
}

/**
 * Validate multiple cookies
 */
function validateCookies(cookies: any[]): { valid: Cookie[]; invalid: Array<{ cookie: any; error: string }> } {
  const valid: Cookie[] = [];
  const invalid: Array<{ cookie: any; error: string }> = [];

  for (const cookie of cookies) {
    const result = validateCookie(cookie);
    if (result.valid) {
      valid.push(cookie);
    } else {
      invalid.push({ cookie, error: result.error || 'Unknown error' });
    }
  }

  return { valid, invalid };
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number,
  errorMessage: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${errorMessage}: ${lastError!.message}`);
}

/**
 * Export cookies from a profile
 */
async function exportCookies(profileId: string): Promise<Cookie[]> {
  const { profilesPath } = await getDatabase();

  const secondaryCookiePath = path.join(
    profilesPath,
    `gologin_profile_${profileId}`,
    'Default',
    'Network',
    'Cookies'
  );

  const cookies = await retryWithBackoff(
    async () => await loadCookiesFromFile(secondaryCookiePath, false, profileId, profilesPath),
    3,
    1500,
    `Failed to export cookies for profile ${profileId}`
  );

  return cookies;
}

/**
 * Import cookies to a profile
 */
async function importCookies(profileId: string, rawCookies: any): Promise<{ success: boolean; imported: number }> {
  const cookies = Array.isArray(rawCookies)
    ? rawCookies
    : typeof rawCookies === 'object' && rawCookies !== null
    ? [rawCookies]
    : null;

  if (!cookies) {
    throw new Error('Cookies must be an array or a single cookie object.');
  }

  // Validate cookies
  const { valid, invalid } = validateCookies(cookies);

  if (invalid.length > 0) {
    console.warn(`⚠️ Found ${invalid.length} invalid cookies:`, invalid);
  }

  if (valid.length === 0) {
    throw new Error('No valid cookies to import');
  }

  const { Profile, profilesPath } = await getDatabase();

  const profile = await Profile.findOne({ where: { Id: profileId } });
  if (!profile || !(profile as any).ProfilePath) {
    throw new Error(`Profile with ID ${profileId} not found or has no path.`);
  }

  const profileJson = JSON.parse((profile as any).JsonData || '{}');
  let createTableQuery = profileJson.createCookiesTableQuery;

  if (!createTableQuery) {
    console.warn(`'createCookiesTableQuery' not found for profile ${profileId}. Using default schema.`);
    createTableQuery = `CREATE TABLE "cookies" (
      "creation_utc" INTEGER NOT NULL, "host_key" TEXT NOT NULL, "top_frame_site_key" TEXT NOT NULL,
      "name" TEXT NOT NULL, "value" TEXT NOT NULL, "encrypted_value" BLOB NOT NULL, "path" TEXT NOT NULL,
      "expires_utc" INTEGER NOT NULL, "is_secure" INTEGER NOT NULL,
      "is_httponly" INTEGER NOT NULL, "last_access_utc" INTEGER NOT NULL, "has_expires" INTEGER NOT NULL,
      "is_persistent" INTEGER NOT NULL, "priority" INTEGER NOT NULL, "samesite" INTEGER NOT NULL,
      "source_scheme" INTEGER NOT NULL, "source_port" INTEGER NOT NULL, "is_same_party" INTEGER NOT NULL,
      "last_update_utc" INTEGER NOT NULL, UNIQUE (host_key, name, path)
    )`;
  }

  const profileDir = path.join(profilesPath, (profile as any).ProfilePath, 'Default');
  const cookieDbPaths = [
    path.join(profileDir, 'Cookies'),
    path.join(profileDir, 'Network', 'Cookies')
  ];

  // Ensure directories exist
  await fs.mkdir(path.dirname(cookieDbPaths[0]), { recursive: true });
  await fs.mkdir(path.dirname(cookieDbPaths[1]), { recursive: true });

  const writeToDb = (cookieDbPath: string): Promise<{ success: boolean; imported: number }> => {
    return new Promise((resolve, reject) => {
      const cookieDb = new verboseSqlite3.Database(
        cookieDbPath,
        verboseSqlite3.OPEN_READWRITE | verboseSqlite3.OPEN_CREATE,
        err => {
          if (err) return reject(new Error(`Failed to open/create cookie DB at ${cookieDbPath}: ${err.message}`));
        }
      );

      const cleanupAndResolve = (error: Error | null, result?: any) => {
        cookieDb.close(closeErr => {
          if (error) return reject(error);
          if (closeErr) return reject(new Error(`Failed to close cookie DB: ${closeErr.message}`));
          resolve(result);
        });
      };

      cookieDb.serialize(() => {
        cookieDb.run('DROP TABLE IF EXISTS cookies', dropErr => {
          if (dropErr) return cleanupAndResolve(new Error(`Failed to drop old cookies table: ${dropErr.message}`));

          cookieDb.run(createTableQuery.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE'), createErr => {
            if (createErr) return cleanupAndResolve(new Error(`Failed to create cookies table: ${createErr.message}`));
            if (valid.length === 0) return cleanupAndResolve(null, { success: true, imported: 0 });

            // Parse columns from CREATE TABLE query
            const columnMatch = createTableQuery.match(/\(([^)]+)\)/);
            if (!columnMatch || !columnMatch[1]) {
              return cleanupAndResolve(new Error('Could not parse columns from CREATE TABLE query'));
            }

            const columns = columnMatch[1]
              .split(',')
              .map((col: string) => col.trim().split(/\s+/)[0].replace(/"/g, ''))
              .filter((name: string) => name.toUpperCase() !== 'UNIQUE' && name.toUpperCase() !== 'PRIMARY');

            const placeholders = columns.map(() => '?').join(',');
            const insertQuery = `INSERT OR REPLACE INTO cookies (${columns.join(', ')}) VALUES (${placeholders})`;

            cookieDb.run('BEGIN TRANSACTION', err => {
              if (err) return cleanupAndResolve(new Error(`Transaction begin failed: ${err.message}`));

              const stmt = cookieDb.prepare(insertQuery);
              const sameSiteStringToInt = { no_restriction: 0, lax: 1, strict: 2, unspecified: -1 };
              const nowLdap = unixToLDAP(Date.now() / 1000);

              const getExpiresLdap = (cookie: any) => {
                const expiresTimestamp = cookie.expires ?? cookie.expirationDate;
                return cookie.session || !expiresTimestamp ? '0' : unixToLDAP(expiresTimestamp);
              };

              const columnValueMapping: { [key: string]: (cookie: any) => any } = {
                creation_utc: cookie => unixToLDAP(cookie.creationDate || Date.now() / 1000),
                host_key: cookie => cookie.domain || '',
                top_frame_site_key: () => '',
                name: cookie => cookie.name || '',
                value: cookie => cookie.value || '',
                encrypted_value: () => Buffer.from(''),
                path: cookie => cookie.path || '/',
                expires_utc: cookie => getExpiresLdap(cookie),
                is_secure: cookie => (cookie.secure ? 1 : 0),
                is_http_only: cookie => (cookie.httpOnly ? 1 : 0),
                is_httponly: cookie => (cookie.httpOnly ? 1 : 0),
                last_access_utc: () => nowLdap,
                has_expires: cookie => (getExpiresLdap(cookie) !== '0' ? 1 : 0),
                is_persistent: cookie => (getExpiresLdap(cookie) !== '0' ? 1 : 0),
                priority: () => 1,
                samesite: cookie => sameSiteStringToInt[cookie.sameSite as keyof typeof sameSiteStringToInt] ?? -1,
                source_scheme: cookie => (cookie.secure ? 2 : 1),
                source_port: () => -1,
                is_same_party: () => 0,
                last_update_utc: () => nowLdap,
                source_type: () => 0,
                has_cross_site_ancestor: () => 0
              };

              for (const cookie of valid) {
                const values = columns.map((colName: string) => {
                  const getValue = columnValueMapping[colName];
                  return getValue ? getValue(cookie) : null;
                });

                stmt.run(values, err => {
                  if (err) console.error(`Failed to insert cookie ${cookie.name}:`, err.message);
                });
              }

              stmt.finalize(err => {
                if (err) return cleanupAndResolve(new Error(`Statement finalize failed: ${err.message}`));
                cookieDb.run('COMMIT', commitErr => {
                  if (commitErr) {
                    cookieDb.run('ROLLBACK');
                    return cleanupAndResolve(new Error(`Transaction commit failed: ${commitErr.message}`));
                  }
                  cleanupAndResolve(null, { success: true, imported: valid.length });
                });
              });
            });
          });
        });
      });
    });
  };

  try {
    const writePromises = cookieDbPaths.map(cookieDbPath => writeToDb(cookieDbPath));
    const results = await Promise.all(writePromises);
    const firstResult = results[0];

    if (!firstResult || !firstResult.success) {
      throw new Error('Failed to write cookies to database files.');
    }

    // Update profile JsonData
    profileJson.cookies = { cookies: rawCookies };
    const newJsonData = JSON.stringify(profileJson);

    const updateResult = await Profile.update(
      {
        JsonData: newJsonData,
        UpdatedAt: new Date().toISOString()
      },
      { where: { Id: profileId } }
    );

    if (updateResult[0] === 0) {
      throw new Error('Failed to update profile JsonData after cookie import');
    }

    return { success: true, imported: valid.length };
  } catch (error: any) {
    console.error('Error in importCookies:', error);
    throw new Error(error.message || 'An unknown error occurred during cookie import.');
  }
}

/**
 * Register all cookie-related IPC handlers
 */
export function registerCookieHandlers(): void {
  // Export cookies to JSON string
  ipcMain.handle('profiles:exportCookie', async (_event, profileId: string) => {
    try {
      const cookies = await exportCookies(profileId);
      return JSON.stringify(cookies, null, 2);
    } catch (error) {
      console.error('Export cookies error:', error);
      throw error;
    }
  });

  // Import cookies from JSON/Array
  ipcMain.handle('profiles:importCookie', async (_event, { profileId, rawCookies }) => {
    try {
      const result = await importCookies(profileId, rawCookies);
      return result.success;
    } catch (error) {
      console.error('Import cookies error:', error);
      throw error;
    }
  });

  // Export cookies to file
  ipcMain.handle('cookies:exportToFile', async (_event, { profileId, filePath }) => {
    try {
      const cookies = await exportCookies(profileId);
      await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
      return {
        success: true,
        count: cookies.length,
        filePath
      };
    } catch (error) {
      console.error('Export to file error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Import cookies from file
  ipcMain.handle('cookies:importFromFile', async (_event, { profileId, filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const cookies = JSON.parse(content);
      const result = await importCookies(profileId, cookies);
      return {
        success: true,
        imported: result.imported,
        filePath
      };
    } catch (error) {
      console.error('Import from file error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Validate cookies without importing
  ipcMain.handle('cookies:validate', async (_event, cookies: any[]) => {
    try {
      const { valid, invalid } = validateCookies(cookies);
      return {
        success: true,
        valid: valid.length,
        invalid: invalid.length,
        invalidCookies: invalid
      };
    } catch (error) {
      console.error('Validate cookies error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Batch export cookies from multiple profiles
  ipcMain.handle('cookies:batchExport', async (_event, profileIds: string[]) => {
    try {
      const results = [];
      for (const profileId of profileIds) {
        try {
          const cookies = await exportCookies(profileId);
          results.push({
            profileId,
            success: true,
            cookies,
            count: cookies.length
          });
        } catch (error) {
          results.push({
            profileId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      return { success: true, results };
    } catch (error) {
      console.error('Batch export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Batch import cookies to multiple profiles
  ipcMain.handle(
    'cookies:batchImport',
    async (_event, imports: Array<{ profileId: string; cookies: any[] }>) => {
      try {
        const results = [];
        for (const { profileId, cookies } of imports) {
          try {
            const result = await importCookies(profileId, cookies);
            results.push({
              profileId,
              success: true,
              imported: result.imported
            });
          } catch (error) {
            results.push({
              profileId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        return { success: true, results };
      } catch (error) {
        console.error('Batch import error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  // Get cookie count for a profile
  ipcMain.handle('cookies:getCount', async (_event, profileId: string) => {
    try {
      const cookies = await exportCookies(profileId);
      return {
        success: true,
        count: cookies.length
      };
    } catch (error) {
      console.error('Get cookie count error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  console.log('✅ Cookie handlers registered');
}

/**
 * Unregister all cookie-related IPC handlers
 */
export function unregisterCookieHandlers(): void {
  ipcMain.removeHandler('profiles:exportCookie');
  ipcMain.removeHandler('profiles:importCookie');
  ipcMain.removeHandler('cookies:exportToFile');
  ipcMain.removeHandler('cookies:importFromFile');
  ipcMain.removeHandler('cookies:validate');
  ipcMain.removeHandler('cookies:batchExport');
  ipcMain.removeHandler('cookies:batchImport');
  ipcMain.removeHandler('cookies:getCount');

  console.log('✅ Cookie handlers unregistered');
}