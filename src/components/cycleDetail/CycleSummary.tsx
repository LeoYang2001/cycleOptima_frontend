import React from "react";
import type { Cycle } from "../../types/common/Cycle";
import { calculateCycleDurations } from "../../utils/totalDuration";
import { formatTimeLabel } from "../../utils/formatTime";
import { Clock, Logs, Pause, Puzzle } from "lucide-react";

interface CycleSummaryProps {
  cycle: Cycle;
}

function CycleSummary({ cycle }: CycleSummaryProps) {
  const { totalCycleDuration, phaseDurations } = calculateCycleDurations(cycle);
  function calculateTotalComponents() {
    const phases = cycle.data.phases || [];
    let sum = 0;
    for (const phase of phases) {
      sum += phase.components.length;
    }
    return sum;
  }

  const summaryList = [
    {
      label: "Total Duration",
      value: formatTimeLabel(totalCycleDuration),
      icon: <Clock className="text-blue-600" size={28} />,
    },
    {
      label: "# of Phases",
      value: cycle.data.phases.length,
      icon: <Logs className="text-green-600" size={28} />,
    },
    {
      label: "# of Components",
      value: calculateTotalComponents(),
      icon: <Puzzle className="text-yellow-600" size={28} />,
    },
    {
      label: "Total Pause Time",
      value: 0, // Placeholder for total pause time
      icon: <Pause className="text-red-600 " size={28} />,
    },
  ];
  return (
    <div className="w-full h-full   flex-col gap-3 justify-between grid grid-cols-2 p-4">
      {summaryList.map((item, index) => (
        <div
          key={item.label + index}
          style={{
            backgroundColor: "#111113",
          }}
          className="flex flex-col gap-2 h-full w-full rounded-lg items-center justify-center"
        >
          {item.icon}
          <span className=" text-2xl font-bold text-white opacity-80">
            {item.value}
          </span>
          <span className=" text-sm text-gray-600  font-semibold">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default CycleSummary;
