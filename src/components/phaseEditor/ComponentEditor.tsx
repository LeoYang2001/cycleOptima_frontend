import React, { useState, useEffect } from "react";
import type { CycleComponent } from "../../types/common/CycleComponent";
import { getStyle } from "./ComponentLibrary";

interface ComponentEditorProps {
  component?: CycleComponent | null;
  setComponents: React.Dispatch<React.SetStateAction<CycleComponent[]>>;
}

function ComponentEditor({ component, setComponents }: ComponentEditorProps) {
  const ifLibraryComponent = component?.id?.startsWith("library") || false;
  const [label, setLabel] = useState(component?.label || "");
  const [start, setStart] = useState(component?.start || 0);
  const [duration, setDuration] = useState(component?.duration || 0);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when component changes
  useEffect(() => {
    if (component) {
      setLabel(component.label);
      setStart(component.start || 0);
      setDuration(component.duration || 0);
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
    duration !== (component?.duration || 0);

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
          comp.id === component.id ? { ...comp, label, start, duration } : comp
        )
      );

      // Update the component object to reflect the new saved values
      // This ensures the hasChanges comparison works correctly after saving
      Object.assign(component, { label, start, duration });
    }

    // Reset saving state after 1 second to trigger re-render
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  }; // Add keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSaveChanges();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, handleSaveChanges]);

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
            <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-300 text-sm font-medium">
                  Unsaved changes
                </span>
              </div>
              <span className="text-yellow-400 text-xs opacity-70">Ctrl+S</span>
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
                </span>
                <input
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  type="number"
                  className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default ComponentEditor;
