import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import SensorDataPresentation from "../../components/monitor/sensorDataPresentation";

const ESP32_URL = "http://192.168.4.193:8080";
const WEBSOCKET_URL = "ws://192.168.4.193:8080/ws";

const pins = [
  { name: "RETRACTOR_PIN", pin: 7 },
  { name: "COLD_VALVE2_PIN", pin: 8 },
  { name: "HOT_VALVE_PIN", pin: 9 },
  { name: "DRAIN_PUMP_PIN", pin: 19 },
  { name: "COLD_VALVE1_PIN", pin: 5 },
  { name: "COLD_VALVE3_PIN", pin: 18 },
  { name: "MOTOR_ON_PIN", pin: 4 },
  { name: "MOTOR_DIRECTION_PIN", pin: 10 },
];

interface CycleStatus {
  running: boolean;
  phase: number;
  total: number;
  wifi_connected?: boolean;
  websocket_connected?: boolean;
  ws_connections?: number;
}

interface TelemetryData {
  cycle_running: boolean;
  current_phase: number;
  total_phases: number;
  current_phase_name: string;
  elapsed_seconds: number;
  components: Array<{
    name: string;
    pin: number;
    active: boolean;
  }>;
  sensors: {
    flow_sensor_pin3: number;
  };
  timestamp: number;
}

interface Phase {
  id: string;
  name: string;
  color: string;
  startTime: number;
  components: Array<{
    id: string;
    label: string;
    start: number;
    compId: string;
    duration: number;
    motorConfig: any;
  }>;
  sensorTrigger?: {
    type: string;
    pinNumber: number;
    threshold: number;
  };
}

interface CycleData {
  id: string;
  displayName: string;
  data: {
    name: string;
    phases: Phase[];
  };
  created_at: string;
  updated_at: string;
  engineer_note: string;
  status: string;
  tested_at: string;
}

function SystemMonitor() {
  const location = useLocation();
  
  // Get cycle data from navigation state
  const cycleData: CycleData | null = location.state?.cycleData || null;
  const timestamp = location.state?.timestamp || null;

  const [pinStates, setPinStates] = useState<Record<number, boolean>>({});
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>({
    running: false,
    phase: 1,
    total: 8,
    wifi_connected: false,
    websocket_connected: false,
    ws_connections: 0,
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [lastTelemetryUpdate, setLastTelemetryUpdate] = useState<number>(0);
  const websocketRef = useRef<WebSocket | null>(null);
  const telemetryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Add state for sensor data modal
  const [showSensorModal, setShowSensorModal] = useState(false);

  // Calculate total cycle duration from phase data
  const calculateTotalDuration = (phases: Phase[]): number => {
    return phases.reduce((total, phase) => {
      const phaseDuration = phase.components.reduce((phaseTotal, component) => {
        return Math.max(phaseTotal, component.start + component.duration);
      }, 0);
      return total + phaseDuration;
    }, 0);
  };

  // Get phase durations for timeline rendering
  const getPhaseTimeline = () => {
    if (!cycleData?.data.phases) return [];
    
    return cycleData.data.phases.map((phase, index) => {
      const phaseDuration = phase.components.reduce((max, component) => {
        return Math.max(max, component.start + component.duration);
      }, 0);
      
      return {
        name: phase.name,
        color: `#${phase.color}`,
        duration: phaseDuration,
        index: index + 1
      };
    });
  };

  // Auto-start telemetry when cycle data is available
  useEffect(() => {
    if (cycleData && wsConnected && !telemetryEnabled) {
      console.log("Auto-starting telemetry for loaded cycle:", cycleData.displayName);
      setTelemetryEnabled(true);
      if (websocketRef.current) {
        websocketRef.current.send("start_telemetry");
      }
    }
  }, [cycleData, wsConnected, telemetryEnabled]);

  // WebSocket connection setup
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WEBSOCKET_URL);
        websocketRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected");
          setWsConnected(true);
          // Send connect command to verify and get enhanced status
          ws.send("connect");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check if this is telemetry data
            if (data.cycle_running !== undefined && data.components && data.sensors) {
              setTelemetryData(data as TelemetryData);
              setLastTelemetryUpdate(Date.now());
              
              // Update pin states based on component data
              const newPinStates: Record<number, boolean> = {};
              data.components.forEach((component: any) => {
                newPinStates[component.pin] = component.active;
              });
              setPinStates(newPinStates);
            } else {
              // Regular status data
              setCycleStatus(data as CycleStatus);
            }
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setWsConnected(false);
          setTelemetryEnabled(false);
          stopTelemetryPolling();
          setCycleStatus((prev) => ({
            ...prev,
            websocket_connected: false,
            ws_connections: 0,
          }));
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      stopTelemetryPolling();
    };
  }, []);

  // Start telemetry polling
  const startTelemetryPolling = () => {
    if (telemetryIntervalRef.current) return; // Already polling

    telemetryIntervalRef.current = setInterval(() => {
      if (websocketRef.current && wsConnected) {
        websocketRef.current.send("get_telemetry");
      }
    }, 1000); // Poll every 1 second
  };

  // Stop telemetry polling
  const stopTelemetryPolling = () => {
    if (telemetryIntervalRef.current) {
      clearInterval(telemetryIntervalRef.current);
      telemetryIntervalRef.current = null;
    }
  };

  // Auto-start polling when telemetry is enabled
  useEffect(() => {
    if (telemetryEnabled && wsConnected) {
      startTelemetryPolling();
    } else {
      stopTelemetryPolling();
    }

    return () => {
      stopTelemetryPolling();
    };
  }, [telemetryEnabled, wsConnected]);

  const sendWebSocketCommand = (command: string) => {
    console.log('send command:', command);
    if (websocketRef.current && wsConnected) {
      websocketRef.current.send(command);
    } else {
      alert("WebSocket not connected");
    }
  };

  const toggleTelemetry = () => {
    if (telemetryEnabled) {
      sendWebSocketCommand("stop_telemetry");
      setTelemetryEnabled(false);
      stopTelemetryPolling();
    } else {
      sendWebSocketCommand("start_telemetry");
      setTelemetryEnabled(true);
      // Polling will start automatically via useEffect
    }
  };

  const getTelemetrySnapshot = () => {
    sendWebSocketCommand("get_telemetry");
  };

  const sendPing = () => {
    sendWebSocketCommand("ping");
  };

  const togglePin = async (pin: number) => {
    const isOn = pinStates[pin];
    const action = isOn ? "off" : "on";
    try {
      await fetch(`${ESP32_URL}/${action}/${pin}`);
      setPinStates((prev) => ({ ...prev, [pin]: !isOn }));
    } catch (err) {
      alert(`Failed to toggle pin ${pin}`);
      console.log(err);
    }
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeSinceLastUpdate = (): string => {
    if (lastTelemetryUpdate === 0) return "Never";
    const diff = Math.floor((Date.now() - lastTelemetryUpdate) / 1000);
    return `${diff}s ago`;
  };

  const calculateProgress = () => {
    if (!telemetryData) return 0;
    return (telemetryData.current_phase / telemetryData.total_phases) * 100;
  };

  // Display cycle information if available
  useEffect(() => {
    if (cycleData && timestamp) {
      console.log("Received cycle data for monitoring:", cycleData);
      console.log("Flash completed at:", new Date(timestamp));
    }
  }, [cycleData, timestamp]);

  const phaseTimeline = getPhaseTimeline();

  return (
    <div style={{ 
      minHeight: "100vh", 
      color: "#fff", 
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px" 
      }}>
        <div>
          <h1 style={{ 
            fontSize: "28px", 
            fontWeight: "700", 
            margin: "0 0 4px 0",
            color: "#fff"
          }}>
            {cycleData ? `${cycleData.displayName} - Monitor` : "Cycle Monitor"}
          </h1>
          <p style={{ 
            color: "#64748b", 
            margin: "0",
            fontSize: "14px"
          }}>
            {cycleData 
              ? `Monitoring cycle flashed at ${new Date(timestamp).toLocaleTimeString()} • ${phaseTimeline.length} phases`
              : "Real-time monitoring and control of active washer cycle"
            }
          </p>
        </div>
        {/* Show cycle info badge if we have cycle data */}
        {cycleData && (
          <div style={{
            padding: "8px 16px",
            background: "#059669",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase"
          }}>
            CYCLE LOADED
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "2fr 1fr", 
        gap: "24px",
        marginBottom: "24px"
      }}>
        {/* Cycle Progress Card */}
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            marginBottom: "20px"
          }}>
            <div style={{ 
              width: "8px", 
              height: "8px", 
              background: "#22c55e", 
              borderRadius: "50%" 
            }}></div>
            <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>
              Cycle Progress
            </h3>
          </div>

          {/* Overall Progress */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "8px" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>Overall Progress</span>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {calculateProgress().toFixed(1)}%
              </span>
            </div>
            <div style={{
              background: "#333",
              borderRadius: "4px",
              height: "8px",
              overflow: "hidden"
            }}>
              <div style={{
                background: "#22c55e",
                height: "100%",
                width: `${calculateProgress()}%`,
                transition: "width 0.3s ease"
              }}></div>
            </div>
          </div>

          {/* Current Phase */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: "8px" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>
                Current Phase: {telemetryData?.current_phase_name || "Unknown"}
              </span>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                Phase {telemetryData?.current_phase || 1} of {telemetryData?.total_phases || phaseTimeline.length}
              </span>
            </div>
            <div style={{
              background: "#333",
              borderRadius: "4px",
              height: "8px",
              overflow: "hidden"
            }}>
              <div style={{
                background: "#22c55e",
                height: "100%",
                width: "75%"
              }}></div>
            </div>
          </div>

          {/* Phase Timeline - Dynamic based on cycle data */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "12px" }}>
              Phase Timeline {cycleData && `(${cycleData.data.name})`}
            </div>
            <div style={{ display: "flex", height: "40px", borderRadius: "6px",  }}>
              {phaseTimeline.length > 0 ? (
                phaseTimeline.map((phase, index) => (
                  <div 
                    key={phase.name}
                    style={{ 
                      background: phase.color, 
                      flex: "1", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "600",
                      position: "relative",
                      opacity: telemetryData?.current_phase === phase.index ? 1 : 0.7,
                      border: telemetryData?.current_phase === phase.index ? "2px solid #fff" : "none"
                    }}
                  >
                    {phase.name}
                    {telemetryData?.current_phase === phase.index && (
                      <div style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "16px",
                        height: "16px",
                        background: "#22c55e",
                        borderRadius: "50%",
                        border: "2px solid #fff",
                        animation: "pulse 2s infinite"
                      }}></div>
                    )}
                  </div>
                ))
              ) : (
                // Default phases when no cycle data
                <>
                  <div style={{ 
                    background: "#1e40af", 
                    flex: "1", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    Pre-wash
                  </div>
                  <div style={{ 
                    background: "#059669", 
                    flex: "1", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    Main wash
                  </div>
                  <div style={{ 
                    background: "#d97706", 
                    flex: "1", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    Rinse
                  </div>
                  <div style={{ 
                    background: "#dc2626", 
                    flex: "1", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    Final spin
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Time Display */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff" }}>
                {telemetryData ? formatElapsedTime(telemetryData.elapsed_seconds) : "00:00:00"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Elapsed Time</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff" }}>
                {cycleData ? `${phaseTimeline.length}` : "4"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Total Phases</div>
            </div>
          </div>
        </div>

        {/* Live Sensor Data Card - Make it clickable */}
        <div 
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "24px",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onClick={() => setShowSensorModal(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#252525";
            e.currentTarget.style.borderColor = "#444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1a1a1a";
            e.currentTarget.style.borderColor = "#333";
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}>
            <h3 style={{ 
              margin: "0", 
              fontSize: "18px", 
              fontWeight: "600" 
            }}>
              Live Sensor Data
            </h3>
            <div style={{
              padding: "4px 8px",
              background: "#3b82f6",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: "600",
              textTransform: "uppercase"
            }}>
              Click for Analytics
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "6px", 
                  background: "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  P
                </div>
                <span style={{ fontSize: "14px" }}>Pressure</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700" }}>2.2</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>bar</div>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "6px", 
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  R
                </div>
                <span style={{ fontSize: "14px" }}>Flow Rate</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700" }}>
                  {telemetryData?.sensors.flow_sensor_pin3.toFixed(1) || "0.0"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>pulses/sec</div>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "6px", 
                  background: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  T
                </div>
                <span style={{ fontSize: "14px" }}>Temperature</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700" }}>39.7</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>°C</div>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "6px", 
                  background: "#06b6d4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600"
                }}>
                  W
                </div>
                <span style={{ fontSize: "14px" }}>Water Level</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: "700" }}>74.5</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "24px",
        marginBottom: "24px"
      }}>
        {/* Quick Actions Card */}
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h3 style={{ 
            margin: "0 0 20px 0", 
            fontSize: "18px", 
            fontWeight: "600" 
          }}>
            Quick Actions
          </h3>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "12px 20px",
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onClick={() => sendWebSocketCommand("start")}
            >
              ▶ Start Cycle
            </button>
            <button
              style={{
                padding: "12px 20px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onClick={() => sendWebSocketCommand("stop")}
            >
              ⏹ Stop Cycle
            </button>
            <button
              style={{
                padding: "12px 20px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onClick={() => sendWebSocketCommand("prev")}
            >
              ⏮ Previous Phase
            </button>
              <button
              style={{
                padding: "12px 20px",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onClick={() => sendWebSocketCommand("skip")}
            >
              ⏭ Skip Phase
            </button>
            <button
              style={{
                padding: "12px 20px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onClick={() => sendWebSocketCommand("restart")}
            >
              🔄 Restart Phase
            </button>
            
          
          </div>
        </div>

        {/* System Status Card */}
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h3 style={{ 
            margin: "0 0 20px 0", 
            fontSize: "18px", 
            fontWeight: "600" 
          }}>
            System Status
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>ESP Connection</span>
              <div style={{
                padding: "4px 8px",
                background: wsConnected ? "#059669" : "#dc2626",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {wsConnected ? "Connected" : "Disconnected"}
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>Auto-Update</span>
              <div style={{
                padding: "4px 8px",
                background: telemetryEnabled ? "#059669" : "#6b7280",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {telemetryEnabled ? "Active" : "Disabled"}
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>Last Poll</span>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {getTimeSinceLastUpdate()}
              </span>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>Cycle Status</span>
              <div style={{
                padding: "4px 8px",
                background: telemetryData?.cycle_running ? "#059669" : "#6b7280",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {telemetryData?.cycle_running ? "running" : "idle"}
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>Errors</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#10b981" }}>
                None
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pin Control Section */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "24px"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>
            Component Control
          </h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {cycleData && (
              <div style={{
                padding: "4px 8px",
                background: "#059669",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "600",
                textTransform: "uppercase"
              }}>
                AUTO-STARTED
              </div>
            )}
            {/* <button
              style={{
                padding: "8px 16px",
                background: telemetryEnabled ? "#ef4444" : "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "12px",
                cursor: "pointer"
              }}
              onClick={toggleTelemetry}
            >
              {telemetryEnabled ? "Stop Auto-Update" : "Start Auto-Update"}
            </button> */}
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px"
        }}>
          {pins.map(({ name, pin }) => (
            <button
              key={pin}
              style={{
                padding: "20px",
                background: pinStates[pin] ? "#059669" : "#374151",
                color: "#fff",
                border: pinStates[pin] ? "2px solid #10b981" : "2px solid #4b5563",
                borderRadius: "12px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px"
              }}
              onClick={() => togglePin(pin)}
            >
              <div style={{ 
                width: "12px", 
                height: "12px", 
                borderRadius: "50%",
                background: pinStates[pin] ? "#10b981" : "#6b7280"
              }}></div>
              <div style={{ fontSize: "12px", textAlign: "center" }}>
                {name.replace("_PIN", "").replace("_", " ")}
              </div>
              <div style={{ 
                fontSize: "10px", 
                color: pinStates[pin] ? "#86efac" : "#9ca3af",
                fontWeight: "500"
              }}>
                Pin {pin} - {pinStates[pin] ? "ON" : "OFF"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sensor Data Modal */}
      <SensorDataPresentation
        isOpen={showSensorModal}
        onClose={() => setShowSensorModal(false)}
        telemetryData={telemetryData}
      />
    </div>
  );
}

export default SystemMonitor;