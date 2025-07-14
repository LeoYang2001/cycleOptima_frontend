import React, { useState, useEffect } from "react";
import type { Phase } from "../../types/common/Phase";

interface PhaseTimeLinePreviewProps {
  phase: Phase;
  phase_progress: number;
}

function PhaseTimeLinePreview({
  phase,
  phase_progress,
}: PhaseTimeLinePreviewProps) {
  // State for animated width
  const [animatedWidth, setAnimatedWidth] = useState(0);

  // Animate width from 0% to phase_progress% when component mounts or phase_progress changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedWidth(phase_progress);
    }, 100); // Small delay for smooth animation

    return () => clearTimeout(timer);
  }, [phase_progress]);

  return (
    <div
      style={{
        height: 14,
        borderRadius: 7,
        backgroundColor: "#27272a",
      }}
      className=" w-full overflow-hidden "
    >
      <div
        style={{
          height: "100%",
          borderRadius: 7,
          transition: "width 0.8s ease-in-out",
          width: `${animatedWidth}%`,
          backgroundColor: `#${phase.color}`,
        }}
      ></div>
    </div>
  );
}

export default PhaseTimeLinePreview;
