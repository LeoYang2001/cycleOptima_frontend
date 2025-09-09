import type { CycleComponent } from "./CycleComponent";

export type SensorTrigger = {
  type: string;
  pinNumber: number;
  threshold: number;
};

export type Phase = {
  id: string;
  name: string;
  startTime: number;
  components: CycleComponent[];
  color: string; // e.g. "#4ADE80"
  sensorTrigger?: SensorTrigger; // Optional sensor trigger configuration
};
