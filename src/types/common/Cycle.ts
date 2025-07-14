import type { Phase } from "./Phase";

export type Cycle = {
  id: string;
  displayName: string;
  data: {
    phases: Phase[];
  };
  created_at: string;
  updated_at: string;
  tested_at: string | null;
  engineer_note: string | null;
  summary: string | null;
  status: string;
  embedding?: number[];
};
