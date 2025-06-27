import { app } from 'electron';
import { retryWithBackoff } from '../index';
import store from '../store';
const path = require('path');
const fs = require('fs').promises;

// Directly require the CommonJS module
const { GoLogin, GologinApi } = require('../gologin/gologin.js');

export interface ProfileData {
  Id?: string;
  Name: string;
  GroupId?: number;
  JsonData?: string;
  ProfilePath?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  [key: string]: any;
}

export interface LaunchResult {
  status: string;
  wsUrl: string;
  port: number;
  processId: number | null;
  profileId: string;
}

export interface RunningProfile {
  profileId: string;
  port: number;
  startTime: Date;
  processId: number | null;
  isProcessAlive: boolean;
}

/**
 * 🚀 GoLogin Service - Centralized service for all GoLogin operations
 * Provides clean API for profile management, browser launching, and cookie operations
 */
export class GoLoginService {
  private runningProfiles = new Map<string, { goLogin: any; port: number; startTime: Date }>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Get GoLogin access token from secure storage
   */
  private getAccessToken(): string {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MjE0YWM3MzdhMTIwZjRlZDk2OTM2YTYiLCJ0eXBlIjoiZGV2Iiwiand0aWQiOiI2ODNkYmQzMDllZjNmNzMyNjk1ODA3ZTYifQ.gUN3PNj6BkIwUm9urC3a2IuVniwvltW_OUvJkxXaDeo";
    if (!token) {
      throw new Error("GoLogin token not found. Please configure it in Settings.");
    }
    return token as string;
  }

  /**
   * Get profiles directory path
   */
  private getProfilesPath(): string {
    return (store.get("dataPath") as string) || app.getPath("userData");
  }

  /**
   * Format date time for database storage
   */
  private formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds())
    );
  }

  /**
   * Validate and sanitize profile name
   */
  private sanitizeProfileName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new Error("Profile name is required.");
    }
    
    const sanitized = name.replace(/[^a-zA-Z0-9\s\-_\.]/g, '').trim().replace(/\s+/g, ' ');
    if (sanitized.length === 0) {
      throw new Error("Profile name contains only invalid characters.");
    }
    if (sanitized.length > 50) {
      throw new Error("Profile name must be 50 characters or less.");
    }
    
    return sanitized;
  }

  /**
   * Check if a process is still running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up a running profile
   */
  private cleanupRunningProfile(profileId: string, reason: string = 'Process ended'): void {
    if (this.runningProfiles.has(profileId)) {
      const runningProfile = this.runningProfiles.get(profileId);
      if (runningProfile) {
        console.log(`Cleaning up profile ${profileId}: ${reason}`);
        runningProfile.goLogin.setActive(false);
        this.runningProfiles.delete(profileId);
      }
    }
  }

  /**
   * Start health monitoring for running processes
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      const profilesToCleanup: string[] = [];
      
      this.runningProfiles.forEach((data, profileId) => {
        if (data.goLogin.processSpawned) {
          const pid = data.goLogin.processSpawned.pid;
          if (pid && !this.isProcessRunning(pid)) {
            console.log(`Process ${pid} for profile ${profileId} is no longer running`);
            profilesToCleanup.push(profileId);
          }
        }
      });
      
      profilesToCleanup.forEach(profileId => {
        this.cleanupRunningProfile(profileId, 'Process died externally');
      });
    }, 5000);
  }

  /**
   * Stop health monitoring
   */
  public stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Create a new profile with GoLogin
   */
  async createProfile(profileData: ProfileData): Promise<string> {
    let profileId: string | null = null;
    let GL: any = null;
    
    try {
      if (!GologinApi || !GoLogin) {
        throw new Error("GoLogin library is not available. Please restart the application.");
      }
      
      const access_token = this.getAccessToken();
      const profilesPath = this.getProfilesPath();
      
      // Validate and sanitize profile name
      profileData.Name = this.sanitizeProfileName(profileData.Name);

      GL = GologinApi({ token: access_token });
      
      console.log(`Creating profile: ${profileData.Name}`);
      
      // Create profile with retry mechanism
      const profileGologin = await retryWithBackoff(
        async () => {
          const result = await GL.createProfileRandomFingerprint(profileData.Name);
          if (!result || !result.id) {
            throw new Error("Failed to create profile: Invalid response from GoLogin API.");
          }
          return result;
        },
        3, // maxRetries
        2000, // baseDelay
        'GoLogin profile creation failed'
      );
      
      profileId = profileGologin.id;

      const goLogin = new GoLogin({
        token: access_token, 
        profile_id: profileId, 
        tmpdir: profilesPath 
      });
      
      console.log(`Profile created with id: ${profileId}`);
      
      // Get profile data with retry mechanism
      const JsonData = await retryWithBackoff(
        async () => await goLogin.getProfile(),
        3, // maxRetries
        1500, // baseDelay  
        `Failed to get profile data for ${profileId}`
      );
      
      profileData.JsonData = JSON.stringify(JsonData);
      
      // Clean up remote profile (we only need local copy)
      try {
        await GL.deleteProfile(profileId);
      } catch (error: any) {
        console.warn(`Warning: Failed to delete remote profile ${profileId}:`, error.message);
        // Don't fail the entire operation for this
      }
      
      // Download and extract profile with retry
      await retryWithBackoff(
        async () => {
          await goLogin.downloadProfileAndExtract(profileData, true);
          console.log(`Profile downloaded and extracted to: ${goLogin.profilePath()}`);
        },
        3, // maxRetries
        3000, // baseDelay (longer for downloads)
        `Failed to download profile ${profileId}`
      );
      
      // Create startup script
      try {
        await goLogin.createStartup(true, JsonData);
      } catch (error: any) {
        console.warn(`Warning: Failed to create startup script for ${profileId}:`, error.message);
        // Don't fail for this, profile can still work
      }
      
      // Clean up zip file
      try {
        const profilesPath = this.getProfilesPath();
        await fs.unlink(path.join(profilesPath, `gologin_${profileId}.zip`));
      } catch (error: any) {
        console.warn(`Warning: Failed to clean up zip file for ${profileId}:`, error.message);
        // Don't fail for cleanup issues
      }
      
      // Prepare final profile data
      const now = this.formatDateTime(new Date());
      profileData.ProfilePath = `gologin_profile_${profileId}`;
      profileData.CreatedAt = now;
      profileData.UpdatedAt = now;
      profileData.Id = profileId || undefined;
      
      return profileId || '';
      
    } catch (error: any) {
      // Cleanup on failure
      if (profileId && GL) {
        try {
          console.log(`Cleaning up failed profile creation: ${profileId}`);
          await GL.deleteProfile(profileId);
        } catch (cleanupError: any) {
          console.warn(`Failed to cleanup profile ${profileId}:`, cleanupError.message);
        }
      }
      
      console.error('Profile creation failed:', error);
      throw error;
    }
  }

  /**
   * Launch a profile browser
   */
  async launchProfile(profileId: string, profileJsonData: string): Promise<LaunchResult> {
    const access_token = this.getAccessToken();
    const profilesPath = this.getProfilesPath();
    
    if (this.runningProfiles.has(profileId)) {
      const existing = this.runningProfiles.get(profileId);
      throw new Error(`Profile is already running on port ${existing?.port}`);
    }
    
    const goLogin = new GoLogin({
      token: access_token, 
      profile_id: profileId, 
      tmpdir: profilesPath 
    });
    goLogin.writeCookiesFromServer = false;
    
    // Create startup with retry
    await retryWithBackoff(
      async () => await goLogin.createStartupCustom(true, JSON.parse(profileJsonData)),
      2, // maxRetries (fewer for startup)
      1000, // baseDelay
      `Failed to create startup for profile ${profileId}`
    );
    
    // Spawn browser with retry
    const wsUrl = await retryWithBackoff(
      async () => await goLogin.spawnBrowser(),
      2, // maxRetries
      2000, // baseDelay (longer for browser spawn)
      `Failed to spawn browser for profile ${profileId}`
    );
    
    console.log('wsUrl:', wsUrl);
    goLogin.setActive(true);
    
    this.runningProfiles.set(profileId, {
      goLogin,
      port: goLogin.port,
      startTime: new Date()
    });
    
    // Setup process event listeners
    if (goLogin.processSpawned) {
      goLogin.processSpawned.on('exit', (code: number, signal: string) => {
        console.log(`Browser process for profile ${profileId} exited with code ${code}, signal ${signal}`);
        this.cleanupRunningProfile(profileId, `Process exited (code: ${code}, signal: ${signal})`);
      });
      
      goLogin.processSpawned.on('error', (error: Error) => {
        console.log(`Browser process for profile ${profileId} error:`, error.message);
        this.cleanupRunningProfile(profileId, `Process error: ${error.message}`);
      });
      
      goLogin.processSpawned.on('close', (code: number, signal: string) => {
        console.log(`Browser process for profile ${profileId} closed with code ${code}, signal ${signal}`);
        this.cleanupRunningProfile(profileId, `Process closed (code: ${code}, signal: ${signal})`);
      });
    }
    
    return {
      status: 'success', 
      wsUrl: wsUrl, 
      port: goLogin.port, 
      processId: goLogin.processSpawned?.pid || null,
      profileId: profileId
    };
  }

  /**
   * Stop a running profile
   */
  async stopProfile(profileId: string): Promise<{ status: string; message: string }> {
    try {
      const runningProfile = this.runningProfiles.get(profileId);
      
      if (!runningProfile) {
        throw new Error(`Profile ${profileId} is not currently running`);
      }
      
      const { goLogin } = runningProfile;
      
      if (goLogin.processSpawned) {
        goLogin.processSpawned.kill('SIGTERM');
        console.log(`Killed process for profile ${profileId}`);
      }
      
      this.cleanupRunningProfile(profileId, 'Stopped manually');
      
      console.log(`Profile ${profileId} stopped successfully`);
      return { status: 'success', message: 'Profile stopped successfully' };
    } catch (error: any) {
      console.error(`Error stopping profile ${profileId}:`, error);
      throw new Error(`Failed to stop profile: ${error.message}`);
    }
  }

  /**
   * Get list of running profiles
   */
  async getRunningProfiles(): Promise<RunningProfile[]> {
    const profilesToCleanup: string[] = [];
    
    this.runningProfiles.forEach((data, profileId) => {
      if (data.goLogin.processSpawned) {
        const pid = data.goLogin.processSpawned.pid;
        if (pid && !this.isProcessRunning(pid)) {
          profilesToCleanup.push(profileId);
        }
      }
    });
    
    profilesToCleanup.forEach(profileId => {
      this.cleanupRunningProfile(profileId, 'Process died - detected in getRunning');
    });

    const running = Array.from(this.runningProfiles.entries())
      .filter(([_, data]) => {
        const pid = data.goLogin.processSpawned?.pid;
        return pid && this.isProcessRunning(pid);
      })
      .map(([profileId, data]) => ({
        profileId,
        port: data.port,
        startTime: data.startTime,
        processId: data.goLogin.processSpawned?.pid || null,
        isProcessAlive: true
      }));
      
    return running;
  }

  /**
   * Export cookies for a profile
   */
  async exportCookies(profileId: string): Promise<any> {
    const access_token = this.getAccessToken();
    const profilesPath = this.getProfilesPath();
    
    const goLogin = new GoLogin({
      token: access_token,
      profile_id: profileId,
      tmpdir: profilesPath
    });

    // Export cookies with retry mechanism
    return await retryWithBackoff(
      async () => await goLogin.exportCookies(),
      3, // maxRetries
      1500, // baseDelay
      `Failed to export cookies for profile ${profileId}`
    );
  }

  /**
   * Import cookies for a profile
   */
  async importCookies(profileId: string, cookies: any): Promise<void> {
    const access_token = this.getAccessToken();
    const profilesPath = this.getProfilesPath();
    
    const goLogin = new GoLogin({
      token: access_token,
      profile_id: profileId,
      tmpdir: profilesPath
    });

    // Import cookies with retry mechanism
    await retryWithBackoff(
      async () => await goLogin.importCookies(cookies),
      3, // maxRetries
      1500, // baseDelay
      `Failed to import cookies for profile ${profileId}`
    );
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    runningProfilesCount: number;
    totalSessions: number;
    uptime: string;
  } {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    return {
      runningProfilesCount: this.runningProfiles.size,
      totalSessions: this.runningProfiles.size,
      uptime: `${hours}h ${minutes}m`
    };
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.stopHealthMonitoring();
    
    // Stop all running profiles
    this.runningProfiles.forEach((data, profileId) => {
      try {
        if (data.goLogin.processSpawned) {
          data.goLogin.processSpawned.kill('SIGTERM');
        }
        data.goLogin.setActive(false);
      } catch (error) {
        console.error(`Error cleaning up profile ${profileId}:`, error);
      }
    });
    
    this.runningProfiles.clear();
    console.log('GoLoginService destroyed and all resources cleaned up');
  }
} 