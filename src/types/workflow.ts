// Workflow Types và Interfaces

export interface WorkflowAction {
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

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    action: WorkflowAction;
    isValid?: boolean;
    errors?: string[];
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {  
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

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stepId?: string;
  data?: any;
}

export interface ExecutionResult {
  stepId: string;
  actionType: string;
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string;
  extractedText?: string;
  duration: number;
}

// Node types cho react-flow
export type NodeType = 
  | 'goto'
  | 'click' 
  | 'fill'
  | 'waitForSelector'
  | 'screenshot'
  | 'extractText'
  | 'wait';

export interface NodeTemplate {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  defaultData: Partial<WorkflowAction>;
  configFields: ConfigField[];
}

export interface ConfigField {
  name: keyof WorkflowAction;
  type: 'text' | 'number' | 'select' | 'textarea';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WorkflowListResponse extends ApiResponse {
  data: {
    workflows: Workflow[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface ExecutionResponse extends ApiResponse {
  data: WorkflowExecution;
}

// Browser connection config
export interface BrowserConfig {
  wsEndpoint?: string;
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout?: number;
} 