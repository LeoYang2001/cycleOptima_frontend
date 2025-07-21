import { DndContext, useDraggable } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useState, useRef, useCallback } from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";
import { getStyle } from "../phaseEditor/ComponentLibrary";
import { generateTicksWithStartTime } from "../../utils/generateTicks";
import { Pause, RotateCcw, RotateCw } from "lucide-react";

interface DraggableComponentProps {
  position: { x: number; y: number };
  onPositionChange: (percentage: number) => void;
  component: CycleComponent; // Replace with actual type if available
}

function DraggableComponent({
  position,
  onPositionChange,
  component,
}: DraggableComponentProps) {
  const compStyle = getStyle(component.compId, 24); // Assuming getStyle is defined elsewhere
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "demo",
    data: {
      type: "type1",
    },
  });

  const draggableStyle = transform
    ? {
        transform: `translate3d(${transform.x + position.x}px, ${
          position.y
        }px, 0)`,
        zIndex: 1,
        position: "absolute" as const,
      }
    : {
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: "absolute" as const,
      };

  return (
    <div
      className="cursor-grab h-full flex justify-center items-center active:cursor-grabbing"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        ...draggableStyle,
        backgroundColor: compStyle.color,
        borderRadius: 8,
        width: 100,
      }}
    >
      {compStyle.icon}
    </div>
  );
}

interface LivePreviewComponentProps {
  component: CycleComponent; // Replace with actual type if available
  duration?: number; // Component duration for tick generation
  startTime?: number; // Component start time for tick generation
  motorConfig?: {
    runningStyle: string;
    repeatTimes: number;
    pattern: Array<{ stepTime: number; pauseTime: number; direction: string }>;
  };
}

function LivePreviewComponent({
  component,
  duration = 0,
  startTime = 0,
  motorConfig,
}: LivePreviewComponentProps) {
  // Generate ticks based on component duration and start time
  const totalDuration =
    (startTime || 0) + (duration || component.duration || 0);
  const ticks = generateTicksWithStartTime(
    Number(totalDuration),
    startTime || 0
  );

  const motorRunningQueue = [];

  if (motorConfig?.runningStyle === "Toggle Direction") {
    const init_dir = motorConfig.pattern[0].direction;
    const reverse_dir = init_dir === "cw" ? "ccw" : "cw";
    // Generate toggle direction pattern
    for (let i = 0; i < (motorConfig?.repeatTimes || 1); i++) {
      motorRunningQueue.push(
        {
          stepTime: motorConfig.pattern[0].stepTime,
          pauseTime: motorConfig.pattern[0].pauseTime,
          direction: init_dir,
        },
        {
          stepTime: motorConfig.pattern[0].stepTime,
          pauseTime: motorConfig.pattern[0].pauseTime,
          direction: reverse_dir,
        }
      );
    }
  } else {
    // First, build the queue with raw values
    for (let i = 0; i < (motorConfig?.repeatTimes || 1); i++) {
      motorRunningQueue.push(
        ...(motorConfig?.pattern.map((step) => ({
          stepTime: step.stepTime,
          pauseTime: step.pauseTime,
          direction: step.direction,
        })) || [])
      );
    }
  }

  console.log("motorRunningQueue: ", motorRunningQueue);
  // Calculate total duration of all steps
  const totalMotorDuration = motorRunningQueue.reduce(
    (total, step) => total + step.stepTime + step.pauseTime,
    0
  );

  // Convert to percentages
  const motorRunningQueueWithPercentages = motorRunningQueue.map((step) => ({
    stepTimePercentage:
      totalMotorDuration > 0 ? (step.stepTime / totalMotorDuration) * 100 : 0,
    pauseTimePercentage:
      totalMotorDuration > 0 ? (step.pauseTime / totalMotorDuration) * 100 : 0,
    direction: step.direction,
  }));

  return (
    <div className=" flex flex-col justify-center w-full  ">
      {/* <div className="text-sm text-gray-600">
        Position: {percentage.toFixed(1)}%
      </div> */}
      <span className=" text-lg text-white font-semibold my-2">
        Live Preview
      </span>
      <div
        style={{
          height: 160,
          backgroundColor: "#27272a",
          borderRadius: 8,
        }}
        className=" w-full  relative flex flex-col gap-2 justify-center items-center px-10 py-6"
      >
        {/* Ticks Display */}
        {ticks.length > 0 && (
          <div className="w-full flex justify-between items-center mb-4">
            {ticks.slice(1).map((tick, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-px bg-gray-400"></div>
                <span className="text-sm text-gray-400 mt-1">{tick.label}</span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            height: 40,
          }}
          className=" w-full  flex flex-row  overflow-hidden rounded-md"
        >
          {motorRunningQueueWithPercentages.map((step, index) => {
            const ifPause = step.pauseTimePercentage > 0;
            const stepWidthTooSmall = step.stepTimePercentage < 2; // Hide icon if width less than 2%
            const pauseWidthTooSmall = step.pauseTimePercentage < 2; // Hide icon if width less than 2%
            return (
              <>
                <div
                  style={{
                    width: `${step.stepTimePercentage}%`,
                    backgroundColor:
                      step.direction === "cw" ? "#10b981" : "#f59e0b",
                    height: "100%",
                  }}
                  className="flex items-center justify-center p-2"
                >
                  {!stepWidthTooSmall &&
                    (step.direction === "cw" ? (
                      <RotateCw size={16} className="text-white" />
                    ) : (
                      <RotateCcw size={16} className="text-white" />
                    ))}
                </div>
                {ifPause && (
                  <div
                    style={{
                      width: `${step.pauseTimePercentage}%`,
                      backgroundColor: "#9E9E9E",
                      height: "100%",
                    }}
                    className="flex items-center justify-center p-2"
                  >
                    {!pauseWidthTooSmall && (
                      <Pause size={16} className="text-white" />
                    )}
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LivePreviewComponent;
