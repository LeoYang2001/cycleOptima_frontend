import { RealtimeSession } from "@openai/agents/realtime";

const MODEL = "gpt-4o-realtime-preview-2025-06-03";
const API_ENDPOINT =
  "https://cycleoptima-production.up.railway.app/api/session";

let sessionRef: RealtimeSession | null = null;
let timeoutRef: NodeJS.Timeout | null = null;

export const fetchClientSecret = async (): Promise<string> => {
  const res = await fetch(API_ENDPOINT, { method: "POST" });
  const data = await res.json();
  return data.clientSecret;
};

export const startAgentSession = async (
  setSession: (session: RealtimeSession | null) => void
): Promise<RealtimeSession> => {
  if (sessionRef) {
    await sessionRef.close();
    sessionRef = null;
    console.log("🔌 Disconnected previous session");
    setSession(null); // ✅ now this is from context
  }

  const clientSecret = await fetchClientSecret();
  const newSession = new RealtimeSession(agent, { model: MODEL });
  await newSession.connect({ apiKey: clientSecret });

  sessionRef = newSession;
  console.log("🔗 Connected to new session with client secret:", clientSecret);
  await newSession.sendMessage("Hello JAVIS!");

  setSession(newSession); // ✅ set via context

  if (timeoutRef) clearTimeout(timeoutRef);
  timeoutRef = setTimeout(() => {
    console.log("🔄 Auto-refreshing session...");
    startAgentSession(setSession); // pass context again
  }, 25 * 60 * 1000);

  return newSession;
};

// --- SessionContext for React ---
import React, { createContext, useContext, useRef } from "react";
import { agent } from "../agent/voiceAgent";

export let externalEndSession: ((sleepTime: number) => Promise<void>) | null =
  null;

type SessionContextType = {
  session: RealtimeSession | null;
  setSession: (session: RealtimeSession | null) => void;
  endSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = React.useState<RealtimeSession | null>(null);

  const endSession = async () => {
    if (session) {
      await session.close();
      setSession(null);
      console.log("🛑 Session ended via context");
    }
  };

  externalEndSession = async (sleepTime: number) => {
    console.log(`⏳ Ending session in ${sleepTime / 1000} seconds...`);
    setTimeout(async () => {
      await endSession();
    }, sleepTime);
  };

  return (
    <SessionContext.Provider value={{ session, setSession, endSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSessionContext must be used within a SessionProvider");
  return ctx;
};
