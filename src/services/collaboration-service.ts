import { Edge, Node } from 'reactflow';

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedNodeId?: string;
}

export interface CollaborationEvent {
  type: 'node-update' | 'edge-update' | 'node-select' | 'cursor-move' | 'user-join' | 'user-leave';
  userId: string;
  data: any;
  timestamp: number;
}

export interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  users: CollaborationUser[];
}

class CollaborationService {
  private ws: WebSocket | null = null;
  private currentUser: CollaborationUser | null = null;
  private listeners: Map<string, ((event: CollaborationEvent) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    // Generate random user info
    this.currentUser = {
      id: this.generateUserId(),
      name: `User ${Math.floor(Math.random() * 1000)}`,
      color: this.generateUserColor(),
    };
  }

  // Connect to collaboration server
  connect(workflowId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use mock WebSocket for demo - replace with real server URL
        const wsUrl = `ws://localhost:8080/collaboration/${workflowId}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 Connected to collaboration server');
          this.reconnectAttempts = 0;
          
          // Send user join event
          this.sendEvent({
            type: 'user-join',
            userId: this.currentUser!.id,
            data: this.currentUser,
            timestamp: Date.now(),
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const collaborationEvent: CollaborationEvent = JSON.parse(event.data);
            this.handleEvent(collaborationEvent);
          } catch (error) {
            console.error('❌ Failed to parse collaboration event:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from collaboration server');
          this.attemptReconnect(workflowId);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        // Fallback for demo - simulate collaboration without real server
        console.warn('⚠️ WebSocket not available, using local simulation');
        this.simulateCollaboration();
        resolve();
      }
    });
  }

  // Disconnect from collaboration server
  disconnect() {
    if (this.ws) {
      this.sendEvent({
        type: 'user-leave',
        userId: this.currentUser!.id,
        data: this.currentUser,
        timestamp: Date.now(),
      });
      
      this.ws.close();
      this.ws = null;
    }
  }

  // Send collaboration event
  sendEvent(event: CollaborationEvent) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      // For demo: simulate local event
      setTimeout(() => this.handleEvent(event), 10);
    }
  }

  // Handle incoming collaboration events
  private handleEvent(event: CollaborationEvent) {
    // Don't process our own events
    if (event.userId === this.currentUser?.id) return;

    const eventListeners = this.listeners.get(event.type) || [];
    eventListeners.forEach(listener => listener(event));
  }

  // Subscribe to collaboration events
  on(eventType: string, listener: (event: CollaborationEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  // Unsubscribe from collaboration events
  off(eventType: string, listener: (event: CollaborationEvent) => void) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Broadcast node update
  broadcastNodeUpdate(nodes: Node[]) {
    this.sendEvent({
      type: 'node-update',
      userId: this.currentUser!.id,
      data: { nodes },
      timestamp: Date.now(),
    });
  }

  // Broadcast edge update
  broadcastEdgeUpdate(edges: Edge[]) {
    this.sendEvent({
      type: 'edge-update',
      userId: this.currentUser!.id,
      data: { edges },
      timestamp: Date.now(),
    });
  }

  // Broadcast node selection
  broadcastNodeSelection(nodeId: string | null) {
    this.sendEvent({
      type: 'node-select',
      userId: this.currentUser!.id,
      data: { nodeId },
      timestamp: Date.now(),
    });
  }

  // Broadcast cursor movement
  broadcastCursorMove(x: number, y: number) {
    this.sendEvent({
      type: 'cursor-move',
      userId: this.currentUser!.id,
      data: { x, y },
      timestamp: Date.now(),
    });
  }

  // Get current user info
  getCurrentUser(): CollaborationUser | null {
    return this.currentUser;
  }

  // Update current user info
  updateCurrentUser(updates: Partial<CollaborationUser>) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...updates };
    }
  }

  // Attempt to reconnect
  private attemptReconnect(workflowId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(workflowId).catch(() => {
          // Retry with exponential backoff
          this.reconnectDelay *= 2;
        });
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  // Simulate collaboration for demo
  private simulateCollaboration() {
    console.log('🎭 Simulating collaboration with virtual users');
    
    // Simulate other users joining
    setTimeout(() => {
      this.handleEvent({
        type: 'user-join',
        userId: 'demo-user-1',
        data: {
          id: 'demo-user-1',
          name: 'Demo User 1',
          color: '#3b82f6',
        },
        timestamp: Date.now(),
      });
    }, 2000);

    setTimeout(() => {
      this.handleEvent({
        type: 'user-join',
        userId: 'demo-user-2',
        data: {
          id: 'demo-user-2',
          name: 'Demo User 2',
          color: '#ef4444',
        },
        timestamp: Date.now(),
      });
    }, 4000);

    // Simulate cursor movements
    setInterval(() => {
      const users = ['demo-user-1', 'demo-user-2'];
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      this.handleEvent({
        type: 'cursor-move',
        userId: randomUser,
        data: {
          x: Math.random() * 800 + 100,
          y: Math.random() * 600 + 100,
        },
        timestamp: Date.now(),
      });
    }, 3000);
  }

  // Helper functions
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserColor(): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService(); 