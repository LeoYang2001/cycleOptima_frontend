import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

// Import the existing Cycle type
import type { Cycle } from '../types/common/Cycle';
import type { Phase } from '../types/common/Phase';

interface LocalCyclesState {
  cycles: Cycle[];
  loading: boolean;
  error: string | null;
  directoryPath: string | null;
  lastLoaded: string | null;
}

const initialState: LocalCyclesState = {
  cycles: [],
  loading: false,
  error: null,
  directoryPath: null,
  lastLoaded: null,
};

const localCyclesSlice = createSlice({
  name: 'localCycles',
  initialState,
  reducers: {

        deletePhaseOptimistically: (
      state,
      action: PayloadAction<{ cycleId: string; phaseId: string }>
    ) => {
      const { cycleId, phaseId } = action.payload;
      const cycle = state.cycles.find((c) => c.id === cycleId);
 if (cycle) {
        cycle.data.phases = cycle.data.phases.filter(
          (phase) => phase.id !== phaseId
        );
    
      }
    
    },


       updateCyclePhases: (
      state,
      action: PayloadAction<{ cycleId: string; phases: Phase[] }>
    ) => {
      const { cycleId, phases } = action.payload;
      const cycle = state.cycles.find((c) => c.id === cycleId);

      if (cycle) {
        cycle.data.phases = phases;
       
      }
    },
       addPhaseOptimistically: (
          state,
          action: PayloadAction<{ cycleId: string; phase: Phase }>
        ) => {
          const { cycleId, phase } = action.payload;
          const cycle = state.cycles.find((c) => c.id === cycleId);
     if (cycle) {
        cycle.data.phases.push(phase);
     }
        
        },
     updateCycleOptimistically: (state, action: PayloadAction<Cycle>) => {
   
      const updatedCycle = action.payload;
      const index = state.cycles.findIndex(
        (cycle) => cycle.id === updatedCycle.id
      );

      if (index !== -1) {
        state.cycles[index] = updatedCycle;
      } else {
        state.cycles.push(updatedCycle);
        console.log('push new cycle in local:', updatedCycle);
      }

    },
     updateCycleNote: (
      state,
      action: PayloadAction<{ cycleId: string; note: string }>
    ) => {
      const { cycleId, note } = action.payload;
      const cycle = state.cycles.find((c) => c.id === cycleId);

     
    },
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when starting to load
      }
    },

    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Set directory path
    setDirectoryPath: (state, action: PayloadAction<string>) => {
      state.directoryPath = action.payload;
    },

    // Clear directory path
    clearDirectoryPath: (state) => {
      state.directoryPath = null;
      state.cycles = []; // Clear cycles when path is cleared
      state.lastLoaded = null;
    },

    // Load cycles (replace all existing cycles)
    loadCycles: (state, action: PayloadAction<Cycle[]>) => {
      state.cycles = action.payload;
      state.loading = false;
      state.error = null;
      state.lastLoaded = new Date().toISOString();
    },

    // Add a single cycle
    addCycle: (state, action: PayloadAction<Cycle>) => {
      const existingIndex = state.cycles.findIndex(cycle => cycle.id === action.payload.id);
      if (existingIndex >= 0) {
        // Update existing cycle
        state.cycles[existingIndex] = action.payload;
      } else {
        // Add new cycle
        state.cycles.push(action.payload);
      }
    },

    // Update a cycle
    updateCycle: (state, action: PayloadAction<Cycle>) => {
      const index = state.cycles.findIndex(cycle => cycle.id === action.payload.id);
      if (index >= 0) {
        state.cycles[index] = action.payload;
      }
    },

    // Remove a cycle
    removeCycle: (state, action: PayloadAction<string>) => {
      state.cycles = state.cycles.filter(cycle => cycle.id !== action.payload);
    },

    // Clear all cycles
    clearCycles: (state) => {
      state.cycles = [];
      state.lastLoaded = null;
    },

    // Refresh cycles (same as loadCycles but with different semantic meaning)
    refreshCycles: (state, action: PayloadAction<Cycle[]>) => {
      state.cycles = action.payload;
      state.loading = false;
      state.error = null;
      state.lastLoaded = new Date().toISOString();
    },
  },
});

// Configure persistence
const persistConfig = {
  key: 'localCycles',
  storage,
  // Only persist cycles and directoryPath, not loading states
  whitelist: ['cycles', 'directoryPath', 'lastLoaded']
};

export const {
  setLoading,
  setError,
  clearError,
  setDirectoryPath,
  clearDirectoryPath,
  loadCycles,
  addCycle,
  updateCycle,
  removeCycle,
  clearCycles,
  updateCycleOptimistically,
  updateCycleNote,
  addPhaseOptimistically,
  deletePhaseOptimistically,
  updateCyclePhases
} = localCyclesSlice.actions;

// Selectors
export const selectLocalCycles = (state: { localCycles: LocalCyclesState }) => 
  state.localCycles.cycles;

export const selectLocalCyclesLoading = (state: { localCycles: LocalCyclesState }) => 
  state.localCycles.loading;

export const selectLocalCyclesError = (state: { localCycles: LocalCyclesState }) => 
  state.localCycles.error;

export const selectLocalCyclesDirectoryPath = (state: { localCycles: LocalCyclesState }) => 
  state.localCycles.directoryPath;

export const selectLocalCyclesLastLoaded = (state: { localCycles: LocalCyclesState }) => 
  state.localCycles.lastLoaded;

export const selectLocalCycleById = (state: { localCycles: LocalCyclesState }, id: string) =>
  state.localCycles.cycles.find(cycle => cycle.id === id);

export const selectLocalCyclesByStatus = (state: { localCycles: LocalCyclesState }, status: string) =>
  state.localCycles.cycles.filter(cycle => cycle.status === status);

// Create persisted reducer
const persistedLocalCyclesReducer = persistReducer(persistConfig, localCyclesSlice.reducer);

export default persistedLocalCyclesReducer;