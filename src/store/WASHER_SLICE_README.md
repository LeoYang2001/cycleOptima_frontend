# Washer Telemetry Slice

This slice manages real-time telemetry data from the washer machine received via WebSocket.

## Features

- **Real-time telemetry storage**: Stores the latest telemetry data including GPIO states, sensor readings, and cycle status
- **Historical data tracking**: Maintains a rolling history of RPM and pressure readings for charts/graphs
- **Type-safe selectors**: Provides typed selectors for easy data access
- **Automatic updates**: Automatically updates when WebSocket receives telemetry messages

## Data Structure

The telemetry data follows this structure:

```typescript
{
  type: "telemetry",
  packet_timestamp_ms: number,
  gpio: [
    { pin: number, state: number }
  ],
  sensors: {
    rpm: number,
    pressure_freq: number,
    sensor_error: boolean
  },
  cycle: {
    cycle_running: boolean,
    current_phase_index: number,
    current_phase_name: string,
    total_phases: number,
    phase_elapsed_ms: number,
    phase_total_duration_ms: number,
    cycle_start_time_ms: number
  },
  cycle_data?: [  // Optional: Full cycle definition from ESP32
    {
      id: string,
      name: string,
      color: string,
      start_time_ms: number,
      components: [
        {
          id: string,
          label: string,
          compId: string,
          start_ms: number,
          duration_ms: number,
          has_motor: boolean
        }
      ]
    }
  ]
}
```

## Usage

### Basic Usage in Components

```typescript
import { useSelector } from 'react-redux';
import { selectRPM, selectPressure, selectCycleRunning } from '../store/washerSlice';

function MyComponent() {
  const rpm = useSelector(selectRPM);
  const pressure = useSelector(selectPressure);
  const isRunning = useSelector(selectCycleRunning);

  return (
    <div>
      <p>RPM: {rpm}</p>
      <p>Pressure: {pressure.toFixed(2)} Hz</p>
      <p>Status: {isRunning ? 'Running' : 'Stopped'}</p>
    </div>
  );
}
```

### Available Selectors

#### Full Data
- `selectTelemetry` - Get the complete telemetry object
- `selectLastUpdateTime` - Get timestamp of last update

#### GPIO
- `selectGPIOStates` - Get all GPIO pin states
- `selectGPIOByPin(pinNumber)` - Get specific GPIO pin state

#### Sensors
- `selectSensorData` - Get all sensor data
- `selectRPM` - Get current RPM value
- `selectPressure` - Get current pressure frequency

#### Cycle Status
- `selectCycleStatus` - Get full cycle status
- `selectCycleRunning` - Check if cycle is running
- `selectCurrentPhaseName` - Get current phase name

#### Cycle Data (NEW)
- `selectCycleData` - Get all cycle phases from telemetry
- `selectCurrentPhaseData` - Get current phase data with components

#### Historical Data
- `selectRPMHistory` - Get RPM history array
- `selectPressureHistory` - Get pressure history array

### Example: Display GPIO States

```typescript
import { useSelector } from 'react-redux';
import { selectGPIOStates } from '../store/washerSlice';

function GPIOMonitor() {
  const gpioStates = useSelector(selectGPIOStates);

  return (
    <div>
      {gpioStates.map(gpio => (
        <div key={gpio.pin}>
          Pin {gpio.pin}: {gpio.state === 1 ? 'HIGH' : 'LOW'}
        </div>
      ))}
    </div>
  );
}
```

### Example: Chart with Historical Data

```typescript
import { useSelector } from 'react-redux';
import { selectRPMHistory } from '../store/washerSlice';

function RPMChart() {
  const rpmHistory = useSelector(selectRPMHistory);
  
  // Use rpmHistory with your charting library
  // Each item has: { timestamp: number, value: number }
  
  return (
    <YourChartComponent 
      data={rpmHistory.map(item => ({
        x: item.timestamp,
        y: item.value
      }))}
    />
  );
}
```

### Example: Specific GPIO Pin

```typescript
import { useSelector } from 'react-redux';
import { selectGPIOByPin } from '../store/washerSlice';

function MotorStatus() {
  const motorPin = useSelector(selectGPIOByPin(7));

  return (
    <div>
      Motor: {motorPin?.state === 1 ? 'ON' : 'OFF'}
    </div>
  );
}
```

### Example: Using Cycle Data

```typescript
import { useSelector } from 'react-redux';
import { selectCycleData, selectCurrentPhaseData } from '../store/washerSlice';

function CycleInfo() {
  const cycleData = useSelector(selectCycleData);
  const currentPhase = useSelector(selectCurrentPhaseData);

  return (
    <div>
      <h3>Total Phases: {cycleData.length}</h3>
      
      {currentPhase && (
        <div>
          <h4>Current Phase: {currentPhase.name}</h4>
          <div style={{ backgroundColor: `#${currentPhase.color}` }}>
            {currentPhase.components.map(comp => (
              <p key={comp.id}>
                {comp.label}: {comp.duration_ms}ms
                {comp.has_motor && ' (Motor)'}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Actions

While the slice updates automatically via WebSocket, you can also dispatch actions manually:

```typescript
import { useDispatch } from 'react-redux';
import { clearTelemetry, clearHistory, setMaxHistoryLength } from '../store/washerSlice';

function Controls() {
  const dispatch = useDispatch();

  return (
    <div>
      <button onClick={() => dispatch(clearTelemetry())}>
        Clear Telemetry
      </button>
      <button onClick={() => dispatch(clearHistory())}>
        Clear History
      </button>
      <button onClick={() => dispatch(setMaxHistoryLength(200))}>
        Increase History Size
      </button>
    </div>
  );
}
```

## WebSocket Integration

The washer slice is automatically updated when the WebSocket receives telemetry messages. The integration is handled in `websocketSlice.ts`:

```typescript
// When WebSocket receives a message:
ws.onmessage = (evt) => {
  const data = JSON.parse(evt.data);
  
  // If it's telemetry, the washer slice is automatically updated
  if (data.type === 'telemetry') {
    dispatch(updateTelemetry(data));
  }
};
```

No additional setup is required - just ensure the WebSocket is connected.

## History Configuration

By default, the slice keeps the last 100 data points for RPM and pressure. You can change this:

```typescript
import { setMaxHistoryLength } from '../store/washerSlice';

// Keep last 500 data points
dispatch(setMaxHistoryLength(500));
```

This is useful for:
- Adjusting memory usage
- Controlling chart data density
- Balancing between history depth and performance

## Complete Example

See `src/examples/WasherTelemetryExample.tsx` for a complete working example that demonstrates all features.
