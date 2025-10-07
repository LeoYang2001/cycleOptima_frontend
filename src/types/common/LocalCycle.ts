import type { Phase } from "./Phase";

export interface LocalCycle {
  id: string;
  displayName: string;
  status: "draft" | "tested" | "production";
  created_at: string;
  updated_at: string;
  tested_at?: string;
  engineer_note: string;
  summary: string;
  data: {
    phases: Phase[];
  };
}