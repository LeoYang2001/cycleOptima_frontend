const API_URL = "http://localhost:4000"; // Adjust if your backend runs elsewhere

export async function fetchAllWasherCycles() {
  const res = await fetch(`${API_URL}/api/washer-cycles`);
  if (!res.ok) throw new Error("Failed to fetch washer cycles");
  return res.json();
}

export async function createWasherCycle(cycle: {
  id: string;
  displayName: string;
  data: any;
}) {
  const res = await fetch(`${API_URL}/api/washer-cycles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cycle),
  });
  if (!res.ok) throw new Error("Failed to create washer cycle");
  return res.json();
}

export async function deleteWasherCycle(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/washer-cycles/delete/${id}`, {
      method: "DELETE",
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
    const res = await fetch(`${API_URL}/api/washer-cycles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${API_URL}/api/washer-cycles/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
