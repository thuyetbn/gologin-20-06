// Enhanced State-Aware Workflow Types
// Inspired by sauermar's WAW format and finite automata theory

export interface StateCondition {
  id: string;
  type: 'url' | 'selector' | 'text' | 'attribute' | 'custom';
  operator: 'equals' | 'contains' | 'exists' | 'not_exists' | 'matches';
  target: string;
  value?: string;
  timeout?: number;
}

export interface StateAction {
  id: string;
  action: 'goto' | 'click' | 'fill' | 'wait' | 'screenshot' | 'extract' | 'evaluate';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  script?: string;
  onSuccess?: string; // Next state ID
  onFailure?: string; // Fallback state ID
}

export interface StateTransition {
  id: string;
  from: string; // Source state ID
  to: string;   // Target state ID
  condition?: StateCondition;
  probability?: number; // For A/B testing scenarios
  delay?: number;
}

export interface WorkflowState {
  id: string;
  name: string;
  type: 'start' | 'action' | 'condition' | 'parallel' | 'end' | 'error';
  description?: string;
  
  // State matching criteria (inspired by WAW "where")
  conditions: StateCondition[];
  
  // Actions to perform in this state (inspired by WAW "what")
  actions: StateAction[];
  
  // Possible transitions to other states
  transitions: StateTransition[];
  
  // Visual properties for React Flow
  position: { x: number; y: number };
  data: {
    label: string;
    [key: string]: any;
  };
}

export interface NonLinearWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  // State machine definition
  states: WorkflowState[];
  initialState: string;
  
  // Global configuration
  config: {
    timeout: number;
    retries: number;
    parallelism: number;
    errorHandling: 'stop' | 'continue' | 'retry';
  };
  
  // Metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    tags: string[];
  };
}

export interface ExecutionContext {
  workflowId: string;
  currentState: string;
  previousStates: string[];
  variables: Record<string, any>;
  startTime: number;
  lastTransition?: number;
  errorCount: number;
}

export interface ExecutionResult {
  success: boolean;
  finalState: string;
  executionPath: string[];
  duration: number;
  variables: Record<string, any>;
  screenshots: string[];
  logs: ExecutionLog[];
  error?: string;
}

export interface ExecutionLog {
  timestamp: number;
  state: string;
  action: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message: string;
  screenshot?: string;
  data?: any;
}

// State machine utilities
export interface StateMachine {
  workflow: NonLinearWorkflow;
  context: ExecutionContext;
  
  // Core methods
  getCurrentState(): WorkflowState;
  canTransitionTo(stateId: string): boolean;
  transitionTo(stateId: string): Promise<boolean>;
  evaluateConditions(conditions: StateCondition[]): Promise<boolean>;
  executeActions(actions: StateAction[]): Promise<void>;
  
  // Execution control
  start(): Promise<ExecutionResult>;
  pause(): void;
  resume(): void;
  stop(): void;
  reset(): void;
}

// Integration with existing workflow types
export interface EnhancedWorkflowNode extends WorkflowState {
  // React Flow compatibility
  handles?: {
    source: boolean;
    target: boolean;
  };
}

export interface EnhancedWorkflowEdge extends StateTransition {
  // React Flow compatibility
  source: string;
  target: string;
  animated?: boolean;
  style?: any;
  label?: string;
}

// Template system for common patterns
export interface StateWorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  
  // Pre-defined state machine
  workflow: NonLinearWorkflow;
  
  // Customization options
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'url' | 'selector';
    default?: any;
    required: boolean;
    description: string;
  }[];
} 