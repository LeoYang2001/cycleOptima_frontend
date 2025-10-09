import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Cycle } from '../types/common/Cycle';

// API base URL
const API_BASE = 'https://192.168.0.200:8443/api';
// const API_BASE = 'http://localhost:3000/api';

const timer = 1000; // 3 seconds

// Timeout wrapper function
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Async thunks for API operations
export const fetchAllCycles = createAsyncThunk(
  'cycles/fetchAll',
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      console.log('Fetching cycles with 5s timeout...');
      const url = status ? `${API_BASE}/cycles?status=${status}` : `${API_BASE}/cycles`;
      
      const result = await withTimeout(
        fetch(url).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch cycles: ${response.statusText}`);
          }
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || 'Failed to fetch cycles');
          }
          return data.data;
        }),
        timer // 5 seconds timeout
      );
      
      console.log(`Successfully fetched ${result.length} cycles`);
      return result;
      
    } catch (error) {
      console.error('Failed to fetch cycles:', error);
      
      // Handle specific timeout error
      if (error instanceof Error && error.message.includes('timed out')) {
        return rejectWithValue(`Request timed out after ${timer / 1000} seconds. Server may be unavailable.`);
      }
      
      // Handle HTML response error (common when endpoint doesn't exist)
      if (error instanceof Error && error.message.includes('Unexpected token')) {
        return rejectWithValue('Server returned HTML instead of JSON. API endpoint may not exist.');
      }
      
      // Handle other errors
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch cycles'
      );
    }
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
  async (cycleData: Partial<Cycle>, { rejectWithValue }) => {
    try {
      console.log('Creating cycle with 5s timeout...');
      
      const result = await withTimeout(
        fetch(`${API_BASE}/cycles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cycleData),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to create cycle: ${response.statusText}`);
          }
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || 'Failed to create cycle');
          }
          return data.data;
        }),
        timer // 5 seconds timeout
      );
      
      console.log('Successfully created cycle:', result.displayName);
      return result;
      
    } catch (error) {
      console.error('Failed to create cycle:', error);
      
      // Handle specific timeout error
      if (error instanceof Error && error.message.includes('timed out')) {
        return rejectWithValue('Create request timed out after 5 seconds. Server may be unavailable.');
      }
      
      // Handle HTML response error
      if (error instanceof Error && error.message.includes('Unexpected token')) {
        return rejectWithValue('Server returned HTML instead of JSON. API endpoint may not exist.');
      }
      
      // Handle other errors
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create cycle'
      );
    }
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
  isCreating: boolean; // Add separate loading state for creation
  error: string | null;
  createError: string | null; // Add separate error state for creation
  lastFetched: number | null;
}

const initialState: CyclesState = {
  cycles: [],
  currentCycle: null,
  stats: null,
  loading: false,
  isCreating: false,
  error: null,
  createError: null,
  lastFetched: null,
};

const cyclesSlice = createSlice({
  name: 'cycles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.createError = null;
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
        console.log('Starting cycle fetch...');
      })
      .addCase(fetchAllCycles.fulfilled, (state, action) => {
        state.loading = false;
        state.cycles = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
        console.log('Cycle fetch completed successfully');
      })
      .addCase(fetchAllCycles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || action.error.message || 'Failed to fetch cycles';
        console.log('Cycle fetch failed:', action.payload);
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
        state.isCreating = true;
        state.createError = null;
        console.log('Starting cycle creation...');
      })
      .addCase(createCycle.fulfilled, (state, action) => {
        state.isCreating = false;
        state.cycles.push(action.payload);
        state.currentCycle = action.payload;
        state.createError = null;
        console.log('Cycle creation completed successfully');
      })
      .addCase(createCycle.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload as string || action.error.message || 'Failed to create cycle';
        console.log('Cycle creation failed:', action.payload);
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
export const selectIsCreating = (state: RootState) => state.cycles.isCreating; // Add selector for creation loading
export const selectCyclesError = (state: RootState) => state.cycles.error;
export const selectCreateError = (state: RootState) => state.cycles.createError; // Add selector for creation error
export const selectCyclesStats = (state: RootState) => state.cycles.stats;
export const selectLastFetched = (state: RootState) => state.cycles.lastFetched;

// Derived selectors
export const selectCycleById = (id: string) => (state: RootState) =>
  state.cycles.cycles.find(cycle => cycle.id === id);

export const selectCyclesByStatus = (status: string) => (state: RootState) =>
  state.cycles.cycles.filter(cycle => cycle.status === status);

export default cyclesSlice.reducer;