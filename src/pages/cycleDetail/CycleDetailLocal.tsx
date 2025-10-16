import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, Edit, Code, Plus, Trash2, Play, Save, Logs } from "lucide-react";
import JsonEditor from "../../components/cycleDetail/JsonEditor";
import Section from "../../components/common/Section";
import CycleTimeLinePreview from "../../components/common/CycleTimeLinePreview";
import PhaseBreakdown from "../../components/cycleDetail/PhaseBreakdown";
import CycleSummary from "../../components/cycleDetail/CycleSummary"; // Add this import
import type { Phase } from "../../types/common/Phase";
import type { LocalCycle } from "../../types/common/LocalCycle";

function CycleDetailLocal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [cycle, setCycle] = useState<LocalCycle | null>(null);
  const [cycleName, setCycleName] = useState("");
  const [engineer_note, setEngineer_note] = useState("");
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseColor, setNewPhaseColor] = useState("4ADE80");
  const [inputFocus, setInputFocus] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Color options for phases
  const colorOptions = [
    { value: "4ADE80", label: "Green", class: "bg-green-400" },
    { value: "F59E0B", label: "Yellow", class: "bg-yellow-500" },
    { value: "EF4444", label: "Red", class: "bg-red-500" },
    { value: "3B82F6", label: "Blue", class: "bg-blue-500" },
    { value: "8B5CF6", label: "Purple", class: "bg-purple-500" },
    { value: "EC4899", label: "Pink", class: "bg-pink-500" },
  ];

 

  // Load cycle from localStorage
  useEffect(() => {
    if (id) {
      const localCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
      const foundCycle = localCycles.find((c: LocalCycle) => c.id === id);
      if (foundCycle) {
        // Ensure the cycle has proper data structure
        const normalizedCycle = {
          ...foundCycle,
          data: {
            ...foundCycle.data,
            phases: Array.isArray(foundCycle.data?.phases) ? foundCycle.data.phases : []
          }
        };
        
        setCycle(normalizedCycle);
        setCycleName(normalizedCycle.displayName);
        setEngineer_note(normalizedCycle.engineer_note || "");
      }
    }
  }, [id]);


   if(!cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-gray-500">Loading local cycle...</div>
      </div>
    );  
  }

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


    // Update phases (for drag and drop reordering)
  const updatePhases = async (newPhases: typeof cycle.data.phases) => {
  if (!cycle) return;

  try {
    // Create updated cycle with new phases
    const updatedCycle = {
      ...cycle,
      data: {
        ...cycle.data,
        phases: Array.isArray(newPhases) ? newPhases : []
      },
      updated_at: new Date().toISOString()
    };

    // Save to localStorage
    saveCycle(updatedCycle);
    
    console.log('Phases updated successfully in localStorage');
    
  } catch (error) {
    console.error('Failed to update phases:', error);
    alert('Failed to update phase order. Please try again.');
  }
};
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


  // Add phase function for CycleTimeLinePreview
  const addPhase = () => {
    setShowPhaseModal(true);
  };

  // Manual save to localStorage with feedback
  const handleSaveToLocal = () => {
    if (!cycle) return;
    
    setSaveStatus('saving');
    
    // Simulate save delay for better UX
    setTimeout(() => {
      const updatedCycle = {
        ...cycle,
        updated_at: new Date().toISOString()
      };
      
      saveCycle(updatedCycle);
      setSaveStatus('saved');
      
      // Reset save status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 500);
  };

  // Update cycle name
  const updateCycleName = (newName: string) => {
    if (!cycle) return;
    
    setCycleName(newName);
    const updatedCycle = {
      ...cycle,
      displayName: newName,
      updated_at: new Date().toISOString()
    };
    saveCycle(updatedCycle);
  };

  // Update engineer note
  const updateEngineerNote = (newNote: string) => {
    if (!cycle) return;
    
    setEngineer_note(newNote);
    const updatedCycle = {
      ...cycle,
      engineer_note: newNote,
      updated_at: new Date().toISOString()
    };
    saveCycle(updatedCycle);
  };

  // Create new phase
  const handleCreatePhase = () => {
    if (!newPhaseName.trim() || !cycle) {
      alert("Phase name cannot be empty. Please enter a valid phase name.");
      return;
    }

    const newPhase: Phase = {
      id: Date.now().toString(),
      name: newPhaseName.trim(),
      color: newPhaseColor,
      startTime: 10000,
      components: [],
    };

    const currentPhases = Array.isArray(cycle.data?.phases) ? cycle.data.phases : [];

    const updatedCycle = {
      ...cycle,
      data: {
        ...cycle.data,
        phases: [...currentPhases, newPhase]
      },
      updated_at: new Date().toISOString()
    };

    saveCycle(updatedCycle);
    setShowPhaseModal(false);
    setNewPhaseName("");
    setNewPhaseColor("4ADE80");
  };

  // Delete phase
  const deletePhase = (phaseId: string) => {
    if (!cycle || !Array.isArray(cycle.data?.phases)) return;
    
    if (confirm("Are you sure you want to delete this phase?")) {
      const updatedCycle = {
        ...cycle,
        data: {
          ...cycle.data,
          phases: cycle.data.phases.filter(phase => phase && phase.id !== phaseId)
        },
        updated_at: new Date().toISOString()
      };
      saveCycle(updatedCycle);
    }
  };

  // Handle JSON save from editor
  const handleJsonSave = (updatedCycle: LocalCycle) => {
    saveCycle(updatedCycle);
    setCycleName(updatedCycle.displayName);
    setEngineer_note(updatedCycle.engineer_note || "");
    setShowJsonEditor(false);
    alert('Cycle updated successfully!');
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

  // Calculate total duration
  const calculateTotalDuration = () => {
    if (!cycle || !cycle.data || !Array.isArray(cycle.data.phases)) {
      return 0;
    }
    
    return cycle.data.phases.reduce((total, phase) => {
      if (!phase || !Array.isArray(phase.components)) {
        return total;
      }
      
      const phaseDuration = phase.components.reduce((phaseTotal: number, comp: any) => {
        if (!comp) return phaseTotal;
        return Math.max(phaseTotal, (comp.start || 0) + (comp.duration || 0));
      }, 0);
      
      return total + phaseDuration;
    }, 0);
  };

  if (!cycle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Local cycle not found</div>
      </div>
    );
  }

  const totalDuration = calculateTotalDuration();

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <header className="flex flex-row items-center justify-between px-4 py-6">
        <div className="flex flex-row items-center gap-4">
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
            className="w-[80%] transition-all duration-200  bg-transparent border-none outline-none"
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
        </div>

        <div className="flex items-center gap-4">
          {/* Status badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
            cycle.status === 'draft' 
              ? 'bg-gray-900/30 text-gray-300 border-gray-600/30'
              : cycle.status === 'tested'
              ? 'bg-green-900/30 text-green-300 border-green-600/30'
              : 'bg-blue-900/30 text-blue-300 border-blue-600/30'
          }`}>
            {cycle.status.toUpperCase()}
          </div>

          {/* Download button */}
          <div
            onClick={handleDownload}
            className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-600/30 rounded-lg px-3 py-2 hover:bg-indigo-800/30 transition-colors text-indigo-300"
          >
            <Download size={16} />
            Download
          </div>

          {/* Save to Local button */}
          {/* <div
            onClick={saveStatus === 'saving' ? undefined : handleSaveToLocal}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
              saveStatus === 'saved'
                ? 'bg-green-900/20 border border-green-600/30 text-green-300'
                : saveStatus === 'saving'
                ? 'bg-yellow-900/20 border border-yellow-600/30 text-yellow-300 opacity-50 cursor-not-allowed'
                : 'bg-blue-900/20 border border-blue-600/30 text-blue-300 hover:bg-blue-800/30'
            }`}
            style={saveStatus === 'saving' ? { pointerEvents: 'none' } : undefined}
          >
            <Save size={16} className={saveStatus === 'saving' ? 'animate-spin' : ''} />
            {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'saving' ? 'Saving...' : 'Save Local'}
          </div> */}

          {/* JSON Editor button */}
          <div
            onClick={() => setShowJsonEditor(true)}
            className="flex items-center gap-2 bg-purple-900/20 border border-purple-600/30 rounded-lg px-3 py-2 hover:bg-purple-800/30 transition-colors text-purple-300"
          >
            <Code size={16} />
            Edit JSON
          </div>
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
                phases={Array.isArray(cycle.data?.phases) ? cycle.data.phases : []}
                cycle={cycle}
                size="large"
                func={addPhase}
              />
            </Section>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <Section icon={Logs} title="Phase Breakdown">
              <PhaseBreakdown
                deletePhase={deletePhase}
                cycle={cycle}
                Phases={Array.isArray(cycle.data?.phases) ? cycle.data.phases : []}
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

      {/* Add Phase Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/80" 
            onClick={() => setShowPhaseModal(false)}
          />
          <div className="relative bg-gray-900 rounded-lg border border-gray-700 w-96 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Add New Phase</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Phase Name
                </label>
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="Enter phase name"
                  className="w-full bg-gray-800 border border-gray-600 rounded p-3 text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Phase Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((color) => (
                    <div
                      key={color.value}
                      onClick={() => setNewPhaseColor(color.value)}
                      className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                        newPhaseColor === color.value
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${color.class}`} />
                      <span className="text-white text-sm">{color.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <div
                onClick={() => setShowPhaseModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </div>
              <div
                onClick={!newPhaseName.trim() ? undefined : handleCreatePhase}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ${
                  !newPhaseName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Create Phase
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Editor Modal */}
      <JsonEditor
        isOpen={showJsonEditor}
        onClose={() => setShowJsonEditor(false)}
        cycle={cycle}
        onSave={handleJsonSave}
      />
    </div>
  );
}

export default CycleDetailLocal;