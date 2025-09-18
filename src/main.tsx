import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import { persistor, store } from "./store";
import "./index.css";
import { SessionProvider } from "./voiceAgent/session/sessionManager";
import { PersistGate } from "redux-persist/integration/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <SessionProvider>
          <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
            <App />
        </PersistGate>
      </SessionProvider>
    </Provider>
  </React.StrictMode>
);
