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
import { Save, ArrowLeft, X } from "lucide-react";
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
import type { CycleComponent } from "../../types/common/CycleComponent";

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

  const cycle = useSelector((state: RootState) =>
    selectCycleById(state, cycleId!)
  );
  const cycles = useSelector((state: RootState) => state.cycles.cycles);
  const cyclesLoading = useSelector((state: RootState) => state.cycles.loading);
  const phase = cycle?.data.phases.find((p) => p.id === phaseId);

  // Check if cycle or phase exists and redirect if not found
  useEffect(() => {
    if (!cyclesLoading && cycles.length > 0) {
      if (!cycle) {
        console.log(`Cycle with ID ${cycleId} not found, redirecting to home`);
        navigate("/", { replace: true });
      } else if (!phase) {
        console.log(
          `Phase with ID ${phaseId} not found, redirecting to cycle detail`
        );
        navigate(`/cycle/${cycleId}`, { replace: true });
      }
    }
  }, [cycle, phase, cycles, cyclesLoading, cycleId, phaseId, navigate]);

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

  const libraryComponents = useSelector((state: RootState) =>
    selectAllLibraryComponents(state)
  );
  const isLoading = useSelector((state: RootState) =>
    selectLibraryLoading(state)
  );

  const [phaseName, setPhaseName] = useState(phase?.name || "");
  const [startTime, setStartTime] = useState(phase?.startTime || 0);
  const [components, setComponents] = useState(phase?.components || []);

  const [isDragging, setIsDragging] = useState(false);
  const [initialDragPosition, setInitialDragPosition] = useState<{
    x: number;
    distanceToRightBorder: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [selectedComponent, setSelectedComponent] =
    useState<CycleComponent | null>(null);

  useEffect(() => {
    if (selectedComponent) {
      // Do something with the selected component
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [selectedComponent]);

  const handleRemoveModal = () => {
    setShowModal(false);
    setSelectedComponent(null);
  };

  // Custom modifier to restrict right dragging based on initial position
  const restrictRightDragging: Modifier = ({ transform }) => {
    if (!initialDragPosition) {
      return transform;
    }

    const maxRightMovement = initialDragPosition.distanceToRightBorder - 20; // 20px margin from right edge
    const constrainedX = Math.min(transform.x, maxRightMovement);

    return {
      ...transform,
      x: constrainedX,
    };
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
        {/* Mask/Backdrop */}
        <div
          className="absolute inset-0 bg-black opacity-80"
          onClick={onClose}
        ></div>

        {/* Modal Content */}
        <div
          style={{
            width: "60%",
            height: selectedComponent?.compId.startsWith("Motor")
              ? "80%"
              : "30%",
            borderWidth: 1,
            borderColor: "#333",
          }}
          className="relative bg-black  rounded-lg w-full  z-10"
        >
          {children}
        </div>
      </div>
    );
  };

  // Check if changes have been made
  const hasChanges =
    phaseName !== (phase?.name || "") ||
    startTime !== (phase?.startTime || 0) ||
    JSON.stringify(components) !== JSON.stringify(phase?.components || []);

  // Handle save changes
  const handleSaveChanges = () => {
    if (!cycle || !phase || !hasChanges || selectedComponent) return;

    // Validate phase name is not empty
    if (!phaseName.trim()) {
      alert("Phase name cannot be empty. Please enter a valid phase name.");
      return;
    }

    // Update the phase in the cycle
    const updatedPhases = cycle.data.phases.map((p) =>
      p.id === phaseId
        ? {
            ...p,
            name: phaseName,
            startTime: startTime,
            components: components,
          }
        : p
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

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    // Get the draggable element's position
    const activeElement = event.active;
    console.log("activeElement:", activeElement);
    if (activeElement && activeElement.rect && activeElement.rect.current) {
      const rect = activeElement.rect.current.translated;
      if (rect) {
        const elementRight = rect.left + rect.width;
        const distanceToRightBorder = window.innerWidth - elementRight;
        // Set initial drag position

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
      console.log({ active, over });
      //append active component to the components array
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
    setInitialDragPosition(null); // Reset initial position
  };

  // Handle component deletion
  const handleDeleteComponent = (componentId: string) => {
    setComponents((prev) =>
      prev.filter((component) => component.id !== componentId)
    );

    // If the deleted component was selected, close the modal
    // if (selectedComponent?.id === componentId) {
    //   setSelectedComponent(null);
    //   setShowModal(false);
    // }
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
        <header className="flex flex-row items-center justify-between px-4 py-6 ">
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
                isDragging={isDragging}
                components={components}
                startTime={startTime}
                setComponents={setComponents}
                setSelectedComponent={setSelectedComponent}
                onDeleteComponent={handleDeleteComponent}
              />
            </Section>
          </div>
          <div className="w-[25%] h-[800px] overflow-hidden overflow-y-auto">
            <Section title="Component Library">
              <ComponentLibrary
                setSelectedComponent={setSelectedComponent}
                libraryComponents={libraryComponents}
                isLoading={isLoading}
              />
            </Section>
          </div>
        </section>
      </DndContext>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={handleRemoveModal}>
        <ComponentEditor
          setComponents={setComponents}
          component={selectedComponent}
          onClose={handleRemoveModal}
        />
      </Modal>
    </div>
  );
}

export default PhaseEditor;
