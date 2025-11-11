import { useSelector } from 'react-redux';
import {
  selectTelemetry,
  selectRPM,
  selectPressure,
  selectCurrentPhaseName,
  selectCycleRunning,
  selectGPIOStates,
  selectSensorData,
  selectCycleStatus,
  selectRPMHistory,
  selectPressureHistory,
  selectLastUpdateTime,
} from '../store/washerSlice';

/**
 * Example component showing how to use the washer slice
 * to display real-time telemetry data from the websocket
 */
export default function WasherTelemetryExample() {
  // Get specific values
  const rpm = useSelector(selectRPM);
  const pressure = useSelector(selectPressure);
  const phaseName = useSelector(selectCurrentPhaseName);
  const cycleRunning = useSelector(selectCycleRunning);
  const gpioStates = useSelector(selectGPIOStates);
  
  // Get grouped data
  const sensorData = useSelector(selectSensorData);
  const cycleStatus = useSelector(selectCycleStatus);
  
  // Get historical data for charts
  const rpmHistory = useSelector(selectRPMHistory);
  const pressureHistory = useSelector(selectPressureHistory);
  
  // Get full telemetry
  const telemetry = useSelector(selectTelemetry);
  const lastUpdate = useSelector(selectLastUpdateTime);

  if (!telemetry) {
    return (
      <div className="p-4">
        <p>Waiting for telemetry data...</p>
        <p className="text-sm text-gray-500">
          Make sure WebSocket is connected
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Washer Telemetry Monitor</h1>
      
      {/* Last Update */}
      <div className="text-sm text-gray-500">
        Last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'}
      </div>

      {/* Cycle Status */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Cycle Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Status: </span>
            <span className={cycleRunning ? 'text-green-600' : 'text-gray-600'}>
              {cycleRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div>
            <span className="font-medium">Phase: </span>
            {phaseName}
          </div>
          <div>
            <span className="font-medium">Phase Index: </span>
            {cycleStatus?.current_phase_index} / {cycleStatus?.total_phases}
          </div>
          <div>
            <span className="font-medium">Phase Elapsed: </span>
            {((cycleStatus?.phase_elapsed_ms || 0) / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Sensor Data */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Sensors</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="font-medium">RPM: </span>
            {rpm}
          </div>
          <div>
            <span className="font-medium">Pressure: </span>
            {pressure.toFixed(2)} Hz
          </div>
          <div>
            <span className="font-medium">Error: </span>
            <span className={sensorData?.sensor_error ? 'text-red-600' : 'text-green-600'}>
              {sensorData?.sensor_error ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* GPIO States */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">GPIO Pins</h2>
        <div className="grid grid-cols-4 gap-2">
          {gpioStates.map((gpio) => (
            <div 
              key={gpio.pin}
              className={`p-2 rounded text-center ${
                gpio.state === 1 ? 'bg-green-200' : 'bg-gray-200'
              }`}
            >
              <div className="font-medium">Pin {gpio.pin}</div>
              <div className="text-sm">{gpio.state === 1 ? 'HIGH' : 'LOW'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* History Info */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Historical Data</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">RPM samples: </span>
            {rpmHistory.length}
          </div>
          <div>
            <span className="font-medium">Pressure samples: </span>
            {pressureHistory.length}
          </div>
        </div>
      </div>

      {/* Raw Telemetry (for debugging) */}
      <details className="bg-gray-50 p-4 rounded-lg">
        <summary className="cursor-pointer font-semibold">
          Raw Telemetry Data (Click to expand)
        </summary>
        <pre className="mt-2 text-xs overflow-auto">
          {JSON.stringify(telemetry, null, 2)}
        </pre>
      </details>
    </div>
  );
}
