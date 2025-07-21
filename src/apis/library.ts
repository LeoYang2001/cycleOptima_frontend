import type { CycleComponent } from "../types/common/CycleComponent";

const API_URL = "http://192.168.10.73:4000";

export async function fetchLibraryComponents(): Promise<CycleComponent[]> {
  const res = await fetch(`${API_URL}/api/library`);
  if (!res.ok) throw new Error("Failed to fetch library components");
  const data = await res.json();

  // Transform the API response to match CycleComponent interface
  return data.map((item: any) => ({
    id: item.id,
    label: item.label,
    start: 0, // Library components don't have a start time, default to 0
    compId: item.compId,
    duration: item.duration,
    motorConfig: item.motorConfig,
  }));
}
