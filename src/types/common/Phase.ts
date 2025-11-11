import type { CycleComponent } from "./CycleComponent";

export type SensorTrigger = {
  type: string;
  pinNumber: number;
  threshold: number;
  triggerAbove: boolean;
};

export type Phase = {
  id: string;
  name: string;
  startTime: number;
  components: CycleComponent[];
  color: string; // e.g. "#4ADE80"
  sensorTrigger?: SensorTrigger; // Optional sensor trigger configuration
};



export interface MotorStep {
  stepTime: number;
  pauseTime: number;
  direction: string;
}