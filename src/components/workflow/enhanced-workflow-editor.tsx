// Enhanced Workflow Editor with State-Aware Capabilities
// Integrates traditional node-based editing with non-linear state machine concepts

import {
    Brain,
    GitBranch,
    Layers,
    Pause,
    Play,
    Square,
    Workflow,
    Zap
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Connection,
    ControlButton,
    Controls,
    Edge,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    Position,
    addEdge,
    useEdgesState,
    useNodesState
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

import { createWorkflowFromTemplate } from '../../data/state-workflow-templates';
import { StateMachineEngine } from '../../services/state-machine-engine';
import {
    EnhancedWorkflowEdge,
    EnhancedWorkflowNode,
    NonLinearWorkflow,
    StateWorkflowTemplate,
    WorkflowState
} from '../../types/state-workflow';

// Enhanced node component with state awareness
const StateAwareNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-600';
      case 'end': return 'bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-600';
      case 'condition': return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-600';
      case 'parallel': return 'bg-purple-100 border-purple-300 dark:bg-purple-900 dark:border-purple-600';
      case 'action': return 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-600';
      case 'error': return 'bg-gray-100 border-gray-300 dark:bg-gray-900 dark:border-gray-600';
      default: return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start': return '🚀';
      case 'end': return '🏁';
      case 'condition': return '🤔';
      case 'parallel': return '⚡';
      case 'action': return '⚙️';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  return (
    <Card className={`min-w-[200px] transition-all duration-200 ${getNodeColor(data.type)} ${
      selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-sm hover:shadow-md'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />
      
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{getNodeIcon(data.type)}</span>
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {data.label}
          </span>
        </div>
        
        {data.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {data.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {data.type}
          </Badge>
          {data.conditions?.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {data.conditions.length} conditions
            </Badge>
          )}
          {data.actions?.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {data.actions.length} actions
            </Badge>
          )}
        </div>
      </CardContent>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 border-2 border-white"
      />
    </Card>
  );
};

const nodeTypes = {
  stateAware: StateAwareNode,
};

interface EnhancedWorkflowEditorProps {
  initialWorkflow?: NonLinearWorkflow;
  onWorkflowChange?: (workflow: NonLinearWorkflow) => void;
  onExecute?: (workflow: NonLinearWorkflow) => void;
}

const EnhancedWorkflowEditor: React.FC<EnhancedWorkflowEditorProps> = ({
  initialWorkflow,
  onWorkflowChange,
  onExecute
}) => {
  // Mode management
  const [editorMode, setEditorMode] = useState<'linear' | 'state-machine'>('linear');
  const [executionMode, setExecutionMode] = useState<'sequential' | 'state-aware'>('sequential');
  
  // Workflow state
  const [currentWorkflow, setCurrentWorkflow] = useState<NonLinearWorkflow | null>(initialWorkflow || null);
  const [nodes, setNodes, onNodesChange] = useNodesState<EnhancedWorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EnhancedWorkflowEdge>([]);
  
  // Execution state
  const [executionEngine, setExecutionEngine] = useState<StateMachineEngine | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  
  // Templates
  const [selectedTemplate, setSelectedTemplate] = useState<StateWorkflowTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Convert between linear nodes and state-aware nodes
  const convertToStateAware = useCallback((linearNodes: Node[], linearEdges: Edge[]) => {
    const stateNodes: EnhancedWorkflowNode[] = linearNodes.map(node => ({
      ...node,
      name: node.data?.label || `State ${node.id}`, // Add required name property
      type: (node.type as "start" | "action" | "condition" | "parallel" | "end" | "error") || 'action', // Fix type constraint
      description: node.data?.description || undefined, // Optional description
      conditions: [],
      actions: [
        {
          id: uuidv4(),
          action: node.data.action || 'click',
          selector: node.data.selector,
          value: node.data.value,
          url: node.data.url,
          timeout: node.data.timeout
        }
      ],
      transitions: linearEdges
        .filter(edge => edge.source === node.id)
        .map(edge => ({
          id: uuidv4(),
          from: edge.source,
          to: edge.target
        }))
    })) as EnhancedWorkflowNode[];

    const stateEdges: EnhancedWorkflowEdge[] = linearEdges.map(edge => ({
      ...edge,
      id: edge.id,
      from: edge.source,
      to: edge.target,
      source: edge.source,
      target: edge.target,
      animated: executionMode === 'state-aware',
      style: { strokeWidth: 2 },
      label: typeof edge.label === 'string' ? edge.label : undefined,
    })) as EnhancedWorkflowEdge[];

    return { stateNodes, stateEdges };
  }, [executionMode]);

  // Handle mode switching
  const handleModeSwitch = useCallback((newMode: 'linear' | 'state-machine') => {
    setEditorMode(newMode);
    
    if (newMode === 'state-machine' && executionMode === 'sequential') {
      setExecutionMode('state-aware');
      const { stateNodes, stateEdges } = convertToStateAware(nodes, edges);
      setNodes(stateNodes as any);
      setEdges(stateEdges as any);
    }
  }, [nodes, edges, executionMode, convertToStateAware, setNodes, setEdges]);

  // Add new state-aware node
  const addStateAwareNode = useCallback((nodeType: WorkflowState['type']) => {
    const newNode: EnhancedWorkflowNode = {
      id: uuidv4(),
      name: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
      type: nodeType,
      description: `A ${nodeType} node`,
      conditions: [],
      actions: [],
      transitions: [],
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100
      },
      data: {
        label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
        type: nodeType
      }
    };

    setNodes(prev => [...prev, newNode] as any);
  }, [setNodes]);

  // Handle connection with state-aware validation
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;

    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (!sourceNode || !targetNode) return;

    // Validate state-aware connections
    if (editorMode === 'state-machine') {
      // Prevent cycles in non-looping scenarios
      if (sourceNode.type === 'end' || targetNode.type === 'start') {
        console.warn('Invalid state transition attempted');
        return;
      }
    }

    const newEdge: EnhancedWorkflowEdge = {
      ...params,
      id: uuidv4(),
      from: params.source,
      to: params.target,
      source: params.source!,
      target: params.target!,
      animated: executionMode === 'state-aware',
      style: { strokeWidth: 2 }
    };

    setEdges(prev => addEdge(newEdge, prev));
  }, [nodes, editorMode, executionMode, setEdges]);

  // Create workflow from template
  const applyTemplate = useCallback((template: StateWorkflowTemplate, parameters: Record<string, any>) => {
    const workflow = createWorkflowFromTemplate(template, parameters);
    setCurrentWorkflow(workflow);
    
    // Convert workflow states to React Flow nodes
    const flowNodes: EnhancedWorkflowNode[] = workflow.states.map(state => ({
      ...state,
      data: {
        ...state.data,
        type: state.type,
        conditions: state.conditions,
        actions: state.actions
      }
    }));

    // Convert transitions to React Flow edges
    const flowEdges: EnhancedWorkflowEdge[] = workflow.states.flatMap(state =>
      state.transitions.map(transition => ({
        ...transition,
        source: transition.from,
        target: transition.to,
        animated: true,
        style: { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed }
      }))
    );

    setNodes(flowNodes as any);
    setEdges(flowEdges);
    setShowTemplateModal(false);
  }, [setNodes, setEdges]);

  // Execute workflow with state machine
  const executeWorkflow = useCallback(async () => {
    if (!currentWorkflow) return;

    setIsExecuting(true);
    setExecutionLogs([]);

    try {
      // Mock page for demonstration
      const mockPage = {
        url: () => 'https://example.com',
        goto: async (url: string) => console.log(`Navigate to: ${url}`),
        locator: (selector: string) => ({
          click: async () => console.log(`Click: ${selector}`),
          fill: async (value: string) => console.log(`Fill ${selector}: ${value}`),
          textContent: async () => 'Sample Text',
          waitFor: async () => {},
          getAttribute: async () => 'sample-value'
        }),
        evaluate: async (script: string) => {
          console.log(`Evaluate: ${script}`);
          return true;
        },
        screenshot: async () => Buffer.from('mock-screenshot')
      } as any;

      const engine = new StateMachineEngine(currentWorkflow, mockPage);
      setExecutionEngine(engine);

      const result = await engine.start();
      setExecutionLogs(result.logs);
      
      if (onExecute) {
        onExecute(currentWorkflow);
      }
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [currentWorkflow, onExecute]);

  // Pause/Resume execution
  const pauseExecution = useCallback(() => {
    if (executionEngine) {
      executionEngine.pause();
    }
  }, [executionEngine]);

  const resumeExecution = useCallback(() => {
    if (executionEngine) {
      executionEngine.resume();
    }
  }, [executionEngine]);

  const stopExecution = useCallback(() => {
    if (executionEngine) {
      executionEngine.stop();
      setIsExecuting(false);
    }
  }, [executionEngine]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Header with Mode Controls */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Enhanced Workflow Editor
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="editor-mode">Editor Mode:</Label>
                <Tabs value={editorMode} onValueChange={(value) => handleModeSwitch(value as any)}>
                  <TabsList>
                    <TabsTrigger value="linear">
                      <Workflow className="w-4 h-4 mr-1" />
                      Linear
                    </TabsTrigger>
                    <TabsTrigger value="state-machine">
                      <GitBranch className="w-4 h-4 mr-1" />  
                      State Machine
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="execution-mode">Execution:</Label>
                <Switch
                  id="execution-mode"
                  checked={executionMode === 'state-aware'}
                  onCheckedChange={(checked) => 
                    setExecutionMode(checked ? 'state-aware' : 'sequential')
                  }
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {executionMode === 'state-aware' ? 'State-Aware' : 'Sequential'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
            >
              <Layers className="w-4 h-4 mr-1" />
              Templates
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={executeWorkflow}
              disabled={isExecuting || !currentWorkflow}
            >
              <Play className="w-4 h-4 mr-1" />
              Execute
            </Button>
            
            {isExecuting && (
              <>
                <Button variant="outline" size="sm" onClick={pauseExecution}>
                  <Pause className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={stopExecution}>
                  <Square className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* State-Aware Node Palette */}
        {editorMode === 'state-machine' && (
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              State Nodes
            </h3>
            <div className="space-y-2">
              {(['start', 'action', 'condition', 'parallel', 'end', 'error'] as const).map(nodeType => (
                <Button
                  key={nodeType}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addStateAwareNode(nodeType)}
                >
                  <span className="mr-2">
                    {nodeType === 'start' && '🚀'}
                    {nodeType === 'action' && '⚙️'}
                    {nodeType === 'condition' && '🤔'}
                    {nodeType === 'parallel' && '⚡'}
                    {nodeType === 'end' && '🏁'}
                    {nodeType === 'error' && '❌'}
                  </span>
                  {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-white dark:bg-gray-800"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              className="dark:opacity-30"
            />
            <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <ControlButton onClick={() => console.log('Auto-layout')}>
                <Zap className="w-4 h-4" />
              </ControlButton>
            </Controls>
            <MiniMap 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>

        {/* Execution Logs Panel */}
        {isExecuting && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Execution Logs
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {executionLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs ${
                    log.status === 'success' ? 'bg-green-100 text-green-800' :
                    log.status === 'error' ? 'bg-red-100 text-red-800' :
                    log.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="font-medium">{log.state}</div>
                  <div>{log.message}</div>
                  <div className="text-xs opacity-75">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedWorkflowEditor; 