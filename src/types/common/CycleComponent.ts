export type CycleComponent = {
  label: string;
  start: number;
  compId: string;
  duration: number;
  motorConfig?: {
    pattern: Array<{
      stepTime: number;
      pauseTime: number;
      repeatTimes: number;
    }>;
    runningStyle: string;
  };
};
