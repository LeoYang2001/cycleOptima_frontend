import "./App.css";
import MainLayout from "./MainLayout";
import AiAssistant from "./pages/aiAssistant/AiAssistant";
import CycleManager from "./pages/cycleManager/CycleManager";
import Home from "./pages/Home";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import SystemMonitor from "./pages/monitor/SystemMonitor";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";
import { useEffect } from "react";
import { fetchCycles } from "./store/cycleSlice";
import { fetchLibrary } from "./store/librarySlice";
import { io } from "socket.io-client";
import CycleDetail from "./pages/cycleDetail/CycleDetail";
import PhaseEditor from "./pages/phaseEditor/PhaseEditor";

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchCycles());
    dispatch(fetchLibrary());
    const socket = io("http://192.168.10.73:4000");
    socket.on("cycle_updated", () => {
      dispatch(fetchCycles()); // Refetch when notified
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="cycle-manager" element={<CycleManager />} />
          <Route path="ai-assistant" element={<AiAssistant />} />
          <Route path="system-monitor" element={<SystemMonitor />} />
          <Route path="/cycle/:id" element={<CycleDetail />} />
          <Route path="/cycle/:id/phase/:phaseId" element={<PhaseEditor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
