import type { Cycle } from "../types/common/Cycle";

type PhaseDuration = {
  id: string;
  duration: number;
};

type Result = {
  totalCycleDuration: number;
  phaseDurations: PhaseDuration[];
};
export function calculateCycleDurations(cycle: Cycle): Result {
  const data = cycle.data;
  const phaseDurations: PhaseDuration[] = [];

  for (const phase of data.phases) {
    const longestComponentEnd = Math.max(
      ...phase.components.map((c) => c.start + c.duration)
    );

    phaseDurations.push({
      id: phase.id,
      duration: longestComponentEnd + phase.startTime,
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
