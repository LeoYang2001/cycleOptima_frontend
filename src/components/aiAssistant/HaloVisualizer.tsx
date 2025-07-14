import React, { useState } from "react";
import "./HaloVisualizer.css";

type Props = {
  decibel: number | null;
  ifSession?: boolean;
  scaleRange?: [number, number];
  size?: "small" | "medium" | "large"; // New size prop
};

const HaloVisualizer: React.FC<Props> = ({
  decibel,
  scaleRange = [0.8, 2.0],
  size = "large", // default to large
}) => {
  const [haloState, setHaloState] = useState("");
  const [minScale, maxScale] = scaleRange;

  // Compute dynamic scale
  let scale = 1;
  if (decibel !== null) {
    const normalized = Math.min(Math.max(decibel / 50, 0), 1);
    scale = minScale + (maxScale - minScale) * normalized;
  }

  // Size mapping
  const sizeMap = {
    small: 40,
    medium: 80,
    large: 120,
  };
  const dimension = sizeMap[size];

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
