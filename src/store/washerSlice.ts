import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { websocketManager } from './websocketSlice';

// Telemetry data structure based on the provided packet
export interface GPIOState {
  pin: number;
  state: number;
}

export interface SensorData {
  rpm: number;
  pressure_freq: number;
  sensor_error: boolean;
}

export interface CycleStatus {
  cycle_running: boolean;
  current_phase_index: number;
  current_phase_name: string;
  total_phases: number;
  phase_elapsed_ms: number;
  phase_total_duration_ms: number;
  cycle_start_time_ms: number;
}

// Cycle data component structure
export interface CycleComponent {
  id: string;
  label: string;
  compId: string;
  start_ms: number;
  duration_ms: number;
  has_motor: boolean;
}

// Cycle data phase structure
export interface CyclePhase {
  id: string;
  name: string;
  color: string;
  start_time_ms: number;
  components: CycleComponent[];
}

export interface TelemetryData {
  type: string;
  packet_timestamp_ms: number;
  gpio: GPIOState[];
  sensors: SensorData;
  cycle: CycleStatus;
  cycle_data?: CyclePhase[]; // Optional array of cycle phases
}

interface WasherState {
  telemetry: TelemetryData | null;
  lastUpdateTime: number | null;
  history: {
    rpm: Array<{ timestamp: number; value: number }>;
    pressure: Array<{ timestamp: number; value: number }>;
    maxHistoryLength: number;
  };
}

const initialState: WasherState = {
  telemetry: null,
  lastUpdateTime: null,
  history: {
    rpm: [],
    pressure: [],
    maxHistoryLength: 100, // Keep last 100 data points
  },
};

const washerSlice = createSlice({
  name: 'washer',
  initialState,
  reducers: {
    // Update telemetry data
    updateTelemetry: (state, action: PayloadAction<TelemetryData>) => {
      state.telemetry = action.payload;
      state.lastUpdateTime = Date.now();

      // Add to history (for charts/graphs)
      const timestamp = action.payload.packet_timestamp_ms;
      
      // Add RPM to history
      state.history.rpm.push({
        timestamp,
        value: action.payload.sensors.rpm,
      });

      // Add pressure to history
      state.history.pressure.push({
        timestamp,
        value: action.payload.sensors.pressure_freq,
      });

      // Limit history length
      if (state.history.rpm.length > state.history.maxHistoryLength) {
        state.history.rpm.shift();
      }
      if (state.history.pressure.length > state.history.maxHistoryLength) {
        state.history.pressure.shift();
      }
    },

    // Clear telemetry data
    clearTelemetry: (state) => {
      state.telemetry = null;
      state.lastUpdateTime = null;
    },

    // Clear history
    clearHistory: (state) => {
      state.history.rpm = [];
      state.history.pressure = [];
    },

    // Update max history length
    setMaxHistoryLength: (state, action: PayloadAction<number>) => {
      state.history.maxHistoryLength = action.payload;
    },
  },
});

export const {
  updateTelemetry,
  clearTelemetry,
  clearHistory,
  setMaxHistoryLength,
} = washerSlice.actions;

// Selectors
export const selectTelemetry = (state: { washer: WasherState }) => 
  state.washer.telemetry;

export const selectGPIOStates = (state: { washer: WasherState }) => 
  state.washer.telemetry?.gpio || [];

export const selectSensorData = (state: { washer: WasherState }) => 
  state.washer.telemetry?.sensors || null;

export const selectCycleStatus = (state: { washer: WasherState }) => 
  state.washer.telemetry?.cycle || null;

export const selectRPM = (state: { washer: WasherState }) => 
  state.washer.telemetry?.sensors.rpm || 0;

export const selectPressure = (state: { washer: WasherState }) => 
  state.washer.telemetry?.sensors.pressure_freq || 0;

export const selectCurrentPhaseName = (state: { washer: WasherState }) => 
  state.washer.telemetry?.cycle.current_phase_name || '';

export const selectCycleRunning = (state: { washer: WasherState }) => 
  state.washer.telemetry?.cycle.cycle_running || false;

export const selectLastUpdateTime = (state: { washer: WasherState }) => 
  state.washer.lastUpdateTime;

export const selectRPMHistory = (state: { washer: WasherState }) => 
  state.washer.history.rpm;

export const selectPressureHistory = (state: { washer: WasherState }) => 
  state.washer.history.pressure;

// Selector to get cycle data (phases)
export const selectCycleData = (state: { washer: WasherState }) => 
  state.washer.telemetry?.cycle_data || [];

// Selector to get current phase data
export const selectCurrentPhaseData = (state: { washer: WasherState }) => {
  const cycleData = state.washer.telemetry?.cycle_data;
  const currentPhaseIndex = state.washer.telemetry?.cycle.current_phase_index;
  
  if (!cycleData || currentPhaseIndex === undefined) return null;
  
  return cycleData[currentPhaseIndex] || null;
};

// Helper selector to get GPIO state by pin number
export const selectGPIOByPin = (pin: number) => (state: { washer: WasherState }) => 
  state.washer.telemetry?.gpio.find(g => g.pin === pin) || null;

// Thunk action to toggle GPIO pin
// Note: State 1 means OFF, State 0 means ON (inverted logic)
export const togglePin = (pin: number) => (dispatch: any, getState: any) => {
    console.log(`Toggling pin ${pin}...`);
  const state = getState();
  const currentGPIO = selectGPIOByPin(pin)(state);
  
  // Determine new state (toggle current state)
  // If current state is 1 (ON), new state should be 0 (OFF)
  // If current state is 0 (OFF), new state should be 1 (ON)
  const newState = currentGPIO?.state === 1 ? 0 : 1;
  
  // Create the command object
  const command = {
    action: "toggle_gpio",
    pin: pin,
    state: newState
  };
  
  // Send command to websocket
  const success = websocketManager.send(command);
  
  if (!success) {
    console.error(`Failed to send toggle command for pin ${pin}`);
    return false;
  }
  
  console.log(`Toggled pin ${pin} to state ${newState} (${newState === 0 ? 'ON' : 'OFF'})`);
  return true;
};

// Thunk action to write JSON cycle data to ESP32
export const writeJSON = (data: { phases: any[] }) => (dispatch: any, getState: any) => {
  console.log('Writing JSON cycle data to ESP32...');
  
  const command = {
    action: "write_json",
    data: data
  };
  
  const success = websocketManager.send(command);
  
  if (!success) {
    console.error('Failed to send write_json command');
    return false;
  }
  
  console.log('JSON cycle data sent successfully');
  return true;
};

// Thunk action to start cycle
export const startCycle = () => (dispatch: any, getState: any) => {
  console.log('Starting cycle...');
  
  const command = {
    action: "start_cycle"
  };
  
  const success = websocketManager.send(command);
  
  if (!success) {
    console.error('Failed to send start_cycle command');
    return false;
  }
  
  console.log('Start cycle command sent');
  return true;
};

// Thunk action to stop cycle
export const stopCycle = () => (dispatch: any, getState: any) => {
  console.log('Stopping cycle...');
  
  const command = {
    action: "stop_cycle"
  };
  
  const success = websocketManager.send(command);
  
  if (!success) {
    console.error('Failed to send stop_cycle command');
    return false;
  }
  
  console.log('Stop cycle command sent');
  return true;
};

// Thunk action to skip to next phase
export const skipPhase = () => (dispatch: any, getState: any) => {
  console.log('Skipping to next phase...');
  
  const command = {
    action: "skip_phase"
  };
  
  const success = websocketManager.send(command);
  
  if (!success) {
    console.error('Failed to send skip_phase command');
    return false;
  }
  
  console.log('Skip phase command sent');
  return true;
};

// Thunk action to skip to specific phase by index
export const skipToPhase = (index: number) => (dispatch: any, getState: any) => {
  console.log(`Skipping to phase ${index}...`);
  
  const command = {
    action: "skip_to_phase",
    index: index
  };
  
  const success = websocketManager.send(command);
  
  if (!success) {
    console.error(`Failed to send skip_to_phase command for index ${index}`);
    return false;
  }
  
  console.log(`Skip to phase ${index} command sent`);
  return true;
};

export default washerSlice.reducer;
