import type { CycleComponent } from "./CycleComponent";

export type Phase = {
  id: string;

  name: string;
  startTime: number;
  components: CycleComponent[];
  color: string; // e.g. "#4ADE80"
};
