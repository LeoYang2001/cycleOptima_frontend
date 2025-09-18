import React, { useState, useEffect } from "react";
import { PlaceholdersAndVanishInput } from "../../components/ui/placeholders-and-vanish-input";
import Button from "../../components/common/Button";
import { PlusIcon } from "lucide-react";
import Dropdown from "../../components/common/Dropdown";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { getEmbedding } from "../../apis/embedText";
import { getSemanticSearchResults } from "../../utils/semanticSearch";
import { X } from "lucide-react"; // Add this import at the top with other imports
import { ClipLoader, PuffLoader } from "react-spinners";
import CycleFile from "../../components/cycleManager/CycleFile";
import { addNewCycle } from "../../apis/cycles";
import { fetchCycles } from "../../store/cycleSlice";
import { Database, FolderOpen, ToggleLeft, ToggleRight } from "lucide-react";

const statusOptions = ["all status", "draft", "tested"];
const CYCLES_PER_PAGE = 30; // 6 cols * 5 rows
const LOCAL_CYCLES_MODE_KEY = "cycleOptima_local_cycles_mode";

function CycleManager() {
  const [inputVal, setInputVal] = useState("");
  const [status, setStatus] = useState(statusOptions[0]);
  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchPrompt, setSearchPrompt] = useState("");
  const [isAddingCycle, setIsAddingCycle] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [localCycles, setLocalCycles] = useState<any[]>([]);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [loadingLocalCycles, setLoadingLocalCycles] = useState(false);
  const cycles = useSelector((state: RootState) => state.cycles.cycles);
  const dispatch = useDispatch<AppDispatch>();

  // Load saved mode from localStorage on component mount
  useEffect(() => {
    const savedMode = localStorage.getItem(LOCAL_CYCLES_MODE_KEY);
    const savedPath = localStorage.getItem("cycleOptima_local_cycles_path");

    if (savedMode === "true" && savedPath) {
      setUseLocalMode(true);
      loadCyclesFromLocalPath(savedPath);
    }
  }, []);

  // Function to load cycles from local directory
  const loadCyclesFromLocalPath = async (directoryPath: string) => {
    if (!("showDirectoryPicker" in window)) {
      alert(
        "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser."
      );
      return;
    }

    setLoadingLocalCycles(true);

    try {
      console.log(`Loading cycles from saved path: ${directoryPath}`);

      // Ask user to select the directory (browser security limitation)
      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: "read",
      });

      const cyclesFromDirectory = [];

      // Read all .json files from the selected directory
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === "file" && name.endsWith(".json")) {
          try {
            console.log(`Reading file: ${name}`);
            const file = await handle.getFile();
            const content = await file.text();
            const cycleData = JSON.parse(content);

            // Add metadata for local cycles
            cycleData.isLocal = true;
            cycleData.localFilePath = name;

            // Ensure required fields exist (with fallbacks for missing data)
            if (!cycleData.id) {
              cycleData.id = `local_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            }
            if (!cycleData.displayName) {
              cycleData.displayName = name.replace(".json", "");
            }
            if (!cycleData.status) {
              cycleData.status = "draft";
            }
            if (!cycleData.created_at) {
              cycleData.created_at = new Date().toISOString();
            }
            if (!cycleData.updated_at) {
              cycleData.updated_at = new Date().toISOString();
            }
            if (!cycleData.engineer_note) {
              cycleData.engineer_note = "Loaded from local file";
            }
            if (!cycleData.data) {
              cycleData.data = { name: cycleData.displayName, phases: [] };
            }
            if (!cycleData.summary) {
              cycleData.summary = null;
            }
            if (!cycleData.tested_at && cycleData.status === "tested") {
              cycleData.tested_at = cycleData.updated_at;
            }

            // Validate that data.phases exists and is an array
            if (!cycleData.data.phases || !Array.isArray(cycleData.data.phases)) {
              cycleData.data.phases = [];
            }

            // Validate each phase structure
            cycleData.data.phases = cycleData.data.phases.map(
              (phase: any, index: number) => ({
                id: phase.id || `phase_${index}`,
                name: phase.name || `Phase ${index + 1}`,
                color: phase.color || "06B6D4",
                startTime: phase.startTime || 0,
                components: Array.isArray(phase.components)
                  ? phase.components.map((comp: any) => ({
                      id: comp.id || `comp_${Date.now()}_${Math.random()
                        .toString(36)
                        .substr(2, 5)}`,
                      label: comp.label || "Component",
                      start: comp.start || 0,
                      compId: comp.compId || "Unknown",
                      duration: comp.duration || 1000,
                      motorConfig: comp.motorConfig || null,
                    }))
                  : [],
              })
            );

            cyclesFromDirectory.push(cycleData);
            console.log(`Successfully loaded: ${cycleData.displayName}`);
          } catch (parseError) {
            console.warn(`Failed to parse JSON file ${name}:`, parseError);

            // Show user-friendly error for invalid JSON files
            const shouldContinue = confirm(
              `Failed to parse "${name}" as valid JSON.\n\n` +
                `Error: ${(parseError as Error).message}\n\n` +
                `Continue loading other files?`
            );

            if (!shouldContinue) {
              throw new Error(`Stopped loading due to invalid file: ${name}`);
            }
          }
        }
      }

      // Sort cycles by displayName for consistent ordering
      cyclesFromDirectory.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      setLocalCycles(cyclesFromDirectory);
      console.log(
        `Successfully loaded ${cyclesFromDirectory.length} cycles from: ${directoryPath}`
      );

      // Show success message with details
      const message =
        `Loaded ${cyclesFromDirectory.length} cycles from directory:\n\n` +
        cyclesFromDirectory
          .map((cycle) => `• ${cycle.displayName} (${cycle.status})`)
          .join("\n");

      if (cyclesFromDirectory.length > 0) {
        alert(message);
      } else {
        alert(
          `No valid JSON cycle files found in the selected directory.\n\nMake sure your directory contains .json files with valid cycle data.`
        );
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as any).name !== "AbortError"
      ) {
        console.error("Failed to load local cycles:", error);
        alert(
          `Failed to load cycles from directory: ${directoryPath}\n\nError: ${(error as Error).message}`
        );
      } else {
        console.log("User cancelled directory selection");
      }
    } finally {
      setLoadingLocalCycles(false);
    }
  };

  // Function to toggle between modes
  const toggleMode = async () => {
    const savedPath = localStorage.getItem("cycleOptima_local_cycles_path");

    if (!useLocalMode) {
      // Switching to local mode
      if (!savedPath) {
        alert("Please set a cycles directory path in the header first.");
        return;
      }

      setUseLocalMode(true);
      localStorage.setItem(LOCAL_CYCLES_MODE_KEY, "true");
      await loadCyclesFromLocalPath(savedPath);
    } else {
      // Switching to database mode
      setUseLocalMode(false);
      setLocalCycles([]);
      localStorage.setItem(LOCAL_CYCLES_MODE_KEY, "false");
    }
  };

  // Handler for opening add new cycle modal
  const handleAddNewCycle = () => {
    if (useLocalMode) {
      alert(
        "Adding new cycles is not available in local mode. Please switch to database mode or add JSON files directly to your local directory."
      );
      return;
    }
    setShowAddModal(true);
    setNewCycleName(""); // Reset the input
  };

  // Handler for submitting the new cycle form
  const handleSubmitNewCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName.trim() || useLocalMode) return;

    // Check for duplicate cycle names
    const trimmedName = newCycleName.trim();
    const activeCycles = useLocalMode ? localCycles : cycles;
    const isDuplicate = activeCycles.some(
      (cycle) => cycle.displayName?.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      alert(
        `A cycle with the name "${trimmedName}" already exists. Please choose a different name.`
      );
      return;
    }

    setIsAddingCycle(true);
    setShowAddModal(false);

    try {
      const result = await addNewCycle(trimmedName);
      console.log("New cycle created:", result);
      // Refresh the cycles list
      dispatch(fetchCycles());
    } catch (error) {
      console.error("Failed to create new cycle:", error);
      alert("Failed to create new cycle: " + (error as Error).message);
    } finally {
      setIsAddingCycle(false);
      setNewCycleName("");
    }
  };

  // Handler for canceling the add new cycle modal
  const handleCancelAddCycle = () => {
    setShowAddModal(false);
    setNewCycleName("");
  };

  // Search handler (semantic search on submit)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setLoadingSearch(true);
    setIsTyping(false);

    try {
      const queryEmbedding = await getEmbedding(inputVal);
      const sorted = getSemanticSearchResults(queryEmbedding, cycles, 0.7);
      setSearchResults(sorted);
      setSearchPrompt(inputVal.trim());
      setInputVal(""); // Clear input after search
      setPage(1);
    } catch (err) {
      alert("Search failed: " + (err as Error).message);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Update cycles logic to use correct source
  const activeCycles = useLocalMode ? localCycles : cycles;

  // Name filter as you type
  const nameFilteredCycles = React.useMemo(() => {
    if (isTyping && inputVal.trim()) {
      const lower = inputVal.trim().toLowerCase();
      return activeCycles.filter((c) =>
        c.displayName?.toLowerCase().includes(lower)
      );
    }
    return [];
  }, [activeCycles, inputVal, isTyping]);

  // Cycles to display: searchResults > nameFilteredCycles > all cycles
  const cyclesToDisplay = React.useMemo(() => {
    if (searchResults && searchResults.length > 0) {
      return activeCycles.filter((c) => searchResults.includes(c.id));
    }
    if (inputVal.trim() && isTyping) {
      return nameFilteredCycles;
    }
    // If input is empty and no searchResults, show all cycles
    return activeCycles;
  }, [activeCycles, searchResults, inputVal, isTyping, nameFilteredCycles]);

  // Apply status filter if not 'all status'
  const statusFilteredCycles =
    status === "all status"
      ? cyclesToDisplay
      : cyclesToDisplay.filter((c) => c.status === status);

  // Pagination logic (after status filtering)
  const totalPages = Math.ceil(statusFilteredCycles.length / CYCLES_PER_PAGE);
  const pagedCycles = statusFilteredCycles.slice(
    (page - 1) * CYCLES_PER_PAGE,
    page * CYCLES_PER_PAGE
  );

  // Clear search results handler
  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchPrompt("");
    setInputVal("");
    setIsTyping(false);
    setPage(1);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full flex flex-row justify-between items-center gap-4">
        <div className="w-[50%] relative flex flex-row items-center gap-2 justify-start">
          <PlaceholdersAndVanishInput
            placeholders={[
              "Search Cycle Name",
              "Search Comments",
              "Type and press Enter",
            ]}
            onChange={(e) => {
              setInputVal(e.target.value);
              setIsTyping(true);
              setPage(1);
              setSearchResults(null); // Clear semantic search when typing
            }}
            onSubmit={handleSubmit}
          />
          <Dropdown
            options={statusOptions}
            value={status}
            setValue={setStatus}
          />
          {/* Clear search tag */}
          {searchResults && (
            <div
              onClick={handleClearSearch}
              className="inline-flex bg-zinc-800 absolute left-0 -bottom-10 text-gray-100 border border-gray-700 hover:bg-zinc-700 cursor-pointer items-center rounded-full   px-3 py-1  text-sm  mr-2"
            >
              <span className=" flex justify-center items-center">
                {searchPrompt}

                <X size={16} />
              </span>
            </div>
          )}
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                useLocalMode
                  ? "bg-blue-900/20 border-blue-600/30 text-blue-300 hover:bg-blue-800/30"
                  : "bg-green-900/20 border-green-600/30 text-green-300 hover:bg-green-800/30"
              }`}
              title={
                useLocalMode
                  ? "Switch to Database Mode"
                  : "Switch to Local Mode"
              }
            >
              {useLocalMode ? (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Local</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span className="text-sm font-medium">Database</span>
                </>
              )}
            </button>

            {/* Mode indicator with count */}
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                useLocalMode
                  ? "bg-blue-900/30 text-blue-400"
                  : "bg-green-900/30 text-green-400"
              }`}
            >
              {activeCycles.length} cycles
            </div>
          </div>

          {/* Add New Cycle Button */}
          <Button
            func={handleAddNewCycle}
            theme="dark"
            label="Add New Cycle"
            icon={PlusIcon}
            disabled={useLocalMode}
          />
        </div>
      </div>

      {/* Loading indicator for local cycles */}
      {loadingLocalCycles && (
        <div className="mt-4 flex items-center gap-2 text-blue-300">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300"></div>
          <span className="text-sm">
            Loading cycles from local directory...
          </span>
        </div>
      )}

      {/* Render cycles in a 6x5 grid */}
      <section className="mt-14 flex-1  ">
        {loadingSearch || loadingLocalCycles ? (
          <div className=" mb-2 text-lg font-semibold w-full h-full  justify-center items-start pt-20 flex">
            <PuffLoader
              color={"white"}
              loading={loadingSearch || loadingLocalCycles}
              size={80}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : cyclesToDisplay.length === 0 ? (
          <div className="text-gray-400 text-center mt-2 select-none">
            <span className="block mb-2 text-lg font-semibold">
              {useLocalMode ? "No local cycles found." : "No cycles found."}
            </span>
            <span className="text-gray-500">
              {useLocalMode
                ? "Add JSON files to your local directory or switch to database mode."
                : "Press Enter to run a smarter search."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-5 grid-rows-3 gap-4  h-full">
            {pagedCycles.map((cycle) => (
              <CycleFile cycle={cycle} key={cycle.id} />
            ))}
            {/* Add skeleton when adding new cycle */}
            {isAddingCycle && (
              <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-700 rounded w-1/2"></div>
                <div className="mt-4 h-8 bg-gray-700 rounded"></div>
              </div>
            )}
            {/* Fill empty cells if not enough cycles for the last page */}
            {Array.from({
              length:
                CYCLES_PER_PAGE - pagedCycles.length - (isAddingCycle ? 1 : 0),
            }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
          </div>
        )}
      </section>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            theme="light"
            label="Prev"
            func={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          />
          <span className="text-gray-700 dark:text-gray-200">
            Page {page} of {totalPages}
          </span>
          <Button
            theme="light"
            label="Next"
            func={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          />
        </div>
      )}

      {/* Add New Cycle Modal */}
      {showAddModal && (
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          }}
          className="fixed inset-0  flex items-center justify-center z-50"
          onClick={handleCancelAddCycle}
        >
          <div
            style={{
              backgroundColor: "#27272a",
            }}
            className=" rounded-lg p-6 w-96 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Add New Cycle
            </h2>
            <form onSubmit={handleSubmitNewCycle}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Cycle Name
                </label>
                <input
                  type="text"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="Enter cycle name"
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 4,
                    border: "1px solid #333",
                  }}
                  className="w-full h-10 bg-transparent text-white p-2 my-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#3b82f6",
                  }}
                  className="px-4 py-2 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CycleManager;
