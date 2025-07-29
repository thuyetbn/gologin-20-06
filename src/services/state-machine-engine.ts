// State Machine Execution Engine
// Implementation of finite automata for web automation workflows

import { Page } from 'playwright-core';
import {
    ExecutionContext,
    ExecutionLog,
    ExecutionResult,
    NonLinearWorkflow,
    StateAction,
    StateCondition,
    StateMachine,
    WorkflowState
} from '../types/state-workflow';

export class StateMachineEngine implements StateMachine {
  public workflow: NonLinearWorkflow;
  public context: ExecutionContext;
  
  private page: Page;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private logs: ExecutionLog[] = [];
  private variables: Record<string, any> = {};

  constructor(workflow: NonLinearWorkflow, page: Page) {
    this.workflow = workflow;
    this.page = page;
    this.context = this.initializeContext();
  }

  private initializeContext(): ExecutionContext {
    return {
      workflowId: this.workflow.id,
      currentState: this.workflow.initialState,
      previousStates: [],
      variables: {},
      startTime: Date.now(),
      errorCount: 0
    };
  }

  getCurrentState(): WorkflowState {
    const state = this.workflow.states.find(s => s.id === this.context.currentState);
    if (!state) {
      throw new Error(`State not found: ${this.context.currentState}`);
    }
    return state;
  }

  canTransitionTo(stateId: string): boolean {
    const currentState = this.getCurrentState();
    return currentState.transitions.some(t => t.to === stateId);
  }

  async transitionTo(stateId: string): Promise<boolean> {
    if (!this.canTransitionTo(stateId)) {
      this.log('error', `Invalid transition from ${this.context.currentState} to ${stateId}`);
      return false;
    }

    const transition = this.getCurrentState().transitions.find(t => t.to === stateId);
    if (!transition) return false;

    // Evaluate transition condition if exists
    if (transition.condition) {
      const conditionMet = await this.evaluateConditions([transition.condition]);
      if (!conditionMet) {
        this.log('skipped', `Transition condition not met: ${transition.id}`);
        return false;
      }
    }

    // Apply transition delay
    if (transition.delay) {
      await this.sleep(transition.delay);
    }

    // Update context
    this.context.previousStates.push(this.context.currentState);
    this.context.currentState = stateId;
    this.context.lastTransition = Date.now();

    this.log('success', `Transitioned to state: ${stateId}`);
    return true;
  }

  async evaluateConditions(conditions: StateCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition);
      if (!result) return false;
    }
    return true;
  }

  private async evaluateCondition(condition: StateCondition): Promise<boolean> {
    try {
      switch (condition.type) {
        case 'url':
          return this.evaluateUrlCondition(condition);
          
        case 'selector':
          return await this.evaluateSelectorCondition(condition);
          
        case 'text':
          return await this.evaluateTextCondition(condition);
          
        case 'attribute':
          return await this.evaluateAttributeCondition(condition);
          
        case 'custom':
          return await this.evaluateCustomCondition(condition);
          
        default:
          return false;
      }
    } catch (error) {
      this.log('error', `Condition evaluation failed: ${condition.id}`, { error });
      return false;
    }
  }

  private evaluateUrlCondition(condition: StateCondition): boolean {
    const currentUrl = this.page.url();
    
    switch (condition.operator) {
      case 'equals':
        return currentUrl === condition.target;
      case 'contains':
        return currentUrl.includes(condition.target);
      case 'matches':
        return new RegExp(condition.target).test(currentUrl);
      default:
        return false;
    }
  }

  private async evaluateSelectorCondition(condition: StateCondition): Promise<boolean> {
    const element = this.page.locator(condition.target);
    const timeout = condition.timeout || 5000;

    try {
      switch (condition.operator) {
        case 'exists':
          await element.waitFor({ timeout, state: 'visible' });
          return true;
        case 'not_exists':
          try {
            await element.waitFor({ timeout: 1000, state: 'visible' });
            return false;
          } catch {
            return true;
          }
        default:
          return false;
      }
    } catch {
      return condition.operator === 'not_exists';
    }
  }

  private async evaluateTextCondition(condition: StateCondition): Promise<boolean> {
    const element = this.page.locator(condition.target);
    
    try {
      const text = await element.textContent({ timeout: condition.timeout || 5000 });
      if (!text) return false;

      switch (condition.operator) {
        case 'equals':
          return text === condition.value;
        case 'contains':
          return text.includes(condition.value || '');
        case 'matches':
          return new RegExp(condition.value || '').test(text);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async evaluateAttributeCondition(condition: StateCondition): Promise<boolean> {
    const [selector, attribute] = condition.target.split('|');
    const element = this.page.locator(selector);
    
    try {
      const value = await element.getAttribute(attribute, { timeout: condition.timeout || 5000 });
      if (value === null) return condition.operator === 'not_exists';

      switch (condition.operator) {
        case 'exists':
          return true;
        case 'equals':
          return value === condition.value;
        case 'contains':
          return value.includes(condition.value || '');
        default:
          return false;
      }
    } catch {
      return condition.operator === 'not_exists';
    }
  }

  private async evaluateCustomCondition(condition: StateCondition): Promise<boolean> {
    try {
      // Execute custom JavaScript condition
      const result = await this.page.evaluate((script) => {
        return eval(script);
      }, condition.target);
      
      return Boolean(result);
    } catch (error) {
      this.log('error', `Custom condition failed: ${condition.id}`, { error });
      return false;
    }
  }

  async executeActions(actions: StateAction[]): Promise<void> {
    for (const action of actions) {
      if (!this.isRunning || this.isPaused) break;
      
      try {
        await this.executeAction(action);
        this.log('success', `Action executed: ${action.action}`, { actionId: action.id });
      } catch (error) {
        this.log('error', `Action failed: ${action.action}`, { actionId: action.id, error });
        
        if (action.onFailure) {
          await this.transitionTo(action.onFailure);
          return;
        }
        
        if (this.workflow.config.errorHandling === 'stop') {
          throw error;
        }
      }
    }
  }

  private async executeAction(action: StateAction): Promise<void> {
    const timeout = action.timeout || this.workflow.config.timeout;

    switch (action.action) {
      case 'goto':
        if (action.url) {
          await this.page.goto(action.url, { timeout });
        }
        break;

      case 'click':
        if (action.selector) {
          await this.page.locator(action.selector).click({ timeout });
        }
        break;

      case 'fill':
        if (action.selector && action.value !== undefined) {
          await this.page.locator(action.selector).fill(action.value, { timeout });
        }
        break;

      case 'wait':
        await this.sleep(timeout);
        break;

      case 'screenshot':
        const screenshot = await this.page.screenshot();
        this.log('success', 'Screenshot taken', { screenshot: screenshot.toString('base64') });
        break;

      case 'extract':
        if (action.selector) {
          const text = await this.page.locator(action.selector).textContent({ timeout });
          this.variables[action.id] = text;
          this.log('success', `Text extracted: ${text}`, { variable: action.id });
        }
        break;

      case 'evaluate':
        if (action.script) {
          const result = await this.page.evaluate(action.script);
          this.variables[action.id] = result;
          this.log('success', `Script executed`, { variable: action.id, result });
        }
        break;
    }

    // Handle success transition
    if (action.onSuccess) {
      await this.transitionTo(action.onSuccess);
    }
  }

  async start(): Promise<ExecutionResult> {
    this.isRunning = true;
    this.isPaused = false;
    this.logs = [];
    this.context = this.initializeContext();

    try {
      this.log('pending', 'Workflow execution started');

      while (this.isRunning && !this.isPaused) {
        const currentState = this.getCurrentState();
        
        // Check if we've reached an end state
        if (currentState.type === 'end') {
          break;
        }

        this.log('pending', `Executing state: ${currentState.name}`);

        // Evaluate state conditions
        if (currentState.conditions.length > 0) {
          const conditionsMet = await this.evaluateConditions(currentState.conditions);
          if (!conditionsMet) {
            this.log('error', `State conditions not met: ${currentState.id}`);
            break;
          }
        }

        // Execute state actions
        await this.executeActions(currentState.actions);

        // Automatic transition if no explicit transitions were triggered
        if (currentState.transitions.length === 1 && currentState.transitions[0].condition === undefined) {
          await this.transitionTo(currentState.transitions[0].to);
        }

        // Prevent infinite loops
        if (this.context.previousStates.length > 100) {
          throw new Error('Maximum execution steps exceeded');
        }
      }

      const duration = Date.now() - this.context.startTime;
      
      return {
        success: true,
        finalState: this.context.currentState,
        executionPath: [...this.context.previousStates, this.context.currentState],
        duration,
        variables: this.variables,
        screenshots: this.logs.filter(l => l.screenshot).map(l => l.screenshot!),
        logs: this.logs
      };

    } catch (error) {
      this.log('error', `Workflow execution failed: ${error}`);
      
      return {
        success: false,
        finalState: this.context.currentState,
        executionPath: [...this.context.previousStates, this.context.currentState],
        duration: Date.now() - this.context.startTime,
        variables: this.variables,
        screenshots: this.logs.filter(l => l.screenshot).map(l => l.screenshot!),
        logs: this.logs,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.isRunning = false;
    }
  }

  pause(): void {
    this.isPaused = true;
    this.log('pending', 'Workflow paused');
  }

  resume(): void {
    this.isPaused = false;
    this.log('pending', 'Workflow resumed');
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.log('pending', 'Workflow stopped');
  }

  reset(): void {
    this.context = this.initializeContext();
    this.logs = [];
    this.variables = {};
    this.isRunning = false;
    this.isPaused = false;
  }

  private log(status: ExecutionLog['status'], message: string, data?: any): void {
    this.logs.push({
      timestamp: Date.now(),
      state: this.context.currentState,
      action: message,
      status,
      message,
      data
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 