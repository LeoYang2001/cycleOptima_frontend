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
import { FolderOpen, Check, Settings } from "lucide-react";
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
import type { Cycle } from "../../types/common/Cycle";

const LOCAL_CYCLES_PATH_KEY = "cycleOptima_local_cycles_path";

function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const { decibelLevel, startDetection } = useDecibelDetector();
  const { session, setSession } = useSessionContext();
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef<string | null>(null);

  const [isHome, setIsHome] = useState(true);
  const [localCyclesPath, setLocalCyclesPath] = useState<string>("");
  const [showPathModal, setShowPathModal] = useState(false);

  // Get state from Redux instead of local state
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

      console.log(directoryHandle);

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

  // Function to manually edit path
  const editCyclesPath = () => {
    const newPath = prompt(
      "Enter the full path to your cycles directory:",
      localCyclesPath || "C:\\Users\\labview\\Desktop\\Leo\\cycleOptima\\cycles"
    );

    if (newPath && newPath.trim()) {
      localStorage.setItem(LOCAL_CYCLES_PATH_KEY, newPath.trim());
      setLocalCyclesPath(newPath.trim());
      setShowPathModal(false);
      alert("Cycles directory path updated!");
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

      {/* Cycles Directory Indicator */}
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
        className="flex items-center gap-3  transition-all duration-800"
      >
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
                <button
                  onClick={selectLocalCyclesDirectory}
                  className="w-full p-3 rounded-lg border border-blue-600/30 bg-blue-900/20 text-blue-300 hover:bg-blue-800/30 transition-colors text-left"
                >
                  <div className="font-medium">Browse & Select Directory</div>
                  <div className="text-xs text-blue-400/70 mt-1">
                    Use file picker to select directory
                  </div>
                </button>

                {/* <button
                  onClick={editCyclesPath}
                  className="w-full p-3 rounded-lg border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="font-medium">Manually Enter Path</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Type the directory path directly
                  </div>
                </button> */}

                {localCyclesPath && (
                  <button
                    onClick={clearCyclesPath}
                    className="w-full p-3 rounded-lg border border-red-600/30 bg-red-900/20 text-red-300 hover:bg-red-800/30 transition-colors text-left"
                  >
                    <div className="font-medium">Clear Directory</div>
                    <div className="text-xs text-red-400/70 mt-1">
                      Remove saved directory path
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPathModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
