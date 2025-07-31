import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Phase } from "../../types/common/Phase";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PhaseTimeLineViewProps {
  // Define any props you need here
  phase: Phase;
  phases_progress: { id: string; portion: number }[]; // Added to access progress
}

function PhaseTimeLineView({ phase, phases_progress }: PhaseTimeLineViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = phase;
  const progress_portion = phases_progress.find((p) => p.id === id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showText, setShowText] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Check if container is wide enough to show text
  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Hide text if container is too narrow (less than 80px for minimal text display)
        setShowText(containerWidth >= 80);
      }
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [progress_portion?.portion]);

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
      onDoubleClick={(e) => {
        e.stopPropagation();
        navigate(`${location.pathname.replace(/\/$/, "")}/phase/${id}`);
      }}
      ref={(node) => {
        setNodeRef(node);
        if (containerRef.current !== node) {
          containerRef.current = node;
        }
      }}
      style={{
        ...style,
        backgroundColor: `#${phase.color}`,
        height: 80,
        width: `${progress_portion?.portion}%`,
        minWidth: 0, // Allow shrinking below content size
        flexShrink: 1, // Allow shrinking when container is too small
      }}
      className="flex flex-col mx-0.5 justify-center hover:opacity-90 items-center rounded-lg font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
      {...attributes}
      {...listeners}
    >
      {showText && (
        <>
          <span className="text-white text-sm font-semibold truncate px-1">
            {phase.name}
          </span>
        </>
      )}
    </div>
  );
}

export default PhaseTimeLineView;
