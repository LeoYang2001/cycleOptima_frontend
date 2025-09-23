import React from "react";
import type { Phase } from "../../types/common/Phase";
import { formatTimeLabel } from "../../utils/formatTime";
import {
  calculateCycleDurations,
  calculatePhaseTotalDuration,
} from "../../utils/totalDuration";
import PhaseTimeLinePreview from "../common/PhaseTimeLinePreview";
import type { Cycle } from "../../types/common/Cycle";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface PhaseBreakdownProps {
  Phases: Phase[];
  cycle: Cycle;
  deletePhase: (phaseId: string) => void; // Function to delete a phase
}

function PhaseBreakdown({ Phases, cycle, deletePhase }: PhaseBreakdownProps) {

  console.log('cycle read from phase breakdown', cycle)
  return (
    <div className=" w-full h-full  flex flex-col gap-3    ">
      {Phases.map((phase) => {
        const { totalCycleDuration, phaseDurations } =
          calculateCycleDurations(cycle);
        const phase_duration = phaseDurations.find((p) => p.id === phase.id);
        const phase_progress = phase_duration
          ? (phase_duration.duration / totalCycleDuration) * 100
          : 0;

        return (
          <Link to={`/cycle/${cycle.id}/phase/${phase.id}`}>
            <div
              style={{
                backgroundColor: "#111113",
              }}
              key={phase.id}
              className=" flex flex-row  px-4 py-6 rounded-lg  hover:opacity-80 cursor-pointer  border border-black items-center  transition-all duration-200"
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: `#${phase.color}`,
                  borderRadius: "50%",
                }}
              />
              <div
                style={{
                  width: "15%",
                }}
                className="flex flex-col pl-4 "
              >
                <h3 className="text-lg text-white font-semibold">
                  {phase.name}
                </h3>
                <span className="text-gray-400 text-sm">
                  {formatTimeLabel(calculatePhaseTotalDuration(phase))} active
                </span>
              </div>
              <div className="flex flex-1 flex-col   justify-center gap-2 items-center">
                <span className=" text-gray-500  text-sm self-end">
                  {phase_progress.toFixed(2)}% of total
                </span>
                <PhaseTimeLinePreview
                  phase_progress={phase_progress}
                  phase={phase}
                />
              </div>
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
                className="h-full  hover:brightness-150 duration-200 transition-all cursor-pointer flex justify-center items-center py-3"
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
