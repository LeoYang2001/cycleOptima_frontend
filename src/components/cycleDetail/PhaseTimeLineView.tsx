import React from "react";
import type { Phase } from "../../types/common/Phase";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { p } from "motion/react-client";

interface PhaseTimeLineViewProps {
  // Define any props you need here
  phase: Phase;
  phases_progress: { id: string; portion: number }[]; // Added to access progress
}

function PhaseTimeLineView({ phase, phases_progress }: PhaseTimeLineViewProps) {
  const { id } = phase;
  const progress_portion = phases_progress.find((p) => p.id === id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    position: "relative", // make zIndex take effect
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 0, // lift it when dragging
  };

  // Calculate width for dragging
  const dragWidth = `${100 / phases_progress.length}%`;

  return (
    <div
      style={{
        ...style,
        backgroundColor: `#${phase.color}`,
        height: 80,
        width: `${progress_portion?.portion}%`,
      }}
      className="flex flex-col justify-center items-center rounded-lg font-semibold hover:shadow-lg transition-shadow duration-200 overscroll-x-auto cursor-pointer"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <span className="text-white text-sm font-semibold">{phase.name}</span>
      <span> {phase.startTime}ms</span>
    </div>
  );
}

export default PhaseTimeLineView;
