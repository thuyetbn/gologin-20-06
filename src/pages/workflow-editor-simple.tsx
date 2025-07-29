import {
    ArrowLeftRight,
    ArrowUpDown,
    BookOpen,
    Download,
    Upload,
    Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    addEdge,
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
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

// Import our enhanced utilities
import {
    getLayoutedElements,
    isValidConnection
} from '../utils/workflow-layout';

// Import Properties Panel
import NodePropertiesPanel from '../components/workflow/node-properties-panel';

// Import Templates Modal
import WorkflowTemplatesModal from '../components/workflow/workflow-templates-modal';
import type { WorkflowTemplate } from '../data/workflow-templates';

// Import Collaboration
import CollaborationOverlay from '../components/workflow/collaboration-overlay';
import { CollaborationEvent, collaborationService, CollaborationUser } from '../services/collaboration-service';

// Enhanced node component with dark mode support
const CustomNode = ({ data, selected }: any) => {
  const getNodeColor = (type: string) => {
    const colors = {
      goto: '#3b82f6', // blue
      click: '#ef4444', // red  
      fill: '#10b981', // emerald
      wait: '#6b7280', // gray
      screenshot: '#8b5cf6', // violet
      extract: '#06b6d4', // cyan
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  };

  const color = getNodeColor(data.type);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 border-2 border-white dark:border-gray-800"
        isConnectable={true}
      />
      <div 
        className={`px-4 py-3 shadow-lg rounded-lg bg-white dark:bg-gray-800 border-2 min-w-[200px] transition-colors ${
          selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
        }`}
        style={{ borderColor: color }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{data.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {data.label}
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs mt-1 bg-opacity-20 dark:bg-opacity-30"
              style={{ 
                backgroundColor: `${color}30`,
                color: color,
                borderColor: color 
              }}
            >
              {data.type}
            </Badge>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 border-2 border-white dark:border-gray-800"
        isConnectable={true}
      />
    </>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

// Sample initial data
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'customNode',
    position: { x: 250, y: 50 },
    data: { 
      label: 'Đi đến URL', 
      type: 'goto', 
      icon: '🌐',
      url: 'https://example.com',
      timeout: 30000,
    },
  },
  {
    id: '2',
    type: 'customNode',
    position: { x: 250, y: 200 },
    data: { 
      label: 'Click Element', 
      type: 'click', 
      icon: '👆',
      selector: '#button',
      clickType: 'left',
      timeout: 10000,
    },
  },
];

const initialEdges: Edge[] = [
  { 
    id: 'e1-2', 
    source: '1', 
    target: '2',
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#6b7280',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#6b7280',
    },
  },
];

const WorkflowEditorSimple: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflowName, setWorkflowName] = useState('Demo Workflow');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [collaborationUsers, setCollaborationUsers] = useState<CollaborationUser[]>([]);
  const [isCollaborationEnabled, setIsCollaborationEnabled] = useState(false);

  // Setup collaboration on component mount
  useEffect(() => {
    const workflowId = 'demo-workflow'; // In real app, this would be dynamic
    
    collaborationService.connect(workflowId)
      .then(() => {
        setIsCollaborationEnabled(true);
        console.log('✅ Collaboration enabled');
      })
      .catch(error => {
        console.warn('⚠️ Collaboration disabled:', error);
      });

    // Set up collaboration event listeners
    const handleUserJoin = (event: CollaborationEvent) => {
      setCollaborationUsers(prev => {
        const existingUser = prev.find(u => u.id === event.data.id);
        if (existingUser) return prev;
        return [...prev, event.data as CollaborationUser];
      });
    };

    const handleUserLeave = (event: CollaborationEvent) => {
      setCollaborationUsers(prev => prev.filter(u => u.id !== event.userId));
    };

    const handleCursorMove = (event: CollaborationEvent) => {
      setCollaborationUsers(prev =>
        prev.map(user =>
          user.id === event.userId
            ? { ...user, cursor: event.data }
            : user
        )
      );
    };

    const handleNodeSelect = (event: CollaborationEvent) => {
      setCollaborationUsers(prev =>
        prev.map(user =>
          user.id === event.userId
            ? { ...user, selectedNodeId: event.data.nodeId }
            : user
        )
      );
    };

    // Subscribe to collaboration events
    collaborationService.on('user-join', handleUserJoin);
    collaborationService.on('user-leave', handleUserLeave);
    collaborationService.on('cursor-move', handleCursorMove);
    collaborationService.on('node-select', handleNodeSelect);

    // Cleanup on unmount
    return () => {
      collaborationService.off('user-join', handleUserJoin);
      collaborationService.off('user-leave', handleUserLeave);
      collaborationService.off('cursor-move', handleCursorMove);
      collaborationService.off('node-select', handleNodeSelect);
      collaborationService.disconnect();
    };
  }, []);

  // Enhanced connection handler with validation
  const onConnect = useCallback(
    (params: Connection) => {
      // Check for null values first
      if (!params.source || !params.target) {
        console.log('Invalid connection: missing source or target');
        return;
      }

      // Use our custom validation
      if (!isValidConnection(params as { source: string; target: string; sourceHandle?: string }, nodes, edges)) {
        console.log('Invalid connection blocked');
        return;
      }

      const newEdge = {
        ...params,
        id: uuidv4(),
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#6b7280',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
        },
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, edges, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    
    // Broadcast node selection to collaborators
    if (isCollaborationEnabled) {
      collaborationService.broadcastNodeSelection(node.id);
    }
  }, [isCollaborationEnabled]);

  // Track mouse movement for cursor collaboration
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (isCollaborationEnabled) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Throttle cursor updates to avoid spam
      if (Date.now() - (onMouseMove as any).lastUpdate > 100) {
        collaborationService.broadcastCursorMove(x, y);
        (onMouseMove as any).lastUpdate = Date.now();
      }
    }
  }, [isCollaborationEnabled]);

  // Auto-layout function
  const onLayout = useCallback((direction: 'TB' | 'LR') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      direction
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setLayoutDirection(direction);
  }, [nodes, edges, setNodes, setEdges]);

  // Add new node with better positioning
  const addNewNode = (nodeType: string) => {
    const templates = {
      goto: { 
        label: 'Đi đến URL', 
        icon: '🌐',
        url: 'https://example.com',
        timeout: 30000,
      },
      click: { 
        label: 'Click Element', 
        icon: '👆',
        selector: '#button',
        clickType: 'left',
        timeout: 10000,
      },
      fill: { 
        label: 'Điền Input', 
        icon: '✏️',
        selector: '#input',
        value: '',
        clearFirst: 'true',
      },
      wait: { 
        label: 'Chờ', 
        icon: '⏳',
        waitType: 'time',
        delay: 2000,
      },
      screenshot: { 
        label: 'Chụp màn hình', 
        icon: '📷',
        path: 'screenshot.png',
        fullPage: 'true',
        quality: 90,
      },
      extract: { 
        label: 'Trích xuất Text', 
        icon: '📝',
        selector: '.result',
        attribute: 'text',
        multiple: 'false',
      },
    };

    const template = templates[nodeType as keyof typeof templates];
    
    // Smart positioning: place new node below existing ones
    const maxY = nodes.length > 0 
      ? Math.max(...nodes.map(node => node.position.y)) 
      : 0;

    const newNode: Node = {
      id: uuidv4(),
      type: 'customNode',
      position: {
        x: 250 + (Math.random() - 0.5) * 100, // Small random offset
        y: maxY + 150,
      },
      data: {
        ...template,
        type: nodeType,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // Update node handler
  const onUpdateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  // Delete node handler
  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Close properties panel
  const onClosePropertiesPanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Export workflow as JSON
  const exportWorkflow = useCallback(() => {
    const workflowData = {
      name: workflowName,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.type,
        position: node.position,
        config: node.data,
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
      })),
      createdAt: new Date().toISOString(),
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${workflowName.replace(/\s+/g, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [workflowName, nodes, edges]);

  // Generate workflow actions JSON (compatible with our backend)
  const generateActionsJSON = useCallback(() => {
    // Sort nodes by position to determine execution order
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    const actions = sortedNodes.map(node => ({
      action: node.data.type,
      // Use actual node data instead of defaults
      ...(node.data.type === 'goto' && { 
        url: node.data.url || 'https://example.com',
        timeout: node.data.timeout || 30000
      }),
      ...(node.data.type === 'click' && { 
        selector: node.data.selector || '#button',
        timeout: node.data.timeout || 10000
      }),
      ...(node.data.type === 'fill' && { 
        selector: node.data.selector || '#input', 
        value: node.data.value || 'test',
        clearFirst: node.data.clearFirst === 'true'
      }),
      ...(node.data.type === 'wait' && { 
        delay: node.data.delay || 1000,
        waitType: node.data.waitType || 'time',
        ...(node.data.waitType === 'selector' && { selector: node.data.selector })
      }),
      ...(node.data.type === 'screenshot' && { 
        path: node.data.path || 'screenshot.png',
        fullPage: node.data.fullPage === 'true',
        quality: node.data.quality || 90
      }),
      ...(node.data.type === 'extract' && { 
        selector: node.data.selector || '.result',
        attribute: node.data.attribute || 'text',
        multiple: node.data.multiple === 'true'
      }),
    }));

    return JSON.stringify(actions, null, 2);
  }, [nodes]);

  // Import workflow from file
  const importWorkflow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflowData = JSON.parse(event.target?.result as string);
          
          // Validate workflow structure
          if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
            throw new Error('Invalid workflow format: missing nodes array');
          }

          // Convert workflow data to ReactFlow format
          const importedNodes: Node[] = workflowData.nodes.map((nodeData: any, index: number) => ({
            id: nodeData.id || uuidv4(),
            type: 'customNode',
            position: nodeData.position || { 
              x: 100 + (index % 3) * 250, 
              y: 100 + Math.floor(index / 3) * 150 
            },
            data: {
              label: nodeData.config?.label || nodeData.label || `Node ${index + 1}`,
              type: nodeData.type || nodeData.config?.type || 'goto',
              icon: getIconForType(nodeData.type || nodeData.config?.type || 'goto'),
              ...nodeData.config,
            },
          }));

          const importedEdges: Edge[] = workflowData.edges?.map((edgeData: any) => ({
            id: uuidv4(),
            source: edgeData.source,
            target: edgeData.target,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#6b7280',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6b7280',
            },
          })) || [];

          // Update state
          setNodes(importedNodes);
          setEdges(importedEdges);
          setWorkflowName(workflowData.name || 'Imported Workflow');
          setSelectedNode(null);

          // Show success message
          console.log('✅ Workflow imported successfully!', {
            nodes: importedNodes.length,
            edges: importedEdges.length,
          });

        } catch (error) {
          console.error('❌ Failed to import workflow:', error);
          alert(`Lỗi import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }, [setNodes, setEdges, setWorkflowName]);

  // Import template from templates library
  const onSelectTemplate = useCallback((template: WorkflowTemplate) => {
    try {
      // Convert template nodes to ReactFlow format
      const templateNodes: Node[] = template.nodes.map(nodeData => ({
        id: nodeData.id,
        type: 'customNode',
        position: nodeData.position,
        data: {
          ...nodeData.config,
        },
      }));

      const templateEdges: Edge[] = template.edges.map(edgeData => ({
        id: uuidv4(),
        source: edgeData.source,
        target: edgeData.target,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#6b7280',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
        },
      }));

      // Update state
      setNodes(templateNodes);
      setEdges(templateEdges);
      setWorkflowName(template.name);
      setSelectedNode(null);

      console.log('✅ Template loaded successfully!', template);

    } catch (error) {
      console.error('❌ Failed to load template:', error);
      alert(`Lỗi load template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [setNodes, setEdges, setWorkflowName]);

  // Clear workflow
  const clearWorkflow = useCallback(() => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ workflow? Hành động này không thể hoàn tác.')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setWorkflowName('New Workflow');
    }
  }, [setNodes, setEdges]);

  // Helper function to get icon for node type
  const getIconForType = (type: string): string => {
    const icons: Record<string, string> = {
      goto: '🌐',
      click: '👆',
      fill: '✏️',
      wait: '⏳',
      screenshot: '📷',
      extract: '📝',
    };
    return icons[type] || '⚙️';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Header - Dark Mode Compatible */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Tên workflow..."
              className="w-64 font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
            <Badge variant="outline" className="text-sm border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              {nodes.length} nodes • {edges.length} connections
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplatesModal(true)}
              className="border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={importWorkflow}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportWorkflow}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('Actions JSON:', generateActionsJSON())}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generate Actions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearWorkflow}
              className="border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Enhanced Node Palette - Dark Mode Compatible */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              🎨 Action Palette
            </h3>
            
            <div className="space-y-3">
              {[
                { type: 'goto', label: 'Đi đến URL', icon: '🌐', desc: 'Navigate to URL' },
                { type: 'click', label: 'Click Element', icon: '👆', desc: 'Click on element' },
                { type: 'fill', label: 'Điền Input', icon: '✏️', desc: 'Fill input field' },
                { type: 'wait', label: 'Chờ', icon: '⏳', desc: 'Wait for time' },
                { type: 'screenshot', label: 'Chụp màn hình', icon: '📷', desc: 'Take screenshot' },
                { type: 'extract', label: 'Trích xuất Text', icon: '📝', desc: 'Extract text' },
              ].map((template) => (
                <Button
                  key={template.type}
                  variant="outline"
                  onClick={() => addNewNode(template.type)}
                  className="w-full justify-start h-auto p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start gap-3 w-full">
                    <span className="text-lg flex-shrink-0">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {template.label}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {template.desc}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onMouseMove={onMouseMove}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Meta', 'Ctrl']}
            isValidConnection={(connection) => {
              if (!connection.source || !connection.target) return false;
              return isValidConnection(connection as { source: string; target: string; sourceHandle?: string }, nodes, edges);
            }}
          >
            <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <ControlButton 
                onClick={() => onLayout('TB')}
                title="Layout Vertical"
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowUpDown className="w-4 h-4" />
              </ControlButton>
              <ControlButton 
                onClick={() => onLayout('LR')}
                title="Layout Horizontal"
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </ControlButton>
            </Controls>
            
            <MiniMap 
              nodeColor={(node) => {
                const colors = {
                  goto: '#3b82f6',
                  click: '#ef4444',
                  fill: '#10b981',
                  wait: '#6b7280',
                  screenshot: '#8b5cf6',
                  extract: '#06b6d4',
                };
                return colors[node.data?.type as keyof typeof colors] || '#6b7280';
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            />
            
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              color="#e5e7eb"
              style={{
                backgroundColor: 'transparent',
              }}
              className="dark:opacity-30"
            />
          </ReactFlow>

          {/* Collaboration Overlay */}
          {isCollaborationEnabled && (
            <CollaborationOverlay
              users={collaborationUsers}
              currentUserId={collaborationService.getCurrentUser()?.id || ''}
            />
          )}
        </div>

        {/* Properties Panel */}
        <NodePropertiesPanel
          selectedNode={selectedNode}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onClose={onClosePropertiesPanel}
        />
      </div>

      {/* Status Bar - Dark Mode Compatible */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <div>
            Layout: {layoutDirection === 'TB' ? 'Vertical' : 'Horizontal'} • 
            Click nodes to configure • Delete with Backspace
            {isCollaborationEnabled && (
              <span className="ml-2 inline-flex items-center gap-1">
                • <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live collaboration ({collaborationUsers.length} users)
              </span>
            )}
          </div>
          <div className="text-xs flex items-center gap-4">
            {selectedNode ? `Selected: ${selectedNode.data.label}` : 'Ready ✅'}
            {isCollaborationEnabled && (
              <span className="text-green-600 dark:text-green-400">
                🤝 Collaborative
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Templates Modal */}
      <WorkflowTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={onSelectTemplate}
      />
    </div>
  );
};

const WorkflowEditorSimplePage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorSimple />
    </ReactFlowProvider>
  );
};

export default WorkflowEditorSimplePage; 