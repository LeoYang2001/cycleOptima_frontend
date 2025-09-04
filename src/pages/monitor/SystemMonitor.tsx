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
  const websocketRef = useRef<WebSocket | null>(null);

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
            const status = JSON.parse(event.data) as CycleStatus;
            setCycleStatus(status);
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setWsConnected(false);
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
    };
  }, []);

  const sendWebSocketCommand = (command: string) => {
    if (websocketRef.current && wsConnected) {
      websocketRef.current.send(command);
    } else {
      alert("WebSocket not connected");
    }
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
        </div>
      </div>

      {/* Cycle Status Display */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3>Cycle Status</h3>
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