# Cycle Data Update - Summary

## Changes Made

### ✅ Updated Washer Slice

Added support for the new `cycle_data` attribute in telemetry packets.

#### New Interfaces:

```typescript
// Component structure within a phase
export interface CycleComponent {
  id: string;
  label: string;
  compId: string;
  start_ms: number;
  duration_ms: number;
  has_motor: boolean;
}

// Phase structure
export interface CyclePhase {
  id: string;
  name: string;
  color: string;
  start_time_ms: number;
  components: CycleComponent[];
}
```

#### Updated TelemetryData:

```typescript
export interface TelemetryData {
  type: string;
  packet_timestamp_ms: number;
  gpio: GPIOState[];
  sensors: SensorData;
  cycle: CycleStatus;
  cycle_data?: CyclePhase[]; // NEW: Optional array of cycle phases
}
```

### ✅ New Selectors

Added two new selectors to access cycle data:

1. **`selectCycleData`** - Returns all cycle phases
   ```typescript
   const cycleData = useSelector(selectCycleData);
   // Returns: CyclePhase[] or []
   ```

2. **`selectCurrentPhaseData`** - Returns the current phase with all its components
   ```typescript
   const currentPhase = useSelector(selectCurrentPhaseData);
   // Returns: CyclePhase | null
   ```

### ✅ Example Usage

Created `CycleDataUsageExample.tsx` showing:
- How to display all phases
- How to show the current phase
- How to access components within phases
- Helper hooks for common operations

## Usage Examples

### Display Current Phase Components

```typescript
import { useSelector } from 'react-redux';
import { selectCurrentPhaseData } from '../store/washerSlice';

function CurrentPhaseView() {
  const currentPhase = useSelector(selectCurrentPhaseData);
  
  if (!currentPhase) return <div>No active phase</div>;
  
  return (
    <div style={{ backgroundColor: `#${currentPhase.color}` }}>
      <h3>{currentPhase.name}</h3>
      {currentPhase.components.map(comp => (
        <div key={comp.id}>
          {comp.label} - {comp.duration_ms / 1000}s
          {comp.has_motor && ' 🔧'}
        </div>
      ))}
    </div>
  );
}
```

### Timeline Visualization

```typescript
import { useSelector } from 'react-redux';
import { selectCycleData, selectCycleStatus } from '../store/washerSlice';

function PhaseTimeline() {
  const phases = useSelector(selectCycleData);
  const status = useSelector(selectCycleStatus);
  
  return (
    <div className="flex">
      {phases.map((phase, idx) => (
        <div 
          key={phase.id}
          className={idx === status?.current_phase_index ? 'active' : ''}
          style={{ 
            backgroundColor: `#${phase.color}`,
            flex: 1 
          }}
        >
          {phase.name}
        </div>
      ))}
    </div>
  );
}
```

### Get Motor Components Only

```typescript
import { useSelector } from 'react-redux';
import { selectCycleData } from '../store/washerSlice';

function MotorSchedule() {
  const phases = useSelector(selectCycleData);
  
  const motorComponents = phases.flatMap(phase =>
    phase.components
      .filter(comp => comp.has_motor)
      .map(comp => ({
        ...comp,
        phase: phase.name,
        phaseColor: phase.color
      }))
  );
  
  return (
    <div>
      {motorComponents.map(motor => (
        <div key={motor.id}>
          {motor.label} in {motor.phase} - {motor.duration_ms}ms
        </div>
      ))}
    </div>
  );
}
```

## Data Flow

1. **ESP32 sends telemetry** with cycle_data:
   ```json
   {
     "type": "telemetry",
     "cycle_data": [
       {
         "id": "1755269543284",
         "name": "phase1",
         "color": "4ADE80",
         "components": [...]
       }
     ]
   }
   ```

2. **WebSocket receives** and dispatches to washer slice

3. **Washer slice updates** telemetry with cycle_data

4. **Components access** via selectors:
   - `selectCycleData()` - Get all phases
   - `selectCurrentPhaseData()` - Get current phase

5. **UI updates automatically** when telemetry changes

## Benefits

✅ **Real-time cycle definition** - ESP32 can send the complete cycle structure
✅ **Dynamic UI** - Frontend can render phases without hardcoding
✅ **Component tracking** - Know exactly which components are in each phase
✅ **Motor detection** - Easily filter motor-based components
✅ **Timeline generation** - Build accurate phase timelines from actual data
✅ **Type-safe** - Full TypeScript support for all cycle data

## Files Modified

- ✅ `src/store/washerSlice.ts` - Added interfaces and selectors
- ✅ `src/store/WASHER_SLICE_README.md` - Updated documentation
- ✅ `src/examples/CycleDataUsageExample.tsx` - Created usage examples

## Next Steps

You can now:
1. Use `selectCycleData()` to render dynamic phase timelines
2. Use `selectCurrentPhaseData()` to show current phase details
3. Build visualizations based on actual cycle structure from ESP32
4. Track component execution within phases
5. Filter motor vs non-motor components
