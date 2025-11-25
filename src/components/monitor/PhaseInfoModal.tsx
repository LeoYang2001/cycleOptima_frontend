import React from "react";

interface PhaseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhase: {
    id: string;
    name: string;
    color: string;
    duration: number;
    index: number;
    components?: Array<{
      id: string;
      label: string;
      start_ms: number;
      duration_ms: number;
      has_motor: boolean;
    }>;
  } | null;
  cycleStatus?: {
    current_phase_index: number;
    total_phases: number;
    phase_elapsed_ms?: number;
  } | null;
  totalPhases: number;
  onSkipToPhase: (index: number) => void;
  formatElapsedTime: (milliseconds: number) => string;
  phaseElapsedMs?: number;
}

const PhaseInfoModal: React.FC<PhaseInfoModalProps> = ({
  isOpen,
  onClose,
  selectedPhase,
  cycleStatus,
  totalPhases,
  onSkipToPhase,
  formatElapsedTime,
  phaseElapsedMs,
}) => {
  if (!isOpen || !selectedPhase) return null;

  const handleSkipClick = () => {
    if (cycleStatus?.current_phase_index === 0) {
      alert("Cannot skip phases while idle");
      return;
    }
    if (cycleStatus?.current_phase_index && cycleStatus?.current_phase_index >= selectedPhase.index) {
      alert("Cannot skip to current or previous phases");
      return;
    }
    onSkipToPhase(selectedPhase.index - 1);
    onClose();
  };

  const isSkipDisabled = 
    cycleStatus?.current_phase_index === 0 ||
    (cycleStatus?.current_phase_index !== undefined && cycleStatus?.current_phase_index >= selectedPhase.index);

  const getSkipButtonTitle = () => {
    if (cycleStatus?.current_phase_index === 0) {
      return "Cannot skip phases while idle";
    }
    if (cycleStatus?.current_phase_index && cycleStatus?.current_phase_index >= selectedPhase.index) {
      return "Cannot skip to current or previous phases";
    }
    return `Skip to ${selectedPhase.name}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: selectedPhase.color,
                borderRadius: "8px"
              }}
            />
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
              {selectedPhase.name}
            </h2>
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>
            Phase {selectedPhase.index} of {cycleStatus?.total_phases || totalPhases}
          </div>
        </div>

        {/* Phase Duration */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px"
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            Total Duration
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#fff" }}>
            {formatElapsedTime(selectedPhase.duration)}
          </div>
        </div>

        {/* Phase Timeline Visualization */}
        <div  style={{ marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600" }}>
            Phase Timeline ({selectedPhase.components?.length || 0} Components)
          </h3>
          {selectedPhase.components && selectedPhase.components.length > 0 ? (
            <div>
              {/* Timeline container */}
              <div  style={{ position: "relative", marginBottom: "20px" }}>
                {/* Time axis */}
                <div  style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  marginBottom: "8px",
                  fontSize: "10px",
                  color: "#64748b"
                }}>
                  <span>0:00</span>
                  <span>{formatElapsedTime(selectedPhase.duration / 2)}</span>
                  <span>{formatElapsedTime(selectedPhase.duration)}</span>
                </div>

                {/* Timeline track */}
                <div style={{
                  position: "relative",
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "16px 32px",
                  minHeight: "120px",
                  maxHeight: "300px",
                  overflowY: "auto"
                }}>
                  {/* Components as bars */}
                  {selectedPhase.components.map((component, idx) => {
                    const startPercent = (component.start_ms / selectedPhase.duration) * 100;
                    const widthPercent = (component.duration_ms / selectedPhase.duration) * 100;
                    const endMs = component.start_ms + component.duration_ms;
                    
                    return (
                      <div
                        key={component.id || idx}
                        style={{
                          position: "absolute",
                          left: `calc(12px + ${startPercent}% * 0.96)`,
                          top: `${16 + idx * 28}px`,
                          width: `${widthPercent * 0.96}%`,
                          height: "22px",
                          background: component.has_motor ? "#10b981" : "#3b82f6",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: "600",
                          color: "#fff",
                          overflow: "hidden",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          transition: "transform 0.2s ease",
                          cursor: "pointer"
                        }}
                        title={`${component.label}\nStart: ${formatElapsedTime(component.start_ms)}\nDuration: ${formatElapsedTime(component.duration_ms)}\nEnd: ${formatElapsedTime(endMs)}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scaleY(1.2)";
                          e.currentTarget.style.zIndex = "10";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scaleY(1)";
                          e.currentTarget.style.zIndex = "0";
                        }}
                      >
                        <span style={{ 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          padding: "0 4px"
                        }}>
                          {component.label} {component.has_motor && "⚡"}
                        </span>
                      </div>
                    );
                  })}

                  {/* Current time pointer - only show if phase is currently active */}
                  {cycleStatus?.current_phase_index === selectedPhase.index && phaseElapsedMs !== undefined && (
                    <div
                      style={{
                        position: "absolute",
                        left: `calc(12px + ${Math.min((phaseElapsedMs / selectedPhase.duration) * 100, 100) * 0.96}%)`,
                        top: "8px",
                        bottom: "8px",
                        width: "3px",
                        background: "#ef4444",
                        borderRadius: "2px",
                        boxShadow: "0 0 8px rgba(239, 68, 68, 0.8)",
                        zIndex: 20
                      }}
                    >
                      {/* Pointer head */}
                      <div style={{
                        position: "absolute",
                        top: "-6px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "0",
                        height: "0",
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "8px solid #ef4444"
                      }} />
                      {/* Time label */}
                      <div style={{
                        position: "absolute",
                        top: "-24px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#ef4444",
                        color: "#fff",
                        fontSize: "9px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap"
                      }}>
                        {formatElapsedTime(phaseElapsedMs)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Component legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedPhase.components.map((component, idx) => (
                  <div
                    key={`legend-${component.id || idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px"
                    }}
                  >
                    <div style={{
                      width: "16px",
                      height: "16px",
                      background: component.has_motor ? "#10b981" : "#3b82f6",
                      borderRadius: "3px",
                      flexShrink: 0
                    }} />
                    <span style={{ fontWeight: "600", color: "#fff" }}>{component.label}</span>
                    <span style={{ color: "#64748b" }}>
                      {formatElapsedTime(component.start_ms)} → {formatElapsedTime(component.start_ms + component.duration_ms)}
                    </span>
                    {component.has_motor && (
                      <span style={{ color: "#10b981", fontSize: "10px" }}>⚡ Motor</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: "14px", fontStyle: "italic" }}>
              No components defined for this phase
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            style={{
              flex: 1,
              padding: "14px 20px",
              background: (() => {
                if (cycleStatus?.current_phase_index === 0) return "#6b7280";
                if (cycleStatus?.current_phase_index && cycleStatus?.current_phase_index >= selectedPhase.index) return "#6b7280";
                return "#3b82f6";
              })(),
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: isSkipDisabled ? "not-allowed" : "pointer",
              opacity: isSkipDisabled ? 0.5 : 1,
              transition: "all 0.2s ease"
            }}
            onClick={handleSkipClick}
            disabled={isSkipDisabled}
            title={getSkipButtonTitle()}
          >
            ⏭ Skip to This Phase
          </button>
          <button
            style={{
              flex: 1,
              padding: "14px 20px",
              background: "transparent",
              color: "#94a3b8",
              border: "1px solid #333",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhaseInfoModal;
