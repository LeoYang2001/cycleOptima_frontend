export type CycleComponent = {
  id: string;
  label: string;
  start: number;
  compId: string;
  duration: number;
  motorConfig?: {
    repeatTimes: number;

    pattern: Array<{
      stepTime: number;
      pauseTime: number;
      direction: string;
    }>;
    runningStyle: string;
  };
};
