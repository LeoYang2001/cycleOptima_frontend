import React from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { getStyle } from "./ComponentLibrary";
import { generateTicksWithStartTime } from "../../utils/generateTicks";

interface ComponentViewProps {
  component: CycleComponent;
  percentageOfTotal: number;
  percentageOfActive: number;
}

function ComponentView({
  component,
  percentageOfTotal,
  percentageOfActive,
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

  console.log(component);
  console.log("percentageOfActive:", percentageOfActive);

  return (
    <div
      style={{
        width: `${percentageOfActive.toFixed(1)}%`,
        height: 50,
        backgroundColor: compStyle.color,
      }}
      className=" rounded p-2 mb-2 flex flex-row items-center justify-center gap-2 text-white text-sm overflow-hidden"
    >
      {(showBoth || showIconOnly) && compStyle.icon}
      {showBoth && (
        <div className="font-semibold text-nowrap">{component.label}</div>
      )}
    </div>
  );
}

interface ComponentTimelineProps {
  // Define props if needed, e.g., components, setComponents
  components: CycleComponent[]; // Replace with actual type
  setComponents: (components: CycleComponent[]) => void; // Replace with actual type
  isDragging: boolean; // To control the mask style
  startTime?: number; // Optional start time for the timeline
}

function ComponentTimeline({
  components,
  setComponents,
  isDragging,
  startTime,
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
    const componentPercentages = components.map((component) => ({
      id: component.id,
      label: component.label,
      duration: component.duration || 0,
      percentageOfTotal: ((component.duration || 0) / totalPhaseDuration) * 100,
      percentageOfActive:
        activeDuration > 0
          ? ((component.duration || 0) / activeDuration) * 100
          : 0,
    }));

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

  console.log("ticks:", ticks);

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
      {/* <div className="mb-4 p-3 bg-gray-800 rounded-lg text-white text-sm">
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <span className="text-gray-400">Total Phase Duration: </span>
            <span className="font-semibold">
              {percentageData.totalPhaseDuration}ms
            </span>
          </div>
          <div>
            <span className="text-gray-400">Active Duration: </span>
            <span className="font-semibold">
              {percentageData.activeDuration}ms
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-yellow-400">Pause Time: </span>
            <span className="font-semibold">{percentageData.pauseTime}ms</span>
            <span className="text-yellow-400 ml-2">
              ({percentageData.pauseTimePercentage.toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="text-green-400">Active Time: </span>
            <span className="font-semibold">
              {percentageData.activeDuration}ms
            </span>
            <span className="text-green-400 ml-2">
              ({percentageData.activeDurationPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div> */}
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
          >
            {isOver ? (
              <span
                style={{
                  color: "#3673d9",
                  fontSize: 16,
                }}
                className="font-semibold"
              >
                <Plus size={38} />
              </span>
            ) : (
              <span
                style={{
                  color: "#3673d9",
                  fontSize: 16,
                }}
                className="font-semibold"
              >
                Drop component here
              </span>
            )}
          </div>
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
          <div className="flex-1 h-full p-2">
            {percentageData.componentPercentages.map((componentData) => {
              const component = components.find(
                (c) => c.id === componentData.id
              );
              return component ? (
                <ComponentView
                  key={component.id}
                  component={component}
                  percentageOfTotal={componentData.percentageOfTotal}
                  percentageOfActive={componentData.percentageOfActive}
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
