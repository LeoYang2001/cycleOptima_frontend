import React, { useState } from "react";
import { Card } from "../ui/card-hover-effect";
import type { Cycle } from "../../types/common/Cycle";
import { Link } from "react-router-dom";
import CycleTimeLinePreview from "../common/CycleTimeLinePreview";
import { Clock, HardDrive, Trash2, CloudUpload, Loader2 } from "lucide-react";
import { formatTimeLabel } from "../../utils/formatTime";
import { calculateCycleDurations } from "../../utils/totalDuration";
import CycleTag from "../../pages/cycleManager/CycleTag";
import { deleteWasherCycle } from "../../apis/cycles";
import TimeTag from "../../pages/cycleManager/TimeTag";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store";
import { deleteCycle, fetchAllCycles, createCycle } from "../../store/cycleSlice";

interface CycleFileProps {
  cycle: Cycle;
}

function CycleFile({ cycle }: CycleFileProps) {
  const { totalCycleDuration, phaseDurations } = calculateCycleDurations(cycle);
  const dispatch = useDispatch<AppDispatch>();
  const [isSyncing, setIsSyncing] = useState(false);

  const isLocalCycle = cycle.id.startsWith("local-cycle");
  const navigationPath = isLocalCycle ? `/cycle-local/${cycle.id}` : `/cycle/${cycle.id}`;

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isLocalCycle) {
      alert("This cycle is already synced to the server.");
      return;
    }

    const confirmSync = window.confirm(
      `Sync "${cycle.displayName}" to the server? This will create a new server cycle and remove the local copy.`
    );
    if (!confirmSync) return;

    setIsSyncing(true);

    try {
      // Generate new server cycle ID
      const serverCycleId = `cycle-${Date.now()}`;
      
      // Prepare cycle data for server (remove local-specific fields and update ID)
      const syncCycleData = {
        displayName: cycle.displayName,
        status: cycle.status as "draft" | "tested" | "production",
        data: cycle.data,
        engineer_note: cycle.engineer_note || "",
        summary: cycle.summary || ""
      };

      // Create cycle on server via Redux
      const resultAction = await dispatch(createCycle(syncCycleData));

      if (createCycle.fulfilled.match(resultAction)) {
        // Success - remove from localStorage
        const localCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
        const updatedCycles = localCycles.filter((c: any) => c.id !== cycle.id);
        localStorage.setItem('localCycles', JSON.stringify(updatedCycles));
        
        // Trigger storage event to update other components
        window.dispatchEvent(new Event('storage'));
        
        // Refresh cycles list to show the new server cycle
        dispatch(fetchAllCycles());
        
        alert(`"${cycle.displayName}" successfully synced to server! Local copy removed.`);
        
      } else {
        // Handle Redux rejection
        const errorMessage = resultAction.payload || 'Unknown error occurred';
        throw new Error(errorMessage as string);
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
      let errorMessage = 'Failed to sync cycle to server. ';
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage += 'A cycle with this name already exists on the server.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += 'Network error - please check your connection.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again later.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const confirm = window.confirm(`Delete cycle "${cycle.displayName}"?`);
    if (!confirm) return;

    try {
      if (isLocalCycle) {
        // Delete from localStorage
        const localCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
        const updatedCycles = localCycles.filter((c: any) => c.id !== cycle.id);
        localStorage.setItem('localCycles', JSON.stringify(updatedCycles));
        
        // Trigger a storage event to update other components
        window.dispatchEvent(new Event('storage'));
        
        alert("Local cycle deleted successfully!");
      } else {
        // Delete from API
        await dispatch(deleteCycle(cycle.id));
        // Refresh the cycles list
        dispatch(fetchAllCycles());
      }
    } catch (err) {
      alert(`Failed to delete ${isLocalCycle ? 'local' : ''} cycle.`);
    }
  };

  return (
    <Link to={navigationPath} className="w-full h-full overflow-hidden">
      <div
        className="w-full h-full flex flex-col transition-all duration-200 hover:bg-[#172131] hover:shadow-lg active:bg-[#1e2a3f] cursor-pointer group relative"
        style={{
          padding: 12,
          borderRadius: 20,
        }}
      >
        <div
          className="w-full bg-black border z-30 h-full flex flex-col items-start justify-start gap-2"
          style={{
            padding: 20,
            borderRadius: 12,
            borderColor: "#333333",
          }}
        >
          <div className="flex flex-row items-center justify-between w-full mb-3">
            <span className="font-semibold text-white text-xl">
              {cycle.displayName}
            </span>
            {/* Local indicator */}
            {isLocalCycle && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 ml-auto mr-2 border border-blue-600/30 rounded text-xs text-blue-300">
                <HardDrive size={12} />
                Local
              </div>
            )}
            <CycleTag ifTested={cycle.status === "tested"} />
          </div>

          {/* engineer note */}
          <div className="w-full relative">
            <div
              className="transition-all duration-300 ease-in-out max-h-[1.5em] overflow-hidden text-sm"
              style={{ color: "#5d5d63" }}
            >
              {cycle.engineer_note}
            </div>
          </div>

          {/* PREVIEW */}
          <CycleTimeLinePreview cycle={cycle} />
          <div className="flex text-gray-500 flex-row items-center gap-1 text-sm">
            <Clock size={18} />
            Duration: {formatTimeLabel(totalCycleDuration)}
          </div>
          <div className="flex flex-row w-full mt-auto justify-between">
            <div className="flex flex-row items-center gap-2">
              {/* Sync button for local cycles */}
              {isLocalCycle && (
                <div
                  onClick={isSyncing ? undefined : handleSync}
                  className={`cursor-pointer group-hover:opacity-100 opacity-0 transition-opacity duration-300 flex justify-center items-center px-1 ${
                    isSyncing
                      ? "text-gray-500 cursor-not-allowed"
                      : "text-green-500 hover:text-green-400 active:text-green-600"
                  }`}
                  title={isSyncing ? "Syncing to server..." : "Sync to server"}
                  aria-disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CloudUpload size={16} />
                  )}
                </div>
              )}
              
              <div
                onClick={handleDelete}
                className="cursor-pointer group-hover:opacity-100 active:text-gray-400 text-gray-500 flex justify-center items-center px-1 opacity-0 transition-opacity duration-300"
              >
                <Trash2 size={16} />
              </div>
            </div>
            
            <div className="ml-auto flex flex-row items-center gap-2">
              <TimeTag createdAt={cycle.created_at} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default CycleFile;