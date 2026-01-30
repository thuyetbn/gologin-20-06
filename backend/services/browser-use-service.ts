/**
 * Browser-Use Service - Bridge between Electron and Python Browser-Use agent
 */
import { ChildProcess, spawn } from 'child_process';
import { app } from 'electron';
import { join } from 'path';
import store from '../store';

interface TaskRequest {
  profileId: string;
  cdpUrl: string;
  task: string;
  llmProvider?: 'google' | 'anthropic';  // google is FREE!
  model?: string;
  maxSteps?: number;
  useVision?: boolean;
}

interface TaskResult {
  success: boolean;
  result?: string;
  steps: string[];
  error?: string;
}

interface ServiceStatus {
  status: string;
  active_profiles: string[];
  version: string;
}

export class BrowserUseService {
  private pythonProcess: ChildProcess | null = null;
  private serviceUrl: string;
  private isRunning: boolean = false;
  private startupPromise: Promise<boolean> | null = null;

  constructor() {
    const host = process.env.BROWSER_USE_HOST || '127.0.0.1';
    const port = process.env.BROWSER_USE_PORT || '8765';
    this.serviceUrl = `http://${host}:${port}`;
  }

  /**
   * Get Python executable path
   */
  private getPythonPath(): string {
    // Check store settings first
    const storedPath = store.get('browserUsePythonPath') as string;
    if (storedPath) return storedPath;

    // Check environment variable
    if (process.env.BROWSER_USE_PYTHON_PATH) {
      return process.env.BROWSER_USE_PYTHON_PATH;
    }

    // In development, use venv python
    const servicePath = this.getServicePath();
    if (process.platform === 'win32') {
      const venvPython = join(servicePath, 'venv', 'Scripts', 'python.exe');
      return venvPython;
    }
    return join(servicePath, 'venv', 'bin', 'python');
  }

  /**
   * Get path to Python service directory
   */
  private getServicePath(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, 'python-service');
    }
    // In development, __dirname is dist/backend/services, so go up to project root
    // then into backend/python-service (source folder)
    return join(__dirname, '..', '..', '..', 'backend', 'python-service');
  }

  /**
   * Start the Python Browser-Use service
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }

    // Prevent multiple simultaneous starts
    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = this._doStart();
    const result = await this.startupPromise;
    this.startupPromise = null;
    return result;
  }

  private async _doStart(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const pythonPath = this.getPythonPath();
        const servicePath = this.getServicePath();
        const serverScript = join(servicePath, 'server.py');

        console.log(`🐍 Starting Browser-Use service...`);
        console.log(`   Python: ${pythonPath}`);
        console.log(`   Script: ${serverScript}`);

        this.pythonProcess = spawn(pythonPath, [serverScript], {
          cwd: servicePath,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let startupTimeout: NodeJS.Timeout;

        const checkStartup = (output: string) => {
          // Uvicorn logs to stderr, so check both stdout and stderr
          if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
            this.isRunning = true;
            clearTimeout(startupTimeout);
            resolve(true);
          }
        };

        this.pythonProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          console.log(`[Browser-Use] ${output}`);
          checkStartup(output);
        });

        this.pythonProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          console.log(`[Browser-Use] ${output}`);
          checkStartup(output);
        });

        this.pythonProcess.on('close', (code) => {
          console.log(`[Browser-Use] Process exited with code ${code}`);
          this.isRunning = false;
          this.pythonProcess = null;
        });

        this.pythonProcess.on('error', (error) => {
          console.error(`[Browser-Use] Failed to start:`, error);
          this.isRunning = false;
          resolve(false);
        });

        // Timeout after 30 seconds
        startupTimeout = setTimeout(() => {
          console.error('[Browser-Use] Startup timeout');
          resolve(false);
        }, 30000);

      } catch (error) {
        console.error('[Browser-Use] Start error:', error);
        resolve(false);
      }
    });
  }

  /**
   * Stop the Python service
   */
  async stop(): Promise<void> {
    if (this.pythonProcess) {
      console.log('🛑 Stopping Browser-Use service...');
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
      this.isRunning = false;
    }
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<ServiceStatus | null> {
    try {
      const response = await fetch(`${this.serviceUrl}/status`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Run a task on a GoLogin profile
   */
  async runTask(request: TaskRequest): Promise<TaskResult> {
    // Ensure service is running
    if (!this.isRunning) {
      const started = await this.start();
      if (!started) {
        return {
          success: false,
          error: 'Failed to start Browser-Use service',
          steps: [],
        };
      }
      // Wait a bit for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const response = await fetch(`${this.serviceUrl}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_id: request.profileId,
          cdp_url: request.cdpUrl,
          task: request.task,
          llm_provider: request.llmProvider,
          model: request.model,
          max_steps: request.maxSteps || 50,
          use_vision: request.useVision ?? true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${error}`,
          steps: [],
        };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        steps: [],
      };
    }
  }

  /**
   * Connect agent to a profile for persistent use
   */
  async connectToProfile(profileId: string, cdpUrl: string, llmProvider?: string): Promise<boolean> {
    if (!this.isRunning) {
      await this.start();
    }

    try {
      const response = await fetch(`${this.serviceUrl}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          cdp_url: cdpUrl,
          llm_provider: llmProvider,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect agent from a profile
   */
  async disconnectProfile(profileId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/disconnect/${profileId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let browserUseService: BrowserUseService | null = null;

export function getBrowserUseService(): BrowserUseService {
  if (!browserUseService) {
    browserUseService = new BrowserUseService();
  }
  return browserUseService;
}

export function cleanupBrowserUseService(): void {
  if (browserUseService) {
    browserUseService.stop();
    browserUseService = null;
  }
}
