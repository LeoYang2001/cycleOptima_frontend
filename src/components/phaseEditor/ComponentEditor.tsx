import React, { useState, useEffect } from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";
import { getStyle } from "./ComponentLibrary";
import LivePreviewComponent from "../componentEditor/LivePreviewComponent";
import Dropdown from "../common/Dropdown";
import { Trash2 } from "lucide-react";
import Button from "../common/Button";

interface ComponentEditorProps {
  component?: CycleComponent | null;
  setComponents: React.Dispatch<React.SetStateAction<CycleComponent[]>>;
  onClose?: () => void;
}

function ComponentEditor({
  component,
  setComponents,
  onClose,
}: ComponentEditorProps) {
  const ifLibraryComponent = component?.id?.startsWith("library") || false;
  const [label, setLabel] = useState(component?.label || "");
  const [start, setStart] = useState(component?.start || 0);
  const [duration, setDuration] = useState(component?.duration || 0);
  const [isSaving, setIsSaving] = useState(false);

  // Motor configuration states
  const [motorRunningStyle, setMotorRunningStyle] = useState(
    component?.motorConfig?.runningStyle || "Single Direction"
  );
  const [stepTime, setStepTime] = useState(
    component?.motorConfig?.pattern?.[0]?.stepTime || 500
  );
  const [pauseTime, setPauseTime] = useState(
    component?.motorConfig?.pattern?.[0]?.pauseTime || 1000
  );
  const [direction, setDirection] = useState(
    component?.motorConfig?.pattern?.[0]?.direction || "cw"
  );
  const [repeatTimes, setRepeatTimes] = useState(
    component?.motorConfig?.repeatTimes || 1
  );
  const [customSteps, setCustomSteps] = useState(
    component?.motorConfig?.pattern || [
      { stepTime: 1000, pauseTime: 500, direction: "cw" },
    ]
  );

  // Calculate total duration based on motor configuration
  const calculateMotorDuration = () => {
    if (motorRunningStyle === "Custom Pattern") {
      const patternDuration = customSteps.reduce(
        (total, step) => total + step.stepTime + step.pauseTime,
        0
      );
      return patternDuration * repeatTimes;
    } else if (motorRunningStyle === "Toggle Direction") {
      // Toggle Direction has two steps per repeat cycle
      return (stepTime + pauseTime) * 2 * repeatTimes;
    } else {
      // Single Direction
      return (stepTime + pauseTime) * repeatTimes;
    }
  };

  // Motor configuration helper functions
  const addCustomStep = () => {
    setCustomSteps([
      ...customSteps,
      { stepTime: 1000, pauseTime: 500, direction: "cw" },
    ]);
  };

  const removeCustomStep = (index: number) => {
    setCustomSteps(customSteps.filter((_, i) => i !== index));
  };

  const updateCustomStep = (
    index: number,
    field: "stepTime" | "pauseTime" | "direction",
    value: number | string
  ) => {
    setCustomSteps(
      customSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  };

  // Update local state when component changes
  useEffect(() => {
    if (component) {
      setLabel(component.label);
      setStart(component.start || 0);
      setDuration(component.duration || 0);

      // Initialize motor config states
      if (component.compId.startsWith("Motor")) {
        setMotorRunningStyle(
          component.motorConfig?.runningStyle || "Single Direction"
        );
        setStepTime(component.motorConfig?.pattern?.[0]?.stepTime || 500);
        setPauseTime(component.motorConfig?.pattern?.[0]?.pauseTime || 1000);
        setDirection(component.motorConfig?.pattern?.[0]?.direction || "cw");
        setRepeatTimes(component.motorConfig?.repeatTimes || 1);
        setCustomSteps(
          component.motorConfig?.pattern || [
            { stepTime: 1000, pauseTime: 500, direction: "cw" },
          ]
        );
      }
    }
  }, [component]);

  // Additional effect to refresh state after saving
  useEffect(() => {
    if (!isSaving && component) {
      setLabel(component.label);
      setStart(component.start || 0);
      setDuration(component.duration || 0);
    }
  }, [isSaving, component]);

  // Auto-update component duration when motor configuration changes
  useEffect(() => {
    if (component?.compId.startsWith("Motor")) {
      const newDuration = calculateMotorDuration();
      if (newDuration !== duration) {
        setDuration(newDuration);
      }
    }
  }, [
    motorRunningStyle,
    stepTime,
    pauseTime,
    direction,
    repeatTimes,
    customSteps,
    component?.compId,
  ]);

  if (!component) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gray-500">No component selected</span>
      </div>
    );
  }

  const iconStyle = getStyle(component.compId);

  // Check if changes have been made (similar to phase editor)
  const hasChanges =
    label !== (component?.label || "") ||
    start !== (component?.start || 0) ||
    duration !== (component?.duration || 0) ||
    (component?.compId.startsWith("Motor") &&
      (motorRunningStyle !==
        (component?.motorConfig?.runningStyle || "Single Direction") ||
        stepTime !== (component?.motorConfig?.pattern?.[0]?.stepTime || 500) ||
        pauseTime !==
          (component?.motorConfig?.pattern?.[0]?.pauseTime || 1000) ||
        direction !==
          (component?.motorConfig?.pattern?.[0]?.direction || "cw") ||
        repeatTimes !== (component?.motorConfig?.repeatTimes || 1) ||
        JSON.stringify(customSteps) !==
          JSON.stringify(
            component?.motorConfig?.pattern || [
              { stepTime: 1000, pauseTime: 500, direction: "cw" },
            ]
          )));

  // Handle save changes (similar to phase editor)
  const handleSaveChanges = () => {
    if (!component || !hasChanges) return;
    // Set saving state to trigger re-render
    setIsSaving(true);
    //if the component is a library component, do not allow saving changes, instead we call the apis to sync the library component in database
    if (ifLibraryComponent) {
      // Call API to sync library component
      console.log("Syncing library component:", component.id);
    } else {
      // Validate component label is not empty
      if (!label.trim()) {
        alert("Component label cannot be empty. Please enter a valid label.");
        return;
      }

      // Update the component in the components array
      setComponents((prev) =>
        prev.map((comp) =>
          comp.id === component.id
            ? {
                ...comp,
                label,
                start,
                duration,
                ...(comp.compId.startsWith("Motor") && {
                  motorConfig: {
                    repeatTimes,
                    pattern:
                      motorRunningStyle === "Custom Pattern"
                        ? customSteps
                        : motorRunningStyle === "Toggle Direction"
                        ? [
                            { stepTime, pauseTime, direction },
                            { stepTime, pauseTime, direction: direction === "cw" ? "ccw" : "cw" }
                          ]
                        : [{ stepTime, pauseTime, direction }],
                    runningStyle: motorRunningStyle,
                  },
                }),
              }
            : comp
        )
      );
    }
    setIsSaving(false);
    if (onClose) {
      onClose();
    }
    // Reset saving state after 1 second to trigger re-render
    // setTimeout(() => {
    //   // Call onClose callback if provided to close the modal after saving
    // }, 10000);
  }; // Add keyboard shortcut for saving (Ctrl+S)
  
  return (
    <div className=" w-full h-full  flex flex-col">
      <header
        style={{
          borderColor: "#333",
        }}
        className=" flex flex-row items-center border-b-1    p-5 "
      >
        <div
          style={{
            width: 42,
            height: 42,
            backgroundColor: `${iconStyle.color}`,
            borderRadius: 8,
          }}
          className=" flex justify-center items-center"
        >
          {iconStyle.icon}
        </div>
        <div className="flex flex-col ml-3 ">
          <span className="text-xl font-semibold text-white ">
            {component?.label}
          </span>
          <span className="text-sm  text-white opacity-70">
            {component?.compId} Configuration
          </span>
        </div>

        {/* Changes indicator and save button */}
        <div className="flex items-center gap-4 ml-auto">
          {hasChanges ? (
            <div onClick={handleSaveChanges} className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-300 text-sm font-medium">
                  Unsaved changes
                </span>
              </div>
              <span className="text-yellow-400 text-xs opacity-70">Click</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-green-900/20 border border-green-600/30 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-300 text-sm font-medium">
                All changes saved
              </span>
            </div>
          )}
        </div>
      </header>
      <section className="flex-1 overflow-y-auto p-5">
        {isSaving ? (
          // Loading template during save
          <div className="flex flex-col gap-8">
            <span className="text-lg font-semibold text-white">
              Basic Configuration
            </span>
            <div className="flex flex-row justify-between items-center gap-6">
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-sm text-white opacity-70">
                  Custom Label
                </span>
                <div
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  className="w-full h-10 bg-transparent text-white p-2 my-2 flex items-center justify-center"
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-sm text-white opacity-70">
                  Start Time (ms)
                </span>
                <div
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  className="w-full h-10 bg-transparent text-white p-2 my-2 flex items-center justify-center"
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-sm text-white opacity-70">
                  Duration (ms)
                  {component.compId.startsWith("Motor") && (
                    <span className="text-xs text-gray-400 ml-2">
                      (Auto-calculated)
                    </span>
                  )}
                </span>
                <div
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  className="w-full h-10 bg-transparent text-white p-2 my-2 flex items-center justify-center"
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            {/* Motor Configuration Loading */}
            {component.compId.startsWith("Motor") && (
              <div className="flex-1 w-full border border-white p-4 gap-8">
                <span className="text-lg font-semibold text-white mb-4 block">
                  Motor Configuration
                </span>
                <div className="space-y-4">
                  <div className="flex items-center justify-center h-20 bg-gray-800/50 rounded">
                    <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Normal form fields
          <div className="flex flex-col gap-8">
            <span className="text-lg font-semibold text-white">
              Basic Configuration
            </span>
            <div className="flex flex-row justify-between items-center gap-6">
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-sm text-white opacity-70">
                  Custom Label
                </span>
                <input
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  type="text"
                  className="w-full h-10 bg-transparent text-white p-2 my-2"
                  placeholder="Enter custom label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-sm text-white opacity-70">
                  Start Time (ms)
                </span>
                <input
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  type="number"
                  className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter start time"
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-sm text-white opacity-70">
                  Duration (ms)
                  {component.compId.startsWith("Motor") && (
                    <span className="text-xs text-gray-400 ml-2">
                      (Auto-calculated)
                    </span>
                  )}
                </span>
                <input
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  type="number"
                  className={`w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    component.compId.startsWith("Motor")
                      ? "opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder="Enter duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  disabled={component.compId.startsWith("Motor")}
                />
              </div>
            </div>
          </div>
        )}
        {component.compId.startsWith("Motor") && (
          <div className="flex-1 w-full  gap-8 mt-4">
            <span className="text-lg font-semibold text-white mb-4 block">
              Motor Configuration
            </span>

            {/* Motor Running Style Dropdown */}
            <div className="mb-4">
              <label className="text-white text-sm font-medium mb-2 block">
                Motor Running Style
              </label>
              <Dropdown
                value={motorRunningStyle}
                options={[
                  "Single Direction",
                  "Toggle Direction",
                  "Custom Pattern",
                ]}
                setValue={setMotorRunningStyle}
                className="w-full bg-[#1a1a1a] border border-gray-600 text-white"
              />
            </div>

            {/* Repeat Times (shown for all motor types) */}
            <div className="mb-4">
              <label className="text-white text-sm font-medium mb-2 block">
                Repeat Times (for entire pattern)
              </label>
              <input
                type="number"
                value={repeatTimes}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: 4,
                  border: "1px solid #333",
                }}
                className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onChange={(e) => setRepeatTimes(Number(e.target.value))}
                placeholder="Enter repeat times"
                min="1"
              />
            </div>

            {/* Single Direction Configuration */}
            {motorRunningStyle === "Single Direction" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Step Time (ms)
                    </label>
                    <input
                      type="number"
                      value={stepTime}
                      onChange={(e) => setStepTime(Number(e.target.value))}
                      style={{
                        backgroundColor: "#18181b",
                        borderRadius: 4,
                        border: "1px solid #333",
                      }}
                      className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter step time"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Pause Time (ms)
                    </label>
                    <input
                      type="number"
                      value={pauseTime}
                      onChange={(e) => setPauseTime(Number(e.target.value))}
                      style={{
                        backgroundColor: "#18181b",
                        borderRadius: 4,
                        border: "1px solid #333",
                      }}
                      className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter pause time"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Direction
                    </label>
                    <Dropdown
                      value={direction}
                      options={["cw", "ccw"]}
                      setValue={setDirection}
                      className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  Total Duration: {calculateMotorDuration()} ms
                </div>
              </div>
            )}

            {/* Toggle Direction Configuration */}
            {motorRunningStyle === "Toggle Direction" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Step Time (ms)
                    </label>
                    <input
                      type="number"
                      value={stepTime}
                      onChange={(e) => setStepTime(Number(e.target.value))}
                      style={{
                        backgroundColor: "#18181b",
                        borderRadius: 4,
                        border: "1px solid #333",
                      }}
                      className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter step time"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Pause Time (ms)
                    </label>
                    <input
                      type="number"
                      value={pauseTime}
                      onChange={(e) => setPauseTime(Number(e.target.value))}
                      style={{
                        backgroundColor: "#18181b",
                        borderRadius: 4,
                        border: "1px solid #333",
                      }}
                      className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter pause time"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Direction
                    </label>
                    <Dropdown
                      value={direction}
                      options={["cw", "ccw"]}
                      setValue={setDirection}
                      className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  Total Duration: {calculateMotorDuration()} ms
                </div>
              </div>
            )}

            {/* Custom Pattern Configuration */}
            {motorRunningStyle === "Custom Pattern" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-medium">
                    Custom Steps
                  </span>
                  <Button func={addCustomStep} label="Add Step" />
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {customSteps.map((step, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: "#27272a",
                        borderRadius: 8,
                      }}
                      className="flex items-center flex-row  gap-3  p-3 bg-gray-800 rounded"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-gray-300 text-xs">
                            Step Time (ms)
                          </label>
                          <input
                            type="number"
                            value={step.stepTime}
                            onChange={(e) =>
                              updateCustomStep(
                                index,
                                "stepTime",
                                Number(e.target.value)
                              )
                            }
                            style={{
                              backgroundColor: "#18181b",
                              borderRadius: 4,
                              border: "1px solid #333",
                            }}
                            className="  w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-gray-300 text-xs">
                            Pause Time (ms)
                          </label>
                          <input
                            type="number"
                            value={step.pauseTime}
                            onChange={(e) =>
                              updateCustomStep(
                                index,
                                "pauseTime",
                                Number(e.target.value)
                              )
                            }
                            style={{
                              backgroundColor: "#18181b",
                              borderRadius: 4,
                              border: "1px solid #333",
                            }}
                            className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-gray-300 text-xs">
                            Direction
                          </label>
                          <Dropdown
                            value={step.direction}
                            options={["cw", "ccw"]}
                            setValue={(value) =>
                              updateCustomStep(index, "direction", value)
                            }
                            className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div
                        onClick={() => removeCustomStep(index)}
                        className=" px-3 py-2 rounded cursor-pointer hover:opacity-100 opacity-50 transition-opacity duration-200  flex items-center justify-center"
                      >
                        <Trash2 size={20} color="red" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-gray-400 text-sm">
                  Total Duration: {calculateMotorDuration()} ms
                </div>
              </div>
            )}
          </div>
        )}
        {component.compId.startsWith("Motor") && (
          <LivePreviewComponent
            component={component}
            duration={calculateMotorDuration()}
            startTime={start}
            motorConfig={{
              runningStyle: motorRunningStyle,
              repeatTimes: repeatTimes,
              pattern:
                motorRunningStyle === "Custom Pattern"
                  ? customSteps
                  : [{ stepTime, pauseTime, direction }],
            }}
          />
        )}
      </section>
    </div>
  );
}

export default ComponentEditor;
