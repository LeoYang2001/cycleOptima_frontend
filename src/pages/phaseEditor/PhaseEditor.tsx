import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import type { RootState, AppDispatch } from "../../store";
import {
  selectCycleById,
  updateCycleOptimistically,
} from "../../store/cycleSlice";
import { useAutoSync } from "../../hooks/useAutoSync";
import Section from "../../components/common/Section";
import PhaseConfiguration from "../../components/phaseEditor/PhaseConfiguration";
import { Save, ArrowLeft } from "lucide-react";
import ComponentTimeline from "../../components/phaseEditor/ComponentTimeline";

function PhaseEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Extract both cycle id and phase id from the URL parameters
  const { id: cycleId, phaseId } = useParams<{
    id: string;
    phaseId: string;
  }>();

  // Set up auto-sync to track pending changes (but disabled for manual control)
  const { pendingCount } = useAutoSync({
    enabled: false, // Disable auto-sync for manual control
    debounceMs: 1500,
  });

  // Handle cases where parameters might be undefined
  if (!cycleId || !phaseId) {
    return (
      <div className="text-red-500">
        Error: Missing cycle ID or phase ID in URL
      </div>
    );
  }

  const cycle = useSelector((state: RootState) =>
    selectCycleById(state, cycleId!)
  );
  const phase = cycle?.data.phases.find((p) => p.id === phaseId);

  const [phaseName, setPhaseName] = useState(phase?.name || "");
  const [startTime, setStartTime] = useState(phase?.startTime || 0);
  const [components, setComponents] = useState(phase?.components || []);

  // Check if changes have been made
  const hasChanges =
    phaseName !== (phase?.name || "") || startTime !== (phase?.startTime || 0);

  // Handle save changes
  const handleSaveChanges = () => {
    if (!cycle || !phase || !hasChanges) return;

    // Validate phase name is not empty
    if (!phaseName.trim()) {
      alert("Phase name cannot be empty. Please enter a valid phase name.");
      return;
    }

    // Update the phase in the cycle
    const updatedPhases = cycle.data.phases.map((p) =>
      p.id === phaseId ? { ...p, name: phaseName, startTime: startTime } : p
    );

    // Update cycle with modified phase (optimistic update)
    dispatch(
      updateCycleOptimistically({
        ...cycle,
        data: {
          ...cycle.data,
          phases: updatedPhases,
        },
      })
    );

    // Navigate back to previous page
    navigate(-1);
  };

  // Add keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSaveChanges();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, handleSaveChanges]);

  return (
    <div className="w-full h-full flex flex-col">
      <header className="flex flex-row items-center justify-between px-4 py-6 border-b border-gray-800">
        <div className="flex flex-row items-center gap-4">
          <div className="flex flex-col justify-center items-start">
            <span
              className="text-3xl font-bold text-white"
              style={{
                color: "#fff",
                fontFamily: "Andale Mono, monospace",
              }}
            >
              Phase Editor
            </span>
            <span className="text-gray-400 text-sm">
              Configure components and timing for "
              {phase?.name || "Unknown Phase"}"
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Changes indicator */}
          {hasChanges ? (
            <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-300 text-sm font-medium">
                  Unsaved changes
                </span>
              </div>
              <span className="text-yellow-400 text-xs opacity-70">Ctrl+S</span>
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
      </header>

      <section className="flex-1 overflow-y-auto gap-10  py-10  flex flex-row">
        <div className="w-[70%] flex flex-col gap-10 ">
          <Section title="Phase Configuration">
            <PhaseConfiguration
              phaseName={phaseName}
              setPhaseName={setPhaseName}
              startTime={startTime}
              setStartTime={setStartTime}
            />
          </Section>
          <Section title="Component Timeline">
            <ComponentTimeline
              components={components}
              setComponents={setComponents}
            />
          </Section>
        </div>
        <div className="w-[30%]   ">
          <Section title="Phase Details">demo</Section>
        </div>
      </section>
    </div>
  );
}

export default PhaseEditor;
