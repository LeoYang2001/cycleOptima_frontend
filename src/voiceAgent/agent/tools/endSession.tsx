import { tool } from "@openai/agents";
import { z } from "zod";
import { externalEndSession } from "../../session/sessionManager";
import eventBus from "./eventBus";

export const endSession = tool({
  name: "end_session",
  description:
    "Triggers when the user says goodbye, ends the conversation, or dismisses the assistant (e.g., 'goodbye', 'let's talk next time', 'you're dismissed'). Ends the session and says a polite farewell.",
  parameters: z.object({
    sleepTime: z.number().min(3000).max(10000).default(6000),
  }),
  async execute({ sleepTime }) {
    eventBus.emit("agentPendingEnd", true);
    externalEndSession?.(sleepTime);
    return `Goodbye for now, Leo! Ending the session in ${
      sleepTime / 1000
    } seconds.`;
  },
});
