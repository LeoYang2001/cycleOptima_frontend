import React, { useState, useEffect, useRef } from "react";

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

function SystemMonitor() {
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

  return (
    <div style={{ padding: "20px" }}>
      {/* Enhanced Connection Status */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: wsConnected ? "#22c55e" : "#ef4444",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            Client WS: {wsConnected ? "Connected" : "Disconnected"}
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: cycleStatus.wifi_connected ? "#22c55e" : "#ef4444",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            ESP32 WiFi:{" "}
            {cycleStatus.wifi_connected ? "Connected" : "Disconnected"}
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: cycleStatus.websocket_connected ? "#22c55e" : "#ef4444",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            ESP32 WS:{" "}
            {cycleStatus.websocket_connected ? "Connected" : "Disconnected"}
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: "#3b82f6",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            WS Connections: {cycleStatus.ws_connections || 0}
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: telemetryEnabled ? "#22c55e" : "#6b7280",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            Telemetry: {telemetryEnabled ? "Auto-Updating" : "Inactive"}
          </span>
          {telemetryIntervalRef.current && (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                background: "#f59e0b",
                color: "#fff",
                fontSize: "12px",
              }}
            >
              Polling: 1s interval
            </span>
          )}
        </div>
      </div>

      {/* Telemetry Control */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
          Telemetry Control
        </h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
          <button
            style={{
              padding: "12px 20px",
              background: telemetryEnabled ? "#ef4444" : "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "120px",
            }}
            onClick={toggleTelemetry}
          >
            {telemetryEnabled ? "Stop Auto-Update" : "Start Auto-Update"}
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "120px",
            }}
            onClick={getTelemetrySnapshot}
          >
            Get Snapshot
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={sendPing}
          >
            Ping
          </button>
        </div>
      </div>

      {/* Telemetry Data Window */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
          Live Telemetry Data
          <span style={{ fontSize: "12px", color: "#666", marginLeft: "10px" }}>
            Last update: {getTimeSinceLastUpdate()}
          </span>
        </h3>
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "16px",
            maxHeight: "400px",
            overflow: "auto",
          }}
        >
          {telemetryData ? (
            <div style={{ color: "#fff", fontFamily: "monospace", fontSize: "12px" }}>
              {/* Cycle Information */}
              <div style={{ marginBottom: "16px", padding: "12px", background: "#2a2a2a", borderRadius: "6px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#22c55e" }}>Cycle Status</h4>
                <div>Running: <span style={{ color: telemetryData.cycle_running ? "#22c55e" : "#ef4444" }}>
                  {telemetryData.cycle_running ? "YES" : "NO"}
                </span></div>
                <div>Phase: {telemetryData.current_phase}/{telemetryData.total_phases} - {telemetryData.current_phase_name}</div>
                <div>Elapsed: {formatElapsedTime(telemetryData.elapsed_seconds)}</div>
              </div>

              {/* Sensor Data */}
              <div style={{ marginBottom: "16px", padding: "12px", background: "#2a2a2a", borderRadius: "6px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#3b82f6" }}>Sensors</h4>
                <div>Flow Sensor (Pin 3): {telemetryData.sensors.flow_sensor_pin3.toFixed(1)} pulses/sec</div>
              </div>

              {/* Component Status */}
              <div style={{ marginBottom: "16px", padding: "12px", background: "#2a2a2a", borderRadius: "6px" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#f59e0b" }}>Components</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  {telemetryData.components.map((component, index) => (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{component.name} (Pin {component.pin}):</span>
                      <span style={{ color: component.active ? "#22c55e" : "#ef4444" }}>
                        {component.active ? "ON" : "OFF"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ fontSize: "10px", color: "#666", textAlign: "right" }}>
                Timestamp: {new Date(telemetryData.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", textAlign: "center", padding: "40px" }}>
              No telemetry data received yet. Click "Start Auto-Update" or "Get Snapshot" to begin.
            </div>
          )}
        </div>
      </div>

      {/* Cycle Status Display */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3>Basic Cycle Status</h3>
        <p>
          Phase: {cycleStatus.phase}/{cycleStatus.total} |{" "}
          Status: {cycleStatus.running ? "Running" : "Stopped"}
        </p>
      </div>

      {/* Connection Control */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
          Connection Control
        </h3>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            style={{
              padding: "12px 20px",
              background: "#06b6d4",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "120px",
            }}
            onClick={() => sendWebSocketCommand("connect")}
          >
            Check Connection
          </button>
        </div>
      </div>

      {/* Phase Control Buttons */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
          Phase Control
        </h3>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              padding: "12px 20px",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={() => sendWebSocketCommand("start")}
          >
            Start
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={() => sendWebSocketCommand("stop")}
          >
            Stop
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={() => sendWebSocketCommand("prev")}
          >
            Prev
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={() => sendWebSocketCommand("skip")}
          >
            Skip
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={() => sendWebSocketCommand("restart")}
          >
            Restart
          </button>
          <button
            style={{
              padding: "12px 20px",
              background: "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "80px",
            }}
            onClick={() => sendWebSocketCommand("status")}
          >
            Status
          </button>
        </div>
      </div>

      {/* Pin Control Section */}
      <div>
        <h3 style={{ textAlign: "center", marginBottom: "16px" }}>
          Pin Control
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          {pins.map(({ name, pin }) => (
            <button
              key={pin}
              style={{
                padding: "16px",
                background: pinStates[pin] ? "#22c55e" : "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
              onClick={() => togglePin(pin)}
            >
              {name}
              <br />
              {pinStates[pin] ? "ON" : "OFF"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SystemMonitor;