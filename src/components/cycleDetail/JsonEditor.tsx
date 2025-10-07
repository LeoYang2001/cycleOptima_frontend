import React, { useState, useEffect } from 'react';
import { X, Save, Download, Upload, RotateCcw } from 'lucide-react';

interface JsonEditorProps {
  isOpen: boolean;
  onClose: () => void;
  cycle: any;
  onSave: (updatedCycle: any) => void;
}

function JsonEditor({ isOpen, onClose, cycle, onSave }: JsonEditorProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (cycle && isOpen) {
      const formattedJson = JSON.stringify(cycle, null, 2);
      setJsonInput(formattedJson);
      setHasChanges(false);
      setError(null);
    }
  }, [cycle, isOpen]);

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    setHasChanges(value !== JSON.stringify(cycle, null, 2));
    setError(null);
  };

  const validateAndSave = () => {
    try {
      const parsedCycle = JSON.parse(jsonInput);
      
      // Basic validation - ensure required fields exist
      if (!parsedCycle.id || !parsedCycle.displayName || !parsedCycle.data) {
        throw new Error('Missing required fields: id, displayName, or data');
      }

      // Update timestamp
      parsedCycle.updated_at = new Date().toISOString();
      
      onSave(parsedCycle);
      setHasChanges(false);
      setError(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleDownload = () => {
    try {
      const parsedCycle = JSON.parse(jsonInput);
      const blob = new Blob([JSON.stringify(parsedCycle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
      a.href = url;
      a.download = `${parsedCycle.displayName?.replace(/[^a-zA-Z0-9]/g, '_') || 'cycle'}_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Cannot download invalid JSON');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          setJsonInput(JSON.stringify(parsed, null, 2));
          setHasChanges(true);
          setError(null);
        } catch (err) {
          setError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    if (cycle) {
      setJsonInput(JSON.stringify(cycle, null, 2));
      setHasChanges(false);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasChanges && !error) {
        validateAndSave();
      }
    }
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
      <div className="relative bg-gray-900 rounded-lg border border-gray-700 w-[90%] h-[70%] max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">JSON Editor</h2>
            <div className="text-sm text-gray-400">
              {cycle?.displayName} (Local)
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* File upload */}
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="json-upload"
            />
            <label
              htmlFor="json-upload"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded cursor-pointer transition-colors"
            >
              <Upload size={16} />
              Upload
            </label>
            
            {/* Download */}
            <div
              onClick={handleDownload}
              className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-600/30 hover:bg-indigo-800/30 text-indigo-300 px-3 py-2 rounded transition-colors"
            >
              <Download size={16} />
              Download
            </div>
            
            {/* Reset */}
            <div
              onClick={hasChanges ? handleReset : undefined}
              className={`flex items-center gap-2 bg-orange-900/20 border border-orange-600/30 hover:bg-orange-800/30 text-orange-300 px-3 py-2 rounded transition-colors ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ pointerEvents: !hasChanges ? 'none' : 'auto' }}
            >
              <RotateCcw size={16} />
              Reset
            </div>
            
            {/* Save */}
            <div
              onClick={(!hasChanges || !!error) ? undefined : validateAndSave}
              className={`flex items-center gap-2 bg-green-900/20 border border-green-600/30 hover:bg-green-800/30 text-green-300 px-3 py-2 rounded transition-colors ${(!hasChanges || !!error) ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ pointerEvents: (!hasChanges || !!error) ? 'none' : 'auto' }}
            >
              <Save size={16} />
              Save
            </div>
            
            {/* Close */}
            <div
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </div>
          </div>
        </div>
        
        {/* Status bar */}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {hasChanges ? (
                <div className="flex items-center gap-2 text-yellow-300">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-sm">All changes saved</span>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 text-red-300">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              Press Ctrl+S to save
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4">
          <textarea
            value={jsonInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-black border border-gray-600 rounded p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Edit cycle JSON..."
            spellCheck={false}
          />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-yellow-900/10">
          <div className="flex items-center gap-2 text-yellow-300 text-sm">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span>
              Offline Mode: Changes are saved locally and will not sync with the server until connection is restored.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JsonEditor;