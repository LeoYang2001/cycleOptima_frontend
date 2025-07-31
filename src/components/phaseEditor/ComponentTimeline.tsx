import React from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";
import { useDroppable } from "@dnd-kit/core";
import { getStyle } from "./ComponentLibrary";
import { generateTicksWithStartTime } from "../../utils/generateTicks";
import { Plus } from "lucide-react";

interface ComponentViewProps {
  component: CycleComponent;
  percentageOfTotal: number;
  percentageOfActive: number;
  startPercentage: number;
  runningPercentage: number;
  setSelectedComponent: (component: CycleComponent | null) => void; // Function to set selected component
  onDeleteComponent: (componentId: string) => void; // Function to delete component
  autoCreateRetractor?: (motorInfo: CycleComponent) => void; // Pass motor info
}

function ComponentView({
  component,
  percentageOfTotal,
  percentageOfActive,
  startPercentage,
  autoCreateRetractor = () => {}, // Default to empty function if not provided
  setSelectedComponent,
  onDeleteComponent,
}: ComponentViewProps) {
  const compStyle = getStyle(component.compId);

  // Determine what to show based on available space
  // Rough estimate: icon ~30px, label ~8px per character, padding ~16px
  const estimatedLabelWidth = component.label.length * 8;
  const minWidthForBoth = 30 + estimatedLabelWidth + 16; // icon + label + padding
  const minWidthForIcon = 30 + 16; // just icon + padding
  const actualWidth = (percentageOfTotal / 100) * window.innerWidth * 0.65; // Approximate timeline width

  const showBoth = actualWidth >= minWidthForBoth;
  const showIconOnly = actualWidth >= minWidthForIcon && !showBoth;

  const [hovered, setHovered] = React.useState(false);

  const handleClick = () => {
    setSelectedComponent(component);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the main click handler

    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the component "${component.label}"?\n\nThis action cannot be undone.`
    );

    if (confirmDelete) {
      onDeleteComponent(component.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent browser context menu
    handleDeleteClick(e);
  };

  return (
    <div
      style={{
        width: `100%`,
        height: 50,
      }}
      className=" flex flex-row justify-start items-center  mb-2"
    >
      <div
        style={{
          width: `${startPercentage.toFixed(1)}%`,
          backgroundColor: "transparent",
        }}
        className=" h-full"
      />
      <div
        style={{
          width: `${percentageOfActive.toFixed(1)}%`,
          backgroundColor: compStyle.color,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group rounded p-2 h-full  relative flex cursor-pointer flex-row items-center hover:opacity-70 transition-opacity duration-200 justify-center gap-2 text-white text-sm overflow-hidden"
        title="Left-click to edit • Right-click to delete"
      >
        {(showBoth || showIconOnly) && compStyle.icon}
        {showBoth && (
          <div className="font-semibold text-nowrap">{component.label}</div>
        )}

        {/* Visual indicator for right-click */}
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ fontSize: "8px" }}
        >
          <span className="sr-only">Right-click to delete</span>
        </div>

        {/* Fade-in button for Motor */}
        {component.compId === "Motor" && (
          <button
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-xs rounded shadow-lg border border-yellow-400 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-200 ${
              hovered ? "opacity-100 scale-105" : "opacity-0 scale-95"
            }`}
            style={{
              pointerEvents: hovered ? "auto" : "none",
              background:
                "linear-gradient(90deg, rgb(245,158,11) 0%, rgb(245,158,11,0.85) 100%)",
            }}
            title="Auto-create retractor (starts 5s before motor)"
            onClick={(e) => {
              e.stopPropagation();
              autoCreateRetractor(component);
            }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

interface ComponentTimelineProps {
  components: CycleComponent[];
  setComponents: (components: CycleComponent[]) => void;
  isDragging: boolean;
  startTime?: number;
  setSelectedComponent: (component: CycleComponent | null) => void;
  onDeleteComponent: (componentId: string) => void;
  autoCreateRetractor?: (motorInfo: CycleComponent) => void;
}

function ComponentTimeline({
  components,
  setComponents,
  isDragging,
  startTime,
  setSelectedComponent,
  onDeleteComponent,
  autoCreateRetractor = () => {},
}: ComponentTimelineProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "droppable",
    data: {
      accepts: ["type1", "type2"],
    },
  });

  // Calculate percentages for pause time and components
  const calculatePercentages = () => {
    const pauseTime = startTime || 0;
    const activeDuration = components.reduce((maxEnd, component) => {
      const componentEnd = (component.start || 0) + (component.duration || 0);
      return Math.max(maxEnd, componentEnd);
    }, 0);
    const totalPhaseDuration = pauseTime + activeDuration;

    // Avoid division by zero
    if (totalPhaseDuration === 0) {
      return {
        pauseTimePercentage: 0,
        activeDurationPercentage: 0,
        componentPercentages: [],
      };
    }

    const pauseTimePercentage = (pauseTime / totalPhaseDuration) * 100;
    const activeDurationPercentage =
      (activeDuration / totalPhaseDuration) * 100;

    // Calculate each component's percentage over active duration
    const componentPercentages = components.map((component) => {
      const componentStart = component.start || 0;
      const componentDuration = component.duration || 0;
      const totalComponentDuration = componentStart + componentDuration;

      return {
        id: component.id,
        label: component.label,
        duration: componentDuration,
        start: componentStart,
        percentageOfTotal: (componentDuration / totalPhaseDuration) * 100,
        percentageOfActive:
          activeDuration > 0 ? (componentDuration / activeDuration) * 100 : 0,
        startPercentage:
          totalComponentDuration > 0
            ? (componentStart / activeDuration) * 100
            : 0,
        runningPercentage:
          totalComponentDuration > 0
            ? (componentDuration / totalComponentDuration) * 100
            : 0,
      };
    });

    return {
      pauseTime,
      activeDuration,
      totalPhaseDuration,
      pauseTimePercentage,
      activeDurationPercentage,
      componentPercentages,
    };
  };

  const percentageData = calculatePercentages();
  const ticks = generateTicksWithStartTime(
    Number(percentageData.totalPhaseDuration),
    Number(percentageData.pauseTime)
  );

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
    <div ref={setNodeRef} className=" w-full h-full flex flex-col pt-10 ">
      <div style={{}} className="w-full h-full  rounded-lg relative ">
        {components.length === 0 && !isDragging && (
          <div
            style={{
              border: "1px dashed #333",
              borderRadius: "8px",
            }}
            className="w-full h-full flex items-center absolute justify-center text-lg font-semibold text-gray-500"
          >
            No components to display
          </div>
        )}
        {isDragging && (
          <div
            style={{
              border: "1px dashed #3673d9",
              borderRadius: "8px",
            }}
            className="absolute z-10 w-full h-full flex justify-center items-center"
          />
        )}
        {/* Dragover Mask  */}
        <div
          style={{
            borderRadius: "8px",
            ...maskStyle,
          }}
          className=" transition-all  z-10 flex  items-center duration-200 absolute w-full h-full  left-0 top-0 flex-col justify-start"
        ></div>
        {/* BACKGROUND TICKS  */}
        {components.length > 0 && (
          <div
            style={{
              backgroundColor: "#18181b",
              borderWidth: 1,
              borderRadius: "8px",
              border: "1px solid #333",
            }}
            className="absolute w-full h-full flex flex-row z-1"
          >
            {startTime ? (
              <div
                className="   bg-transparent border-r-1 h-full"
                style={{
                  width: `${Math.min(
                    percentageData.pauseTimePercentage,
                    35
                  ).toFixed(1)}%`,
                  borderColor: "#333",
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)",
                }}
              >
                <span
                  style={{
                    left: 0,
                    top: -35,
                    transform: "translateX(-50%)",
                  }}
                  className=" absolute  text-sm text-gray-500"
                >
                  {ticks[0].label}
                </span>
              </div>
            ) : (
              ""
            )}
            <div className=" flex-1 flex h-full bg-transparent   flex-row ">
              {ticks.slice(1, -1).map((tick, index) => {
                if (index === ticks.length - 3) {
                  return (
                    <div
                      key={index}
                      style={{
                        borderColor: "#333",
                      }}
                      className="flex-1 flex h-full bg-transparent border-r-1  flex-row relative"
                    >
                      <span
                        style={{
                          top: -35,
                          transform: "translateX(-50%)",
                        }}
                        className=" absolute  text-sm text-gray-500"
                      >
                        {tick.label}
                      </span>
                      <span
                        style={{
                          top: -35,
                          right: 0,
                          transform: "translateX(50%)",
                        }}
                        className=" absolute  text-sm text-gray-500"
                      >
                        {ticks[ticks.length - 1].label}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={index}
                      style={{
                        borderColor: "#333",
                      }}
                      className="flex-1 flex h-full bg-transparent  border-r-1 flex-row relative"
                    >
                      <span
                        style={{
                          top: -35,
                          transform: "translateX(-50%)",
                        }}
                        className=" absolute  text-sm text-gray-500"
                      >
                        {tick.label}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
        {/* COMPONENTS TIMELINE VIEW  */}
        <div
          style={{
            backgroundColor: "transparent",
          }}
          className=" z-10 overflow-x-hidden items-center h-full flex flex-row overflow-y-scroll custom-scrollbar relative"
        >
          <div
            style={{
              width: `${Math.min(
                percentageData.pauseTimePercentage,
                35
              ).toFixed(1)}%`,
            }}
            className=" flex items-center justify-center text-xs font-semibold"
          ></div>
          <div className="flex-1 h-full py-2  border-transparent border-4 ">
            {percentageData.componentPercentages.map((componentData) => {
              const component = components.find(
                (c) => c.id === componentData.id
              );
              return component ? (
                <ComponentView
                  setSelectedComponent={setSelectedComponent}
                  key={component.id}
                  component={component}
                  percentageOfTotal={componentData.percentageOfTotal}
                  percentageOfActive={componentData.percentageOfActive}
                  startPercentage={componentData.startPercentage}
                  runningPercentage={componentData.runningPercentage}
                  onDeleteComponent={onDeleteComponent}
                  autoCreateRetractor={autoCreateRetractor}
                />
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComponentTimeline;
