// Create new file: src/components/componentEditor/JsonEditorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import type { MotorStep } from '../../types/common/Phase';


interface JsonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (steps: MotorStep[]) => void;
  initialSteps: MotorStep[];
  componentLabel: string;
}

function JsonEditorModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialSteps, 
  componentLabel 
}: JsonEditorModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize JSON input when modal opens
  useEffect(() => {
    if (isOpen) {
      setJsonInput(JSON.stringify(initialSteps, null, 2));
      setError(null);
      setHasChanges(false);
    }
  }, [isOpen, initialSteps]);

  // Check for changes
  useEffect(() => {
    const originalJson = JSON.stringify(initialSteps, null, 2);
    setHasChanges(jsonInput !== originalJson);
  }, [jsonInput, initialSteps]);

  const validateAndParseJson = (): MotorStep[] | null => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Validate that it's an array
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of motor steps');
        return null;
      }

      // Validate each step
      for (let i = 0; i < parsed.length; i++) {
        const step = parsed[i];
        
        if (typeof step !== 'object' || step === null) {
          setError(`Step ${i + 1}: Must be an object`);
          return null;
        }

        if (typeof step.stepTime !== 'number' || step.stepTime < 0) {
          setError(`Step ${i + 1}: stepTime must be a positive number`);
          return null;
        }

        if (typeof step.pauseTime !== 'number' || step.pauseTime < 0) {
          setError(`Step ${i + 1}: pauseTime must be a positive number`);
          return null;
        }

        if (!['cw', 'ccw'].includes(step.direction)) {
          setError(`Step ${i + 1}: direction must be "cw" or "ccw"`);
          return null;
        }
      }

      if (parsed.length === 0) {
        setError('Pattern must contain at least one step');
        return null;
      }

      setError(null);
      return parsed;
    } catch (err) {
      setError('Invalid JSON syntax');
      return null;
    }
  };

  const handleSave = () => {
    const parsedSteps = validateAndParseJson();
    if (parsedSteps) {
      onSave(parsedSteps);
      onClose();
    }
  };

  const handleReset = () => {
    setJsonInput(JSON.stringify(initialSteps, null, 2));
    setError(null);
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-lg border border-gray-700 w-[90%] h-[80%] max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Motor Pattern JSON Editor</h2>
            <p className="text-gray-400 text-sm">
              Editing custom pattern for: {componentLabel}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
        
            
            <div
              onClick={handleReset}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Reset to original"
            >
              <RotateCcw size={16} />
            </div>
            
            <div
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex flex-col flex-1 gap-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 font-medium">Motor Pattern JSON:</label>
              <div className="text-xs text-gray-400">
                {hasChanges && '● Unsaved changes'}
              </div>
            </div>
            
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Enter motor pattern JSON..."
              className="flex-1 bg-black border border-gray-600 rounded p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              spellCheck={false}
            />
          </div>
          
          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-red-300 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {/* Schema documentation */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <h4 className="text-white font-medium mb-2">Schema:</h4>
            <pre className="text-gray-400 text-xs overflow-x-auto">
{`[
  {
    "stepTime": number,    // Duration motor runs (ms)
    "pauseTime": number,   // Duration motor pauses (ms)  
    "direction": "cw"|"ccw" // Motor direction
  }
]`}
            </pre>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <div
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </div>
          <div
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            Save JSON
          </div>
        </div>
      </div>
    </div>
  );
}

export default JsonEditorModal;