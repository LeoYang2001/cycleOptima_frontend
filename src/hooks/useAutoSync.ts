import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCyclesNeedingSync,
  selectTotalPendingChanges,
  syncCycleToDatabase,
  markSynced,
} from "../store/cycleSlice";
import type { AppDispatch } from "../store";

interface AutoSyncOptions {
  enabled?: boolean;
  debounceMs?: number; // Wait time after last change before syncing
  maxRetries?: number;
}

export function useAutoSync(options: AutoSyncOptions = {}) {
  const {
    enabled = true,
    debounceMs = 2000, // 2 seconds default
    maxRetries = 3,
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const cyclesToSync = useSelector(selectCyclesNeedingSync);
  const totalPendingChanges = useSelector(selectTotalPendingChanges);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!enabled || totalPendingChanges === 0) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced sync
    timeoutRef.current = setTimeout(async () => {
      console.log(
        `🔄 Auto-syncing ${cyclesToSync.length} cycles with ${totalPendingChanges} total changes to database...`
      );

      for (const cycle of cyclesToSync) {
        try {
          const retryCount = retryCountRef.current[cycle.id] || 0;

          if (retryCount >= maxRetries) {
            console.error(`❌ Max retries reached for cycle ${cycle.id}`);
            continue;
          }

          await dispatch(syncCycleToDatabase(cycle)).unwrap();
          console.log(`✅ Successfully synced cycle: ${cycle.displayName}`);

          // Reset retry count on success
          delete retryCountRef.current[cycle.id];
        } catch (error) {
          console.error(`❌ Failed to sync cycle ${cycle.id}:`, error);

          // Increment retry count
          retryCountRef.current[cycle.id] =
            (retryCountRef.current[cycle.id] || 0) + 1;

          // If max retries reached, remove from pending sync to prevent infinite loops
          if (retryCountRef.current[cycle.id] >= maxRetries) {
            dispatch(markSynced(cycle.id));
            console.error(
              `🚫 Removing cycle ${cycle.id} from sync queue after ${maxRetries} failed attempts`
            );
          }
        }
      }
    }, debounceMs);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    cyclesToSync,
    totalPendingChanges,
    enabled,
    debounceMs,
    maxRetries,
    dispatch,
  ]);

  // Manual sync function
  const triggerSync = async (cycleId?: string) => {
    if (cycleId) {
      const cycle = cyclesToSync.find((c) => c.id === cycleId);
      if (cycle) {
        try {
          await dispatch(syncCycleToDatabase(cycle)).unwrap();
          console.log(`✅ Manually synced cycle: ${cycle.displayName}`);
        } catch (error) {
          console.error(`❌ Manual sync failed for cycle ${cycleId}:`, error);
          throw error;
        }
      }
    } else {
      // Sync all pending cycles
      for (const cycle of cyclesToSync) {
        try {
          await dispatch(syncCycleToDatabase(cycle)).unwrap();
        } catch (error) {
          console.error(`❌ Batch sync failed for cycle ${cycle.id}:`, error);
        }
      }
    }
  };

  return {
    pendingCount: totalPendingChanges,
    triggerSync,
    isEnabled: enabled,
  };
}
