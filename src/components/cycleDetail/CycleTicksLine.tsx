import { CirclePause, Pause, Puzzle } from "lucide-react";
import React from "react";

interface Tick {
  time: number;
  label: string;
}

interface TickLineProp {
  ticks: Tick[];
}

function TicksLineComponents({ ticks }: TickLineProp) {
  const fontSize = 14;
  return (
    <div className="w-full flex flex-col items-center ">
      <div
        style={{
          borderColor: "#aaa",
        }}
        className=" w-full  flex  flex-row justify-around h-1 mt-6 "
      >
        <div
          style={{
            borderColor: "#aaa",
          }}
          className="  relative   w-0"
        >
          <span
            style={{
              fontSize: fontSize,

              transform: "translateX(50%)",
              color: "#aaa",
            }}
            className=" absolute right-0 -top-5"
          >
            {ticks[0].label}
          </span>
        </div>
        {ticks.slice(1).map((tick) => (
          <div
            key={tick.label}
            style={{
              fontSize: fontSize,
              borderColor: "#aaa",
              whiteSpace: "nowrap",
            }}
            className="flex-1 relative"
          >
            <span
              style={{
                transform: "translateX(50%)",
                color: "#aaa",
              }}
              className=" absolute right-0 -top-5"
            >
              {tick.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TicksLineComponents;
