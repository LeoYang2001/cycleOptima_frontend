import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Cycle } from '../types/common/Cycle';

// API base URL
const API_BASE = 'https://192.168.0.197:8443/api';
// const API_BASE = 'https://192.168.0.197:2000/api';

// Async thunks for API operations
export const fetchAllCycles = createAsyncThunk(
  'cycles/fetchAll',
  async (status?: string) => {
    const url = status ? `${API_BASE}/cycles?status=${status}` : `${API_BASE}/cycles`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch cycles: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch cycles');
    }
    return result.data;
  }
);

export const fetchCycleById = createAsyncThunk(
  'cycles/fetchById',
  async (id: string) => {
    const response = await fetch(`${API_BASE}/cycles/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch cycle: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch cycle');
    }
    return result.data;
  }
);

export const createCycle = createAsyncThunk(
  'cycles/create',
  async (cycleData: Partial<Cycle>) => {
    const response = await fetch(`${API_BASE}/cycles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cycleData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create cycle: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to create cycle');
    }
    return result.data;
  }
);

export const updateCycle = createAsyncThunk(
  'cycles/update',
  async ({ id, updates }: { id: string; updates: Partial<Cycle> }) => {
    const response = await fetch(`${API_BASE}/cycles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`Failed to update cycle: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to update cycle');
    }
    return result.data;
  }
);

export const deleteCycle = createAsyncThunk(
  'cycles/delete',
  async (id: string) => {
    const response = await fetch(`${API_BASE}/cycles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete cycle: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete cycle');
    }
    return id; // Return the deleted cycle's ID
  }
);

export const fetchStats = createAsyncThunk(
  'cycles/fetchStats',
  async () => {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch stats');
    }
    return result.data;
  }
);

// Interface for the slice state
interface CyclesState {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  stats: {
    total: number;
    draft: number;
    tested: number;
    production: number;
  } | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CyclesState = {
  cycles: [],
  currentCycle: null,
  stats: null,
  loading: false,
  error: null,
  lastFetched: null,
};

const cyclesSlice = createSlice({
  name: 'cycles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCycle: (state) => {
      state.currentCycle = null;
    },
    setCurrentCycle: (state, action) => {
      state.currentCycle = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all cycles
      .addCase(fetchAllCycles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCycles.fulfilled, (state, action) => {
        state.loading = false;
        state.cycles = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAllCycles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cycles';
      })

      // Fetch cycle by ID
      .addCase(fetchCycleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCycleById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCycle = action.payload;
        
        // Also update the cycle in the cycles array if it exists
        const index = state.cycles.findIndex(cycle => cycle.id === action.payload.id);
        if (index !== -1) {
          state.cycles[index] = action.payload;
        } else {
          // Add to cycles array if not present
          state.cycles.push(action.payload);
        }
      })
      .addCase(fetchCycleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cycle';
      })

      // Create cycle
      .addCase(createCycle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCycle.fulfilled, (state, action) => {
        state.loading = false;
        state.cycles.push(action.payload);
        state.currentCycle = action.payload;
      })
      .addCase(createCycle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create cycle';
      })

      // Update cycle
      .addCase(updateCycle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCycle.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.cycles.findIndex(cycle => cycle.id === action.payload.id);
        if (index !== -1) {
          state.cycles[index] = action.payload;
        }
        // Update current cycle if it's the same one
        if (state.currentCycle?.id === action.payload.id) {
          state.currentCycle = action.payload;
        }
      })
      .addCase(updateCycle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update cycle';
      })

      // Delete cycle
      .addCase(deleteCycle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCycle.fulfilled, (state, action) => {
        state.loading = false;
        state.cycles = state.cycles.filter(cycle => cycle.id !== action.payload);
        // Clear current cycle if it was the deleted one
        if (state.currentCycle?.id === action.payload) {
          state.currentCycle = null;
        }
      })
      .addCase(deleteCycle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete cycle';
      })

      // Fetch stats
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch stats';
      });
  },
});

// Actions
export const { clearError, clearCurrentCycle, setCurrentCycle } = cyclesSlice.actions;

// Selectors
export const selectAllCycles = (state: RootState) => state.cycles.cycles;
export const selectCurrentCycle = (state: RootState) => state.cycles.currentCycle;
export const selectCyclesLoading = (state: RootState) => state.cycles.loading;
export const selectCyclesError = (state: RootState) => state.cycles.error;
export const selectCyclesStats = (state: RootState) => state.cycles.stats;
export const selectLastFetched = (state: RootState) => state.cycles.lastFetched;

// Derived selectors
export const selectCycleById = (id: string) => (state: RootState) =>
  state.cycles.cycles.find(cycle => cycle.id === id);

export const selectCyclesByStatus = (status: string) => (state: RootState) =>
  state.cycles.cycles.filter(cycle => cycle.status === status);

export default cyclesSlice.reducer;