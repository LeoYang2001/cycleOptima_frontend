import React from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

interface ComponentTimelineProps {
  // Define props if needed, e.g., components, setComponents
  components: CycleComponent[]; // Replace with actual type
  setComponents: (components: CycleComponent[]) => void; // Replace with actual type
  isDragging: boolean; // To control the mask style
}

function ComponentTimeline({
  components,
  setComponents,
  isDragging,
}: ComponentTimelineProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "droppable",
    data: {
      accepts: ["type1", "type2"],
    },
  });

  let maskStyle = {
    zIndex: -1,
    backgroundColor: "#3673d9",
    opacity: 0,
  };
  if (isDragging && isOver) {
    maskStyle = {
      zIndex: 999,
      backgroundColor: "#3673d9",
      opacity: 0.55,
    };
  } else if (isDragging && !isOver) {
    maskStyle = {
      zIndex: 999,
      backgroundColor: "#3673d9",

      opacity: 0.15,
    };
  }

  return (
    <div ref={setNodeRef} className="relative w-full h-full flex flex-col ">
      {isDragging && (
        <div className="absolute w-full h-full flex justify-center items-center">
          <span
            style={{
              color: "#3673d9",
              fontSize: 16,
            }}
            className="font-semibold"
          >
            Drop component here
          </span>
        </div>
      )}
      {/* Dragover Mask  */}
      <div
        style={maskStyle}
        className=" transition-all flex justify-center items-center duration-200 absolute w-full h-full  left-0 top-0"
      ></div>
      <div className="w-full h-full rounded-lg border border-white  overflow-y-scroll custom-scrollbar">
        ComponentTimeline
      </div>
    </div>
  );
}

export default ComponentTimeline;
