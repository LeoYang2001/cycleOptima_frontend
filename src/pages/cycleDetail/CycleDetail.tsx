import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { useParams, useNavigate } from "react-router-dom";
import { Logs, Play, X, Palette } from "lucide-react";
import Note from "../../components/cycleDetail/Note";
import Section from "../../components/common/Section";
import CycleTimeLinePreview from "../../components/common/CycleTimeLinePreview";
import PhaseBreakdown from "../../components/cycleDetail/PhaseBreakdown";
import CycleSummary from "../../components/cycleDetail/CycleSummary";
import { useAutoSync } from "../../hooks/useAutoSync";
import {
  selectCycleById,
  updateCycleOptimistically,
  updateCyclePhases,
  updateCycleNote,
  addPhaseOptimistically,
  deletePhaseOptimistically,
} from "../../store/cycleSlice";

function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Get cycle from Redux store
  const cycle = useSelector((state: RootState) => selectCycleById(state, id!));
  const cycles = useSelector((state: RootState) => state.cycles.cycles);
  const cyclesLoading = useSelector((state: RootState) => state.cycles.loading);

  // Set up auto-sync (disabled for manual control)
  const { pendingCount, triggerSync } = useAutoSync({
    enabled: false, // Disable auto-sync for manual control
    debounceMs: 1500,
  });

  // Local UI state (non-persisted) - MUST be declared before any conditional returns
  const [cycleName, setCycleName] = useState(cycle?.displayName || "");
  const [inputFocus, setInputFocus] = useState(false);
  const [engineer_note, setEngineer_note] = useState(
    cycle?.engineer_note || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Phase creation modal state
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseColor, setNewPhaseColor] = useState("4ADE80");

  // Manual save trigger (for save button) - defined early so useEffect can reference it
  const handleSave = async () => {
    try {
      if (pendingCount === 0 || !cycle) {
        return; // No changes to save or no cycle, do nothing
      }

      setIsSaving(true);
      await triggerSync(cycle.id);

      // Success - isSaving will be reset when pendingCount becomes 0
    } catch (error) {
      console.error("Save failed:", error);
      setIsSaving(false); // Reset loading state on error
      alert(`Failed to save cycle: ${(error as Error).message}`);
    }
  };

  // Manual run trigger (for run shortcut)
  const handleRun = async () => {
    try {
      if (!cycle) {
        return; // No cycle to run
      }

      setIsRunning(true);

      const response = await fetch(
        "https://cycleoptima-production.up.railway.app/api/esp/run-flash",
        // "http://localhost:4000/api/esp/run-flash",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cycleId: cycle.id }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      setIsRunning(false);
    } catch (error) {
      console.error("Run failed:", error);
      setIsRunning(false); // Reset loading state on error
      alert(`Failed to run cycle: ${(error as Error).message}`);
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
        if (pendingCount > 0) {
          handleSave();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        if (!isRunning) {
          handleRun();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingCount, handleSave, isRunning, handleRun]);

  // Reset saving state when all changes are saved
  useEffect(() => {
    if (pendingCount === 0 && isSaving) {
      setIsSaving(false);
    }
  }, [pendingCount, isSaving]);

  // Check if cycle exists and redirect to home if not found (after cycles are loaded)
  useEffect(() => {
    if (!cyclesLoading && cycles.length > 0 && !cycle && id) {
      console.log(`Cycle with ID ${id} not found, redirecting to home`);
      navigate("/", { replace: true });
    }
  }, [cycle, cycles, cyclesLoading, id, navigate]);

  // Show loading state while cycles are being fetched
  if (cyclesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading cycle...</div>
      </div>
    );
  }

  // NOW we can do conditional returns after all hooks are declared
  if (!cycle) {
    // This will trigger the useEffect above to redirect to home
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cycle not found, redirecting...</div>
      </div>
    );
  }

  // Update cycle name in Redux (optimistic)
  const updateCycleName = (newName: string) => {
    setCycleName(newName);
    dispatch(
      updateCycleOptimistically({
        ...cycle,
        displayName: newName,
      })
    );
  };

  // Update engineer note in Redux (optimistic)
  const updateEngineerNote = (newNote: string) => {
    setEngineer_note(newNote);
    dispatch(
      updateCycleNote({
        cycleId: cycle.id,
        note: newNote,
      })
    );
  };

  // Add phase (open modal)
  const addPhase = () => {
    setShowPhaseModal(true);
  };

  // Handle phase creation from modal
  const handleCreatePhase = () => {
    if (!newPhaseName.trim()) {
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

    dispatch(
      addPhaseOptimistically({
        cycleId: cycle.id,
        phase: newPhase,
      })
    );

    // Reset modal state
    setShowPhaseModal(false);
    setNewPhaseName("");
    setNewPhaseColor("4ADE80");
  };

  // Close modal without creating phase
  const handleClosePhaseModal = () => {
    setShowPhaseModal(false);
    setNewPhaseName("");
    setNewPhaseColor("4ADE80");
  };

  // Delete phase (optimistic update)
  const deletePhase = (phaseId: string) => {
    dispatch(
      deletePhaseOptimistically({
        cycleId: cycle.id,
        phaseId: phaseId,
      })
    );
  };

  // Update phases (for drag and drop reordering)
  const updatePhases = (newPhases: typeof cycle.data.phases) => {
    dispatch(
      updateCyclePhases({
        cycleId: cycle.id,
        phases: newPhases,
      })
    );
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
            {/* Run Status Indicator */}
            {isRunning ? (
              <div className="flex items-center gap-3 bg-purple-900/20 border border-purple-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-purple-400 animate-pulse" />
                  <span className="text-purple-300 text-sm font-medium">
                    Running cycle...
                  </span>
                </div>
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

            {/* Save Status Indicator */}
            {isSaving ? (
              <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-spin border border-blue-200"></div>
                  <span className="text-blue-300 text-sm font-medium">
                    Saving changes...
                  </span>
                </div>
              </div>
            ) : pendingCount > 0 ? (
              <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-300 text-sm font-medium">
                    unsaved change{pendingCount > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-yellow-400 text-xs opacity-70">
                  Ctrl+S
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-300 text-sm font-medium">
                  All changes saved
                </span>
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
          <div className="overflow-hidden">
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
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Section icon={Logs} title="Phase Breakdown">
              <PhaseBreakdown
                deletePhase={deletePhase}
                cycle={cycle}
                Phases={cycle.data.phases}
              />
            </Section>
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
    </div>
  );
}
export default CycleDetail;
