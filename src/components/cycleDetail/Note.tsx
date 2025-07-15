import { Pencil } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

interface NoteProps {
  engineer_note: string;
  setEngineer_note: (text: string) => void;
}

function Note({ engineer_note, setEngineer_note }: NoteProps) {
  const [ifExpand, setifExpand] = useState(false);
  const [noteText, setNoteText] = useState(engineer_note);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state with prop when it changes
  useEffect(() => {
    setNoteText(engineer_note);
  }, [engineer_note]);

  // Save handler (only save if text actually changed)
  const handleSave = () => {
    setifExpand(false); // Close the note after saving
    inputRef.current?.blur();

    // Only call setEngineer_note if the text has actually changed
    if (noteText !== engineer_note) {
      setEngineer_note(noteText);
    }
  };

  // Cancel handler (revert changes and close)
  const handleCancel = () => {
    setNoteText(engineer_note); // Revert to original text
    setifExpand(false);
    inputRef.current?.blur();
  };

  // Auto-focus on input when expanded
  useEffect(() => {
    if (ifExpand) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [ifExpand]);

  // Calculate dynamic width based on noteText length
  // Account for padding, margins, and ensure content is fully visible
  const baseWidth = 120; // Minimum width when expanded
  const charWidth = 8; // Width per character
  const padding = 32; // Left and right padding (px-4 = 16px each side)
  const inputPadding = 16; // Input internal padding (px-2 = 8px each side)
  const buffer = 20; // Extra buffer to ensure full visibility

  const contentWidth = noteText.length * charWidth;
  const totalWidth = baseWidth + contentWidth + padding + inputPadding + buffer;
  const dynamicWidth = Math.max(baseWidth, Math.min(800, totalWidth));

  return (
    <div
      className={`relative flex flex-row items-center justify-start gap-2 left-4 ${
        ifExpand
          ? "px-4 bg-gradient-to-b from-white to-gray-100 rounded-full shadow-lg transition-all duration-300"
          : "w-12 p-0 bg-gradient-to-b from-white to-gray-100 rounded-full shadow-lg transition-all duration-300"
      }`}
      style={{
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        height: 48, // Fixed height
        minWidth: ifExpand ? 200 : 48,
        width: ifExpand ? dynamicWidth : 48,
      }}
    >
      {!ifExpand ? (
        <div
          className="w-12 h-12 cursor-pointer flex items-center justify-center"
          onClick={() => setifExpand(true)}
          aria-label="Expand Note"
        >
          <Pencil size={18} color="#000" />
        </div>
      ) : (
        <div
          className="flex flex-row items-center w-full h-full opacity-0 animate-fadeIn  px-4"
          style={{ animation: "fadeIn 0.3s forwards" }}
        >
          <input
            ref={inputRef}
            className="flex-1 px-2 py-1 rounded bg-gray-100 text-gray-800 focus:outline-none focus:bg-white focus:shadow-sm transition-all text-sm"
            value={noteText}
            placeholder="Type your note here..."
            style={{
              color: "#333",
              fontWeight: 500,
              fontSize: "0.875rem",
              border: "1px solid #d1d5db",
              minWidth: "150px", // Ensure minimum input width
            }}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
              if (e.key === "Escape") {
                handleCancel();
              }
            }}
          />
        </div>
      )}
      {/* FadeIn keyframes */}
      <style>
        {`
          @keyframes fadeIn {
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

export default Note;
