import React, { useState, useEffect } from "react";
import type { Cycle } from "../../types/common/Cycle";
import {
  calculateCycleDurations,
  calculatePhasePortions,
} from "../../utils/totalDuration";
import { generateTicks } from "../../utils/generateTicks";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { DragEndEvent } from "@dnd-kit/core";
import PhaseTimeLineView from "../cycleDetail/PhaseTimeLineView";
import { Plus } from "lucide-react";
import TicksLineComponents from "../cycleDetail/CycleTicksLine";
import type { Phase } from "../../types/common/Phase";
import type { LocalCycle } from "../../types/common/LocalCycle";

interface CycleTimeLinePreviewProp {
  cycle: Cycle | LocalCycle;
  size?: string;
  func?: () => void;
  phases?: Phase[]; // Optional prop for phases
  setPhases?: React.Dispatch<React.SetStateAction<Phase[]>>; // Optional prop for setting phases
}

export const colorMap = ["#4ADE80", "#60A5FA", "#FBBF24", "#F87171"]; // green, blue, yellow, red

export function getColorByIndex(index: number): string {
  return colorMap[index % colorMap.length];
}

function CycleTimeLinePreview({
  cycle,
  size = "small",
  func = () => {},
  phases = cycle.data.phases || [], // Default to cycle phases if not provided
  setPhases = () => {}, // Default no-op function
}: CycleTimeLinePreviewProp) {
  const { totalCycleDuration, phaseDurations } = calculateCycleDurations(cycle);
  const phases_progress = calculatePhasePortions(
    totalCycleDuration,
    phaseDurations
  );
  

  //for detailed Timeline preview
  const [ticks, setTicks] = useState(generateTicks(totalCycleDuration * 1.15));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Update ticks when totalCycleDuration changes
  useEffect(() => {
    setTicks(generateTicks(totalCycleDuration * 1.15));
    console.log('ticks updated', ticks);
  }, [totalCycleDuration]);

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((item) => item.id === active.id);
      const newIndex = phases.findIndex((item) => item.id === over.id);
      setPhases((items) => arrayMove(items, oldIndex, newIndex));
    }
  };
  

  if (size === "small")
    return (
      <div className=" w-full flex flex-col items-start gap-2 justify-start">
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
            {phases_progress.map((progressBar) => (
              <div
                className=" h-full "
                key={progressBar.id}
                style={{
                  width: `${progressBar.portion}%`,
                  backgroundColor: `#${progressBar.color}`,
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
        <div
          style={{
            backgroundColor: "#18181b",
          }}
          className=" w-full relative flex flex-col mb-2 rounded-lg "
        >
          <div className=" px-10 w-full  top-2 z-10 absolute flex justify-start items-center  text-black">
            {" "}
            <TicksLineComponents ticks={ticks} />
          </div>

          <div className="flex flex-row gap-1 p-10 overflow-hidden">
            <div className="flex-1 flex flex-row h-full min-w-0 overflow-hidden">
              {phases.length > 0 && phases_progress.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={phases}
                    strategy={horizontalListSortingStrategy}
                  >
                    {phases.map((phase) => (
                      <PhaseTimeLineView
                        phases_progress={phases_progress}
                        key={phase.id}
                        phase={phase}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <PhaseTimeLineView
                        phases_progress={phases_progress}
                        phase={phases.find((p) => p.id === activeId)!}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  No phases to display
                </div>
              )}
            </div>
            <div
              onClick={func}
              style={{
                width: "15%",
                color: "#ccc",
              }}
              className=" flex select-none flex-row items-center border gap-1 border-dashed border-gray-500 justify-center rounded-lg p-2 cursor-pointer hover:bg-gray-800 transition-all duration-200"
            >
              <Plus size={18} />
              <span className=" text-sm font-semibold">Add Phase</span>
            </div>
          </div>
        </div>
      </div>
    );
}

export default CycleTimeLinePreview;
