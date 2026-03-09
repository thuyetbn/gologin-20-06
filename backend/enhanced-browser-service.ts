import { exec } from 'child_process';
import { BrowserWindow, app } from 'electron';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { BrowserChecker } from './gologin/browser/browser-checker.js';

const execAsync = promisify(exec);

export interface BrowserDownloadProgress {
  stage: 'checking' | 'downloading' | 'extracting' | 'installing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface BrowserHealth {
  isHealthy: boolean;
  version: string;
  path: string;
  size: number;
  lastChecked: Date;
  issues: string[];
  performance: {
    startupTime: number;
    memoryUsage: number;
    responseTime: number;
  };
}

export interface BrowserBackup {
  id: string;
  version: string;
  createdAt: Date;
  size: number;
  path: string;
  description?: string;
}

export interface BrowserPerformanceMetrics {
  startupTime: number;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  crashCount: number;
  lastCrash?: Date;
}

export interface BrowserRepairResult {
  success: boolean;
  actions: string[];
  errors?: string[];
}

export interface CacheCleanResult {
  cleaned: boolean;
  freedSpace: number;
  errors?: string[];
}

/**
 * 🚀 Enhanced Browser Service with advanced features:
 * - Health monitoring and auto-repair
 * - Backup and restore functionality  
 * - Performance tracking
 * - Cache management
 * - Retry mechanisms with exponential backoff
 */
export class EnhancedBrowserService {
  private browserChecker: BrowserChecker;
  private downloadWindow: BrowserWindow | null = null;
  private latestVersionInfo: any = null;
  private majorVersion: string = '118'; // default fallback
  private performanceMetrics: Map<string, BrowserPerformanceMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private backupDir: string;
  
  constructor() {
    this.browserChecker = new BrowserChecker();
    this.backupDir = join(homedir(), '.gologin', 'browser-backups');
    this.initializeService();
  }

  /**
   * Get path to version info file
   */
  private getVersionInfoPath(): string {
    return join(homedir(), '.gologin', 'browser-version.json');
  }

  /**
   * Save browser version info to file
   */
  async saveBrowserVersionInfo(versionInfo: { version: string; majorVersion: string; installedAt: string }): Promise<void> {
    try {
      const versionPath = this.getVersionInfoPath();
      const dir = join(versionPath, '..');
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(versionPath, JSON.stringify(versionInfo, null, 2));
      console.log(`✅ Browser version info saved: ${versionInfo.version} (${versionInfo.majorVersion})`);
    } catch (error) {
      console.error('Failed to save browser version info:', error);
    }
  }

  /**
   * Load browser version info from file
   */
  async loadBrowserVersionInfo(): Promise<{ version: string; majorVersion: string; installedAt: string } | null> {
    try {
      const versionPath = this.getVersionInfoPath();
      const data = await fs.readFile(versionPath, 'utf8');
      const versionInfo = JSON.parse(data);
      console.log(`📖 Loaded browser version info: ${versionInfo.version} (${versionInfo.majorVersion})`);
      return versionInfo;
    } catch (error) {
      console.log('📝 No previous browser version info found, will use API check');
      return null;
    }
  }

  private async initializeService(): Promise<void> {
    await this.initializeBackupDirectory();
    this.startHealthMonitoring();
    console.log('🚀 Enhanced Browser Service initialized with advanced features');
  }

  async checkBrowserExists(majorVersion?: string): Promise<boolean> {
    if (!majorVersion) majorVersion = this.majorVersion;
    
    try {
      const browserPath = this.browserChecker.getBrowserExecutablePath(majorVersion);
      await fs.access(browserPath);
      return true;
    } catch {
      return false;
    }
  }

  private async fetchLatestVersionInfo(): Promise<void> {
    try {
      console.log('🔍 Fetching latest browser version info from API...');
      const versionInfo = await this.browserChecker.getLatestBrowserVersion();
      
      console.log('📊 Raw API response:', JSON.stringify(versionInfo, null, 2));
      
      if (versionInfo && typeof versionInfo === 'object' && versionInfo.latestVersion) {
        this.latestVersionInfo = versionInfo;
        
        // Extract major version from latestVersion (e.g., "118.0.5993.117" -> "118")
        const [major] = versionInfo.latestVersion.split('.');
        this.majorVersion = major;
        console.log(`✅ Latest browser version: ${versionInfo.latestVersion}, Major: ${this.majorVersion}`);
      } else if (versionInfo && typeof versionInfo === 'string' && versionInfo.trim() !== '') {
        // Handle case where API returns version as string
        this.latestVersionInfo = { latestVersion: versionInfo.trim() };
        const [major] = versionInfo.trim().split('.');
        this.majorVersion = major;
        console.log(`✅ Latest browser version (string): ${versionInfo.trim()}, Major: ${this.majorVersion}`);
      } else {
        console.warn('⚠️ API returned invalid or empty version info, using default fallback');
        console.warn('Response was:', versionInfo);
        this.majorVersion = '118'; // fallback
        this.latestVersionInfo = { latestVersion: '118.0.0.0' };
      }
    } catch (error) {
      console.error('❌ Error fetching latest browser version:', error);
      this.majorVersion = '118'; // fallback
      this.latestVersionInfo = { latestVersion: '118.0.0.0' };
    }
  }

  async installBrowserWithProgress(
    parentWindow: BrowserWindow,
    majorVersion?: string
  ): Promise<string> {
    // Fetch latest version info if not provided
    if (!majorVersion) {
      await this.fetchLatestVersionInfo();
      majorVersion = this.majorVersion;
    }

    return new Promise((resolve, reject) => {
      // Create download progress window
      this.downloadWindow = new BrowserWindow({
        width: 900,
        height: 700,
        parent: parentWindow,
        modal: true,
        show: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: join(__dirname, "preload.js"),
        },
      });

      // Load the download progress page
      if (!app.isPackaged) {
        this.downloadWindow.loadURL(`http://localhost:${require('./constants').PORT}/browser-download`);
      } else {
        this.downloadWindow.loadFile(join(__dirname, '..', '..', 'dist', 'frontend', 'browser-download.html'));
      }

      this.downloadWindow.once('ready-to-show', () => {
        this.downloadWindow?.show();
      });

      this.downloadWindow.on('closed', () => {
        this.downloadWindow = null;
      });

      this.installBrowserWithRetry(majorVersion!, 3)
        .then((browserPath) => {
          this.sendProgress({
            stage: 'completed',
            progress: 100,
            message: 'Browser installation completed successfully!'
          });
          
          setTimeout(() => {
            this.downloadWindow?.close();
            resolve(browserPath);
          }, 1500);
        })
        .catch((error) => {
          this.sendProgress({
            stage: 'error',
            progress: 0,
            message: 'Installation failed',
            error: error.message
          });
          
          setTimeout(() => {
            this.downloadWindow?.close();
            reject(error);
          }, 3000);
        });
    });
  }

  private async installBrowser(majorVersion: string): Promise<string> {
    try {
      this.sendProgress({
        stage: 'checking',
        progress: 10,
        message: 'Checking browser requirements and fetching latest version...'
      });

      // Ensure we have latest version info
      if (!this.latestVersionInfo) {
        await this.fetchLatestVersionInfo();
      }

      // Create browser directory
      const browserDir = join(homedir(), '.gologin', 'browser');
      await fs.mkdir(browserDir, { recursive: true });

      this.sendProgress({
        stage: 'downloading',
        progress: 20,
        message: `Downloading Orbita browser v${this.latestVersionInfo?.latestVersion || majorVersion}...`
      });

      // Use browser checker's download method which already handles the download URL
      await this.browserChecker.downloadBrowser(majorVersion);

      this.sendProgress({
        stage: 'extracting',
        progress: 70,
        message: 'Extracting browser files...'
      });

      // Small delay to show extracting message
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.sendProgress({
        stage: 'installing',
        progress: 90,
        message: 'Finalizing installation...'
      });

      // Get final browser path
      const browserPath = this.browserChecker.getBrowserExecutablePath(majorVersion);
      
      // Verify installation
      await fs.access(browserPath);

      // Save version info after successful installation
      await this.saveBrowserVersionInfo({
        version: this.latestVersionInfo?.latestVersion || `${majorVersion}.0.0.0`,
        majorVersion: majorVersion,
        installedAt: new Date().toISOString()
      });

      return browserPath;
    } catch (error) {
      throw new Error(`Browser installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private sendProgress(progress: BrowserDownloadProgress) {
    if (this.downloadWindow && !this.downloadWindow.isDestroyed()) {
      this.downloadWindow.webContents.send('browser-download-progress', progress);
    }
  }

  getBrowserPath(majorVersion?: string): string {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }
    return this.browserChecker.getBrowserExecutablePath(majorVersion);
  }

  getBrowserDownloadUrl(majorVersion?: string): string {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }
    return this.browserChecker.getBrowserDownloadUrl(majorVersion);
  }

  getLatestVersionInfo(): any {
    return this.latestVersionInfo;
  }

  getMajorVersion(): string {
    return this.majorVersion;
  }

  /**
   * Get latest major version, fetching from API if needed
   */
  async getLatestMajorVersion(): Promise<string> {
    if (!this.latestVersionInfo) {
      await this.fetchLatestVersionInfo();
    }
    return this.majorVersion;
  }

  /**
   * Get full latest version info, fetching from API if needed
   */
  async getLatestVersionInfoAsync(): Promise<any> {
    if (!this.latestVersionInfo) {
      await this.fetchLatestVersionInfo();
    }
    return this.latestVersionInfo;
  }

  closeDownloadWindow() {
    if (this.downloadWindow) {
      this.downloadWindow.close();
      this.downloadWindow = null;
    }
  }

  private async installBrowserWithRetry(majorVersion: string, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Browser installation attempt ${attempt}/${maxRetries}`);
        return await this.installBrowser(majorVersion);
      } catch (error) {
        lastError = error as Error;
        console.error(`Installation attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          this.sendProgress({
            stage: 'error',
            progress: 0,
            message: `Installation failed (attempt ${attempt}/${maxRetries}). Retrying in 3 seconds...`
          });
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    throw new Error(`Installation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  async performHealthCheck(majorVersion?: string): Promise<BrowserHealth> {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }

    const browserPath = this.getBrowserPath(majorVersion);
    const health: BrowserHealth = {
      isHealthy: false,
      version: majorVersion,
      path: browserPath,
      size: 0,
      lastChecked: new Date(),
      issues: [],
      performance: {
        startupTime: 0,
        memoryUsage: 0,
        responseTime: 0
      }
    };

    try {
      // Check if browser executable exists
      await fs.access(browserPath);

      // Get browser size
      const stats = await fs.stat(browserPath);
      health.size = stats.size;

      // Check if executable is actually executable
      if (process.platform !== 'win32') {
        try {
          await fs.access(browserPath, fs.constants.X_OK);
        } catch {
          health.issues.push('Browser executable does not have execute permissions');
        }
      }

      // Test browser startup
      const startTime = Date.now();
      try {
        const { stdout } = await execAsync(`"${browserPath}" --version`);
        health.performance.startupTime = Date.now() - startTime;
        health.version = stdout.trim();
      } catch (error) {
        health.issues.push(`Browser startup test failed: ${error}`);
      }

      // Check for corrupt files in browser directory
      const browserDir = join(browserPath, '..');
      try {
        await this.validateBrowserIntegrity(browserDir);
      } catch (error) {
        health.issues.push(`Browser integrity check failed: ${error}`);
      }

      health.isHealthy = health.issues.length === 0;
      
      console.log(`Browser health check completed for v${majorVersion}:`, health.isHealthy ? 'HEALTHY' : 'ISSUES FOUND');
      return health;

    } catch (error) {
      health.issues.push(`Browser not found at path: ${browserPath}`);
      console.error('Browser health check failed:', error);
      return health;
    }
  }

  private async validateBrowserIntegrity(browserDir: string): Promise<void> {
    const criticalFiles = [
      'chrome', 'chrome.exe', 'Orbita',
      'resources', 'locales'
    ];

    for (const file of criticalFiles) {
      const filePath = join(browserDir, file);
      try {
        await fs.access(filePath);
      } catch {
        // Only throw for critical files that should exist on this platform
        if ((process.platform === 'win32' && file === 'chrome.exe') ||
            (process.platform !== 'win32' && (file === 'chrome' || file === 'Orbita'))) {
          throw new Error(`Critical file missing: ${file}`);
        }
      }
    }
  }

  async createBackup(majorVersion?: string, description?: string): Promise<BrowserBackup> {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }

    const browserDir = join(homedir(), '.gologin', 'browser', `orbita-browser-${majorVersion}`);
    const backupId = `backup-${majorVersion}-${Date.now()}`;
    const backupPath = join(this.backupDir, `${backupId}.tar.gz`);

    try {
      // Create backup using tar
      await execAsync(`tar -czf "${backupPath}" -C "${join(browserDir, '..')}" "orbita-browser-${majorVersion}"`);

      const stats = await fs.stat(backupPath);
      const backup: BrowserBackup = {
        id: backupId,
        version: majorVersion,
        createdAt: new Date(),
        size: stats.size,
        path: backupPath,
        description
      };

      // Save backup metadata
      await this.saveBackupMetadata(backup);
      
      console.log(`Browser backup created: ${backupId}`);
      return backup;

    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async restoreFromBackup(backupId: string, majorVersion?: string): Promise<void> {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }

    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const browserDir = join(homedir(), '.gologin', 'browser');
    const targetDir = `orbita-browser-${majorVersion}`;

    try {
      // Remove existing browser
      await this.browserChecker.deleteDir(join(browserDir, targetDir));

      // Extract backup — validate path is within backup directory
      if (!backup.path.startsWith(this.backupDir)) {
        throw new Error('Invalid backup path');
      }
      await execAsync(`tar -xzf "${backup.path}" -C "${browserDir}"`);

      console.log(`Browser restored from backup: ${backupId}`);

    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  async listBackups(): Promise<BrowserBackup[]> {
    try {
      const metadataPath = join(this.backupDir, 'metadata.json');
      const data = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    try {
      await fs.unlink(backup.path);
      const remainingBackups = backups.filter(b => b.id !== backupId);
      await this.saveBackupMetadata(remainingBackups);
      
      console.log(`Backup deleted: ${backupId}`);
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error}`);
    }
  }

  async repairBrowser(majorVersion?: string): Promise<BrowserRepairResult> {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }

    const actions: string[] = [];
    const health = await this.performHealthCheck(majorVersion);

    if (health.isHealthy) {
      return { success: true, actions: ['Browser is already healthy'] };
    }

    try {
      // Fix permissions if needed
      if (health.issues.some(issue => issue.includes('execute permissions'))) {
        if (process.platform !== 'win32') {
          await execAsync(`chmod +x "${health.path}"`);
          actions.push('Fixed executable permissions');
        }
      }

      // Re-download if browser is missing or corrupt
      if (health.issues.some(issue => issue.includes('not found') || issue.includes('integrity'))) {
        await this.browserChecker.downloadBrowser(majorVersion);
        actions.push('Re-downloaded browser');
      }

      // Verify repair
      const newHealth = await this.performHealthCheck(majorVersion);
      
      return {
        success: newHealth.isHealthy,
        actions
      };

    } catch (error) {
      throw new Error(`Browser repair failed: ${error}`);
    }
  }

  getPerformanceMetrics(majorVersion?: string): BrowserPerformanceMetrics | null {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }
    return this.performanceMetrics.get(majorVersion) || null;
  }

  updatePerformanceMetrics(majorVersion: string, metrics: Partial<BrowserPerformanceMetrics>): void {
    const existing = this.performanceMetrics.get(majorVersion) || {
      startupTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      responseTime: 0,
      crashCount: 0
    };

    this.performanceMetrics.set(majorVersion, { ...existing, ...metrics });
  }

  async cleanBrowserCache(majorVersion?: string): Promise<{ cleaned: boolean; freedSpace: number }> {
    if (!majorVersion) {
      majorVersion = this.majorVersion;
    }

    const browserDir = join(homedir(), '.gologin', 'browser', `orbita-browser-${majorVersion}`);
    const cacheDirectories = [
      'Default/Cache',
      'Default/Code Cache',
      'Default/GPUCache',
      'ShaderCache'
    ];

    let freedSpace = 0;

    try {
      for (const cacheDir of cacheDirectories) {
        const cachePath = join(browserDir, cacheDir);
        try {
          const stats = await fs.stat(cachePath);
          if (stats.isDirectory()) {
            freedSpace += await this.calculateDirectorySize(cachePath);
            await this.browserChecker.deleteDir(cachePath);
          }
        } catch {
          // Cache directory doesn't exist, skip
        }
      }

      console.log(`Cleaned browser cache, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
      return { cleaned: true, freedSpace };

    } catch (error) {
      console.error('Failed to clean browser cache:', error);
      return { cleaned: false, freedSpace: 0 };
    }
  }

  private startHealthMonitoring(): void {
    // Health monitoring disabled to prevent auto-restart issues
    console.log('⚠️ EnhancedBrowserService health monitoring disabled to prevent Chrome auto-restart');
    // this.healthCheckInterval = setInterval(async () => {
    //   try {
    //     const health = await this.performHealthCheck();
    //     if (!health.isHealthy) {
    //       console.warn(`Browser health issues detected:`, health.issues);
    //       // Auto-repair if issues are simple
    //       if (health.issues.length === 1 && health.issues[0].includes('permissions')) {
    //         await this.repairBrowser();
    //       }
    //     }
    //   } catch (error) {
    //     console.error('Health monitoring check failed:', error);
    //   }
    // }, 30 * 60 * 1000); // 30 minutes
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  private async saveBackupMetadata(backup: BrowserBackup | BrowserBackup[]): Promise<void> {
    const metadataPath = join(this.backupDir, 'metadata.json');
    
    let backups: BrowserBackup[];
    if (Array.isArray(backup)) {
      backups = backup;
    } else {
      const existing = await this.listBackups();
      backups = [...existing, backup];
    }

    await fs.writeFile(metadataPath, JSON.stringify(backups, null, 2));
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          size += await this.calculateDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch {
      // Directory access error, return 0
    }

    return size;
  }

  destroy(): void {
    this.stopHealthMonitoring();
    this.closeDownloadWindow();
  }

  /**
   * Download browser silently in background without UI
   */
  async downloadBrowserSilently(majorVersion?: string): Promise<string> {
    if (!majorVersion) {
      await this.fetchLatestVersionInfo();
      majorVersion = this.majorVersion;
    }

    try {
      console.log(`🔄 Downloading browser v${majorVersion} silently...`);
      
      // Use browser checker's download method directly
      await this.browserChecker.downloadBrowser(majorVersion);
      
      // Get final browser path
      const browserPath = this.browserChecker.getBrowserExecutablePath(majorVersion);
      
      // Verify installation
      await fs.access(browserPath);
      
      // Save version info after successful installation
      await this.saveBrowserVersionInfo({
        version: this.latestVersionInfo?.latestVersion || `${majorVersion}.0.0.0`,
        majorVersion: majorVersion,
        installedAt: new Date().toISOString()
      });
      
      console.log(`✅ Browser v${majorVersion} downloaded successfully to: ${browserPath}`);
      return browserPath;
      
    } catch (error) {
      throw new Error(`Silent browser download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get browser executable path for given major version
   */
  getBrowserExecutablePath(majorVersion?: string): string {
    if (!majorVersion) majorVersion = this.majorVersion;
    return this.browserChecker.getBrowserExecutablePath(majorVersion);
  }

  /**
   * Get current browser version
   */
  async getCurrentBrowserVersion(majorVersion?: string): Promise<string> {
    if (!majorVersion) majorVersion = this.majorVersion;
    return await this.browserChecker.getCurrentVersion(majorVersion);
  }

  /**
   * Download browser with progress callback (for in-dialog progress)
   */
  async downloadBrowserWithProgress(
    majorVersion?: string, 
    progressCallback?: (progress: number, message?: string) => void
  ): Promise<string> {
    if (!majorVersion) {
      await this.fetchLatestVersionInfo();
      majorVersion = this.majorVersion;
    }

    try {
      progressCallback?.(5, 'Kiểm tra phiên bản...');
      
      // Ensure we have latest version info
      if (!this.latestVersionInfo) {
        await this.fetchLatestVersionInfo();
      }

      progressCallback?.(10, 'Tạo thư mục...');

      // Create browser directory
      const browserDir = join(homedir(), '.gologin', 'browser');
      await fs.mkdir(browserDir, { recursive: true });

      progressCallback?.(20, 'Bắt đầu tải xuống...');

      // Simulate download progress steps
      const progressSteps = [
        { progress: 30, message: 'Đang tải xuống browser...' },
        { progress: 45, message: 'Đang tải các thành phần...' },
        { progress: 60, message: 'Đang tải tài nguyên...' },
        { progress: 75, message: 'Hoàn thành tải xuống...' },
        { progress: 80, message: 'Bắt đầu giải nén...' },
        { progress: 85, message: 'Đang giải nén...' },
        { progress: 90, message: 'Đang cài đặt...' },
        { progress: 95, message: 'Hoàn tất cài đặt...' }
      ];

      // Execute download with simulated progress updates
      const downloadPromise = this.browserChecker.downloadBrowser(majorVersion);
      
      // Send progress updates during download
      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];
          progressCallback?.(step.progress, step.message);
          stepIndex++;
        }
      }, 800); // Update every 800ms

      // Wait for actual download to complete
      await downloadPromise;
      
      // Clear the interval
      clearInterval(progressInterval);

      // Final steps
      progressCallback?.(98, 'Xác minh cài đặt...');

      // Get final browser path
      const browserPath = this.browserChecker.getBrowserExecutablePath(majorVersion);
      
      // Verify installation
      await fs.access(browserPath);

      // Save version info after successful installation
      await this.saveBrowserVersionInfo({
        version: this.latestVersionInfo?.latestVersion || `${majorVersion}.0.0.0`,
        majorVersion: majorVersion,
        installedAt: new Date().toISOString()
      });

      progressCallback?.(100, 'Hoàn thành!');

      return browserPath;
    } catch (error) {
      throw new Error(`Browser download with progress failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 
