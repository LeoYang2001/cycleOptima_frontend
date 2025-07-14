/**
 * Generate 6 evenly-spaced ticks between 0 and totalTime (ms), inclusive.
 * The display unit automatically adjusts:
 *  - totalTime < 10 000ms → label in milliseconds (e.g. "0ms", "2000ms")
 *  - totalTime < 60 000ms → label in seconds (e.g. "0s", "10s")
 *  - totalTime ≥ 60 000ms → label in minutes and seconds (e.g. "0:00", "5:00", "1:30")
 * @param totalTime Total duration in milliseconds
 * @returns Array of 6 objects: { time: number, label: string }
 */
export function generateTicks(
  totalTime: number
): { time: number; label: string }[] {
  const TICK_COUNT = 6;
  const ticks: { time: number; label: string }[] = [];

  // decide display unit
  type Unit = "ms" | "sec" | "min";
  let unit: Unit;
  if (totalTime < 10000) {
    unit = "ms";
  } else if (totalTime < 60000) {
    unit = "sec";
  } else {
    unit = "min";
  }

  for (let i = 0; i < TICK_COUNT; i++) {
    const fraction = i / (TICK_COUNT - 1);
    const time = fraction * totalTime;

    let label: string;
    if (unit === "ms") {
      // round to nearest millisecond
      label = `${Math.round(time)}ms`;
    } else if (unit === "sec") {
      // convert to whole seconds
      const secs = Math.round(time / 1000);
      label = `${secs}s`;
    } else {
      // minutes and seconds
      const totalSec = Math.round(time / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      label = `${mins}m:${secs.toString().padStart(2, "0")}s`;
    }

    ticks.push({ time, label });
  }

  return ticks;
}
