/**
 * Custom Cookie Client
 * Client để kết nối với custom cookie server thay vì GoLogin server
 */

import { makeRequest } from './http.js';

export class CustomCookieClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || process.env.CUSTOM_COOKIE_SERVER_URL || 'http://localhost:3001';
    this.apiKey = options.apiKey || process.env.CUSTOM_COOKIE_API_KEY;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    
    if (!this.apiKey) {
      throw new Error('API key is required for custom cookie server');
    }
  }

  /**
   * Upload cookies to custom server
   */
  async uploadCookies(profileId, cookies, options = {}) {
    try {
      console.log(`🔄 [Custom Cookie Client] Uploading ${cookies.length} cookies for profile: ${profileId}`);
      
      const response = await this.makeServerRequest(`/api/profiles/${profileId}/cookies`, {
        method: 'POST',
        json: {
          cookies,
          replace: options.replace || false
        }
      });

      console.log(`✅ [Custom Cookie Client] Upload successful: ${response.data.savedCount} cookies saved`);
      
      return {
        success: true,
        message: response.message,
        cookieCount: response.data.savedCount
      };
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Upload failed:`, error);
      throw new Error(`Failed to upload cookies: ${error.message}`);
    }
  }

  /**
   * Download cookies from custom server
   */
  async downloadCookies(profileId, options = {}) {
    try {
      console.log(`🔄 [Custom Cookie Client] Downloading cookies for profile: ${profileId}`);
      
      const queryParams = new URLSearchParams();
      if (options.domain) queryParams.append('domain', options.domain);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);
      
      const url = `/api/profiles/${profileId}/cookies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await this.makeServerRequest(url, {
        method: 'GET'
      });

      console.log(`✅ [Custom Cookie Client] Download successful: ${response.data.length} cookies retrieved`);
      
      return {
        success: true,
        message: 'Cookies downloaded successfully',
        cookieCount: response.data.length,
        cookies: response.data
      };
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Download failed:`, error);
      throw new Error(`Failed to download cookies: ${error.message}`);
    }
  }

  /**
   * Get profile information
   */
  async getProfile(profileId) {
    try {
      const response = await this.makeServerRequest(`/api/profiles/${profileId}`, {
        method: 'GET'
      });

      return response.data;
      
    } catch (error) {
      if (error.message.includes('404')) {
        return null; // Profile not found
      }
      throw error;
    }
  }

  /**
   * Create profile on custom server
   */
  async createProfile(profileData) {
    try {
      console.log(`🔄 [Custom Cookie Client] Creating profile: ${profileData.name}`);
      
      const response = await this.makeServerRequest('/api/profiles', {
        method: 'POST',
        json: profileData
      });

      console.log(`✅ [Custom Cookie Client] Profile created: ${response.data.name} (${response.data.id})`);
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Profile creation failed:`, error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(profileId) {
    try {
      const response = await this.makeServerRequest(`/api/profiles/${profileId}/sync`, {
        method: 'GET'
      });

      return response.data;
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Failed to get sync status:`, error);
      throw error;
    }
  }

  /**
   * Create backup
   */
  async createBackup(profileId, backupName) {
    try {
      console.log(`🔄 [Custom Cookie Client] Creating backup for profile: ${profileId}`);
      
      const response = await this.makeServerRequest(`/api/profiles/${profileId}/backup`, {
        method: 'POST',
        json: {
          name: backupName
        }
      });

      console.log(`✅ [Custom Cookie Client] Backup created: ${response.data.name}`);
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Backup creation failed:`, error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * List backups
   */
  async getBackups(profileId) {
    try {
      const response = await this.makeServerRequest(`/api/profiles/${profileId}/backups`, {
        method: 'GET'
      });

      return response.data;
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Failed to get backups:`, error);
      throw error;
    }
  }

  /**
   * Restore backup
   */
  async restoreBackup(profileId, backupId) {
    try {
      console.log(`🔄 [Custom Cookie Client] Restoring backup ${backupId} for profile: ${profileId}`);
      
      const response = await this.makeServerRequest(`/api/profiles/${profileId}/backups/${backupId}/restore`, {
        method: 'POST'
      });

      console.log(`✅ [Custom Cookie Client] Backup restored: ${response.data.restoredCount} cookies`);
      
      return response.data;
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Backup restore failed:`, error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * Delete cookies
   */
  async deleteCookies(profileId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.domain) queryParams.append('domain', filters.domain);
      if (filters.name) queryParams.append('name', filters.name);
      
      const url = `/api/profiles/${profileId}/cookies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await this.makeServerRequest(url, {
        method: 'DELETE'
      });

      console.log(`✅ [Custom Cookie Client] Deleted ${response.data.deletedCount} cookies`);
      
      return response.data.deletedCount;
      
    } catch (error) {
      console.error(`❌ [Custom Cookie Client] Cookie deletion failed:`, error);
      throw error;
    }
  }

  /**
   * Test server connection
   */
  async testConnection() {
    try {
      const response = await this.makeServerRequest('/health', {
        method: 'GET'
      });

      return {
        success: true,
        status: response.status,
        version: response.version,
        uptime: response.uptime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get server info
   */
  async getServerInfo() {
    try {
      const response = await this.makeServerRequest('/api/info', {
        method: 'GET'
      });

      return response;
      
    } catch (error) {
      throw new Error(`Failed to get server info: ${error.message}`);
    }
  }

  /**
   * Make request to custom server
   */
  async makeServerRequest(endpoint, options = {}) {
    const url = `${this.serverUrl}${endpoint}`;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'gologin-custom-cookie-client',
        ...options.headers
      },
      timeout: this.timeout,
      maxAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      ...options
    };

    try {
      const response = await makeRequest(url, requestOptions);
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      
      if (!data.success) {
        throw new Error(data.error || 'Server request failed');
      }
      
      return data;
      
    } catch (error) {
      // Enhanced error handling
      if (error.statusCode) {
        switch (error.statusCode) {
          case 401:
            throw new Error('Authentication failed: Invalid API key');
          case 403:
            throw new Error('Access denied: Insufficient permissions');
          case 404:
            throw new Error('Resource not found');
          case 429:
            throw new Error('Rate limit exceeded: Too many requests');
          case 500:
            throw new Error('Server error: Internal server error');
          default:
            throw new Error(`Server error (${error.statusCode}): ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Set API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Set server URL
   */
  setServerUrl(serverUrl) {
    this.serverUrl = serverUrl;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      serverUrl: this.serverUrl,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    };
  }
}
