import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAllWasherCycles } from "../apis/cycles";
import type { Cycle } from "../types/common/Cycle";

export const fetchCycles = createAsyncThunk("cycles/fetchAll", async () => {
  return await fetchAllWasherCycles();
});

type CycleState = {
  cycles: Cycle[];
  loading: boolean;
  error: string | null;
};

const initialState: CycleState = {
  cycles: [],
  loading: false,
  error: null,
};

const cycleSlice = createSlice({
  name: "cycles",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCycles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCycles.fulfilled, (state, action) => {
        state.cycles = action.payload;
        state.loading = false;
      })
      .addCase(fetchCycles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch cycles";
      });
  },
});

export default cycleSlice.reducer;
