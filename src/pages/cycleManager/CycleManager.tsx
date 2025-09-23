import React, { useState, useEffect } from "react";
import { PlaceholdersAndVanishInput } from "../../components/ui/placeholders-and-vanish-input";
import Button from "../../components/common/Button";
import { PlusIcon, FolderOpen, RotateCcw } from "lucide-react";
import Dropdown from "../../components/common/Dropdown";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { getEmbedding } from "../../apis/embedText";
import { getSemanticSearchResults } from "../../utils/semanticSearch";
import { X } from "lucide-react";
import { PuffLoader } from "react-spinners";
import CycleFile from "../../components/cycleManager/CycleFile";
import { 
  selectLocalCycles, 
  selectLocalCyclesLoading, 
  selectLocalCyclesDirectoryPath,
} from "../../store/localCyclesSlice";
import { useNavigate } from "react-router-dom";
import { updateCycleOptimistically } from "../../store/cycleSlice"; // Add this import at the top
import type { Cycle } from "../../types/common/Cycle";

const statusOptions = ["all status", "draft", "tested"];
const CYCLES_PER_PAGE = 30; // 6 cols * 5 rows

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

  const navigate = useNavigate()

  // Redux selectors for local cycles only
  const localCycles = useSelector(selectLocalCycles);
  const localCyclesLoading = useSelector(selectLocalCyclesLoading);
  const localDirectoryPath = useSelector(selectLocalCyclesDirectoryPath);

  const dispatch = useDispatch<AppDispatch>();

  // Get active cycles from local only
  const activeCycles = localCycles;
  const isLoading = localCyclesLoading;

  // Refresh cycles from local folder
  const handleRefreshCycles = () => {
    window.dispatchEvent(new CustomEvent('refreshLocalCycles'));
  };

  // Handler for opening add new cycle modal
  const handleAddNewCycle = () => {
    setShowAddModal(true);
    setNewCycleName("");
  };

  // Handler for submitting the new cycle form
  const handleSubmitNewCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName.trim()) return;

    // Check for duplicate cycle names
    const trimmedName = newCycleName.trim();
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
      // Generate a temporary ID for the new cycle
      const tempId = `temp-${Date.now()}`;

      // Prepare template data for the new cycle
      const now = new Date().toISOString();
      const templateCycle:Cycle = {
        id: tempId,
        displayName: trimmedName,
        data: {
          phases: [
            {
              id: "1755269543284",
              name: "phase1",
              color: "4ADE80",
              startTime: 0,
              components: [
                {
                  id: "1756939954770",
                  label: "Standard Retractor Cycle",
                  start: 0,
                  compId: "Retractor",
                  duration: 60000,
                  motorConfig: undefined
                }
              ]
            }
          ],
        },
        status: "draft",
        created_at: now,
        updated_at: now,
        tested_at: null,
        engineer_note: "",
        summary: "",
      };

      // Add the new cycle to Redux
      dispatch(updateCycleOptimistically(templateCycle));

      // Navigate to the detail page
      navigate(`/cycle/${tempId}`, { state: { cycle: templateCycle, isNew: true } });
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
      const sorted = getSemanticSearchResults(queryEmbedding, activeCycles, 0.7);
      setSearchResults(sorted);
      setSearchPrompt(inputVal.trim());
      setInputVal("");
      setPage(1);
    } catch (err) {
      alert("Search failed: " + (err as Error).message);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Name filter as you type
  const nameFilteredCycles = React.useMemo(() => {
    if (isTyping && inputVal.trim()) {
      const lower = inputVal.trim().toLowerCase();
      return activeCycles.filter((c) => c.displayName?.toLowerCase().includes(lower));
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
      {/* Header with source indicator */}
      <div className="w-full flex flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Source Indicator */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-600/30`}>
            {`Local: ${localDirectoryPath ? '...' + localDirectoryPath.slice(-20) : 'No directory'}`}
          </div>
          {/* Cycle count */}
          <div className="text-gray-400 text-sm">
            {activeCycles.length} cycle{activeCycles.length !== 1 ? 's' : ''}
          </div>
        </div>
       
      </div>

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
              setSearchResults(null);
            }}
            onSubmit={handleSubmit}
          />
          <Dropdown
            options={statusOptions}
            value={status}
            setValue={setStatus}
          />
          {searchResults && (
            <div
              onClick={handleClearSearch}
              className="inline-flex bg-zinc-800 absolute left-0 -bottom-10 text-gray-100 border border-gray-700 hover:bg-zinc-700 cursor-pointer items-center rounded-full px-3 py-1 text-sm mr-2"
            >
              <span className="flex justify-center items-center">
                {searchPrompt}
                <X size={16} />
              </span>
            </div>
          )}
        </div>
        {/* Add New Cycle and Refresh Buttons Side by Side */}
        <div className="flex flex-row gap-2 items-center">
          <Button
            func={handleAddNewCycle}
            theme="dark"
            label="Add New Cycle"
            icon={PlusIcon}
          />
       
        </div>
      </div>

      {/* Render cycles in a 6x5 grid */}
      <section className="mt-14 flex-1">
        {loadingSearch || isLoading ? (
          <div className="mb-2 text-lg font-semibold w-full h-full justify-center items-start pt-20 flex">
            <PuffLoader
              color={"white"}
              loading={loadingSearch || isLoading}
              size={80}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : cyclesToDisplay.length === 0 ? (
          <div className="text-gray-400 text-center mt-2 select-none">
            <span className="block mb-2 text-lg font-semibold">
              {"No local cycles found."}
            </span>
            <span className="text-gray-500">
              {"Add JSON files to your local directory or set the directory path in the header."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-5 grid-rows-3 gap-4 h-full">
            {pagedCycles.map((cycle) => (
              <CycleFile cycle={cycle} key={cycle.id} />
            ))}
            {isAddingCycle && (
              <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-700 rounded w-1/2"></div>
                <div className="mt-4 h-8 bg-gray-700 rounded"></div>
              </div>
            )}
            {Array.from({
              length: CYCLES_PER_PAGE - pagedCycles.length - (isAddingCycle ? 1 : 0),
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
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={handleCancelAddCycle}
        >
          <div
            style={{ backgroundColor: "#27272a" }}
            className="rounded-lg p-6 w-96 max-w-md mx-4"
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
                  style={{ backgroundColor: "#3b82f6" }}
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