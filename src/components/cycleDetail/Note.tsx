import { Pencil, Check, CircleX, X } from "lucide-react";
import React, { useState, useRef } from "react";

function Note({ text }: { text: string }) {
  const [ifExpand, setifExpand] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save handler (simulate save)
  const handleSave = () => {
    setIsEditing(false);
    inputRef.current?.blur();
    // TODO: Add actual save logic here
  };

  // Calculate dynamic width based on noteText length
  const dynamicWidth = Math.max(200, Math.min(800, 8 * (noteText.length + 1)));

  return (
    <div
      className={`relative flex flex-col items-start justify-start gap-2 left-4 ${
        ifExpand
          ? "p-4 h-32 bg-gradient-to-b from-white to-gray-100 rounded-3xl shadow-lg transition-all duration-300 "
          : "w-12 h-12 p-0 bg-gradient-to-b from-white to-gray-100 rounded-full shadow-lg transition-all duration-300"
      }`}
      style={{
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        minWidth: ifExpand ? 120 : 48,
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
          className="flex flex-col w-full h-full opacity-0 animate-fadeIn"
          style={{ animation: "fadeIn 0.3s forwards" }}
        >
          <span className="text-gray-800 font-bold mb-1">Note</span>
          {isEditing ? (
            <input
              ref={inputRef}
              className="w-full px-2 py-1 rounded bg-gray-100 border border-gray-300 text-gray-800 focus:outline-none focus:border-blue-400 transition-all text-sm"
              value={noteText}
              placeholder="Type your note here..."
              style={{ color: "#333", fontWeight: 500, fontSize: "0.875rem" }} // text-sm = 14px
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
              autoFocus
            />
          ) : (
            <span
              className="text-gray-500   px-2 py-1 text-sm cursor-pointer"
              onClick={() => setIsEditing(true)}
              tabIndex={0}
              onFocus={() => setIsEditing(true)}
              style={{
                color: noteText ? "#555" : "#9499a1",
                fontSize: "0.875rem",
                fontWeight: 500,
              }} // text-sm = 14px
            >
              {noteText || (
                <span className="text-gray-499">Type your note here...</span>
              )}
            </span>
          )}
          <div className="ml-auto mt-auto   flex gap-2">
            {!isEditing ? (
              <div
                style={{
                  width: 28,
                  height: 28,
                }}
                className=" bg-black rounded-full cursor-pointer flex justify-center items-center"
                aria-label="Edit Note"
                onClick={() => setifExpand(false)}
              >
                <X size={14} color="#fff" />
              </div>
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                }}
                className=" bg-black rounded-full flex justify-center items-center"
                aria-label="Save Note"
                onClick={handleSave}
              >
                <Check size={14} color="#fff" />
              </div>
            )}
          </div>
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
