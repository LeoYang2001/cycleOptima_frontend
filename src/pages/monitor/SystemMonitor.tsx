import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import SensorDataPresentation, { type SensorDataPoint } from "../../components/monitor/sensorDataPresentation";
import LiveSensorCard from "../../components/monitor/LiveSensorCard";
import PhaseInfoModal from "../../components/monitor/PhaseInfoModal";
import { websocketManager, selectWebSocketConnected } from '../../store/websocketSlice';
import {
  selectTelemetry,
  selectGPIOStates,
  selectCycleStatus,
  selectCycleRunning,
  selectSensorData,
  selectRPM,
  selectPressure,
  selectCurrentPhaseName,
  selectRPMHistory,
  selectPressureHistory,
  selectLastUpdateTime,
  selectCycleData,
  togglePin as togglePinAction,
  startCycle,
  stopCycle,
  skipPhase,
  skipToPhase,
} from '../../store/washerSlice';
import { Gauge } from "lucide-react";

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
    triggerAbove: boolean;
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
  const dispatch = useDispatch<AppDispatch>();
  const wsConnected = useSelector(selectWebSocketConnected);
  
  // Use washer slice selectors
  const telemetryData = useSelector(selectTelemetry);
  const gpioStates = useSelector(selectGPIOStates);
  const cycleStatus = useSelector(selectCycleStatus);
  const cycleRunning = useSelector(selectCycleRunning);
  const sensorData = useSelector(selectSensorData);
  const rpm = useSelector(selectRPM);
  const pressure = useSelector(selectPressure);
  const currentPhaseName = useSelector(selectCurrentPhaseName);
  const lastUpdateTime = useSelector(selectLastUpdateTime);
  const cycleDataFromTelemetry = useSelector(selectCycleData); // Get cycle_data from telemetry
  
  // Get cycle data from navigation state (fallback for initial load)
  const cycleData: CycleData | null = location.state?.cycleData || null;

  const timestamp = location.state?.timestamp || null;

  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Add state for sensor data modal
  const [showSensorModal, setShowSensorModal] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);

  // Add a ref for the counter interval
  const counterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [ifStoppingCycle, setIfStoppingCycle] = useState(false);

  const [ifRunningCycle, setIfRunningCycle] = useState(false);
  const [sensorLog, setSensorLog] = useState<SensorLogEntry[]>([]);
  const [sensorHistory, setSensorHistory] = useState<SensorDataPoint[]>([]);
  
  // State to track loading pins
  const [loadingPins, setLoadingPins] = useState<Set<number>>(new Set());
  
  // State to track loading actions
  const [isStartingCycle, setIsStartingCycle] = useState(false);
  const [isStoppingCycle, setIsStoppingCycle] = useState(false);
  const [isSkippingPhase, setIsSkippingPhase] = useState(false);
  
  // State for phase info modal
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<{
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
  } | null>(null);

  // Helper function to get GPIO state by pin number
  const getGPIOState = (pin: number): boolean => {
    const gpio = gpioStates.find(g => g.pin === pin);
    return gpio?.state === 1;
  };

  const createLogEntry = (elapsedTime: number): SensorLogEntry => {
    if (!telemetryData || !cycleStatus || !sensorData) {
      // Return empty/default log entry if no data
      return {
        timestamp: Date.now(),
        elapsedSeconds: elapsedTime,
        cycle_running: false,
        current_phase: 0,
        current_phase_name: '',
        rpm_sensor: 0,
        pressure_sensor: 0,
        retractor_pin7: false,
        cold_valve2_pin8: false,
        hot_valve_pin9: false,
        drain_pump_pin19: false,
        cold_valve1_pin5: false,
        cold_valve3_pin18: false,
        motor_on_pin4: false,
        motor_direction_pin10: false,
      };
    }

    const componentStates = {
      retractor_pin7: getGPIOState(7),
      cold_valve2_pin8: getGPIOState(8),
      hot_valve_pin9: getGPIOState(9),
      drain_pump_pin19: getGPIOState(19),
      cold_valve1_pin5: getGPIOState(5),
      cold_valve3_pin18: getGPIOState(18),
      motor_on_pin4: getGPIOState(4),
      motor_direction_pin10: getGPIOState(10),
    };

    return {
      timestamp: Date.now(),
      elapsedSeconds: elapsedTime,
      cycle_running: cycleStatus.cycle_running,
      current_phase: cycleStatus.current_phase_index,
      current_phase_name: cycleStatus.current_phase_name,
      rpm_sensor: sensorData.rpm,
      pressure_sensor: sensorData.pressure_freq,
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
    // Prioritize cycle_data from telemetry (real-time from ESP32)
    if (cycleDataFromTelemetry && cycleDataFromTelemetry.length > 0) {
      return cycleDataFromTelemetry.map((phase, index) => {
        // Calculate phase duration from components
        const phaseDuration = phase.components.reduce((max, component) => {
          return Math.max(max, component.start_ms + component.duration_ms);
        }, 0);
        
        return {
          id: phase.id,
          name: phase.name,
          color: `#${phase.color}`,
          duration: phaseDuration,
          index: index + 1 // ESP32 uses 1-based indexing (0=idle, 1=first phase, etc.)
        };
      });
    }
    
    // Fallback to navigation state cycle data
    if (!cycleData?.data.phases) return [];
    
    return cycleData.data.phases.map((phase, index) => {
      const phaseDuration = phase.components.reduce((max, component) => {
        return Math.max(max, component.start + component.duration);
      }, 0);
      
      return {
        id: phase.id,
        name: phase.name,
        color: `#${phase.color}`,
        duration: phaseDuration,
        index: index + 1 // ESP32 uses 1-based indexing (0=idle, 1=first phase, etc.)
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
    if (cycleRunning) {
      console.log('Cannot toggle pins while cycle is running');
      return;
    }

    // Prevent toggling if this pin is already being processed
    if (loadingPins.has(pin)) {
      console.log(`Pin ${pin} is already being toggled`);
      return;
    }

    // Add pin to loading state
    setLoadingPins(prev => new Set(prev).add(pin));

    try {
      // Use the togglePin action from washer slice
      // @ts-ignore - dispatch returns a thunk function
      const success = dispatch(togglePinAction(pin));
      
      if (!success) {
        console.error(`Failed to toggle pin ${pin} - WebSocket may not be connected`);
        // Remove from loading immediately if send failed
        setLoadingPins(prev => {
          const newSet = new Set(prev);
          newSet.delete(pin);
          return newSet;
        });
        return;
      }

      // Wait for telemetry update (remove from loading after 2 seconds)
      setTimeout(() => {
        setLoadingPins(prev => {
          const newSet = new Set(prev);
          newSet.delete(pin);
          return newSet;
        });
      }, 2000);
      
    } catch (error) {
      console.error(`Error toggling pin ${pin}:`, error);
      // Remove from loading on error
      setLoadingPins(prev => {
        const newSet = new Set(prev);
        newSet.delete(pin);
        return newSet;
      });
    }
  };

  const formatElapsedTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000) ;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  const handleStartCycle = () => {
    if (isStartingCycle) return; // Prevent double clicks
    
    setIsStartingCycle(true);
    dispatch(startCycle());
    
    // Remove loading state after 2 seconds
    setTimeout(() => {
      setIsStartingCycle(false);
    }, 2000);
  };

  const handleStopCycle = () => {
    if (isStoppingCycle) return; // Prevent double clicks
    
    setIsStoppingCycle(true);
    dispatch(stopCycle());
    
    // Remove loading state after 2 seconds
    setTimeout(() => {
      setIsStoppingCycle(false);
    }, 2000);
  };

  const handleSkipPhase = () => {
    if (isSkippingPhase) return; // Prevent double clicks
    
    setIsSkippingPhase(true);
    dispatch(skipPhase());
    
    // Remove loading state after 2 seconds
    setTimeout(() => {
      setIsSkippingPhase(false);
    }, 2000);
  };

    const handleSkipToPhase = (index: number) => {
    dispatch(skipToPhase(index));
  };

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
    if (!cycleStatus || !cycleStatus.total_phases || cycleStatus.total_phases === 0) return 0;
    // Phase index 0 = idle, so subtract 1 for actual progress
    // If phase is 0 (idle), progress is 0
    if (cycleStatus.current_phase_index === 0) return 0;
    return ((cycleStatus.current_phase_index - 1) / cycleStatus.total_phases) * 100;
  };

  // Update the useEffect hook - remove old WebSocket message handler since washer slice handles it
  useEffect(() => {
    // No need for custom message handler - washer slice updates automatically
    
    // Cleanup function
    return () => {
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
    if(cycleRunning){
      setSensorLog(prev => [...prev, createLogEntry(elapsedTime)]);
    }
  }, [ifRunningCycle, elapsedTime]);

  return (
    <div 
    className=" w-full px-8"
    style={{ 
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
            {cycleDataFromTelemetry.length > 0
              ? `Live telemetry • ${cycleDataFromTelemetry.length} phases from ESP32`
              : cycleData 
                ? `Monitoring cycle flashed at ${new Date(timestamp).toLocaleTimeString()} • ${phaseTimeline.length} phases`
                : "Real-time monitoring and control of active washer cycle"
            }
          </p>
        </div>
        {/* Show cycle info badge */}
        {(cycleData || cycleDataFromTelemetry.length > 0) && (
          <div style={{
            padding: "8px 16px",
            background: cycleDataFromTelemetry.length > 0 ? "#10b981" : "#059669",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase"
          }}>
            {cycleDataFromTelemetry.length > 0 ? "LIVE CYCLE DATA" : "CYCLE LOADED"}
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
                {cycleStatus?.current_phase_index === 0 
                  ? "Idle" 
                  : `Phase ${cycleStatus?.current_phase_index || 0} of ${cycleStatus?.total_phases || phaseTimeline.length}`
                }
              </span>
            </div>
            <div style={{
              background: "#333",
              borderRadius: "4px",
              height: "8px",
              overflow: "hidden"
            }}>
              <div style={{
                background: cycleStatus?.current_phase_index === 0 ? "#6b7280" : "#22c55e",
                height: "100%",
                width: `${(cycleStatus && cycleStatus.total_phases && cycleStatus.current_phase_index > 0) 
                  ? ((cycleStatus.current_phase_index - 1) / cycleStatus.total_phases) * 100 
                  : 0}%`,
              }}></div>
            </div>
          </div>

          {/* Phase Timeline - Dynamic based on cycle data */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "12px" }}>
              Phase Timeline
              {/* {cycleDataFromTelemetry.length > 0 && " (Live from ESP32)"}
              {!cycleDataFromTelemetry.length && cycleData && ` (${cycleData.data.name})`} */}
            </div>
            <div style={{ display: "flex", height: "40px", borderRadius: "6px" }}>
              {phaseTimeline.length > 0 ? (
                phaseTimeline.map((phase, index) => {
                  // Check for sensor trigger - only from navigation cycleData (not in telemetry cycle_data)
                  const fullPhase = cycleData?.data.phases?.find(p => p.id === phase.id || p.name === phase.name);
                 
                  return (  
                    <div 
                    className=" cursor-pointer"
                      onClick={() => {
                        // Get full phase data from cycleData
                        const fullPhaseData = cycleData?.data.phases?.find(p => p.id === phase.id || p.name === phase.name);
                        
                        // Map components to match selectedPhase interface
                        const mappedComponents = fullPhaseData?.components.map(comp => ({
                          id: comp.id,
                          label: comp.label,
                          start_ms: comp.start,
                          duration_ms: comp.duration,
                          has_motor: !!comp.motorConfig
                        })) || [];
                        
                        setSelectedPhase({
                          ...phase,
                          components: mappedComponents
                        });
                        setShowPhaseModal(true);
                      }}
                      key={phase.id || phase.name}
                      style={{ 
                        background: phase.color, 
                        flex: "1", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "600",
                        position: "relative",
                        opacity: cycleStatus?.current_phase_index === phase.index ? 1 : 0.7,
                        border: cycleStatus?.current_phase_index === phase.index ? "2px solid #fff" : "none"
                      }}
                    >
                      <span>{phase.name}</span>
                      {/* Sensor Trigger Indicator */}
                      {fullPhase?.sensorTrigger && (
                        <span
                          title={`Sensor Trigger: ${fullPhase.sensorTrigger.type} ${fullPhase.sensorTrigger?.triggerAbove ? ">=" : "<="} ${fullPhase.sensorTrigger.threshold} (Pin ${fullPhase.sensorTrigger.pinNumber})`}
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
                      {cycleStatus?.current_phase_index === phase.index && (
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
                // No cycle data - show empty state
                <div style={{ 
                  flex: "1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                  background: "#0f172a",
                  border: "2px dashed #334155",
                  borderRadius: "6px",
                  gap: "8px"
                }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>
                    No Cycle Data Loaded
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                    Please flash a cycle to the ESP32 to begin monitoring
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time Display */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff" }}>
                {/* use local timestamp  */}
                {formatElapsedTime(cycleStatus?.phase_elapsed_ms || elapsedTime * 1000)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {cycleStatus?.current_phase_index === 0 ? "Idle Time" : "Phase Elapsed"}
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: cycleStatus?.current_phase_index === 0 ? "#6b7280" : "#fff" }}>
                {cycleStatus?.current_phase_index === 0 
                  ? "IDLE" 
                  : (cycleStatus?.current_phase_index !== undefined ? cycleData?.data.phases[cycleStatus.current_phase_index - 1]?.name : undefined) || "—"
                }
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Current Status</div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff" }}>
                {cycleStatus?.total_phases || phaseTimeline.length}
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
                background: isStartingCycle ? "#16a34a" : "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: (cycleRunning || isStartingCycle) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: (cycleRunning || isStartingCycle) ? "0.7" : "1",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onClick={handleStartCycle}
              disabled={cycleRunning || isStartingCycle}
              title={cycleRunning ? "Cannot start while cycle is running" : isStartingCycle ? "Starting..." : "Start cycle"}
            >
            
              {isStartingCycle ? "Starting..." : "▶ Start Cycle"}
            </button>

            {/* Stop Cycle Button - Only enabled when cycle is running */}
            <button
              style={{
                padding: "12px 20px",
                background: isStoppingCycle ? "#dc2626" : "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: (!cycleRunning || isStoppingCycle) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: (!cycleRunning || isStoppingCycle) ? "0.7" : "1",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onClick={handleStopCycle}
              disabled={!cycleRunning || isStoppingCycle}
              title={!cycleRunning ? "No cycle running to stop" : 
                     isStoppingCycle ? "Stopping cycle..." : "Stop cycle"}
            >
             
              {isStoppingCycle ? "Stopping..." : "⏹ Stop Cycle"}
            </button>

         

            {/* Skip Phase Button - Only enabled when cycle is running */}
            <button
              style={{
                padding: "12px 20px",
                background: isSkippingPhase ? "#52525b" : "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: (!cycleRunning || isSkippingPhase) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: (!cycleRunning || isSkippingPhase) ? "0.7" : "1",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onClick={handleSkipPhase}
              disabled={!cycleRunning || isSkippingPhase}
              title={!cycleRunning ? "No cycle running" : isSkippingPhase ? "Skipping..." : "Skip current phase"}
            >
             
              {isSkippingPhase ? "Skipping..." : "⏭ Skip Phase"}
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
                background: cycleRunning ? "#059669" : "#6b7280",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {cycleRunning ? "Running" : "Idle"}
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
          {pins.map(({ name, pin }) => {
            const isOn = !getGPIOState(pin);
            const isLoading = loadingPins.has(pin);
            const isMotorDirection = pin === 10;
            
            // Motor direction: LOW (0) = Counter-Clockwise (default), HIGH (1) = Clockwise
            const isClockwise = isMotorDirection ? !getGPIOState(pin) : false;
            
            return (
              <button
                key={pin}
                style={{
                  padding: "20px",
                  background: isLoading ? "#4b5563" : isOn ? "#059669" : "#374151",
                  color: "#fff",
                  border: isLoading ? "2px solid #6b7280" : isOn ? "2px solid #10b981" : "2px solid #4b5563",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: (cycleRunning || isLoading) ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  opacity: (cycleRunning || isLoading) ? "0.7" : "1",
                  position: "relative"
                }}
                onClick={() => togglePin(pin)}
                disabled={cycleRunning || isLoading}
                title={
                  cycleRunning ? "Cannot toggle components while cycle is running" 
                  : isLoading ? "Updating..." 
                  : isMotorDirection ? (isClockwise ? "Click to change to Counter-Clockwise" : "Click to change to Clockwise")
                  : ""
                }
              >
                {/* Loading Spinner Overlay */}
                {isLoading && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "24px",
                    height: "24px",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTop: "3px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                )}
                
                {isMotorDirection ? (
                  // Special rendering for Motor Direction
                  <>
                    <div 
                    style={{ 
                      fontSize: "24px",
                      opacity: isLoading ? 0.5 : 1,
                      transform: isClockwise ? "rotate(0deg)" : "rotate(180deg)",
                      transition: "transform 0.3s ease"
                    }}>
                      ↻
                    </div>
                    
                    <div style={{ 
                      fontSize: "12px", 
                      textAlign: "center",
                      opacity: isLoading ? 0.5 : 1
                    }}>
                      {name.replace("_PIN", "").replace("_", " ")}
                    </div>
                    
                    <div style={{ 
                      fontSize: "10px", 
                      color: isLoading ? "#9ca3af" : "#86efac",
                      fontWeight: "600",
                      opacity: isLoading ? 0.5 : 1
                    }}>
                      {isLoading ? "UPDATING..." : isClockwise ? "CLOCKWISE" : "COUNTER-CW"}
                    </div>
                  </>
                ) : (
                  // Standard rendering for other pins
                  <>
                    <div style={{ 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%",
                      background: isLoading ? "#9ca3af" : isOn ? "#10b981" : "#6b7280",
                      opacity: isLoading ? 0.5 : 1
                    }}></div>
                    
                    <div style={{ 
                      fontSize: "12px", 
                      textAlign: "center",
                      opacity: isLoading ? 0.5 : 1
                    }}>
                      {name.replace("_PIN", "").replace("_", " ")}
                    </div>
                    
                    <div style={{ 
                      fontSize: "10px", 
                      color: isLoading ? "#9ca3af" : isOn ? "#86efac" : "#9ca3af",
                      fontWeight: "500",
                      opacity: isLoading ? 0.5 : 1
                    }}>
                      Pin {pin} - {isLoading ? "UPDATING..." : isOn ? "ON" : "OFF"}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sensor Data Modal */}
      <SensorDataPresentation
        isOpen={showSensorModal}
        sensorHistory={sensorHistory}
        setSensorHistory={setSensorHistory}
        onClose={() => setShowSensorModal(false)}
        telemetryData={telemetryData}
      />

      {/* Phase Info Modal */}
      <PhaseInfoModal
        isOpen={showPhaseModal}
        onClose={() => setShowPhaseModal(false)}
        selectedPhase={selectedPhase}
        cycleStatus={cycleStatus}
        totalPhases={phaseTimeline.length}
        onSkipToPhase={handleSkipToPhase}
        formatElapsedTime={formatElapsedTime}
        phaseElapsedMs={cycleStatus?.phase_elapsed_ms}
      />
    </div>
  );
}

export default SystemMonitor;