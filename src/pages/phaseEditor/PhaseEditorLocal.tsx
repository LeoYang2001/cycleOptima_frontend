import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Code, Eye, Save } from "lucide-react";
import Section from "../../components/common/Section";
import PhaseConfiguration from "../../components/phaseEditor/PhaseConfiguration";
import ComponentTimeline from "../../components/phaseEditor/ComponentTimeline";
import ComponentLibrary from "../../components/phaseEditor/ComponentLibrary";
import ComponentEditor from "../../components/phaseEditor/ComponentEditor";
import SensorTriggerModal from "../../components/phaseEditor/SensorTriggerModal";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Modifier } from "@dnd-kit/core";
import type { CycleComponent } from "../../types/common/CycleComponent";
import type { SensorTrigger } from "../../types/common/Phase";
import { LIBRARY_COMPONENTS } from "../../lib/libraryComponents";

interface LocalCycle {
  id: string;
  displayName: string;
  status: "draft" | "tested" | "production";
  created_at: string;
  updated_at: string;
  tested_at?: string;
  engineer_note: string;
  summary: string;
  data: {
    phases: any[];
  };
}

function PhaseEditorLocal() {
  const { cycleId, phaseId } = useParams<{ cycleId: string; phaseId: string }>();
  const navigate = useNavigate();

  // View mode state
  const [viewMode, setViewMode] = useState<"editor" | "json">("editor");
  
  // Cycle and phase data
  const [cycle, setCycle] = useState<LocalCycle | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  
  // Phase editor states
  const [phaseName, setPhaseName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [components, setComponents] = useState<any[]>([]);
  const [sensorTrigger, setSensorTrigger] = useState<SensorTrigger | null>(null);
  
  // UI states
  const [isDragging, setIsDragging] = useState(false);
  const [initialDragPosition, setInitialDragPosition] = useState<{
    x: number;
    distanceToRightBorder: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<CycleComponent | null>(null);

  // Load cycle and phase from localStorage
  useEffect(() => {
    if (cycleId && phaseId) {
      const localCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
      const foundCycle = localCycles.find((c: LocalCycle) => c.id === cycleId);
      
      if (foundCycle) {
        setCycle(foundCycle);
        setJsonInput(JSON.stringify(foundCycle, null, 2));
        
        const phase = foundCycle.data.phases.find((p: any) => p.id === phaseId);
        if (phase) {
          setPhaseName(phase.name || "");
          setStartTime(phase.startTime || 0);
          setComponents(phase.components || []);
          setSensorTrigger(phase.sensorTrigger || null);
        }
      }
    }
  }, [cycleId, phaseId]);

  // Update local state when switching from JSON mode
  useEffect(() => {
    if (cycle && viewMode === "editor") {
      const phase = cycle.data.phases.find((p: any) => p.id === phaseId);
      if (phase) {
        setPhaseName(phase.name || "");
        setStartTime(phase.startTime || 0);
        setComponents(phase.components || []);
        setSensorTrigger(phase.sensorTrigger || null);
      }
    }
  }, [cycle, phaseId, viewMode]);

  useEffect(() => {
      if (selectedComponent) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    }, [selectedComponent]);
  

  const phase = cycle?.data.phases.find((p: any) => p.id === phaseId);

  
  // Check if changes have been made (editor mode)
  const hasChanges = phase && (
    phaseName !== (phase?.name || "") ||
    startTime !== (phase?.startTime || 0) ||
    JSON.stringify(components) !== JSON.stringify(phase?.components || []) ||
    JSON.stringify(sensorTrigger) !== JSON.stringify(phase?.sensorTrigger || null)
  );


  // Save cycle to localStorage
  const saveCycle = (updatedCycle: LocalCycle) => {
    const localCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
    const index = localCycles.findIndex((c: LocalCycle) => c.id === updatedCycle.id);
    
    if (index !== -1) {
      localCycles[index] = updatedCycle;
    } else {
      localCycles.push(updatedCycle);
    }
    
    localStorage.setItem('localCycles', JSON.stringify(localCycles));
    setCycle(updatedCycle);
  };

  // Handle JSON save
  const handleSaveJson = () => {
    try {
      const parsedCycle = JSON.parse(jsonInput);
      parsedCycle.updated_at = new Date().toISOString();
      saveCycle(parsedCycle);
      alert('Cycle saved locally!');
    } catch (error) {
      alert('Invalid JSON format. Please check your syntax.');
    }
  };

  // Handle editor save - add keyboard shortcut support
 
  // Handle editor save
  const handleSaveChanges = () => {
    if (!cycle || !phase) {
      alert("Cycle or phase not found. Cannot save changes.");
      return;
    }

    if (selectedComponent) {
      alert("Please close the component editor before saving phase changes.");
      return;
    }

    if (!phaseName.trim()) {
      alert("Phase name cannot be empty. Please enter a valid phase name.");
      return;
    }

    // Validate components
    const invalidComponents = components.filter(comp => 
      !comp.compId || comp.duration <= 0 || comp.start < 0
    );

    if (invalidComponents.length > 0) {
      alert("Some components have invalid configuration. Please check component settings.");
      return;
    }

    // Open sensor trigger modal for final configuration
    setShowSensorModal(true);
  };

  // Handle final save after sensor configuration
  const handleFinalSave = (finalSensorTrigger: SensorTrigger | null) => {
    if (!cycle || !phase) return;

    const updatedPhases = cycle.data.phases.map((p: any) =>
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

    const updatedCycle = {
      ...cycle,
      updated_at: new Date().toISOString(),
      data: {
        ...cycle.data,
        phases: updatedPhases,
      },
    };

    saveCycle(updatedCycle);
    setJsonInput(JSON.stringify(updatedCycle, null, 2));
    navigate(-1);
  };

  // Download cycle as JSON
  const handleDownload = () => {
    if (!cycle) return;
    
    const blob = new Blob([JSON.stringify(cycle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
    a.href = url;
    a.download = `${cycle.displayName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Drag and drop handlers
  const restrictRightDragging: Modifier = ({ transform }) => {
    if (!initialDragPosition) return transform;
    const maxRightMovement = initialDragPosition.distanceToRightBorder - 20;
    const constrainedX = Math.min(transform.x, maxRightMovement);
    return { ...transform, x: constrainedX };
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
    const libraryComponent = LIBRARY_COMPONENTS.find(
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
        <div className="absolute inset-0 bg-black opacity-80" onClick={onClose}></div>
        <div
          style={{
            width: "60%",
            height: selectedComponent?.compId.startsWith("Motor") ? "80%" : "30%",
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

  if (!cycle || !phase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Local cycle or phase not found</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-4">
         
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Andale Mono, monospace" }}>
              Phase Editor (Local)
            </h1>
            <p className="text-gray-400 text-sm">
              Configure components and timing for "{phase?.name || "Unknown Phase"}" - Offline Mode - {JSON.stringify(selectedComponent)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
         

          

          {/* Changes indicator / Save button */}
          {viewMode === "editor" ? (
            hasChanges ? (
              <div onClick={handleSaveChanges} className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-300 text-sm font-medium">Unsaved changes</span>
                </div>
                <span className="text-yellow-400 text-xs opacity-70">Click</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-300 text-sm font-medium">All changes saved</span>
              </div>
            )
          ) : (
            <div
              onClick={handleSaveJson}
              className="flex items-center gap-2 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2 hover:bg-green-800/30 transition-colors text-green-300"
            >
              <Save size={16} />
              Save JSON
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      {viewMode === "json" ? (
        <div className="flex-1 p-4">
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-full bg-black border border-gray-600 rounded p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500"
            placeholder="Edit cycle JSON..."
          />
        </div>
      ) : (
        <DndContext
          modifiers={[restrictRightDragging]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
              <Section title="Component Library (Local)">
                <ComponentLibrary
                setSelectedComponent={setSelectedComponent}
                libraryComponents={LIBRARY_COMPONENTS}
                isLoading={false}
              />
              </Section>
            </div>
          </section>
        </DndContext>
      )}

      {/* Modals */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedComponent(null); }}>
        <ComponentEditor
          setComponents={setComponents}
          component={selectedComponent}
          onClose={() => { setShowModal(false); setSelectedComponent(null); }}
        />
      </Modal>

      <SensorTriggerModal
        isOpen={showSensorModal}
        onClose={() => setShowSensorModal(false)}
        onSave={handleFinalSave}
        currentTrigger={sensorTrigger}
      />

      {/* Offline indicator */}
      <div className="mx-4 mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-300 text-sm">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span>
            Offline Mode: Changes are saved locally and will not sync with the server until connection is restored.
          </span>
        </div>
      </div>
    </div>
  );
}

export default PhaseEditorLocal;