import { tool } from "@openai/agents";
import { z } from "zod";
import { externalEndSession } from "../../session/sessionManager";
import eventBus from "./eventBus";
import { getApiUrl, getNgrokHeaders } from "../../../config/api";

export const summarizeCycles = tool({
  name: "summarize_cycles",
  description:
    "Summarizes the user's washing machine cycles, providing an overview of their characteristics and performance based on engineer_notes.",
   parameters: z.object({}),
  async execute() {
    try {
        console.log("Fetching washer cycles for summary from API...", getApiUrl);
        const res = await fetch(
            getApiUrl("/api/washer-cycles?sortBy=created_at&order=desc"),
            {
              headers: getNgrokHeaders(),
            }
          );
          if (!res.ok) throw new Error("Failed to fetch washer cycles");
        
          const data = await res.json();
          console.log("all cycles:", data);
          return JSON.stringify(data);
    } catch (error) {
        console.error("Error fetching washer cycles:", error);
        throw error;
    }
  },
});
