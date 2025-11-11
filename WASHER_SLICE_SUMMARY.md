# Washer Slice Implementation Summary

## ✅ What Was Created

### 1. **washerSlice.ts** - Main Redux Slice
Location: `src/store/washerSlice.ts`

**Features:**
- Stores real-time telemetry data from WebSocket
- Maintains rolling history of RPM and pressure (last 100 points by default)
- Type-safe interfaces for all data structures
- Comprehensive selectors for easy data access

**Data Structure:**
```typescript
{
  type: "telemetry",
  packet_timestamp_ms: number,
  gpio: [{ pin: number, state: number }],
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
  }
}
```

### 2. **WebSocket Integration**
Updated: `src/store/websocketSlice.ts`

**Changes:**
- Automatically dispatches `updateTelemetry()` when receiving telemetry messages
- Checks if `data.type === 'telemetry'` before updating washer slice
- No manual setup required - works automatically once WebSocket is connected

### 3. **Store Configuration**
Updated: `src/store/index.ts`

**Changes:**
- Added `washer` reducer to the store
- Washer state is now accessible throughout the app

### 4. **Example Component**
Created: `src/examples/WasherTelemetryExample.tsx`

A complete working example showing:
- How to display all telemetry data
- Real-time updates
- Cycle status monitoring
- Sensor readings
- GPIO states
- Historical data tracking

### 5. **Documentation**
Created: `src/store/WASHER_SLICE_README.md`

Complete documentation with:
- Usage examples
- All available selectors
- Common patterns
- Integration details

## 🚀 How to Use

### Basic Usage

```typescript
import { useSelector } from 'react-redux';
import { selectRPM, selectCycleRunning } from '../store/washerSlice';

function MyComponent() {
  const rpm = useSelector(selectRPM);
  const isRunning = useSelector(selectCycleRunning);
  
  return (
    <div>
      <p>RPM: {rpm}</p>
      <p>Status: {isRunning ? 'Running' : 'Stopped'}</p>
    </div>
  );
}
```

### Available Selectors

**Full Data:**
- `selectTelemetry` - Complete telemetry object
- `selectLastUpdateTime` - Timestamp of last update

**GPIO:**
- `selectGPIOStates` - All GPIO pin states
- `selectGPIOByPin(pinNumber)` - Specific pin state

**Sensors:**
- `selectSensorData` - All sensor data
- `selectRPM` - Current RPM
- `selectPressure` - Current pressure frequency

**Cycle:**
- `selectCycleStatus` - Full cycle status
- `selectCycleRunning` - Boolean if cycle is running
- `selectCurrentPhaseName` - Current phase name

**History:**
- `selectRPMHistory` - RPM history array
- `selectPressureHistory` - Pressure history array

### Actions

```typescript
import { useDispatch } from 'react-redux';
import { clearTelemetry, clearHistory, setMaxHistoryLength } from '../store/washerSlice';

const dispatch = useDispatch();

// Clear current telemetry
dispatch(clearTelemetry());

// Clear historical data
dispatch(clearHistory());

// Adjust history size (default: 100 points)
dispatch(setMaxHistoryLength(200));
```

## 🔄 Automatic Updates Flow

```
WebSocket receives message
         ↓
websocketSlice checks if type === 'telemetry'
         ↓
Dispatches updateTelemetry(data)
         ↓
washerSlice updates state
         ↓
Components using selectors re-render automatically
```

## 📊 Data Flow Example

1. **ESP32 sends telemetry** via WebSocket
2. **WebSocket manager** receives in `onmessage` handler
3. **Automatically updates** washer slice if `type === 'telemetry'`
4. **React components** using selectors automatically re-render
5. **History arrays** automatically updated (last 100 points)

## 🎯 Key Features

✅ **Type-safe** - Full TypeScript support
✅ **Automatic** - Updates via WebSocket without manual setup
✅ **Efficient** - Only stores last N data points (configurable)
✅ **Flexible** - Multiple selectors for different use cases
✅ **Real-time** - Components update immediately on new data
✅ **Historical** - Maintains rolling history for charts

## 🧪 Testing

To test the implementation:

1. Ensure WebSocket is connected
2. Send telemetry message from ESP32:
   ```json
   {
     "type": "telemetry",
     "packet_timestamp_ms": 12345,
     "gpio": [{"pin": 7, "state": 1}],
     "sensors": {"rpm": 1200, "pressure_freq": 28116.48, "sensor_error": false},
     "cycle": {"cycle_running": true, "current_phase_name": "wash", ...}
   }
   ```
3. Use the example component or selectors in your own components
4. Data should update automatically

## 📁 Files Modified/Created

- ✅ `src/store/washerSlice.ts` (created)
- ✅ `src/store/websocketSlice.ts` (updated)
- ✅ `src/store/index.ts` (updated)
- ✅ `src/examples/WasherTelemetryExample.tsx` (created)
- ✅ `src/store/WASHER_SLICE_README.md` (created)

## 🎨 Next Steps

You can now:
1. Use the selectors in any component to display telemetry data
2. Create charts using the history arrays
3. Monitor GPIO states for device control
4. Track cycle progress in real-time
5. Set up alerts based on sensor readings

All updates happen automatically when your WebSocket receives telemetry messages!
