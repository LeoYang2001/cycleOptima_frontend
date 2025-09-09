import React, { useState } from "react";
import { X } from "lucide-react";
import type { SensorTrigger } from "../../types/common/Phase";

interface SensorTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sensorTrigger: SensorTrigger | null) => void;
  currentTrigger?: SensorTrigger | null;
}

function SensorTriggerModal({
  isOpen,
  onClose,
  onSave,
  currentTrigger,
}: SensorTriggerModalProps) {
  const [enabled, setEnabled] = useState(!!currentTrigger);
  const [type, setType] = useState(currentTrigger?.type || "RPM");
  const [pinNumber, setPinNumber] = useState(currentTrigger?.pinNumber || 3);
  const [threshold, setThreshold] = useState(currentTrigger?.threshold || 400);

  const handleSave = () => {
    if (enabled) {
      onSave({ type, pinNumber, threshold });
    } else {
      onSave(null);
    }
    onClose();
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
            className="text-gray-400 hover:text-white"
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
                  className="w-full h-10 bg-[#18181b] border border-gray-600 text-white p-2 rounded"
                >
                  <option value="RPM">RPM</option>
                  <option value="Temperature">Temperature</option>
                  <option value="Pressure">Pressure</option>
                  <option value="Flow">Flow</option>
                  <option value="Level">Level</option>
                </select>
              </div>

              {/* Pin Number */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Pin Number
                </label>
                <input
                  type="number"
                  value={pinNumber}
                  onChange={(e) => setPinNumber(Number(e.target.value))}
                  className="w-full h-10 bg-[#18181b] border border-gray-600 text-white p-2 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter pin number"
                  min="0"
                  max="39"
                />
              </div>

              {/* Threshold */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Threshold Value
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-10 bg-[#18181b] border border-gray-600 text-white p-2 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter threshold value"
                  min="0"
                />
              </div>

              {/* Help Text */}
              <div className="text-gray-400 text-xs">
                The phase will advance when the sensor reading {type === "RPM" ? "reaches" : "exceeds"} the threshold value.
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <div
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </div>
          <div
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensorTriggerModal;