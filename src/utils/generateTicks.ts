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

/**
 * Generate ticks with a start time offset. Creates one tick at 0, then evenly distributes
 * the remaining ticks from startTime to totalTime.
 *
 * Example: startTime=15ms, totalTime=40ms → generates tick at 0ms + 5 evenly spaced ticks from 15ms to 40ms
 *
 * @param totalTime Total duration in milliseconds
 * @param startTime Start time offset in milliseconds
 * @returns Array of 6 objects: { time: number, label: string }
 */
export function generateTicksWithStartTime(
  totalTime: number,
  startTime: number
): { time: number; label: string }[] {
  const REMAINING_TICK_COUNT = 5; // 5 ticks from startTime to totalTime
  const ticks: { time: number; label: string }[] = [];

  // decide display unit based on totalTime
  type Unit = "ms" | "sec" | "min";
  let unit: Unit;
  if (totalTime < 10000) {
    unit = "ms";
  } else if (totalTime < 60000) {
    unit = "sec";
  } else {
    unit = "min";
  }

  // Helper function to format time based on unit
  const formatTime = (time: number): string => {
    if (unit === "ms") {
      return `${Math.round(time)}ms`;
    } else if (unit === "sec") {
      const secs = Math.round(time / 1000);
      return `${secs}s`;
    } else {
      const totalSec = Math.round(time / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins}m:${secs.toString().padStart(2, "0")}s`;
    }
  };

  // Always add tick at 0
  ticks.push({ time: 0, label: formatTime(0) });

  // Generate 5 evenly spaced ticks from startTime to totalTime
  for (let i = 0; i < REMAINING_TICK_COUNT; i++) {
    const fraction = i / (REMAINING_TICK_COUNT - 1);
    const time = startTime + fraction * (totalTime - startTime);
    const label = formatTime(time);
    ticks.push({ time, label });
  }

  return ticks;
}
