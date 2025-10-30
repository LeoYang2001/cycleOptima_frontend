import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from 'react-redux';
import SensorDataPresentation from "../../components/monitor/sensorDataPresentation";
import LiveSensorCard from "../../components/monitor/LiveSensorCard";
import { websocketManager, selectWebSocketConnected } from '../../store/websocketSlice';
import { set } from "zod";
import { Gauge } from "lucide-react"; // Add at the top for the RPM icon

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
    rpm_sensor: number;
    pressure_sensor?: number; // <-- Add this line
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


interface SensorLogEntry {
  timestamp: number;
  elapsedSeconds: number;
  cycle_running: boolean;
  current_phase: number;
  current_phase_name: string;
  rpm_sensor: number;
  pressure_sensor?: number;
  // Add component states
  retractor_pin7: boolean;
  cold_valve2_pin8: boolean;
  hot_valve_pin9: boolean;
  drain_pump_pin19: boolean;
  cold_valve1_pin5: boolean;
  cold_valve3_pin18: boolean;
  motor_on_pin4: boolean;
  motor_direction_pin10: boolean;
}

function SystemMonitor() {
  const location = useLocation();
  const wsConnected = useSelector(selectWebSocketConnected);
  
  // Get cycle data from navigation state
  const cycleData: CycleData | null = location.state?.cycleData || null;

  const timestamp = location.state?.timestamp || null;

  const [pinStates, setPinStates] = useState<Record<number, boolean>>({});
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);

  // Add state for sensor data modal
  const [showSensorModal, setShowSensorModal] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);

  // Add a ref for the counter interval
  const counterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [ifStoppingCycle, setIfStoppingCycle] = useState(false);

  const [ifRunningCycle, setIfRunningCycle] = useState(false);
    const [sensorLog, setSensorLog] = useState<SensorLogEntry[]>([]);


   const createLogEntry = (telemetryData: TelemetryData, elapsedTime: number): SensorLogEntry => {
    const componentStates = {
      retractor_pin7: pinStates[7] || false,
      cold_valve2_pin8: pinStates[8] || false,
      hot_valve_pin9: pinStates[9] || false,
      drain_pump_pin19: pinStates[19] || false,
      cold_valve1_pin5: pinStates[5] || false,
      cold_valve3_pin18: pinStates[18] || false,
      motor_on_pin4: pinStates[4] || false,
      motor_direction_pin10: pinStates[10] || false,
    };

    return {
      timestamp: Date.now(),
      elapsedSeconds: elapsedTime,
      cycle_running: telemetryData.cycle_running,
      current_phase: telemetryData.current_phase,
      current_phase_name: telemetryData.current_phase_name,
      rpm_sensor: telemetryData.sensors.rpm_sensor,
      pressure_sensor: telemetryData.sensors.pressure_sensor,
      ...componentStates
    };
  };
  
  const downloadCSV = () => {
    if (sensorLog.length === 0) {
      alert('No data to download');
      return;
    }

    // Create CSV headers
    const headers = [
      'Timestamp',
      'Date_Time',
      'Elapsed_Seconds',
      'Cycle_Running',
      'Current_Phase',
      'Phase_Name',
      'RPM',
      'Pressure_Sensor_Pin0',
      'Retractor_Pin7',
      'Cold_Valve2_Pin8',
      'Hot_Valve_Pin9',
      'Drain_Pump_Pin19',
      'Cold_Valve1_Pin5',
      'Cold_Valve3_Pin18',
      'Motor_On_Pin4',
      'Motor_Direction_Pin10'
    ].join(',');

    // Create CSV rows
    const csvRows = sensorLog.map(entry => [
      entry.timestamp,
      new Date(entry.timestamp).toISOString(),
      entry.elapsedSeconds,
      entry.cycle_running,
      entry.current_phase,
      `"${entry.current_phase_name}"`, // Wrap in quotes to handle spaces
      entry.rpm_sensor,
      entry.pressure_sensor || 0,
      entry.retractor_pin7,
      entry.cold_valve2_pin8,
      entry.hot_valve_pin9,
      entry.drain_pump_pin19,
      entry.cold_valve1_pin5,
      entry.cold_valve3_pin18,
      entry.motor_on_pin4,
      entry.motor_direction_pin10
    ].join(','));

    // Combine headers and rows
    const csvContent = [headers, ...csvRows].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with cycle name and timestamp
    const cycleName = cycleData?.displayName || 'Cycle';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${cycleName}_Test_${timestamp}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const promptCSVDownload = () => {
    if (sensorLog.length === 0) {
      return;
    }

    const userConfirmed = window.confirm(
      `Test completed! You have ${sensorLog.length} data points logged.\n\nWould you like to download the test data as a CSV file?`
    );

    if (userConfirmed) {
      downloadCSV();
    }
    setSensorLog([]); // Clear log after prompt
  };
  // Get phase durations for timeline rendering
  const getPhaseTimeline = () => {
    if (!cycleData?.data.phases) return [];
    
    return cycleData.data.phases.map((phase, index) => {
      const phaseDuration = phase.components.reduce((max, component) => {
        return Math.max(max, component.start + component.duration);
      }, 0);
      
      return {
        id: phase.id, // Add id property
        name: phase.name,
        color: `#${phase.color}`,
        duration: phaseDuration,
        index: index + 1
      };
    });
  };


  // Update the sendWebSocketCommand function
  const sendWebSocketCommand = (command: string) => {
    if (wsConnected) {
      if (command === 'start') {
        // Start command sent - polling will begin when we receive acknowledgment
        websocketManager.send(command);
      } else if (command === 'stop') {
        websocketManager.send(command);
      } else {
        websocketManager.send(command);
      }
    } else {
      alert("WebSocket not connected");
    }
  };

  // Update the togglePin function to check cycle status
  const togglePin = async (pin: number) => {
    // Don't allow toggling if cycle is running
    if (telemetryData?.cycle_running) {
      console.log('Cannot toggle pins while cycle is running');
      return;
    }

    const isOn = pinStates[pin];
    const command = `gpio:${pin}:${isOn ? '0' : '1'}`;
    
    try {
      const success = websocketManager.send(command);
      if (success) {
        setPinStates((prev) => ({ ...prev, [pin]: !isOn }));
      } else {  
        alert('Failed to send command. WebSocket not connected.');
      }
    } catch (err) {
      console.error(`Failed to toggle pin ${pin}:`, err);
      alert(`Failed to toggle pin ${pin}: ${(err as Error).message}`);
    }
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  const handleStartCycle = () => {
    // Clear any existing interval first
    if (counterIntervalRef.current) {
      clearInterval(counterIntervalRef.current);
      counterIntervalRef.current = null;
    }

    sendWebSocketCommand("start");
    startPolling();
      setIfRunningCycle(true)

    
    // Start elapsed time counter
    setElapsedTime(0);
    counterIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 0.5);
    }, 500);
  };

  const handleStopCycle = () => {
    sendWebSocketCommand("stop");

      setIfRunningCycle(false);
    // Stop elapsed time counter
    if (counterIntervalRef.current) {
      clearInterval(counterIntervalRef.current);
      counterIntervalRef.current = null;
    }
    setElapsedTime(0);

    // Handle polling interval
    if (pollingInterval) {
      setIfStoppingCycle(true);
      setTimeout(() => {
        clearInterval(pollingInterval);
        setPollingInterval(null);
        setIfStoppingCycle(false);
      }, 1500);
    }
    promptCSVDownload();
  }

  // Update the startPolling function
  const startPolling = () => {
    
    if (wsConnected) {
      console.log('Starting telemetry polling...');

      const interval = setInterval(() => {
        websocketManager.send('get_telemetry');
        if (!pollingInterval) {
          setPollingInterval(interval);
        }
      }, 1000);

      // Initial request
      websocketManager.send('get_telemetry');
    }
  };

  const calculateProgress = () => {
    if (!telemetryData || !telemetryData.total_phases ||  telemetryData.total_phases === 0) return 0;
    return (telemetryData.current_phase / telemetryData.total_phases) * 100;
  };



  // Update the useEffect hook to handle WebSocket messages
  useEffect(() => {
    const handleSystemMessage = (data: any) => {
      try {
        
        // Handle telemetry data response
        if (data.cycle_running !== undefined) {
          setTelemetryData(data);
          // Update pin states from components array
          if (data.components && Array.isArray(data.components)) {
            const newPinStates: { [key: number]: boolean } = {};
            data.components.forEach((component: { pin: number; active: boolean }) => {
              newPinStates[component.pin] = component.active;
            });
            setPinStates(newPinStates);
          }
        }
        else if(!data.success && data.type === 'telemetry'){

          //cycle stop, reset telemetry data
          const resetData: TelemetryData = {
            ...telemetryData,
            cycle_running: false,
            current_phase: 0,
            total_phases: telemetryData?.total_phases ?? 0,
            current_phase_name: telemetryData?.current_phase_name ?? "",
            elapsed_seconds: telemetryData?.elapsed_seconds ?? 0,
            components: telemetryData?.components ?? [],
            sensors: telemetryData?.sensors ?? { rpm_sensor: 0, pressure_sensor: 0 },
            timestamp: telemetryData?.timestamp ?? Date.now()
          };
          setTelemetryData(resetData);


          //reset pins
          setPinStates({});
          console.log('reset pin states')
        }
      } catch (error) {
        console.error('Error processing system message:', error);
      }
    };

    // Register message handler
    websocketManager.registerMessageHandler('systemMonitor', handleSystemMessage);

    // Cleanup function
    return () => {
      websocketManager.unregisterMessageHandler('systemMonitor');
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      // Add cleanup for counter interval
      if (counterIntervalRef.current) {
        clearInterval(counterIntervalRef.current);
        counterIntervalRef.current = null;
      }
    };
  }, []);

  const phaseTimeline = getPhaseTimeline();

  useEffect(() => {
    if(telemetryData?.cycle_running){
      createLogEntry(telemetryData!, elapsedTime)
      setSensorLog(prev => [...prev, createLogEntry(telemetryData!, elapsedTime)]);
    }
  }, [ifRunningCycle, elapsedTime]);

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
                Current Phase:
              </span>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                Phase {telemetryData?.current_phase } of {telemetryData?.total_phases || phaseTimeline.length}
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
                width: `${(telemetryData && telemetryData.total_phases) ? (telemetryData.current_phase / telemetryData.total_phases) * 100 : 0}%`,
              }}></div>
            </div>
          </div>

          {/* Phase Timeline - Dynamic based on cycle data */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "12px" }}>
              Phase Timeline {cycleData && `(${cycleData.data.name})`}
            </div>
            <div style={{ display: "flex", height: "40px", borderRadius: "6px" }}>
              {phaseTimeline.length > 0 ? (
                phaseTimeline.map((phase, index) => {
                  // Find the full phase object from cycleData to check for sensorTrigger
                  const fullPhase = cycleData?.data.phases?.find(p => p.id === phase.id || p.name === phase.name);

                  return (
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
                      <span>{phase.name}</span>
                      {/* Sensor Trigger Indicator */}
                      {fullPhase?.sensorTrigger && (
                        <span
                          title={`Sensor Trigger: ${fullPhase.sensorTrigger.type} ≥ ${fullPhase.sensorTrigger.threshold} (Pin ${fullPhase.sensorTrigger.pinNumber})`}
                          style={{
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            background: "#10b981",
                            borderRadius: "50%",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 0 4px #10b981",
                          }}
                        >
                          <Gauge size={14} color="#fff" />
                        </span>
                      )}
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
                  );
                })
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
                {/* use local timestamp  */}
                {formatElapsedTime(elapsedTime)}
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

        {/* Live Sensor Data Card - Now using the component */}
        <LiveSensorCard 
          telemetryData={telemetryData}
          onCardClick={() => setShowSensorModal(true)}
        />
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
            {/* Start Cycle Button - Only enabled when cycle is not running */}
            <button
              style={{
                padding: "12px 20px",
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: telemetryData?.cycle_running ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: telemetryData?.cycle_running ? "0.5" : "1",
                transition: "all 0.2s ease"
              }}
              onClick={handleStartCycle}
              disabled={telemetryData?.cycle_running}
              title={telemetryData?.cycle_running ? "Cannot start while cycle is running" : "Start cycle"}
            >
              ▶ Start Cycle
            </button>

            {/* Stop Cycle Button - Only enabled when cycle is running */}
            <button
              style={{
                padding: "12px 20px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: !telemetryData?.cycle_running || ifStoppingCycle ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: !telemetryData?.cycle_running || ifStoppingCycle ? "0.5" : "1",
                transition: "all 0.2s ease"
              }}
              onClick={handleStopCycle}
              disabled={!telemetryData?.cycle_running || ifStoppingCycle}
              title={!telemetryData?.cycle_running ? "No cycle running to stop" : 
                     ifStoppingCycle ? "Stopping cycle..." : "Stop cycle"}
            >
              {ifStoppingCycle ? '⏳ Stopping...' : '⏹ Stop Cycle'}
            </button>

            {/* Previous Phase Button - Only enabled when cycle is running */}
            <button
              style={{
                padding: "12px 20px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: !telemetryData?.cycle_running ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: !telemetryData?.cycle_running ? "0.5" : "1",
                transition: "all 0.2s ease"
              }}
              onClick={() => sendWebSocketCommand("prev")}
              disabled={!telemetryData?.cycle_running}
              title={!telemetryData?.cycle_running ? "No cycle running" : "Go to previous phase"}
            >
              ⏮ Previous Phase
            </button>

            {/* Skip Phase Button - Only enabled when cycle is running */}
            <button
              style={{
                padding: "12px 20px",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: !telemetryData?.cycle_running ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: !telemetryData?.cycle_running ? "0.5" : "1",
                transition: "all 0.2s ease"
              }}
              onClick={() => sendWebSocketCommand("skip")}
              disabled={!telemetryData?.cycle_running}
              title={!telemetryData?.cycle_running ? "No cycle running" : "Skip current phase"}
            >
              ⏭ Skip Phase
            </button>

            {/* Restart Phase Button - Only enabled when cycle is running */}
            <button
              style={{
                padding: "12px 20px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: !telemetryData?.cycle_running ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: !telemetryData?.cycle_running ? "0.5" : "1",
                transition: "all 0.2s ease"
              }}
              onClick={() => sendWebSocketCommand("restart")}
              disabled={!telemetryData?.cycle_running}
              title={!telemetryData?.cycle_running ? "No cycle running" : "Restart current phase"}
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
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>Cycle Status</span>
              <div style={{
                padding: "4px 8px",
                background: telemetryData?.cycle_running ? "#059669" : "#6b7280",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {telemetryData?.cycle_running ? "Running" : "Idle"}
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
                cursor: telemetryData?.cycle_running ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                opacity: telemetryData?.cycle_running ? "0.7" : "1"
              }}
              onClick={() => togglePin(pin)}
              disabled={telemetryData?.cycle_running}
              title={telemetryData?.cycle_running ? "Cannot toggle components while cycle is running" : ""}
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