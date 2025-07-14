export function formatTimeLabel(time: number): string {
  if (time < 10000) {
    return `${Math.round(time)}ms`;
  } else if (time < 60000) {
    const secs = Math.round(time / 1000);
    return `${secs}s`;
  } else {
    const totalSec = Math.round(time / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m:${secs.toString().padStart(2, "0")}s`;
  }
}
