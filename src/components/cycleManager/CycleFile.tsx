import React from "react";
import { Card } from "../ui/card-hover-effect";
import type { Cycle } from "../../types/common/Cycle";
import { Link } from "react-router-dom";
import CycleTimeLinePreview from "../common/CycleTimeLinePreview";
import { Clock, Trash2 } from "lucide-react";
import { formatTimeLabel } from "../../utils/formatTime";
import { calculateCycleDurations } from "../../utils/totalDuration";
import CycleTag from "../../pages/cycleManager/CycleTag";
import { deleteWasherCycle } from "../../apis/cycles";
import TimeTag from "../../pages/cycleManager/TimeTag";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store";
import { deleteCycle, fetchAllCycles } from "../../store/cycleSlice";

interface CycleFileProps {
  cycle: Cycle;
}

function CycleFile({ cycle }: CycleFileProps) {
  const { totalCycleDuration, phaseDurations } = calculateCycleDurations(cycle);
  const dispatch = useDispatch<AppDispatch>();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const confirm = window.confirm(`Delete cycle "${cycle.displayName}"?`);
    if (!confirm) return;

    try {
      await dispatch(deleteCycle(cycle.id));
      // Refresh the cycles list
      dispatch(fetchAllCycles());
    } catch (err) {
      alert("Failed to delete cycle.");
    }
  };

  return (
    <Link to={`/cycle/${cycle.id}`} className="w-full h-full overflow-hidden">
      <div
        className="w-full h-full    flex flex-col transition-all duration-200 hover:bg-[#172131] hover:shadow-lg active:bg-[#1e2a3f] cursor-pointer group"
        style={{
          padding: 12,
          borderRadius: 20,
        }}
      >
        <div
          className="w-full   bg-black border   z-30 h-full flex flex-col items-start justify-start gap-2"
          style={{
            padding: 20,
            borderRadius: 12,
            borderColor: "#333333",
          }}
        >
          <div className="flex flex-row items-center justify-between w-full  mb-3">
            <span className="font-semibold text-white text-xl">
              {cycle.displayName}
            </span>
            <CycleTag ifTested={cycle.status === "tested"} />
          </div>

          {/* engineer note  */}
          <div className="w-full relative">
            <div
              className="transition-all duration-300 ease-in-out max-h-[1.5em]  overflow-hidden text-sm"
              style={{ color: "#5d5d63" }}
            >
              {cycle.engineer_note}
            </div>
          </div>

          {/* PREVIEW  */}
          <CycleTimeLinePreview cycle={cycle} />
          <div className=" flex  text-gray-500 flex-row items-center gap-1  text-sm">
            <Clock size={18} />
            Duration: {formatTimeLabel(totalCycleDuration)}
          </div>
          <div className=" flex  flex-row w-full mt-auto justify-between ">
            <div
              onClick={handleDelete}
              className="cursor-default group-hover:opacity-100 active:text-gray-400 text-gray-500  flex justify-center items-center px-1 opacity-0 transition-opacity duration-300"
            >
              <Trash2 size={18} />
            </div>
            <div className=" ml-auto flex flex-row items-center gap-2">
              <TimeTag createdAt={cycle.created_at} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default CycleFile;
