import MainLayout from "./MainLayout";
import AiAssistant from "./pages/aiAssistant/AiAssistant";
import CycleManager from "./pages/cycleManager/CycleManager";
import Home from "./pages/Home";
import { Route, BrowserRouter, Routes, Navigate } from "react-router-dom";
import SystemMonitor from "./pages/monitor/SystemMonitor";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";
import { useEffect } from "react";
import { fetchAllCycles } from "./store/cycleSlice";
import { fetchLibrary } from "./store/librarySlice";
import { io } from "socket.io-client";
import CycleDetail from "./pages/cycleDetail/CycleDetail";
import PhaseEditor from "./pages/phaseEditor/PhaseEditor";
import "./utils/testSocket"; // Import test utility
import { API_CONFIG, getNgrokHeaders } from "./config/api";
import DeviceGuard from "./components/common/DeviceGuard";
import { websocketManager } from "./store/websocketSlice";
import CycleDetailLocal from "./pages/cycleDetail/CycleDetailLocal";
import PhaseEditorLocal from "./pages/phaseEditor/PhaseEditorLocal";



function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchAllCycles());
    dispatch(fetchLibrary());

    const socket = io(API_CONFIG.BASE_URL, {
      transports: ["websocket", "polling"],
      extraHeaders: getNgrokHeaders(),
    });

    // Connection event handlers
    socket.on("connect", () => {
      console.log("✅ Socket.io connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket.io disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("🔥 Socket.io connection error:", error);
    });

  

    socket.on("cycle_created", () => {
      console.log("🆕 Received cycle_created event, refetching cycles...");
      dispatch(fetchAllCycles()); // Refetch when notified
    });

    socket.on("cycle_deleted", () => {
      console.log("🗑️ Received cycle_deleted event, refetching cycles...");
      dispatch(fetchAllCycles()); // Refetch when notified
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  // Initialize WebSocket connection when app starts
  useEffect(() => {
    console.log("Initializing WebSocket connection...");
    websocketManager.initialize(dispatch);

    // Cleanup on app unmount
    return () => {
      websocketManager.disconnect();
    };
  }, [dispatch]);

  return (
    <DeviceGuard>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="cycle-manager" element={<CycleManager />} />
            <Route path="ai-assistant" element={<AiAssistant />} />
            <Route path="system-monitor" element={<SystemMonitor />} />
            <Route path="/cycle/:id" element={<CycleDetail />} />
            <Route path="/cycle/:id/phase/:phaseId" element={<PhaseEditor />} />
            {/* Catch-all route - redirect any unmatched routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/cycle-local/:id" element={<CycleDetailLocal />} />
            <Route path="/cycle-local/:cycleId/phase/:phaseId" element={<PhaseEditorLocal />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DeviceGuard>
  );
}

export default App;
