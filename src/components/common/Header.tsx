import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Color } from "../../constants";
import { TextRevealCard } from "../ui/text-reveal-card";
import HaloVisualizer from "../aiAssistant/HaloVisualizer";
import { useDecibelDetector } from "../../hooks/useDecibelDetector";
import VoiceWidget from "../../voiceAgent/voiceFeature/VoiceWidget";
import {
  startAgentSession,
  useSessionContext,
} from "../../voiceAgent/session/sessionManager";
import { FolderOpen, Check, Settings, Wifi, WifiOff, RotateCcw, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import {
  loadCycles,
  setLoading,
  setError,
  setDirectoryPath,
  selectLocalCycles,
  selectLocalCyclesLoading,
  selectLocalCyclesDirectoryPath,
} from "../../store/localCyclesSlice";
import {
  selectWebSocketConnected,
  selectWebSocketConnecting,
  selectWebSocketError,
  selectConnectionAttempts,
  selectMaxReconnectAttempts,
  websocketManager,
  updateWebSocketUrl,
  selectWebSocketUrl
} from "../../store/websocketSlice";
import type { Cycle } from "../../types/common/Cycle";

const LOCAL_CYCLES_PATH_KEY = "cycleOptima_local_cycles_path";

function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const { decibelLevel, startDetection } = useDecibelDetector();
  const { session, setSession } = useSessionContext();
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef<string | null>(null);

  
  // WebSocket connection state from Redux
  const wsConnected = useSelector(selectWebSocketConnected);
  const wsConnecting = useSelector(selectWebSocketConnecting);
  const wsError = useSelector(selectWebSocketError);
  const connectionAttempts = useSelector(selectConnectionAttempts);
  const maxReconnectAttempts = useSelector(selectMaxReconnectAttempts);
  const wsUrl = useSelector(selectWebSocketUrl);

  const [isHome, setIsHome] = useState(true);
  const [localCyclesPath, setLocalCyclesPath] = useState<string>("");
  const [showPathModal, setShowPathModal] = useState(false);
  const [showWsConfigModal, setShowWsConfigModal] = useState(false);
  const [newWsUrl, setNewWsUrl] = useState(wsUrl);

  // Get state from Redux
  const localCycles = useSelector(selectLocalCycles);
  const loadingCycles = useSelector(selectLocalCyclesLoading);
  const savedDirectoryPath = useSelector(selectLocalCyclesDirectoryPath);
  

  // Load saved path from localStorage and Redux
  useEffect(() => {
    const savedPath = localStorage.getItem(LOCAL_CYCLES_PATH_KEY);
    if (savedPath) {
      setLocalCyclesPath(savedPath);
      dispatch(setDirectoryPath(savedPath));
    }
  }, [dispatch]);

  // Save last path
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    startDetection();
  }, []);

  const basePages = ["/cycle-manager", "/ai-assistant", "/system-monitor"];

  const shouldShowHome = basePages.includes(location.pathname);
  const shouldShowBack = location.pathname !== "/" && !shouldShowHome;

  useEffect(() => {
    setIsHome(location.pathname === "/");
  }, [location.pathname]);

  // Function to get WebSocket status display info
  const getWebSocketStatus = () => {
    if (wsConnected) {
      return {
        text: "Connected",
        color: "text-green-300",
        bgColor: "bg-green-900/20",
        borderColor: "border-green-600/30",
        hoverColor: "hover:bg-green-800/30",
        icon: Wifi,
        pulse: false
      };
    } else if (wsConnecting) {
      return {
        text: "Connecting...",
        color: "text-yellow-300",
        bgColor: "bg-yellow-900/20",
        borderColor: "border-yellow-600/30",
        hoverColor: "hover:bg-yellow-800/30",
        icon: Wifi,
        pulse: true
      };
    } else if (wsError) {
      const isMaxRetriesReached = connectionAttempts >= maxReconnectAttempts;
      return {
        text: isMaxRetriesReached ? "Connection Failed" : `Failed (${connectionAttempts}/${maxReconnectAttempts})`,
        color: "text-red-300",
        bgColor: "bg-red-900/20",
        borderColor: "border-red-600/30",
        hoverColor: "hover:bg-red-800/30",
        icon: WifiOff,
        pulse: false
      };
    } else {
      return {
        text: "Disconnected",
        color: "text-gray-300",
        bgColor: "bg-gray-900/20",
        borderColor: "border-gray-600/30",
        hoverColor: "hover:bg-gray-800/30",
        icon: WifiOff,
        pulse: false
      };
    }
  };

  // Function to handle WebSocket reconnection
  const handleReconnect = () => {
    websocketManager.reconnect();
  };

  // Function to load cycles from local directory
  const loadCyclesFromLocalPath = async (directoryPath?: string) => {
    if (!("showDirectoryPicker" in window)) {
      alert(
        "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser."
      );
      return [];
    }

    // Set loading state in Redux
    dispatch(setLoading(true));

    try {
      // Ask user to select the directory (browser security limitation)
      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: "read",
      });

      const cyclesFromDirectory: Cycle[] = [];

      // Read all .json files from the selected directory
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === "file" && name.endsWith(".json")) {
          try {
            console.log(`Reading file: ${name}`);
            const file = await handle.getFile();
            const content = await file.text();
            const cycleData = JSON.parse(content);

            // Add metadata for local cycles
            cycleData.isLocal = true;
            cycleData.localFilePath = name;

            // Ensure required fields exist (with fallbacks for missing data)
            if (!cycleData.id) {
              cycleData.id = `local_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            }
            if (!cycleData.displayName) {
              cycleData.displayName = name.replace(".json", "");
            }
            if (!cycleData.status) {
              cycleData.status = "draft";
            }
            if (!cycleData.created_at) {
              cycleData.created_at = new Date().toISOString();
            }
            if (!cycleData.updated_at) {
              cycleData.updated_at = new Date().toISOString();
            }
            if (!cycleData.engineer_note) {
              cycleData.engineer_note = "Loaded from local file";
            }
            if (!cycleData.data) {
              cycleData.data = { name: cycleData.displayName, phases: [] };
            }
            if (!cycleData.summary) {
              cycleData.summary = null;
            }
            if (!cycleData.tested_at && cycleData.status === "tested") {
              cycleData.tested_at = cycleData.updated_at;
            }

            // Validate that data.phases exists and is an array
            if (!cycleData.data.phases || !Array.isArray(cycleData.data.phases)) {
              cycleData.data.phases = [];
            }

            // Validate each phase structure
            cycleData.data.phases = cycleData.data.phases.map(
              (phase: any, index: number) => ({
                id: phase.id || `phase_${index}`,
                name: phase.name || `Phase ${index + 1}`,
                color: phase.color || "06B6D4",
                startTime: phase.startTime || 0,
                components: Array.isArray(phase.components)
                  ? phase.components.map((comp: any) => ({
                      id: comp.id || `comp_${Date.now()}_${Math.random()
                        .toString(36)
                        .substr(2, 5)}`,
                      label: comp.label || "Component",
                      start: comp.start || 0,
                      compId: comp.compId || "Unknown",
                      duration: comp.duration || 1000,
                      motorConfig: comp.motorConfig || null,
                    }))
                  : [],
              })
            );

            cyclesFromDirectory.push(cycleData as Cycle);
            console.log(`Successfully loaded: ${cycleData.displayName}`);
          } catch (parseError) {
            console.warn(`Failed to parse JSON file ${name}:`, parseError);

            // Show user-friendly error for invalid JSON files
            const shouldContinue = confirm(
              `Failed to parse "${name}" as valid JSON.\n\n` +
                `Error: ${(parseError as Error).message}\n\n` +
                `Continue loading other files?`
            );

            if (!shouldContinue) {
              throw new Error(`Stopped loading due to invalid file: ${name}`);
            }
          }
        }
      }

      // Sort cycles by displayName for consistent ordering
      cyclesFromDirectory.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      // Save cycles to Redux store
      dispatch(loadCycles(cyclesFromDirectory));

      // Console log the actual JavaScript objects array
      console.log("=== LOADED CYCLES FROM HEADER ===");
      console.log("Directory path:", directoryPath);
      console.log("Total cycles loaded:", cyclesFromDirectory.length);
      console.log("Cycles array (full objects):", cyclesFromDirectory);

      // Log each cycle object individually for better inspection
      cyclesFromDirectory.forEach((cycle, index) => {
        console.log(`Cycle ${index + 1}:`, cycle);
      });
      console.log("=== END LOADED CYCLES ===");

      // Show success message with details
      const message =
        `Loaded ${cyclesFromDirectory.length} cycles from directory:\n\n` +
        cyclesFromDirectory
          .map((cycle) => `• ${cycle.displayName} (${cycle.status})`)
          .join("\n");

      if (cyclesFromDirectory.length > 0) {
        alert(message);
      } else {
        alert(
          `No valid JSON cycle files found in the selected directory.\n\nMake sure your directory contains .json files with valid cycle data.`
        );
      }

      return directoryHandle;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as any).name !== "AbortError"
      ) {
        console.error("Failed to load local cycles:", error);
        dispatch(setError(`Failed to load cycles: ${(error as Error).message}`));
        alert(
          `Failed to load cycles from directory: ${directoryPath}\n\nError: ${(error as Error).message}`
        );
      } else {
        console.log("User cancelled directory selection");
        dispatch(setLoading(false));
      }
      return [];
    }
  };

  // Function to select local cycles directory
  const selectLocalCyclesDirectory = async () => {
    if (!("showDirectoryPicker" in window)) {
      alert(
        "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser."
      );
      return;
    }

    try {
      const directoryHandle = await loadCyclesFromLocalPath();

      // Ask user to enter the full path
      const userPath = prompt(
        `Please enter the full path to the "${directoryHandle.name}" directory:\n\n` +
          `Example: C:\\Users\\labview\\Desktop\\Leo\\cycleOptima\\cycles\n\n` +
          `This will be used for reading and writing cycle files.`,
        `C:\\Users\\labview\\Desktop\\Leo\\cycleOptima\\${directoryHandle.name}`
      );

      if (!userPath) {
        alert("Path is required to set the cycles directory.");
        return;
      }

      // Validate path format (basic check)
      if (!userPath.includes("\\") && !userPath.includes("/")) {
        alert("Please enter a valid full path (e.g., C:\\path\\to\\directory)");
        return;
      }

      // Save to localStorage and state
      localStorage.setItem(LOCAL_CYCLES_PATH_KEY, userPath);
      setLocalCyclesPath(userPath);
      setShowPathModal(false);

      alert(`Cycles directory set to: ${userPath}`);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as any).name !== "AbortError"
      ) {
        console.error("Failed to select directory:", error);
        alert("Failed to select directory");
      }
    }
  };

  // Function to clear saved path
  const clearCyclesPath = () => {
    if (
      confirm(
        "Are you sure you want to clear the saved cycles directory path?"
      )
    ) {
      localStorage.removeItem(LOCAL_CYCLES_PATH_KEY);
      setLocalCyclesPath("");
      setShowPathModal(false);
    }
  };

  // Get display name for path (show only last 2 directories)
  const getPathDisplayName = (path: string) => {
    if (!path) return "No directory set";
    const parts = path.split(/[\\\/]/);
    if (parts.length >= 2) {
      return `...\\${parts[parts.length - 2]}\\${parts[parts.length - 1]}`;
    }
    return path;
  };

  const wsStatus = getWebSocketStatus();

  // Add this function to handle IP input
  const handleWsUrlChange = (value: string) => {
    setNewWsUrl(value);
  };

  // Add this function to handle save
  const handleSaveWsConfig = () => {
    // Basic validation for WebSocket URL format
    const wsUrlPattern = /^ws:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+\/ws$/;
    if (!wsUrlPattern.test(newWsUrl)) {
      alert('Please enter a valid WebSocket URL in the format: ws://xxx.xxx.xxx.xxx:xxxx/ws');
      return;
    }
    
    dispatch(updateWebSocketUrl(newWsUrl));
    websocketManager.reconnect();
    setShowWsConfigModal(false);
  };

  return (
    <div
      style={{
        height: "8%",
        minHeight: 90,
        backgroundColor: Color.darkerColor,
        zIndex: 999,
      }}
      className="w-full py-4 flex relative flex-row justify-between px-10 items-center"
    >
      {shouldShowHome ? (
        <Link
          to="/"
          className="hover:transform hover:-translate-y-1 transition-all duration-300"
        >
          <span className="text-lg font-semibold text-white cursor-pointer">
            Home
          </span>
        </Link>
      ) : shouldShowBack ? (
        <div
          className="hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <span className="text-lg font-semibold text-white">Back</span>
        </div>
      ) : (
        <div className="opacity-0">home</div>
      )}

      <div>
        <TextRevealCard
          text="Test. Tweak. Repeat."
          revealText="Master Your Machine"
          textSize={40}
        />
      </div>

      {/* Right side indicators */}
      <div
        style={
          isHome
            ? {
                transform: "translateY(0%)",
              }
            : {
                transform: "translateY(110%)",
              }
        }
        className="flex items-center gap-3 transition-all duration-800"
      >
        {/* WebSocket Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all cursor-pointer ${
            wsStatus.bgColor
          } ${wsStatus.borderColor} ${wsStatus.hoverColor}`}
          onClick={() => setShowWsConfigModal(true)}
          title={
            wsError 
              ? `WebSocket Error: ${wsError}${!wsConnected && !wsConnecting ? ' (Click to configure)' : ''}`
              : `ESP32 Connection: ${wsStatus.text}`
          }
        >
          <wsStatus.icon 
            className={`w-3 h-3 ${wsStatus.color} ${wsStatus.pulse ? 'animate-pulse' : ''}`} 
          />
          <span className={`text-xs font-medium ${wsStatus.color}`}>
            {wsStatus.text}
          </span>
          {!wsConnected && !wsConnecting && (
            <RotateCcw className="w-3 h-3 text-gray-400 ml-1" />
          )}
        </div>

        {/* Path Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all cursor-pointer ${
            localCyclesPath
              ? "bg-green-900/20 border-green-600/30 hover:bg-green-800/30"
              : "bg-yellow-900/20 border-yellow-600/30 hover:bg-yellow-800/30"
          }`}
          onClick={() => setShowPathModal(true)}
          title={localCyclesPath || "Click to set cycles directory"}
        >
          <span
            className={`text-xs font-medium ${
              localCyclesPath ? "text-green-300" : "text-yellow-300"
            }`}
          >
            {getPathDisplayName(localCyclesPath)}
          </span>
        </div>
      </div>

      <div
        className={`absolute transition-all duration-800`}
        style={
          isHome
            ? {
                left: "50%",
                top: "140%",
                transform: "translate(-50%)",
              }
            : {
                left: "95%",
                top: "30%",
                transform: "translateY(-50%)",
              }
        }
      >
        <VoiceWidget
          onWakeWord={() => {
            console.log("wake word detected");
            if (!session) {
              startAgentSession(setSession);
            }
          }}
        />
      </div>

      {/* Path Management Modal */}
      {showPathModal && (
        <div
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          className="fixed inset-0 flex items-center justify-center z-[1000]"
          onClick={() => setShowPathModal(false)}
        >
          <div
            style={{ backgroundColor: "#27272a" }}
            className="rounded-lg p-6 w-96 max-w-md mx-4 border border-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Cycles Directory
            </h2>

            <div className="space-y-4">
              {/* Current Path Display */}
              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">
                  Current Directory:
                </label>
                <div
                  className={`p-3 rounded-lg border text-sm ${
                    localCyclesPath
                      ? "bg-green-900/20 border-green-600/30 text-green-300"
                      : "bg-gray-800 border-gray-600 text-gray-400"
                  }`}
                >
                  {localCyclesPath || "No directory set"}
                </div>
              </div>

              <div className="text-gray-400 text-xs">
                This directory will be used for reading and writing cycle JSON
                files.
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div
                  onClick={selectLocalCyclesDirectory}
                  className="w-full p-3 rounded-lg border border-gray-600/50 bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:border-gray-500/50 transition-colors text-left"
                >
                  <div className="font-medium">Browse & Select Directory</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Use file picker to select directory
                  </div>
                </div>

                {localCyclesPath && (
                  <div
                    onClick={clearCyclesPath}
                    className="w-full p-3 rounded-lg border border-gray-600/50 bg-gray-800/80 text-red-300 hover:bg-red-900/20 hover:border-red-600/30 transition-colors text-left"
                  >
                    <div className="font-medium">Clear Directory</div>
                    <div className="text-xs text-red-400/70 mt-1">
                      Remove saved directory path
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <div
                onClick={() => setShowPathModal(false)}
                className="px-4 py-2 bg-gray-700/80 text-gray-300 rounded hover:bg-gray-600/80 transition-colors border border-gray-600/50"
              >
                Close
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WebSocket Configuration Modal */}
      {showWsConfigModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[1000] bg-black/80"
          onClick={() => setShowWsConfigModal(false)}
        >
          <div
            className="w-[600px] max-w-[95vw] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                WebSocket Configuration
              </h2>
              <div
                onClick={() => setShowWsConfigModal(false)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current URL Display */}
              <div className="space-y-2">
                <label className="block text-gray-400 text-sm font-medium">
                  Current WebSocket URL
                </label>
                <div className="p-3 rounded-lg border text-sm bg-gray-800/50 border-gray-700 text-gray-300 font-mono">
                  {wsUrl}
                </div>
              </div>

              {/* WebSocket URL Input */}
              <div className="space-y-3">
                <label className="block text-gray-400 text-sm font-medium">
                  New WebSocket URL
                </label>
                <input
                  type="text"
                  value={newWsUrl}
                  onChange={(e) => handleWsUrlChange(e.target.value)}
                  placeholder="ws://xxx.xxx.xxx.xxx:xxxx/ws"
                  className="w-full h-12 px-4 bg-gray-800 border border-gray-700 rounded-lg
                           text-gray-100 font-mono text-lg
                           focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                           transition-colors"
                  autoFocus
                />
                <div className="text-gray-500 text-xs">
                  Format: ws://xxx.xxx.xxx.xxx:xxxx/ws (Example: ws://192.168.4.193:8080/ws)
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-gray-900/50">
              <div
                onClick={() => setShowWsConfigModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg
                         border border-gray-700 hover:bg-gray-700
                         transition-colors text-sm font-medium"
              >
                Cancel
              </div>
              <div
                onClick={handleSaveWsConfig}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg
                         border border-indigo-500 hover:bg-indigo-500
                         transition-colors text-sm font-medium"
              >
                Save & Reconnect
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
