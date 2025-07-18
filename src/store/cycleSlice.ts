import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { fetchAllWasherCycles, upsertWasherCycle } from "../apis/cycles";
import type { Cycle } from "../types/common/Cycle";
import type { Phase } from "../types/common/Phase";

export const fetchCycles = createAsyncThunk("cycles/fetchAll", async () => {
  return await fetchAllWasherCycles();
});

export const syncCycleToDatabase = createAsyncThunk(
  "cycles/syncToDatabase",
  async (cycle: Cycle) => {
    return await upsertWasherCycle({
      id: cycle.id,
      displayName: cycle.displayName,
      data: cycle.data,
      engineer_note: cycle.engineer_note,
    });
  }
);

interface CycleState {
  cycles: Cycle[];
  loading: boolean;
  error: string | null;
  pendingSync: Record<string, number>; // Track number of changes per cycle
  lastModified: Record<string, number>; // Track when cycles were last modified
}

const initialState: CycleState = {
  cycles: [],
  loading: false,
  error: null,
  pendingSync: {},
  lastModified: {},
};

const cycleSlice = createSlice({
  name: "cycles",
  initialState,
  reducers: {
    // Optimistic updates - immediately update Redux state
    updateCycleOptimistically: (state, action: PayloadAction<Cycle>) => {
      const updatedCycle = action.payload;
      const index = state.cycles.findIndex(
        (cycle) => cycle.id === updatedCycle.id
      );

      if (index !== -1) {
        state.cycles[index] = updatedCycle;
      } else {
        state.cycles.push(updatedCycle);
      }

      // Increment change count
      state.pendingSync[updatedCycle.id] =
        (state.pendingSync[updatedCycle.id] || 0) + 1;
      state.lastModified[updatedCycle.id] = Date.now();
    },

    updateCyclePhases: (
      state,
      action: PayloadAction<{ cycleId: string; phases: Phase[] }>
    ) => {
      const { cycleId, phases } = action.payload;
      const cycle = state.cycles.find((c) => c.id === cycleId);

      if (cycle) {
        cycle.data.phases = phases;
        // Increment change count
        state.pendingSync[cycleId] = (state.pendingSync[cycleId] || 0) + 1;
        state.lastModified[cycleId] = Date.now();
      }
    },

    updateCycleNote: (
      state,
      action: PayloadAction<{ cycleId: string; note: string }>
    ) => {
      const { cycleId, note } = action.payload;
      const cycle = state.cycles.find((c) => c.id === cycleId);

      if (cycle) {
        cycle.engineer_note = note;
        // Increment change count
        state.pendingSync[cycleId] = (state.pendingSync[cycleId] || 0) + 1;
        state.lastModified[cycleId] = Date.now();
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
        // Increment change count
        state.pendingSync[cycleId] = (state.pendingSync[cycleId] || 0) + 1;
        state.lastModified[cycleId] = Date.now();
      }
    },

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
        // Increment change count
        state.pendingSync[cycleId] = (state.pendingSync[cycleId] || 0) + 1;
        state.lastModified[cycleId] = Date.now();
      }
    },

    markSynced: (state, action: PayloadAction<string>) => {
      const cycleId = action.payload;
      // Reset change count to 0 (or remove entry)
      delete state.pendingSync[cycleId];
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch cycles
      .addCase(fetchCycles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCycles.fulfilled, (state, action) => {
        state.cycles = action.payload;
        state.loading = false;
        // Clear pending sync since we have fresh data
        state.pendingSync = {};
        state.lastModified = {};
      })
      .addCase(fetchCycles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch cycles";
      })
      // Sync to database
      .addCase(syncCycleToDatabase.pending, () => {
        // Optionally show sync status
      })
      .addCase(syncCycleToDatabase.fulfilled, (state, action) => {
        const cycleId = action.meta.arg.id;
        // Reset change count for this cycle
        delete state.pendingSync[cycleId];
        // Update with server response if needed
        const serverCycle = action.payload;
        if (serverCycle) {
          const index = state.cycles.findIndex((c) => c.id === cycleId);
          if (index !== -1) {
            // Merge server response while preserving local changes
            state.cycles[index] = { ...state.cycles[index], ...serverCycle };
          }
        }
      })
      .addCase(syncCycleToDatabase.rejected, (state, action) => {
        // Keep in pending sync on failure, could retry later
        state.error = action.error.message || "Sync failed";
      });
  },
});

export const {
  updateCycleOptimistically,
  updateCyclePhases,
  updateCycleNote,
  addPhaseOptimistically,
  deletePhaseOptimistically,
  markSynced,
  clearError,
} = cycleSlice.actions;

// Selectors
export const selectAllCycles = (state: { cycles: CycleState }) =>
  state.cycles.cycles;
export const selectCycleById = (
  state: { cycles: CycleState },
  cycleId: string
) => state.cycles.cycles.find((cycle) => cycle.id === cycleId);
export const selectPendingSyncCycles = (state: { cycles: CycleState }) =>
  state.cycles.pendingSync;
export const selectCyclesNeedingSync = (state: { cycles: CycleState }) =>
  state.cycles.cycles.filter(
    (cycle) =>
      state.cycles.pendingSync[cycle.id] &&
      state.cycles.pendingSync[cycle.id] > 0
  );

// New selector to get total pending changes count
export const selectTotalPendingChanges = (state: { cycles: CycleState }) =>
  Object.values(state.cycles.pendingSync).reduce(
    (total, count) => total + count,
    0
  );

export default cycleSlice.reducer;
