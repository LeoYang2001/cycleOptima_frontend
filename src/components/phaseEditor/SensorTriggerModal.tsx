import React, { useState } from "react";
import { X } from "lucide-react";
import type { SensorTrigger } from "../../types/common/Phase";

interface SensorTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sensorTrigger: SensorTrigger | null) => void;
  currentTrigger?: SensorTrigger | null;
}

// Hardcoded mapping of sensor types to pin numbers
const SENSOR_PIN_MAP: Record<string, number> = {
  RPM: 1,
  Pressure: 3,
};

function SensorTriggerModal({
  isOpen,
  onClose,
  onSave,
  currentTrigger,
}: SensorTriggerModalProps) {
  const [enabled, setEnabled] = useState(!!currentTrigger);
  const [type, setType] = useState(currentTrigger?.type || "RPM");
  const [threshold, setThreshold] = useState(currentTrigger?.threshold || 400);

  // Get pin number automatically based on sensor type
  const pinNumber = SENSOR_PIN_MAP[type];

  const handleSave = () => {
    if (enabled) {
      onSave({ type, pinNumber, threshold });
    } else {
      onSave(null);
    }
    onClose();
  };

  const getSensorUnit = (sensorType: string): string => {
    const units: Record<string, string> = {
      RPM: "RPM",
      Pressure: "Hz",
    };
    return units[sensorType] || "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-gray-600 rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Sensor Trigger Configuration
          </h3>
          <div
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <X size={20} />
          </div>
        </div>

        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableTrigger"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="enableTrigger" className="text-white text-sm">
              Enable Sensor Trigger
            </label>
          </div>

          {enabled && (
            <>
              {/* Sensor Type */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Sensor Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 bg-[#18181b] border border-gray-600 text-white p-2 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="RPM">RPM Sensor</option>
                  <option value="Pressure">Pressure Sensor</option>
                </select>

                {/* Show pin number as read-only info */}
                <div className="text-gray-400 text-xs mt-1">Pin: {pinNumber}</div>
              </div>

              {/* Threshold */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Threshold Value ({getSensorUnit(type)})
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-10 bg-[#18181b] border border-gray-600 text-white p-2 rounded focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder={`Enter threshold value in ${getSensorUnit(type)}`}
                  min="0"
                />
              </div>

              {/* Help Text */}
              <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
                <div className="text-gray-300 text-xs">
                  <strong>Configuration:</strong>
                  <br />
                  • Sensor: {type} (Pin {pinNumber})
                  <br />
                  • Trigger: When reading{" "}
                  {type === "RPM" ? "reaches" : "exceeds"} {threshold}{" "}
                  {getSensorUnit(type)}
                  <br />
                  • Action: Advance to next phase
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <div
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </div>
          <div
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Save
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensorTriggerModal;