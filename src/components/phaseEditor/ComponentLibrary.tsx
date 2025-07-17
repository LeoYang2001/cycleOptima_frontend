import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { selectLibraryError } from "../../store/librarySlice";
import type { CycleComponent } from "../../types/common/CycleComponent";
import {
  CircleQuestionMark,
  CloudRain,
  Droplets,
  Egg,
  Flame,
  RefreshCw,
  RotateCcw,
  Settings,
  Wind,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";

export function getStyle(compId: string, iconSize = 18) {
  switch (compId) {
    case "Cold Valve":
      return {
        color: "#60a5fa",
        icon: <Droplets size={iconSize} color="#fff" />,
      };
    case "Drain Pump":
      return {
        color: "#ef4848",
        icon: <Wind size={iconSize} color="#fff" />,
      };
    case "Drain Valve":
      return {
        color: "#8b5cf6",
        icon: <CloudRain size={iconSize} color="#fff" />,
      };
    case "Motor":
      return {
        color: "#f97316",
        icon: <RefreshCw size={iconSize} color="#fff" />,
      };
    case "Retractor":
      return {
        color: "#f59e0b",
        icon: <RotateCcw size={iconSize} color="#fff" />,
      };
    case "Softener Valve":
      return {
        color: "#06b6d4",
        icon: <Egg size={iconSize} color="#fff" />,
      };
    case "Hot Valve":
      return {
        color: "#ec4818",
        icon: <Flame size={iconSize} color="#fff" />,
      };
    default:
      return {
        color: "#10b981",
        icon: <CircleQuestionMark size={iconSize} color="#fff" />,
      };
  }
}

function getComponentIcon(component: CycleComponent) {
  const compStyle = getStyle(component.compId);

  return (
    <div
      style={{
        backgroundColor: compStyle.color,
        borderRadius: 8,
        width: 32,
        height: 32,
      }}
      className="flex items-center justify-center mr-3"
    >
      {compStyle.icon}
    </div>
  );
}
interface ComponentLibraryProps {
  // Define any props if needed
  component: CycleComponent;
  setSelectedComponent: (component: CycleComponent | null) => void;
}
function ComponentLibraryView({
  component,
  setSelectedComponent,
}: ComponentLibraryProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.compId,
    data: {
      type: "type1",
    },
  });

  // Calculate the width for the library panel (25% of screen width minus padding)
  const libraryWidth = window.innerWidth * 0.25 - 32; // 25% minus padding

  const draggableStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1,
        position: "absolute" as const, // Use absolute instead of fixed
        width: libraryWidth, // Preserve the original width
      }
    : {};

  return (
    <div
      style={{
        height: 70,
        width: "100%",
        backgroundColor: "#111113",
        borderRadius: 8,
        border: "1px solid #333",
        ...draggableStyle,
      }}
      className=" relative border border-white"
    >
      <div
        {...attributes}
        {...listeners}
        ref={setNodeRef}
        className=" rounded-lg p-4 flex flex-row select-none items-center justify-start hover:opacity-80  active:cursor-grabbing cursor-grab transition-opacity duration-200"
      >
        {getComponentIcon(component)}
        <div className="flex flex-col  justify-center items-start">
          <span className=" font-semibold text-white text-nowrap ">
            {component.label}
          </span>
          <span
            style={{
              fontSize: 12,
            }}
            className="text-gray-400"
          >
            {component.compId}
          </span>
        </div>
      </div>
      <div
        style={{
          top: "50%",
          right: 10,
          transform: "translateY(-50%)",
        }}
        onClick={() => setSelectedComponent(component)}
        className="flex p-2  cursor-pointer absolute ustify-center items-center ml-auto "
      >
        <Settings
          color="#fff"
          className="hover:opacity-100"
          opacity={0.5}
          size={18}
        />
      </div>
    </div>
  );
}

function ComponentLibrary({
  libraryComponents,
  isLoading,
  setSelectedComponent,
}: {
  libraryComponents: CycleComponent[];
  isLoading: boolean;
  setSelectedComponent: (component: CycleComponent | null) => void;
}) {
  const error = useSelector((state: RootState) => selectLibraryError(state));

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-gray-500">Loading components...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-5">
        {libraryComponents.map((component) => (
          <ComponentLibraryView
            key={component.id}
            component={component}
            setSelectedComponent={setSelectedComponent}
          />
        ))}
      </div>
      {libraryComponents.length === 0 && (
        <div className="text-gray-500 text-center py-8">
          No components available in the library
        </div>
      )}
    </div>
  );
}

export default ComponentLibrary;
