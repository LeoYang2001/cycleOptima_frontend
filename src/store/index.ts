import { configureStore } from "@reduxjs/toolkit";
import cycleReducer from "./cycleSlice";
import libraryReducer from "./librarySlice";

export const store = configureStore({
  reducer: {
    cycles: cycleReducer,
    library: libraryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
