import {
    Settings
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Connection,
    Controls,
    Edge,
    MiniMap,
    Node,
    ReactFlowProvider,
    addEdge,
    useEdgesState,
    useNodesState
} from 'reactflow';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

import { v4 as uuidv4 } from 'uuid';
import NodePalette from '../components/workflow/node-palette';
import NodePropertiesPanel from '../components/workflow/node-properties-panel';
import WorkflowNodeComponent from '../components/workflow/workflow-node';
import WorkflowToolbar from '../components/workflow/workflow-toolbar';
import { NODE_COLORS, WORKFLOW_NODE_TEMPLATES } from '../constants/workflow-templates';
import { NodeType, Workflow, WorkflowAction } from '../types/workflow';

// Define the data structure for our custom nodes
interface WorkflowNodeData {
  label: string;
  action: WorkflowAction;
  isValid?: boolean;
  errors?: string[];
}

// Type for our workflow nodes (extends ReactFlow Node)
type WorkflowNode = Node<WorkflowNodeData>;
type WorkflowEdge = Edge;

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

const WorkflowEditor: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Handle node connections
  const onConnect = useCallback(
    (params: Connection) => {
      const edge: WorkflowEdge = {
        id: uuidv4(),
        source: params.source!,
        target: params.target!,
        type: 'smoothstep',
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node as WorkflowNode);
    },
    []
  );

  // Add new node from palette
  const onAddNode = useCallback(
    (nodeType: NodeType) => {
      const template = WORKFLOW_NODE_TEMPLATES[nodeType];
      const newNode: WorkflowNode = {
        id: uuidv4(),
        type: 'workflowNode',
        position: { 
          x: Math.random() * 500 + 100, 
          y: Math.random() * 300 + 100 
        },
        data: {
          label: template.label,
          action: {
            id: uuidv4(),
            action: nodeType,
            ...template.defaultData,
          },
          isValid: false,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Update node properties
  const onUpdateNode = useCallback(
    (nodeId: string, updates: Partial<WorkflowNode['data']>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );

      // Update selected node if it's the one being updated
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => prev ? {
          ...prev,
          data: { ...prev.data, ...updates }
        } : null);
      }
    },
    [selectedNode, setNodes]
  );

  // Delete selected node
  const onDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Clear all nodes and edges
  const onClearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setWorkflowName('');
    setWorkflowDescription('');
  }, [setNodes, setEdges]);

  // Generate workflow JSON
  const generateWorkflowJSON = useCallback(() => {
    // Sort nodes by execution order based on connections
    const sortedActions = nodes
      .sort((a, b) => a.position.y - b.position.y) // Simple sorting by Y position
      .map((node) => node.data.action);

    return JSON.stringify(sortedActions, null, 2);
  }, [nodes]);

  // Execute workflow
  const onExecuteWorkflow = useCallback(async () => {
    if (nodes.length === 0) return;

    setIsExecuting(true);
    try {
      const workflowJSON = generateWorkflowJSON();
      
      // TODO: Send to backend API
      console.log('Executing workflow:', workflowJSON);
      
      // Simulate execution
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, generateWorkflowJSON]);

  // Save workflow
  const onSaveWorkflow = useCallback(async () => {
    if (!workflowName.trim()) {
      alert('Vui lòng nhập tên workflow');
      return;
    }

    const workflow: Workflow = {
      id: uuidv4(),
      name: workflowName,
      description: workflowDescription,
      nodes: nodes as any,
      edges: edges as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // TODO: Save to backend
      console.log('Saving workflow:', workflow);
      localStorage.setItem(`workflow_${workflow.id}`, JSON.stringify(workflow));
      alert('Workflow đã được lưu thành công!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Lỗi khi lưu workflow');
    }
  }, [workflowName, workflowDescription, nodes, edges]);

  const miniMapNodeColor = (node: Node) => {
    const nodeType = node.data?.action?.action as NodeType;
    return NODE_COLORS[nodeType] || '#6b7280';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <WorkflowToolbar
          workflowName={workflowName}
          onWorkflowNameChange={setWorkflowName}
          onSave={onSaveWorkflow}
          onExecute={onExecuteWorkflow}
          onClear={onClearWorkflow}
          isExecuting={isExecuting}
          canExecute={nodes.length > 0}
        />
      </div>

      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Palette Hành động</h3>
            <NodePalette onAddNode={onAddNode} />
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Controls />
            <MiniMap 
              nodeColor={miniMapNodeColor}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              color="#f3f4f6"
            />
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            {selectedNode ? (
              <NodePropertiesPanel
                {...{
                  node: selectedNode,
                  onUpdateNode,
                  onDeleteNode
                } as any}
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Settings className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Chọn một node để cấu hình</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel - Workflow Info */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="description">Mô tả workflow</Label>
            <Textarea
              id="description"
              placeholder="Mô tả ngắn gọn về workflow này..."
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="flex items-end gap-2">
            <Badge variant="outline">
              {nodes.length} nodes
            </Badge>
            <Badge variant="outline">
              {edges.length} connections
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider
const WorkflowEditorPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor />
    </ReactFlowProvider>
  );
};

export default WorkflowEditorPage; 