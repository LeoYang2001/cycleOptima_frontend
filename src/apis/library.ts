import type { CycleComponent } from "../types/common/CycleComponent";
import { getApiUrl, getNgrokHeaders } from "../config/api";

export async function fetchLibraryComponents(): Promise<CycleComponent[]> {
  try {
    const res = await fetch(getApiUrl("/api/library"), {
      headers: getNgrokHeaders(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        "Library fetch failed:",
        res.status,
        res.statusText,
        errorText
      );
      throw new Error(
        `Failed to fetch library components: ${res.status} ${res.statusText}`
      );
    }

    const data = await res.json();
    console.log("Library components fetched successfully:", data);


    // Transform the API response to match CycleComponent interface
    return data.map((item: any) => ({
      id: item.id,
      label: item.label,
      start: 0, // Library components don't have a start time, default to 0
      compId: item.compId,
      duration: item.duration,
      motorConfig: item.motorConfig,
    }));
  } catch (error) {
    console.error("Failed to fetch library components:", error);
    throw error;
  }
}
