import React, { useState } from "react";
import type { Cycle } from "../../types/common/Cycle";
import { calculateCycleDurations } from "../../utils/totalDuration";
import { generateTicks } from "../../utils/generateTicks";
import { DndContext } from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";

import type { DragEndEvent } from "@dnd-kit/core";
import PhaseTimeLineView from "../cycleDetail/PhaseTimeLineView";

export type PhaseDuration = {
  id: string;
  duration: number;
};

type PhasePortion = {
  id: string;
  portion: number; // e.g., "4.54 %"
};

function calculatePhasePortions(
  totalCycleDuration: number,
  phaseDurations: PhaseDuration[]
): PhasePortion[] {
  return phaseDurations.map((phase) => {
    const percent = (phase.duration / totalCycleDuration) * 100;
    return {
      id: phase.id,
      portion: Number(percent.toFixed(2)),
    };
  });
}

interface CycleTimeLinePreviewProp {
  cycle: Cycle;
  size?: string;
}

export const colorMap = ["#4ADE80", "#60A5FA", "#FBBF24", "#F87171"]; // green, blue, yellow, red

export function getColorByIndex(index: number): string {
  return colorMap[index % colorMap.length];
}

function CycleTimeLinePreview({
  cycle,
  size = "small",
}: CycleTimeLinePreviewProp) {
  const { totalCycleDuration, phaseDurations } = calculateCycleDurations(cycle);
  const phases_progress = calculatePhasePortions(
    totalCycleDuration,
    phaseDurations
  );

  // Set up local state for data and phases
  const [data, setData] = useState(cycle.data);
  const [phases, setPhases] = useState(data.phases || []);

  // Sync data.phases when phases changes
  React.useEffect(() => {
    setData((prevData) => ({
      ...prevData,
      phases: phases,
    }));
  }, [phases]);

  //for detailed Timeline preview
  const [ticks, setTicks] = useState(generateTicks(totalCycleDuration * 1.2));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((item) => item.id === active.id);
      const newIndex = phases.findIndex((item) => item.id === over.id);
      setPhases((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  if (size === "small")
    return (
      <div className=" w-full flex flex-col items-start gap-2 justify-start">
        <span
          style={{
            color: "#5d5d63",
            opacity: 0.5,
          }}
        >
          Cycle Preview
        </span>
        <div
          style={{
            height: 12,
          }}
          className=" w-full relative my-2 "
        >
          {/* for expanding animation  */}
          <div
            className=" absolute right-0 h-full bg-black z-30 animate-shrink"
            style={{
              width: "100%",
            }}
          />
          <div className=" rounded-xl absolute w-full left-0 h-full overflow-hidden flex flex-row items-center justify-start ">
            {phases_progress.map((progressBar, index) => (
              <div
                className=" h-full "
                key={progressBar.id}
                style={{
                  width: `${progressBar.portion}%`,
                  backgroundColor: getColorByIndex(index),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  else
    return (
      <div className=" w-full flex flex-col items-start gap-2 justify-start">
        <span
          style={{
            color: "#5d5d63",
            opacity: 0.5,
          }}
        >
          Cycle Preview
        </span>
        <div
          style={{
            backgroundColor: "#18181b",
          }}
          className=" w-full relative mb-2 rounded-lg "
        >
          <div className=" flex flex-row gap-1  p-10 ">
            <DndContext onDragEnd={handleDragEnd}>
              <SortableContext items={phases}>
                {phases.map((phase, key) => (
                  <PhaseTimeLineView
                    phases_progress={phases_progress}
                    key={phase.id}
                    phase={phase}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    );
}

export default CycleTimeLinePreview;
