import React, { useState } from 'react';
import { X, Upload, FileText, AlertTriangle } from 'lucide-react';
import type { LocalCycle } from '../../types/common/LocalCycle';

interface JsonUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (cycle: LocalCycle) => void;
  existingCycles: LocalCycle[];
}

function JsonUploadModal({ isOpen, onClose, onUpload, existingCycles }: JsonUploadModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'paste' | 'file'>('paste');

  const validateCycle = (cycle: any): { isValid: boolean; error?: string } => {
    // Check required fields
    if (!cycle.id || !cycle.displayName || !cycle.data) {
      return { isValid: false, error: 'Missing required fields: id, displayName, or data' };
    }

    // Check if ID starts with "local-cycle"
    if (!cycle.id.startsWith('local-cycle')) {
      return { isValid: false, error: 'Cycle ID must start with "local-cycle"' };
    }

    // Check for duplicate ID
    const isDuplicateId = existingCycles.some(existing => existing.id === cycle.id);
    if (isDuplicateId) {
      return { isValid: false, error: `A cycle with ID "${cycle.id}" already exists` };
    }

    // Check for duplicate name
    const isDuplicateName = existingCycles.some(
      existing => existing.displayName.toLowerCase() === cycle.displayName.toLowerCase()
    );
    if (isDuplicateName) {
      return { isValid: false, error: `A cycle with name "${cycle.displayName}" already exists` };
    }

    // Validate data structure
    if (!cycle.data.phases || !Array.isArray(cycle.data.phases)) {
      return { isValid: false, error: 'Cycle data must contain a phases array' };
    }

    // Validate status
    const validStatuses = ['draft', 'tested', 'production'];
    if (!validStatuses.includes(cycle.status)) {
      return { isValid: false, error: 'Status must be one of: draft, tested, production' };
    }

    return { isValid: true };
  };

  const handleJsonPaste = (value: string) => {
    setJsonInput(value);
    setError(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setError('Please select a valid JSON file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          setJsonInput(content);
          setError(null);
        } catch (err) {
          setError('Failed to read file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUpload = () => {
    try {
      if (!jsonInput.trim()) {
        setError('Please provide JSON content');
        return;
      }

      const parsedCycle = JSON.parse(jsonInput);
      
      // Validate the cycle
      const validation = validateCycle(parsedCycle);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid cycle data');
        return;
      }

      // Ensure required timestamps
      const cycle: LocalCycle = {
        ...parsedCycle,
        created_at: parsedCycle.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        engineer_note: parsedCycle.engineer_note || '',
        summary: parsedCycle.summary || ''
      };

      onUpload(cycle);
      handleClose();
      
    } catch (err) {
      setError('Invalid JSON format. Please check your syntax.');
    }
  };

  const handleClose = () => {
    setJsonInput('');
    setError(null);
    setUploadMethod('paste');
    onClose();
  };

  const generateSampleJson = () => {
    const sample = {
      id: `local-cycle-${Date.now()}`,
      displayName: "Sample Cycle",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      engineer_note: "Sample engineer note",
      summary: "Sample cycle summary",
      data: {
        phases: [
          {
            id: "sample-phase-1",
            name: "Sample Phase",
            color: "4ADE80",
            startTime: 0,
            components: [
              {
                id: "sample-component-1",
                label: "Sample Component",
                start: 0,
                compId: "Retractor",
                duration: 30000,
                motorConfig: null
              }
            ]
          }
        ]
      }
    };
    setJsonInput(JSON.stringify(sample, null, 2));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-lg border border-gray-700 w-[90%] h-[70%] max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Upload className="text-blue-400" size={20} />
            <h2 className="text-xl font-semibold text-white">Upload Cycle JSON</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Method toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <div
                onClick={() => setUploadMethod('paste')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
                  uploadMethod === 'paste'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText size={14} />
                Paste JSON
              </div>
              <div
                onClick={() => setUploadMethod('file')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
                  uploadMethod === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload size={14} />
                Upload File
              </div>
            </div>
            
            <div
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {uploadMethod === 'file' ? (
            <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed border-gray-600 rounded-lg">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="json-file-input"
              />
              <label
                htmlFor="json-file-input"
                className="flex flex-col items-center gap-4 cursor-pointer hover:bg-gray-800/50 p-8 rounded-lg transition-colors"
              >
                <Upload size={48} className="text-gray-400" />
                <div className="text-center">
                  <div className="text-white font-medium mb-1">Click to upload JSON file</div>
                  <div className="text-gray-400 text-sm">Or drag and drop a .json file here</div>
                </div>
              </label>
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 font-medium">Paste JSON Content:</label>
                <div
                  onClick={generateSampleJson}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Generate Sample JSON
                </div>
              </div>
              
              <textarea
                value={jsonInput}
                onChange={(e) => handleJsonPaste(e.target.value)}
                placeholder="Paste your cycle JSON here..."
                className="flex-1 bg-black border border-gray-600 rounded p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                spellCheck={false}
              />
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg text-red-300">
              <AlertTriangle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {/* Requirements */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <h4 className="text-white font-medium mb-2">Requirements:</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Cycle ID must start with "local-cycle"</li>
              <li>• Cycle name must be unique</li>
              <li>• Must contain valid phases array</li>
              <li>• Status must be: draft, tested, or production</li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <div
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </div>
          <button
            onClick={handleUpload}
            disabled={!jsonInput.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            Upload Cycle
          </button>
        </div>
      </div>
    </div>
  );
}

export default JsonUploadModal;