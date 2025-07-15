import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { useParams } from "react-router-dom";
import type { Cycle } from "../../types/common/Cycle";
import Button from "../../components/common/Button";
import { Logs, Pencil, Play, SaveIcon } from "lucide-react";
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

  // Get cycle from Redux store
  const cycle = useSelector((state: RootState) => selectCycleById(state, id!));

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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingCount, handleSave]);

  // Reset saving state when all changes are saved
  useEffect(() => {
    if (pendingCount === 0 && isSaving) {
      setIsSaving(false);
    }
  }, [pendingCount, isSaving]);

  // NOW we can do conditional returns after all hooks are declared
  if (!cycle) {
    return <div className="text-red-500">Cycle not found</div>;
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

  // Add phase (optimistic update)
  const addPhase = () => {
    const newPhase = {
      id: Date.now().toString(),
      name: "Untitled",
      color: "ccc",
      startTime: 10000,
      components: [],
    };

    dispatch(
      addPhaseOptimistically({
        cycleId: cycle.id,
        phase: newPhase,
      })
    );
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
    <div className=" w-full h-full  flex flex-col">
      <header className="relative  mb-16">
        <div className=" flex flex-row justify-between items-center  px-4 py-2">
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
      <section className="flex-1  flex flex-row gap-10 pb-10 w-full ">
        <div className=" flex flex-col gap-10 w-[70%] h-full ">
          <div className=" ">
            {" "}
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
          <div className=" flex-1 ">
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
            height: "50%",
          }}
          className=" flex-1 flex flex-col gap-10 "
        >
          <Section title="Cycle Summary">
            <CycleSummary cycle={cycle} />
          </Section>
        </div>
      </section>
      {/* Render more details here */}
    </div>
  );
}
export default CycleDetail;
