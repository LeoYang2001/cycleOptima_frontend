import React from "react";
import type { Phase } from "../../types/common/Phase";
import { formatTimeLabel } from "../../utils/formatTime";
import {
  calculateCycleDurations,
  calculatePhaseTotalDuration,
} from "../../utils/totalDuration";
import PhaseTimeLinePreview from "../common/PhaseTimeLinePreview";
import type { Cycle } from "../../types/common/Cycle";
import { Trash2, Zap, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import type { LocalCycle } from "../../types/common/LocalCycle";

interface PhaseBreakdownProps {
  Phases: Phase[];
  cycle: Cycle | LocalCycle;
  deletePhase: (phaseId: string) => void;
}

function PhaseBreakdown({ Phases, cycle, deletePhase }: PhaseBreakdownProps) {

  // Helper function to get sensor trigger display info
  const getSensorTriggerInfo = (phase: Phase) => {
    if (!phase.sensorTrigger) return null;
    
    const { type, pinNumber, threshold } = phase.sensorTrigger;
    

   
    const sensorConfig = {
      RPM: { 
        icon: Gauge, 
        color: '#10b981', 
        unit: 'RPM',
        bgColor: '#10b981/20',
        borderColor: '#10b981/30'
      },
      Pressure: { 
        icon: Gauge, 
        color: '#3b82f6', 
        unit: 'Hz',
        bgColor: '#3b82f6/20',
        borderColor: '#3b82f6/30'
      }
     
    };

    return sensorConfig[type as keyof typeof sensorConfig] || {
      icon: Zap,
      color: '#f59e0b',
      unit: '',
      bgColor: '#f59e0b/20',
      borderColor: '#f59e0b/30'
    };
  };

  // Determine if this is a local cycle and generate the correct navigation path
  const isLocalCycle = cycle.id.startsWith("local-cycle");
  
  const getPhaseEditPath = (phaseId: string) => {
    return isLocalCycle 
      ? `/cycle-local/${cycle.id}/phase/${phaseId}`
      : `/cycle/${cycle.id}/phase/${phaseId}`;
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {Phases.map((phase) => {
        const { totalCycleDuration, phaseDurations } = calculateCycleDurations(cycle);
        const phase_duration = phaseDurations.find((p) => p.id === phase.id);
        const phase_progress = phase_duration
          ? (phase_duration.duration / totalCycleDuration) * 100
          : 0;

        const sensorTriggerInfo = getSensorTriggerInfo(phase);

        return (
          <Link to={getPhaseEditPath(phase.id)} key={phase.id}>
            <div
              style={{
                backgroundColor: "#111113",
              }}
              className="flex flex-row px-4 py-6 rounded-lg hover:opacity-80 cursor-pointer border border-black items-center transition-all duration-200"
            >
              {/* Phase Color Indicator */}
              {/* Sensor Trigger Indicator */}
              <div style={{ width: "10%" }} className="flex flex-col gap-2 px-4">
                {sensorTriggerInfo ? (
                  <div
                    style={{
                      background: `color-mix(in srgb, ${sensorTriggerInfo.color} 20%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${sensorTriggerInfo.color} 30%, transparent)`,
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  >
                    {/* <sensorTriggerInfo.icon 
                      size={14} 
                      style={{ color: sensorTriggerInfo.color }} 
                    /> */}
                    <div className="flex flex-row gap-1 justify-between">
                   
                      <span className="text-xs text-gray-400">
                       {phase.sensorTrigger?.threshold}
                      </span>
                         <span 
                        style={{ color: sensorTriggerInfo.color }}
                        className="text-xs font-medium"
                      >
                        {sensorTriggerInfo.unit}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex  justify-center items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-600/30">
                    <span className="text-xs text-gray-500">None</span>
                  </div>
                )}
              </div>

              {/* Phase Info */}
              <div
                style={{ width: "15%" }}
                className="flex flex-col pl-4"
              >
                <h3 className="text-lg text-white font-semibold">
                  {phase.name}
                </h3>
                <span className="text-gray-400 text-sm">
                  {formatTimeLabel(calculatePhaseTotalDuration(phase))} active
                </span>
              </div>

             

              {/* Phase Timeline Preview */}
              <div className="flex flex-1 flex-col justify-center gap-2 items-center">
                <span className="text-gray-500 text-sm self-end">
                  {phase_progress.toFixed(2)}% of total
                </span>
                <PhaseTimeLinePreview
                  phase_progress={phase_progress}
                  phase={phase}
                />
              </div>

              {/* Delete Button */}
              <div
                style={{
                  width: "5%",
                  color: "#ccc",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deletePhase(phase.id);
                }}
                className="h-full hover:brightness-150 duration-200 transition-all cursor-pointer flex justify-center items-center py-3"
              >
                <Trash2 size={18} color="#ccc" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default PhaseBreakdown;