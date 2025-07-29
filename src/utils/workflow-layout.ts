import dagre from 'dagre';
import { Edge, Node, Position } from 'reactflow';

// Create dagre graph instance
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Node dimensions for layout calculation
const nodeWidth = 200;
const nodeHeight = 80;

/**
 * Apply automatic layout to nodes using dagre
 * Based on OhFlow implementation
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'BT' | 'LR' | 'RL' = 'TB'
) => {
  const isHorizontal = direction === 'LR' || direction === 'RL';
  
  // Configure the graph
  dagreGraph.setGraph({
    rankdir: direction,
    ranker: 'network-simplex', // network-simplex, tight-tree or longest-path
    ranksep: isHorizontal ? 150 : 100,
    nodesep: isHorizontal ? 100 : 150,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight 
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Set handle positions based on direction
    const targetPosition = isHorizontal ? Position.Left : Position.Top;
    const sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // Dagre uses center-center position, but React Flow uses top-left
    // So we adjust the position
    return {
      ...node,
      targetPosition,
      sourcePosition,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      // Add calculated dimensions
      style: {
        ...node.style,
        width: nodeWidth,
        height: nodeHeight,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Center nodes in the viewport
 */
export const centerNodes = (nodes: Node[]): Node[] => {
  if (nodes.length === 0) return nodes;

  // Calculate bounds
  const bounds = {
    minX: Math.min(...nodes.map(node => node.position.x)),
    minY: Math.min(...nodes.map(node => node.position.y)),
    maxX: Math.max(...nodes.map(node => node.position.x + nodeWidth)),
    maxY: Math.max(...nodes.map(node => node.position.y + nodeHeight)),
  };

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Center around viewport
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;

  const offsetX = viewportCenterX - centerX;
  const offsetY = viewportCenterY - centerY;

  return nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
};

/**
 * Validate node connections
 * Based on OhFlow's connection validation
 */
export const isValidConnection = (
  connection: { source: string; target: string; sourceHandle?: string },
  nodes: Node[],
  edges: Edge[]
): boolean => {
  const { source, target, sourceHandle } = connection;

  // Prevent self-connections
  if (source === target) {
    return false;
  }

  // Check if source already has a connection from this handle
  const existingConnections = edges.filter(edge => 
    edge.source === source && 
    (!sourceHandle || edge.sourceHandle === sourceHandle)
  );

  // For most node types, only allow one connection per source handle
  if (existingConnections.length > 0) {
    return false;
  }

  // Prevent cycles (basic check)
  const hasPath = (from: string, to: string, visited: Set<string> = new Set()): boolean => {
    if (from === to) return true;
    if (visited.has(from)) return false;
    
    visited.add(from);
    
    const outgoingEdges = edges.filter(edge => edge.source === from);
    return outgoingEdges.some(edge => hasPath(edge.target, to, visited));
  };

  if (hasPath(target, source)) {
    return false;
  }

  return true;
};

/**
 * Auto-arrange nodes intelligently
 */
export const autoArrangeNodes = (nodes: Node[], edges: Edge[]) => {
  // Group nodes by type for better arrangement
  const startNodes = nodes.filter(node => 
    !edges.some(edge => edge.target === node.id)
  );
  
  if (startNodes.length === 0 && nodes.length > 0) {
    // If no clear start node, use first node
    return getLayoutedElements(nodes, edges, 'TB');
  }

  return getLayoutedElements(nodes, edges, 'TB');
}; 