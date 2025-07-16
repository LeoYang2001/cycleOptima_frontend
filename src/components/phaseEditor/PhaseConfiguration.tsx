import React, { useState, useEffect } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

interface PhaseConfigurationProps {
  phaseName?: string;
  setPhaseName?: (name: string) => void;
  startTime?: number; // Always in milliseconds
  setStartTime?: (time: number) => void; // Always set in milliseconds
}

type TimeUnit = "ms" | "sec" | "min";

interface UnitConfig {
  label: string;
  multiplier: number; // How many ms in one unit
}

const TIME_UNITS: Record<TimeUnit, UnitConfig> = {
  ms: { label: "Milliseconds", multiplier: 1 },
  sec: { label: "Seconds", multiplier: 1000 },
  min: { label: "Minutes", multiplier: 60000 },
};

function PhaseConfiguration({
  phaseName,
  setPhaseName,
  startTime = 0,
  setStartTime,
}: PhaseConfigurationProps) {
  const [selectedUnit, setSelectedUnit] = useState<TimeUnit>("sec");
  const [sliderValue, setSliderValue] = useState(0);

  // Convert milliseconds to the selected unit and update slider
  useEffect(() => {
    const unitMultiplier = TIME_UNITS[selectedUnit].multiplier;
    const valueInUnit = startTime / unitMultiplier;
    setSliderValue(Math.min(100, Math.max(0, valueInUnit))); // Clamp between 0-100
  }, [startTime, selectedUnit]);

  // Handle slider change
  const handleSliderChange = (value: number | number[]) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    setSliderValue(numericValue);
    if (setStartTime) {
      const unitMultiplier = TIME_UNITS[selectedUnit].multiplier;
      const timeInMs = numericValue * unitMultiplier;
      setStartTime(timeInMs);
    }
  };

  // Handle unit change
  const handleUnitChange = (newUnit: TimeUnit) => {
    setSelectedUnit(newUnit);
    // The useEffect will automatically update the slider value based on the new unit
  };

  // Format the display value
  const formatDisplayValue = (value: number, unit: TimeUnit) => {
    return `${value.toFixed(unit === "ms" ? 0 : 1)} ${unit}`;
  };
  return (
    <div className="w-full h-full py-4 flex flex-col justify-start gap-12">
      <div>
        <span className="text-white opacity-70">Phase name</span>
        <input
          value={phaseName}
          style={{
            backgroundColor: "#18181b",
            borderRadius: 8,
            border: "1px solid #333",
          }}
          type="text"
          className="w-full h-10 bg-transparent text-white p-2 my-2"
          placeholder="Enter phase name"
          onChange={(e) => {
            if (setPhaseName) {
              setPhaseName(e.target.value);
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <span className="text-white opacity-70">Pause before phase</span>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 opacity-70">
              {formatDisplayValue(sliderValue, selectedUnit)}
            </span>
            {/* Unit Selector Dropdown */}
            <select
              value={selectedUnit}
              onChange={(e) => handleUnitChange(e.target.value as TimeUnit)}
              className="bg-zinc-800 text-white border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
            >
              {Object.entries(TIME_UNITS).map(([unit, config]) => (
                <option key={unit} value={unit}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>0 {selectedUnit}</span>
            <span>100 {selectedUnit}</span>
          </div>
          <Slider
            railStyle={{ backgroundColor: "#ccc", height: 8 }}
            trackStyle={{ backgroundColor: "#666", height: 8 }}
            handleStyle={{
              backgroundColor: "#999",
              borderColor: "#333",
              opacity: 1,
              height: 16,
              width: 16,
              top: 6,
            }}
            value={sliderValue}
            onChange={handleSliderChange}
            min={0}
            max={100}
            step={selectedUnit === "ms" ? 1 : 0.1}
          />
        </div>
      </div>
    </div>
  );
}

export default PhaseConfiguration;
