import { useSelector } from 'react-redux';
import { selectCycleData, selectCurrentPhaseData, selectCycleStatus } from '../store/washerSlice';

/**
 * Example component showing how to use the cycle_data from telemetry
 */
export default function CycleDataUsageExample() {
  const cycleData = useSelector(selectCycleData);
  const currentPhaseData = useSelector(selectCurrentPhaseData);
  const cycleStatus = useSelector(selectCycleStatus);

  if (cycleData.length === 0) {
    return <div>No cycle data available</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Cycle Data from Telemetry</h2>

      {/* Current Phase Info */}
      {currentPhaseData && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current Phase</h3>
          <div className="space-y-2">
            <p><strong>Name:</strong> {currentPhaseData.name}</p>
            <p><strong>Color:</strong> #{currentPhaseData.color}</p>
            <p><strong>Start Time:</strong> {currentPhaseData.start_time_ms}ms</p>
            <p><strong>Components:</strong> {currentPhaseData.components.length}</p>
            
            {/* List components */}
            <div className="mt-4">
              <h4 className="font-semibold">Components in this phase:</h4>
              <ul className="list-disc list-inside">
                {currentPhaseData.components.map((component) => (
                  <li key={component.id}>
                    {component.label} ({component.compId}) - 
                    {component.duration_ms}ms starting at {component.start_ms}ms
                    {component.has_motor && ' 🔧 Motor'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* All Phases */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">All Phases ({cycleData.length})</h3>
        <div className="space-y-4">
          {cycleData.map((phase, index) => (
            <div 
              key={phase.id}
              className={`p-3 rounded ${
                cycleStatus?.current_phase_index === index 
                  ? 'bg-green-200 border-2 border-green-600' 
                  : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: `#${phase.color}` }}
                ></div>
                <h4 className="font-semibold">
                  Phase {index + 1}: {phase.name}
                  {cycleStatus?.current_phase_index === index && ' ← Current'}
                </h4>
              </div>
              
              <div className="ml-8">
                <p className="text-sm text-gray-600">
                  {phase.components.length} component{phase.components.length !== 1 ? 's' : ''}
                </p>
                <ul className="text-sm space-y-1 mt-2">
                  {phase.components.map((comp) => (
                    <li key={comp.id} className="text-gray-700">
                      • {comp.label} - {comp.duration_ms / 1000}s
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cycle Status */}
      {cycleStatus && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Cycle Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Running:</strong> {cycleStatus.cycle_running ? 'Yes' : 'No'}</p>
              <p><strong>Current Phase:</strong> {cycleStatus.current_phase_index + 1} of {cycleStatus.total_phases}</p>
              <p><strong>Phase Name:</strong> {cycleStatus.current_phase_name}</p>
            </div>
            <div>
              <p><strong>Phase Elapsed:</strong> {(cycleStatus.phase_elapsed_ms / 1000).toFixed(1)}s</p>
              <p><strong>Phase Duration:</strong> {(cycleStatus.phase_total_duration_ms / 1000).toFixed(1)}s</p>
              <p><strong>Cycle Start:</strong> {cycleStatus.cycle_start_time_ms}ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Get total cycle duration
 */
export function useTotalCycleDuration() {
  const cycleData = useSelector(selectCycleData);
  
  return cycleData.reduce((total, phase) => {
    const phaseDuration = Math.max(
      ...phase.components.map(comp => comp.start_ms + comp.duration_ms)
    );
    return total + phaseDuration;
  }, 0);
}

/**
 * Example: Get all motor components
 */
export function useMotorComponents() {
  const cycleData = useSelector(selectCycleData);
  
  const motorComponents = cycleData.flatMap(phase => 
    phase.components.filter(comp => comp.has_motor).map(comp => ({
      ...comp,
      phaseName: phase.name,
      phaseColor: phase.color,
    }))
  );
  
  return motorComponents;
}
