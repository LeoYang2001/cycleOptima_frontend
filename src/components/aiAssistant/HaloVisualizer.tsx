// src/components/HaloVisualizer.tsx
import React, { useEffect, useState } from "react";
import "./HaloVisualizer.css"; // CSS for glow effect
import eventBus from "../../voiceAgent/agent/tools/eventBus";
import { useSessionContext } from "../../voiceAgent/session/sessionManager";

type Props = {
  decibel: number | null;
  ifSession?: boolean;
  scaleRange?: [number, number];
  size?: "small" | "medium" | "large"; // New size prop
};

const HaloVisualizer: React.FC<Props> = ({
  decibel,
  size = "medium",
  scaleRange = [0.8, 2.0],
}) => {
  const { session } = useSessionContext();
  const [haloState, setHaloState] = useState("");

  const [minScale, maxScale] = scaleRange;

  // Size mapping
  const sizeMap: Record<"small" | "medium" | "large", number> = {
    small: 40,
    medium: 80,
    large: 120,
  };
  const dimension = sizeMap[size];

  useEffect(() => {
    const handlePending = () => setHaloState("pending");
    eventBus.on("agentPendingEnd", handlePending);
    return () => {
      eventBus.off("agentPendingEnd", handlePending);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      // maybe show a loading screen or "not connected" indicator
      console.log(session, "Session is not ready");
      setHaloState("");
    } else {
      // session is ready
      console.log("Session is ready:", session);
      setHaloState("active");
    }
  }, [session]);

  let scale = 1;
  if (decibel !== null) {
    const normalized = Math.min(Math.max(decibel / 50, 0), 1);
    scale = minScale + (maxScale - minScale) * normalized;
  }

  return (
    <div className="halo-wrapper" style={{ height: dimension + 20 }}>
      <div
        className={`halo-circle ${haloState}`}
        style={{
          width: `${dimension}px`,
          height: `${dimension}px`,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
};

export default HaloVisualizer;
