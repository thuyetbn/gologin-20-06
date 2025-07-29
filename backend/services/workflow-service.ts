import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Browser, BrowserContext, chromium, Page } from 'playwright-core';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowAction {
  id: string;
  action: 'goto' | 'click' | 'fill' | 'waitForSelector' | 'screenshot' | 'extractText' | 'wait';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  path?: string;
  attribute?: string;
  delay?: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  currentStep?: number;
  totalSteps?: number;
  logs: ExecutionLog[];
  results: ExecutionResult[];
  error?: string;
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stepId?: string;
  data?: any;
}

interface ExecutionResult {
  stepId: string;
  actionType: string;
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string;
  extractedText?: string;
  duration: number;
}

interface BrowserConfig {
  wsEndpoint?: string;
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout?: number;
}

class WorkflowExecutionService extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private executions: Map<string, WorkflowExecution> = new Map();
  private screenshotDir: string;

  constructor() {
    super();
    this.screenshotDir = path.join(process.cwd(), 'temp', 'screenshots');
    this.ensureScreenshotDir();
  }

  private ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async connectBrowser(config: BrowserConfig = {}) {
    try {
      if (config.wsEndpoint) {
        // Connect to remote browser
        this.browser = await chromium.connectOverCDP(config.wsEndpoint);
      } else {
        // Launch new browser instance
        this.browser = await chromium.launch({
          headless: config.headless !== false,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      this.context = await this.browser.newContext({
        viewport: config.viewport || { width: 1920, height: 1080 },
        userAgent: config.userAgent
      });

      this.page = await this.context.newPage();
      
      // Set default timeout
      this.page.setDefaultTimeout(config.timeout || 30000);

      console.log('Browser connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect browser:', error);
      throw error;
    }
  }

  async executeWorkflow(workflowId: string, actions: WorkflowAction[], config?: BrowserConfig): Promise<string> {
    const executionId = uuidv4();
    
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      currentStep: 0,
      totalSteps: actions.length,
      logs: [],
      results: []
    };

    this.executions.set(executionId, execution);

    try {
      // Connect browser if not already connected
      if (!this.browser || !this.page) {
        await this.connectBrowser(config);
      }

      execution.status = 'running';
      execution.startedAt = new Date();
      this.emitExecutionUpdate(execution);

      this.addLog(execution, 'info', `Starting workflow execution with ${actions.length} steps`);

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        execution.currentStep = i + 1;
        
        this.addLog(execution, 'info', `Executing step ${i + 1}: ${action.action}`, action.id);
        
        const startTime = Date.now();
        
        try {
          const result = await this.executeAction(action);
          const duration = Date.now() - startTime;
          
          const executionResult: ExecutionResult = {
            stepId: action.id,
            actionType: action.action,
            success: true,
            data: result.data,
            extractedText: result.extractedText,
            screenshot: result.screenshot,
            duration
          };
          
          execution.results.push(executionResult);
          this.addLog(execution, 'info', `Step ${i + 1} completed successfully (${duration}ms)`, action.id);
          
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          const executionResult: ExecutionResult = {
            stepId: action.id,
            actionType: action.action,
            success: false,
            error: errorMessage,
            duration
          };
          
          execution.results.push(executionResult);
          this.addLog(execution, 'error', `Step ${i + 1} failed: ${errorMessage}`, action.id);
          
          // Continue with next step or stop based on error handling strategy
          // For now, we'll continue
        }
        
        this.emitExecutionUpdate(execution);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      this.addLog(execution, 'info', 'Workflow execution completed');
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      this.addLog(execution, 'error', `Workflow execution failed: ${execution.error}`);
    }

    this.emitExecutionUpdate(execution);
    return executionId;
  }

  private async executeAction(action: WorkflowAction): Promise<{ data?: any; extractedText?: string; screenshot?: string }> {
    if (!this.page) throw new Error('Browser page not available');

    const result: { data?: any; extractedText?: string; screenshot?: string } = {};

    switch (action.action) {
      case 'goto':
        if (!action.url) throw new Error('URL is required for goto action');
        await this.page.goto(action.url, { 
          waitUntil: 'domcontentloaded',
          timeout: action.timeout || 30000 
        });
        result.data = { url: action.url };
        break;

      case 'click':
        if (!action.selector) throw new Error('Selector is required for click action');
        await this.page.click(action.selector, { 
          timeout: action.timeout || 5000 
        });
        result.data = { selector: action.selector };
        break;

      case 'fill':
        if (!action.selector || action.value === undefined) {
          throw new Error('Selector and value are required for fill action');
        }
        await this.page.fill(action.selector, action.value, {
          timeout: action.timeout || 5000
        });
        result.data = { selector: action.selector, value: action.value };
        break;

      case 'waitForSelector':
        if (!action.selector) throw new Error('Selector is required for waitForSelector action');
        await this.page.waitForSelector(action.selector, {
          timeout: action.timeout || 10000
        });
        result.data = { selector: action.selector };
        break;

      case 'screenshot':
        const screenshotPath = action.path || `screenshot_${Date.now()}.png`;
        const fullPath = path.join(this.screenshotDir, screenshotPath);
        
        if (action.selector) {
          const element = await this.page.locator(action.selector);
          await element.screenshot({ path: fullPath });
        } else {
          await this.page.screenshot({ path: fullPath });
        }
        
        result.screenshot = fullPath;
        result.data = { path: screenshotPath };
        break;

      case 'extractText':
        if (!action.selector) throw new Error('Selector is required for extractText action');
        
        const element = this.page.locator(action.selector);
        let extractedText: string;
        
        switch (action.attribute) {
          case 'innerHTML':
            extractedText = await element.innerHTML();
            break;
          case 'value':
            extractedText = await element.inputValue();
            break;
          case 'href':
            extractedText = await element.getAttribute('href') || '';
            break;
          case 'src':
            extractedText = await element.getAttribute('src') || '';
            break;
          case 'innerText':
            extractedText = await element.innerText();
            break;
          default:
            extractedText = await element.textContent() || '';
        }
        
        result.extractedText = extractedText;
        result.data = { 
          selector: action.selector, 
          attribute: action.attribute || 'textContent',
          text: extractedText 
        };
        break;

      case 'wait':
        const delay = action.delay || 1000;
        await this.page.waitForTimeout(delay);
        result.data = { delay };
        break;

      default:
        throw new Error(`Unknown action type: ${action.action}`);
    }

    return result;
  }

  private addLog(execution: WorkflowExecution, level: 'info' | 'warn' | 'error' | 'debug', message: string, stepId?: string) {
    const log: ExecutionLog = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      stepId
    };
    execution.logs.push(log);
  }

  private emitExecutionUpdate(execution: WorkflowExecution) {
    this.emit('execution-update', execution);
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    this.addLog(execution, 'info', 'Workflow execution cancelled by user');
    this.emitExecutionUpdate(execution);
    
    return true;
  }

  async closeBrowser() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.log('Browser closed successfully');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}

export { WorkflowExecutionService };
export type { BrowserConfig, ExecutionLog, ExecutionResult, WorkflowAction, WorkflowExecution };
