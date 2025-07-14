import { configureStore } from "@reduxjs/toolkit";
import cycleReducer from "./cycleSlice";

export const store = configureStore({
  reducer: {
    cycles: cycleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
