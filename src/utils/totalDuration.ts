import type { Cycle } from "../types/common/Cycle";
import type { LocalCycle } from "../types/common/LocalCycle";
import type { Phase } from "../types/common/Phase";

type PhaseDuration = {
  id: string;
  duration: number;
  color: string;
};

type PhasePortion = {
  id: string;
  portion: number; // e.g., "4.54 %"
  color: string;
};

type Result = {
  totalCycleDuration: number;
  phaseDurations: PhaseDuration[];
};
export function calculateCycleDurations(cycle: Cycle | LocalCycle): Result {
  const data = cycle.data;
  const phaseDurations: PhaseDuration[] = [];

  for (const phase of data.phases) {
    phaseDurations.push({
      id: phase.id,
      duration: calculatePhaseTotalDuration(phase),
      color: phase.color,
    });
  }

  const totalCycleDuration = phaseDurations.reduce(
    (sum, p) => sum + p.duration,
    0
  );

  return {
    totalCycleDuration,
    phaseDurations,
  };
}

export function calculatePhasePortions(
  totalCycleDuration: number,
  phaseDurations: PhaseDuration[]
): PhasePortion[] {
  // Handle case where total duration is 0
  if (totalCycleDuration === 0) {
    // Give equal portions to all phases
    const equalPortion =
      phaseDurations.length > 0 ? 100 / phaseDurations.length : 0;
    return phaseDurations.map((phase) => ({
      id: phase.id,
      portion: Number(equalPortion.toFixed(2)),
      color: phase.color,
    }));
  }

  return phaseDurations.map((phase) => {
    const percent = (phase.duration / totalCycleDuration) * 100;
    return {
      id: phase.id,
      portion: Number(percent.toFixed(2)),
      color: phase.color,
    };
  });
}

export function calculatePhaseTotalDuration(phase: Phase): number {
  // Handle empty components array
  const longestComponentEnd =
    phase.components.length > 0
      ? Math.max(...phase.components.map((c) => c.start + c.duration))
      : 0; // Default to 0 if no components

  return longestComponentEnd + phase.startTime;
}
