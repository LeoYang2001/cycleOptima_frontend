import React from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";

interface ComponentTimelineProps {
  // Define props if needed, e.g., components, setComponents
  components: CycleComponent[]; // Replace with actual type
  setComponents: (components: CycleComponent[]) => void; // Replace with actual type
}

function ComponentTimeline({
  components,
  setComponents,
}: ComponentTimelineProps) {
  console.log("components:", components);
  return (
    <div className="w-full h-full flex flex-col ">
      <div className="w-full h-full bg-gray-900 rounded-lg border border-white  overflow-y-scroll custom-scrollbar">
        ComponentTimeline
      </div>
    </div>
  );
}

export default ComponentTimeline;
