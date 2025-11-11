import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Logs, Play, X, Palette, Monitor, Download } from "lucide-react";
import Note from "../../components/cycleDetail/Note";
import Section from "../../components/common/Section";
import CycleTimeLinePreview from "../../components/common/CycleTimeLinePreview";
import PhaseBreakdown from "../../components/cycleDetail/PhaseBreakdown";
import CycleSummary from "../../components/cycleDetail/CycleSummary";

import { websocketManager, selectWebSocketConnected } from '../../store/websocketSlice';
import { updateCycle } from "../../store/cycleSlice";
import { writeJSON } from "../../store/washerSlice";

function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
 


  // Try to get cycle from Redux
  const cycles = useSelector((state: RootState) => state.cycles.cycles);

  const cycle = cycles.find(cycle => cycle.id === id);
  const cyclesLoading = useSelector((state: RootState) => state.cycles.loading);
 

  // Local UI state (non-persisted) - MUST be declared before any conditional returns
  const [cycleName, setCycleName] = useState(cycle?.displayName || "");
  const [inputFocus, setInputFocus] = useState(false);
  const [engineer_note, setEngineer_note] = useState(
    cycle?.engineer_note || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [flashCompleted, setFlashCompleted] = useState(false);

  // Phase creation modal state
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseColor, setNewPhaseColor] = useState("4ADE80");

  
const [isRedirecting, setIsRedirecting] = useState(false);

  // Get WebSocket connection status from Redux
  const wsConnected = useSelector(selectWebSocketConnected);



  // Manual run trigger (for run shortcut) - now runs directly
  const handleRun = async () => {
    if (!cycle) return;
    executeRun();
  };

  // Navigate to monitor with cycle data
  const handleMonitor = () => {
    if (!cycle) return;

    // Navigate to monitor page with cycle data as state
    navigate("/system-monitor", {
      state: {
        cycleData: cycle,
        timestamp: Date.now(),
      },
    });
  };

 const executeRun = async () => {
    console.log('executing run...', cycle);
    try {
      if (!cycle) return;
      if (!wsConnected) {
        alert('Not connected to system. Please check your connection and try again.');
        return;
      }

      setIsRunning(true);
      setFlashCompleted(false);

      // Use writeJSON from washerSlice to flash the cycle data
      const success = dispatch(writeJSON(cycle.data));

      if (!success) {
        setIsRunning(false);
        setFlashCompleted(false);
        alert('Failed to flash cycle data. WebSocket not connected.');
        return;
      }

      // Update cycle status to "tested" in the database
      dispatch(updateCycle({
        id: cycle.id,
        updates: { 
          status: "tested",
          tested_at: new Date().toISOString()
        }
      }));

      // Simulate flash completion (you can adjust timing as needed)
      setTimeout(() => {
        setIsRunning(false);
        setFlashCompleted(true);
        
        setIsRedirecting(true);

        // Navigate to monitor page after a brief delay
        setTimeout(() => {
          console.log('Navigating to monitor page with cycle data');
          navigate("/system-monitor", {
            state: {
              cycleData: {
                ...cycle,
                status: "tested",
                tested_at: new Date().toISOString()
              },
              timestamp: Date.now(),
              autoStarted: true,
              flashSuccess: true
            },
          });

          setIsRedirecting(false);
        }, 1500);

      }, 2000); // 2 second flash simulation

    } catch (error) {
      console.error("Run failed:", error);
      setIsRunning(false);
      setFlashCompleted(false);
      alert(`Failed to run cycle: ${(error as Error).message}`);
    }
  };
  // Cleanup message handler when component unmounts
  useEffect(() => {
    return () => {
      websocketManager.unregisterMessageHandler('cycleRun');
    };
  }, []);

  // Download cycle data as JSON
  const handleDownload = async () => {
    if (!cycle) return;

    try {
      // Create the JSON data to download in the exact format as your file
      const cycleData = {
        id: cycle.id,
        displayName: cycle.displayName,
        data: cycle.data, // This contains name and phases
        created_at: cycle.created_at,
        updated_at: cycle.updated_at,
        engineer_note: cycle.engineer_note,
        status: cycle.status,
        summary: cycle.summary,
        tested_at: cycle.tested_at
      };

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(cycleData, null, 2);
      
      // Create a blob with the JSON data
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Check if File System Access API is available (Chrome/Edge)
      if ('showSaveFilePicker' in window) {
        try {
          // Use modern File System Access API
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: `${cycle.displayName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}Z.json`,
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          alert(`Cycle "${cycle.displayName}" saved successfully!`);
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Failed to save file:', error);
            // Fallback to traditional download
            fallbackDownload(blob, cycle.displayName);
          }
        }
      } else {
        // Fallback for browsers that don't support File System Access API
        fallbackDownload(blob, cycle.displayName);
      }
    } catch (error) {
      console.error('Failed to download cycle:', error);
      alert(`Failed to download cycle: ${(error as Error).message}`);
    }
  };


  // Sync local state with Redux state when cycle changes
  useEffect(() => {
    if (cycle) {
      setCycleName(cycle.displayName);
      setEngineer_note(cycle.engineer_note || "");
    }
  }, [cycle?.displayName, cycle?.engineer_note]);

  // Add keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        if (!isRunning && !flashCompleted) {
          handleRun();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        if (flashCompleted) {
          handleMonitor();
        }
      }
      // Add download shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (!isRunning) {
          handleDownload();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, flashCompleted, handleRun, handleMonitor, handleDownload]);

  

  // Check if cycle exists and redirect to home if not found (after cycles are loaded)
  useEffect(() => {
    // if (!cyclesLoading && cycles.length > 0 && !cycle && id) {
    //   console.log(`Cycle with ID ${id} not found, redirecting to home`);
    //   navigate("/", { replace: true });
    // }
  }, [cycle, cycles, cyclesLoading, id, navigate]);


  // Fallback function for traditional downloads
  const fallbackDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    a.href = url;
    a.download = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`Cycle "${fileName}" downloaded to your default downloads folder!`);
  };

  // NOW we can do conditional returns after all hooks are declared
  if (!cycle) {
    // This will trigger the useEffect above to redirect to home
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cycle not found, redirecting...</div>
        <div>{JSON.stringify(cycles.length)}</div>
      </div>
    );
  }

  // Update cycle name in Redux (optimistic)
const updateCycleName = async (newName: string) => {
    if (!cycle) return;
    
    setCycleName(newName);
    try {
      await dispatch(updateCycle({
        id: cycle.id,
        updates: { displayName: newName }
      })).unwrap();
    } catch (error) {
      console.error('Failed to update cycle name:', error);
      // Revert local state on error
      setCycleName(cycle.displayName);
    }
  };

    const handleClosePhaseModal = () => {
    setShowPhaseModal(false);
    setNewPhaseName("");
    setNewPhaseColor("4ADE80");
  };

  // Update engineer note in Redux (optimistic)
 const updateEngineerNote = async (newNote: string) => {
    if (!cycle) return;
    
    setEngineer_note(newNote);
    try {
      await dispatch(updateCycle({
        id: cycle.id,
        updates: { engineer_note: newNote }
      })).unwrap();
    } catch (error) {
      console.error('Failed to update engineer note:', error);
      // Revert local state on error
      setEngineer_note(cycle.engineer_note || "");
    }
  };
  // Add phase (open modal)
  const addPhase = () => {
    setShowPhaseModal(true);
  };

  // Handle phase creation from modal
   const handleCreatePhase = async () => {
    if (!newPhaseName.trim() || !cycle) {
      alert("Phase name cannot be empty. Please enter a valid phase name.");
      return;
    }

    const newPhase = {
      id: Date.now().toString(),
      name: newPhaseName.trim(),
      color: `${newPhaseColor}`,
      startTime: 10000,
      components: [],
    };

    const updatedPhases = [...cycle.data.phases, newPhase];

    try {
      await dispatch(updateCycle({
        id: cycle.id,
        updates: {
          data: {
            ...cycle.data,
            phases: updatedPhases
          }
        }
      })).unwrap();

      // Reset modal state on success
      setShowPhaseModal(false);
      setNewPhaseName("");
      setNewPhaseColor("4ADE80");
    } catch (error) {
      console.error('Failed to add phase:', error);
      alert('Failed to add phase. Please try again.');
    }
  };

  const deletePhase = async (phaseId: string) => {
    if (!cycle) return;

    const updatedPhases = cycle.data.phases.filter(phase => phase.id !== phaseId);

    try {
      await dispatch(updateCycle({
        id: cycle.id,
        updates: {
          data: {
            ...cycle.data,
            phases: updatedPhases
          }
        }
      })).unwrap();
    } catch (error) {
      console.error('Failed to delete phase:', error);
      alert('Failed to delete phase. Please try again.');
    }
  };

  // Update phases (for drag and drop reordering)
 const updatePhases = async (newPhases: typeof cycle.data.phases) => {
    if (!cycle) return;

    try {
      await dispatch(updateCycle({
        id: cycle.id,
        updates: {
          data: {
            ...cycle.data,
            phases: newPhases
          }
        }
      })).unwrap();
    } catch (error) {
      console.error('Failed to update phases:', error);
      alert('Failed to update phase order. Please try again.');
    }
  };

  // Wrapper for setPhases compatibility with existing components
  const setPhases = (
    updater: React.SetStateAction<typeof cycle.data.phases>
  ) => {
    if (typeof updater === "function") {
      const newPhases = updater(cycle.data.phases);
      updatePhases(newPhases);
    } else {
      updatePhases(updater);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden ">
      <header className="relative mb-16">
        <div className="flex flex-row justify-between items-center px-4 py-2">
          <input
            value={cycleName}
            onChange={(e) => {
              updateCycleName(e.target.value);
            }}
            onFocus={() => {
              setInputFocus(true);
            }}
            onBlur={() => {
              setInputFocus(false);
            }}
            className="w-[40%] transition-all duration-200"
            style={{
              color: !inputFocus ? "#aaa" : "#fff",
              fontFamily: !inputFocus ? "Andale Mono, monospace" : "sans-serif",
              fontSize: 30,
              fontWeight: 600,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setInputFocus(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <div className="flex items-center gap-4">
            {/* Download Button */}
            {!isRunning && (
              <div
                className="flex items-center gap-3 bg-indigo-900/20 border border-indigo-600/30 rounded-lg px-3 py-2 hover:bg-indigo-800/30 transition-colors cursor-pointer"
                onClick={handleDownload}
              >
                <div className="flex items-center gap-2">
                  <Download className="w-3 h-3 text-indigo-400" />
                  <span className="text-indigo-300 text-sm font-medium">
                    Download JSON
                  </span>
                </div>
                <span className="text-indigo-400 text-xs opacity-70">Ctrl+D</span>
              </div>
            )}

            {/* Run/Monitor Status Indicator */}
            {isRedirecting ? (
              <div className="flex items-center gap-3 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {/* Spinner Animation */}
                  <svg
                    className="animate-spin h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span className="text-green-300 text-sm font-medium">
                    Redirecting to monitor...
                  </span>
                </div>
              </div>
            ) : isRunning ? (
              <div className="flex items-center gap-3 bg-purple-900/20 border border-purple-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-purple-400 animate-pulse" />
                  <span className="text-purple-300 text-sm font-medium">
                    Flashing cycle...
                  </span>
                </div>
              </div>
            ) : flashCompleted ? (
              <div
                className="flex items-center gap-3 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2 hover:bg-green-800/30 transition-colors cursor-pointer"
                onClick={handleMonitor}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-3 h-3 text-green-400" />
                  <span className="text-green-300 text-sm font-medium">
                    Flash completed - Monitor cycle
                  </span>
                </div>
                <span className="text-green-400 text-xs opacity-70">Ctrl+M</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 bg-gray-900/20 border border-gray-600/30 rounded-lg px-3 py-2 hover:bg-gray-800/30 transition-colors cursor-pointer"
                onClick={handleRun}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-300 text-sm font-medium">
                    Ready to run
                  </span>
                </div>
                <span className="text-gray-400 text-xs opacity-70">Ctrl+R</span>
              </div>
            )}

         
          </div>
        </div>
        <div className="flex flex-row absolute left-0 top-16">
          <Note
            engineer_note={cycle.engineer_note || "No notes available"}
            setEngineer_note={updateEngineerNote}
          />
        </div>
      </header>
      <section className="flex-1 flex flex-row gap-10 pb-10 w-full overflow-hidden">
        <div className="flex flex-col gap-10 w-[70%] h-full overflow-hidden">
          <div className="overflow-hidden relative">
            <Section
              icon={Play}
              title="Phases Timeline"
              subtitle="Drag and drop phases to reorder. Phase length represents actual duration."
            >
              <CycleTimeLinePreview
                setPhases={setPhases}
                phases={cycle.data.phases}
                cycle={cycle}
                size="large"
                func={addPhase}
              />
            </Section>
            {/* Mask overlay for CycleTimeLinePreview when running */}
            {isRunning && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg px-6 py-4 flex items-center gap-3">
                  <Play className="w-5 h-5 text-purple-400 animate-pulse" />
                  <div className="text-center">
                    <div className="text-purple-300 font-medium">Cycle is flashing...</div>
                    <div className="text-purple-400 text-sm opacity-80">Navigation disabled during flash operation</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <Section icon={Logs} title="Phase Breakdown">
              <PhaseBreakdown
                deletePhase={deletePhase}
                cycle={cycle}
                Phases={cycle.data.phases}
              />
            </Section>
            {/* Mask overlay for PhaseBreakdown when running */}
            {isRunning && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg px-6 py-4 flex items-center gap-3">
                  <Play className="w-5 h-5 text-purple-400 animate-pulse" />
                  <div className="text-center">
                    <div className="text-purple-300 font-medium">Cycle is flashing...</div>
                    <div className="text-purple-400 text-sm opacity-80">Phase editing disabled during flash operation</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            height: "23vw",
          }}
          className="flex-1 flex flex-col gap-10 overflow-y-auto elegant-scrollbar"
        >
          <Section title="Cycle Summary">
            <CycleSummary cycle={cycle} />
          </Section>
        </div>
      </section>
      {/* Render more details here */}

      {/* Phase Creation Modal */}
      {showPhaseModal && (
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleClosePhaseModal}
        >
          {/* Modal Content */}
          <div
            style={{
              backgroundColor: "#27272a",
            }}
            className="rounded-lg p-6 w-96 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Palette className="text-blue-400" size={20} />
                <h2 className="text-xl font-semibold text-white">
                  Create New Phase
                </h2>
              </div>
              <button
                onClick={handleClosePhaseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Phase Name */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Phase Name
                </label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="Enter phase name..."
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>

              {/* Color Selection */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Phase Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={`#${newPhaseColor}`}
                    onChange={(e) =>
                      setNewPhaseColor(e.target.value.substring(1))
                    }
                    style={{
                      backgroundColor: "#18181b",
                      borderRadius: 4,
                      border: "1px solid #333",
                    }}
                    className="w-12 h-10 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newPhaseColor}
                    onChange={(e) =>
                      setNewPhaseColor(e.target.value.replace("#", ""))
                    }
                    placeholder="4ADE80"
                    style={{
                      backgroundColor: "#18181b",
                      borderRadius: 4,
                      border: "1px solid #333",
                    }}
                    className="flex-1 h-10 bg-transparent text-white p-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Predefined Colors */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Quick Colors
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    "4ADE80", // Green
                    "3B82F6", // Blue
                    "F59E0B", // Yellow
                    "EF4444", // Red
                    "8B5CF6", // Purple
                    "06B6D4", // Cyan
                    "F97316", // Orange
                    "EC4899", // Pink
                    "84CC16", // Lime
                    "6366F1", // Indigo
                    "14B8A6", // Teal
                    "F43F5E", // Rose
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewPhaseColor(color)}
                      className={`w-8 h-8 rounded border-2 ${
                        newPhaseColor === color
                          ? "border-white"
                          : "border-gray-600"
                      } hover:border-gray-400 transition-colors cursor-pointer`}
                      style={{ backgroundColor: `#${color}` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleCreatePhase}
                disabled={!newPhaseName.trim()}
                style={{
                  backgroundColor: "#3b82f6",
                }}
                className="px-4 py-2 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Create Phase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render more details here */}
    </div>
  );
}
export default CycleDetail;
