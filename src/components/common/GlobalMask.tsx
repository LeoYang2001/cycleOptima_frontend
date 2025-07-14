import React from "react";

interface GlobalMaskProps {
  visible: boolean;
  onClick?: () => void;
  zIndex?: number;
  color?: string;
  opacity?: number;
}

const GlobalMask: React.FC<GlobalMaskProps> = ({
  visible,
  onClick,
  zIndex = 999,
  color = "#000",
  opacity = 0.3,
}) => {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 w-full h-full"
      style={{
        background: color,
        opacity,
        zIndex,
        pointerEvents: "auto",
      }}
      onClick={onClick}
    />
  );
};

export default GlobalMask;
