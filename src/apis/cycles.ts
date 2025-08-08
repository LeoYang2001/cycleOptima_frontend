import { getApiUrl, getNgrokHeaders } from "../config/api";

export async function fetchAllWasherCycles() {
  console.log("fetching all washer cycles");
  const res = await fetch(
    getApiUrl("/api/washer-cycles?sortBy=created_at&order=desc"),
    {
      headers: getNgrokHeaders(),
    }
  );
  if (!res.ok) throw new Error("Failed to fetch washer cycles");

  const data = await res.json();
  console.log("all cycles:", data);

  // Save to local storage, excluding embedding attribute
  const dataWithoutEmbedding = Array.isArray(data) 
    ? data.map(cycle => {
        const { embedding, ...cycleWithoutEmbedding } = cycle;
        return cycleWithoutEmbedding;
      })
    : (() => {
        const { embedding, ...dataWithoutEmbedding } = data;
        return dataWithoutEmbedding;
      })();
  
  localStorage.setItem('washerCycles', JSON.stringify(dataWithoutEmbedding));
  
  return data;
}

export async function createWasherCycle(cycle: {
  id: string;
  displayName: string;
  data: any;
  engineer_note?: string | null; // Optional field for engineer notes
}) {
  const res = await fetch(getApiUrl("/api/washer-cycles"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getNgrokHeaders(),
    },
    body: JSON.stringify(cycle),
  });
  if (!res.ok) throw new Error("Failed to create washer cycle");
  return res.json();
}

export async function addNewCycle(cycleName?: string) {
  const newCycleTemplate = {
    name: cycleName || "New Test Cycle",
    phases: [
      {
        id: "phase_a",
        name: "Example Phase",
        color: "06B6D4",
        startTime: 0,
        components: [
          {
            id: "1752779020217",
            label: "Quick Drain",
            start: 0,
            compId: "Drain Valve",
            duration: 5000,
            motorConfig: null,
          },
        ],
      },
    ],
  };

  const cycleData = {
    id: `cycle_${Date.now()}`, // Generate unique ID
    displayName: newCycleTemplate.name,
    data: newCycleTemplate,
    engineer_note: "Notes for this cycle can be added here",
  };

  try {
    const result = await createWasherCycle(cycleData);
    return result;
  } catch (error) {
    console.error("Failed to add new cycle:", error);
    throw error;
  }
}

export async function deleteWasherCycle(id: string) {
  try {
    const res = await fetch(getApiUrl(`/api/washer-cycles/delete/${id}`), {
      method: "DELETE",
      headers: getNgrokHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to delete cycle");
    }

    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error("Delete failed:", err.message);
    throw err;
  }
}

export async function updateWasherCycle(
  id: string,
  cycle: {
    displayName: string;
    data: any;
    engineer_note?: string | null;
  }
) {
  try {
    const res = await fetch(getApiUrl(`/api/washer-cycles/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getNgrokHeaders(),
      },
      body: JSON.stringify(cycle),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to update cycle");
    }

    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error("Update failed:", err.message);
    throw err;
  }
}

export async function upsertWasherCycle(cycle: {
  id?: string;
  displayName: string;
  data: any;
  engineer_note?: string | null;
}) {
  try {
    const res = await fetch(getApiUrl("/api/washer-cycles/upsert"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getNgrokHeaders(),
      },
      body: JSON.stringify(cycle),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to save cycle");
    }

    const result = await res.json();
    return result;
  } catch (err: any) {
    console.error("Upsert failed:", err.message);
    throw err;
  }
}
