import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchLibraryComponents } from "../apis/library";
import type { CycleComponent } from "../types/common/CycleComponent";

export const fetchLibrary = createAsyncThunk("library/fetchAll", async () => {
  return await fetchLibraryComponents();
});

interface LibraryState {
  components: CycleComponent[];
  loading: boolean;
  error: string | null;
}

const initialState: LibraryState = {
  components: [],
  loading: false,
  error: null,
};

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLibrary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLibrary.fulfilled, (state, action) => {
        state.loading = false;
        state.components = action.payload;
      })
      .addCase(fetchLibrary.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch library components";
      });
  },
});

export const { clearError } = librarySlice.actions;

// Selectors
export const selectAllLibraryComponents = (state: { library: LibraryState }) =>
  state.library.components;
export const selectLibraryLoading = (state: { library: LibraryState }) =>
  state.library.loading;
export const selectLibraryError = (state: { library: LibraryState }) =>
  state.library.error;
export const selectLibraryComponentById = (
  state: { library: LibraryState },
  componentId: string
) => state.library.components.find((component) => component.id === componentId);

export default librarySlice.reducer;
