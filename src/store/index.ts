import { configureStore } from "@reduxjs/toolkit";
import { persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web

import cycleReducer from "./cycleSlice";
import libraryReducer from "./librarySlice";
import websocketSlice from './websocketSlice';

const rootPersistConfig = {
  key: "root",
  storage,
  // Only persist specific slices if needed
  blacklist: ["cycles"], // Don't persist regular cycles, only local cycles
};

export const store = configureStore({
  reducer: {
    cycles: cycleReducer,
    library: libraryReducer,
    websocket: websocketSlice, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
