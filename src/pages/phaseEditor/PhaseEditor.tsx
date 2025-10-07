import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import type { RootState, AppDispatch } from "../../store";
import {
  fetchCycleById,
  updateCycle,
  selectCurrentCycle,
  selectCyclesLoading,
  selectCyclesError
} from "../../store/cycleSlice";
import Section from "../../components/common/Section";
import PhaseConfiguration from "../../components/phaseEditor/PhaseConfiguration";
import ComponentTimeline from "../../components/phaseEditor/ComponentTimeline";
import ComponentLibrary from "../../components/phaseEditor/ComponentLibrary";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Modifier } from "@dnd-kit/core";
import {
  selectAllLibraryComponents,
  selectLibraryLoading,
} from "../../store/librarySlice";
import ComponentEditor from "../../components/phaseEditor/ComponentEditor";
import SensorTriggerModal from "../../components/phaseEditor/SensorTriggerModal";
import type { CycleComponent } from "../../types/common/CycleComponent";
import type { SensorTrigger } from "../../types/common/Phase";
import { LIBRARY_COMPONENTS } from "../../lib/libraryComponents";

function PhaseEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Extract both cycle id and phase id from the URL parameters
  const { id: cycleId, phaseId } = useParams<{
    id: string;
    phaseId: string;
  }>();

  // Redux selectors
  const cycles = useSelector((state: RootState) => state.cycles.cycles);
  const cyclesLoading = useSelector(selectCyclesLoading);
  const cyclesError = useSelector(selectCyclesError);
  const libraryComponents =  LIBRARY_COMPONENTS
  const isLoading = false

  // All useState hooks
  const [phaseName, setPhaseName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [components, setComponents] = useState<any[]>([]);
  const [sensorTrigger, setSensorTrigger] = useState<SensorTrigger | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [initialDragPosition, setInitialDragPosition] = useState<{
    x: number;
    distanceToRightBorder: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<CycleComponent | null>(null);

  // Find the cycle and phase
  const cycle = cycles.find(c => c.id === cycleId);
  const phase = cycle?.data?.phases?.find((p) => p.id === phaseId);

  // ALL useEffect hooks
  useEffect(() => {
    if (!cycle && !cyclesLoading) {
      dispatch(fetchCycleById(cycleId!));
    }
  }, [cycle, cycleId, cyclesLoading, dispatch]);

  useEffect(() => {
    if (phase) {
      setPhaseName(phase.name || "");
      setStartTime(phase.startTime || 0);
      setComponents(phase.components || []);
      setSensorTrigger(phase.sensorTrigger || null);
    }
  }, [phase]);

  useEffect(() => {
    if (selectedComponent) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [selectedComponent]);

  useEffect(() => {
    if (!cyclesLoading && cycle) {
      if (!phase) {
        console.log(
          `Phase with ID ${phaseId} not found, redirecting to cycle detail`
        );
        navigate(`/cycle/${cycleId}`, { replace: true });
      }
    } else if (!cyclesLoading && cyclesError && !cycle) {
      console.log(`Cycle with ID ${cycleId} not found, redirecting to home`);
      navigate("/", { replace: true });
    }
  }, [cycle, phase, cyclesLoading, cyclesError, cycleId, phaseId, navigate]);

  // Keyboard shortcut useEffect
  useEffect(() => {
    const hasChanges =
      phaseName !== (phase?.name || "") ||
      startTime !== (phase?.startTime || 0) ||
      JSON.stringify(components) !== JSON.stringify(phase?.components || []) ||
      JSON.stringify(sensorTrigger) !== JSON.stringify(phase?.sensorTrigger || null);

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
  }, [phaseName, startTime, components, sensorTrigger, phase]);

  // ✅ NOW HANDLE CONDITIONAL RETURNS AFTER ALL HOOKS

  // Handle cases where parameters might be undefined
  if (!cycleId || !phaseId) {
    useEffect(() => {
      console.log("Missing cycle ID or phase ID, redirecting to home");
      navigate("/", { replace: true });
    }, [navigate]);

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Invalid URL, redirecting...</div>
      </div>
    );
  }

  // Show loading state while cycles are being fetched
  if (cyclesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show redirecting message if cycle or phase not found
  if (!cycle || !phase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          {!cycle
            ? "Cycle not found, redirecting..."
            : "Phase not found, redirecting..."}
        </div>
      </div>
    );
  }

  // ✅ REST OF YOUR COMPONENT FUNCTIONS

  const handleRemoveModal = () => {
    setShowModal(false);
    setSelectedComponent(null);
  };

  // Custom modifier to restrict right dragging based on initial position
  const restrictRightDragging: Modifier = ({ transform }) => {
    if (!initialDragPosition) {
      return transform;
    }

    const maxRightMovement = initialDragPosition.distanceToRightBorder - 20;
    const constrainedX = Math.min(transform.x, maxRightMovement);

    return {
      ...transform,
      x: constrainedX,
    };
  };

  // Check if changes have been made
  const hasChanges =
    phaseName !== (phase?.name || "") ||
    startTime !== (phase?.startTime || 0) ||
    JSON.stringify(components) !== JSON.stringify(phase?.components || []) ||
    JSON.stringify(sensorTrigger) !== JSON.stringify(phase?.sensorTrigger || null);

  // Handle save changes
  const handleSaveChanges = () => {
    if (!cycle || !phase || !hasChanges || selectedComponent) return;

    if (!phaseName.trim()) {
      alert("Phase name cannot be empty. Please enter a valid phase name.");
      return;
    }

    setShowSensorModal(true);
  };

  // Handle final save after sensor trigger configuration
  const handleFinalSave = async (finalSensorTrigger: SensorTrigger | null) => {
    if (!cycle || !phase) return;

    const updatedPhases = cycle.data.phases.map((p) =>
      p.id === phaseId
        ? {
            ...p,
            name: phaseName,
            startTime: startTime,
            components: components,
            sensorTrigger: finalSensorTrigger === null ? undefined : finalSensorTrigger,
          }
        : p
    );

    try {
      await dispatch(updateCycle({
        id: cycle.id,
        updates: {
          data: {
            ...cycle.data,
            phases: updatedPhases,
          },
        }
      })).unwrap();

      navigate(-1);
    } catch (error) {
      console.error("Failed to save phase changes:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const activeElement = event.active;
    if (activeElement && activeElement.rect && activeElement.rect.current) {
      const rect = activeElement.rect.current.translated;
      if (rect) {
        const elementRight = rect.left + rect.width;
        const distanceToRightBorder = window.innerWidth - elementRight;
        setInitialDragPosition({
          x: rect.left,
          distanceToRightBorder: distanceToRightBorder,
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && over.id === "droppable") {
      const libraryComponent = libraryComponents.find(
        (c) => c.compId === active.id
      );
      if (libraryComponent) {
        const newComponent = {
          ...libraryComponent,
          id: Date.now().toString(),
        };
        setComponents((prev) => [...prev, newComponent]);
      }
    }
    setIsDragging(false);
    setInitialDragPosition(null);
  };

  const handleDeleteComponent = (componentId: string) => {
    setComponents((prev) =>
      prev.filter((component) => component.id !== componentId)
    );
  };

  const autoCreateRetractor = (motorInfo: any) => {
    if (!motorInfo) return;
    let motorStart = motorInfo.start ?? 0;
    const motorDuration = motorInfo.duration ?? 1000;
    let retractorStart = Math.max(0, motorStart - 5000);
    let retractorDuration = motorDuration + (motorStart - retractorStart);

    if (motorStart < 5000) {
      retractorStart = 0;
      retractorDuration = motorDuration + 5000;
      setComponents((prev: any[]) =>
        prev.map((comp) =>
          comp.id === motorInfo.id ? { ...comp, start: 5000 } : comp
        )
      );
      motorStart = 5000;
    }

    const retractorComponent = {
      id: Date.now().toString(),
      compId: "Retractor",
      label: "Retractor",
      start: retractorStart,
      duration: retractorDuration,
    };
    setComponents((prev: any[]) => [...prev, retractorComponent]);
  };

  // Modal component
  const Modal = ({
    isOpen,
    onClose,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black opacity-80"
          onClick={onClose}
        ></div>
        <div
          style={{
            width: "60%",
            height: selectedComponent?.compId.startsWith("Motor")
              ? "80%"
              : "30%",
            borderWidth: 1,
            borderColor: "#333",
          }}
          className="relative bg-black rounded-lg w-full z-10"
        >
          {children}
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ zIndex: 1 }}
    >
      <DndContext
        modifiers={[restrictRightDragging]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <header className="flex flex-row items-center justify-between px-4 py-6">
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
                Configure components and timing for "{phase?.name || "Unknown Phase"}"
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {hasChanges ? (
              <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-300 text-sm font-medium">
                    Unsaved changes
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
        </header>

        <section className="flex-1 overflow-y-auto gap-10 py-10 flex flex-row">
          <div className="w-[70%] flex flex-col gap-10">
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
                isDragging={isDragging}
                components={components}
                startTime={startTime}
                setComponents={setComponents}
                setSelectedComponent={setSelectedComponent}
                onDeleteComponent={handleDeleteComponent}
                autoCreateRetractor={autoCreateRetractor}
              />
            </Section>
          </div>
          <div className="w-[25%] h-[800px] overflow-hidden overflow-y-auto">
            <Section title="Component Library">
              <ComponentLibrary
                setSelectedComponent={setSelectedComponent}
                libraryComponents={libraryComponents}
                isLoading={false}
              />
            </Section>
          </div>
        </section>
      </DndContext>

      <Modal isOpen={showModal} onClose={handleRemoveModal}>
        <ComponentEditor
          setComponents={setComponents}
          component={selectedComponent}
          onClose={handleRemoveModal}
        />
      </Modal>

      <SensorTriggerModal
        isOpen={showSensorModal}
        onClose={() => setShowSensorModal(false)}
        onSave={handleFinalSave}
        currentTrigger={sensorTrigger}
      />
    </div>
  );
}

export default PhaseEditor;
