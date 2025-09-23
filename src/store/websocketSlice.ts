import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const WEBSOCKET_URL = "wss://192.168.4.137:8443/ws";

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: any;
  connectionAttempts: number;
  maxReconnectAttempts: number;
  url: string;
}

const initialState: WebSocketState = {
  connected: false,
  connecting: false,
  error: null,
  lastMessage: null,
  connectionAttempts: 0,
  maxReconnectAttempts: 5,
  url: WEBSOCKET_URL,
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    // Connection actions
    startConnecting: (state) => {
      state.connecting = true;
      state.error = null;
    },

    connectionEstablished: (state) => {
      state.connected = true;
      state.connecting = false;
      state.error = null;
      state.connectionAttempts = 0;
    },

    connectionFailed: (state, action: PayloadAction<string>) => {
      state.connected = false;
      state.connecting = false;
      state.error = action.payload;
      state.connectionAttempts += 1;
    },

    connectionClosed: (state) => {
      state.connected = false;
      state.connecting = false;
    },

    // Message handling
    messageReceived: (state, action: PayloadAction<any>) => {
      state.lastMessage = action.payload;
    },

    // Reset connection attempts
    resetConnectionAttempts: (state) => {
      state.connectionAttempts = 0;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Update WebSocket URL
    updateWebSocketUrl: (state, action: PayloadAction<string>) => {
      state.url = `${action.payload}`;
    },
  },
});

export const {
  startConnecting,
  connectionEstablished,
  connectionFailed,
  connectionClosed,
  messageReceived,
  resetConnectionAttempts,
  clearError,
  updateWebSocketUrl,
} = websocketSlice.actions;

// Selectors
export const selectWebSocketConnected = (state: { websocket: WebSocketState }) => 
  state.websocket.connected;

export const selectWebSocketConnecting = (state: { websocket: WebSocketState }) => 
  state.websocket.connecting;

export const selectWebSocketError = (state: { websocket: WebSocketState }) => 
  state.websocket.error;

export const selectWebSocketLastMessage = (state: { websocket: WebSocketState }) => 
  state.websocket.lastMessage;

export const selectConnectionAttempts = (state: { websocket: WebSocketState }) => 
  state.websocket.connectionAttempts;

export const selectMaxReconnectAttempts = (state: { websocket: WebSocketState }) => 
  state.websocket.maxReconnectAttempts;

export const selectWebSocketUrl = (state: { websocket: WebSocketState }) => 
  state.websocket.url;

export default websocketSlice.reducer;

// WebSocket manager class
export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private dispatch: any = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Initialize with Redux dispatch
  initialize(dispatch: any) {
    this.dispatch = dispatch;
    this.connect();
  }

  // Connect to WebSocket
  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (!this.dispatch) {
      console.error('WebSocket manager not initialized with dispatch');
      return;
    }

    this.dispatch(startConnecting());
    
    try {
      // Get current WebSocket URL from state
      const state = this.dispatch((dispatch: any, getState: any) => getState().websocket);
      const wsUrl = state.url;
      
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.dispatch(connectionFailed(`Failed to create connection: ${error}`));
      this.scheduleReconnect();
    }
  }

  // Set up WebSocket event listeners
  private setupEventListeners() {
    if (!this.ws || !this.dispatch) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected to ESP32');
      this.dispatch(connectionEstablished());
      this.dispatch(resetConnectionAttempts());
      this.startHeartbeat();
      
      // Send initial connection message
      this.send('connect');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Update Redux state
        this.dispatch(messageReceived(data));
        
        // Call registered message handlers
        this.messageHandlers.forEach((handler, key) => {
          handler(data);
        });
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.dispatch(connectionClosed());
      this.stopHeartbeat();
      
      // Attempt to reconnect if not manually closed
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.dispatch(connectionFailed('Connection error occurred'));
    };
  }

  // Send message through WebSocket
  send(message: string | object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('WebSocket message sent:', messageStr);
      return true;
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
  }

  // Register message handler for specific components
  registerMessageHandler(key: string, handler: (data: any) => void) {
    this.messageHandlers.set(key, handler);
  }

  // Unregister message handler
  unregisterMessageHandler(key: string) {
    this.messageHandlers.delete(key);
  }

  // Manual reconnect
  reconnect() {
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect() {
    if (!this.dispatch) return;

    const state = this.dispatch((dispatch: any, getState: any) => getState().websocket);
    
    if (state.connectionAttempts >= state.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.dispatch(connectionFailed('Max reconnection attempts reached'));
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, state.connectionAttempts), 30000); // Exponential backoff, max 30s
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${state.connectionAttempts + 1})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ action: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getReadyState(): number | null {
    return this.ws?.readyState ?? null;
  }
}

// Export singleton instance
export const websocketManager = WebSocketManager.getInstance();