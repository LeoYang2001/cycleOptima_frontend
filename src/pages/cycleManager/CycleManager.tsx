import React, { useState, useEffect } from "react";
import { PlaceholdersAndVanishInput } from "../../components/ui/placeholders-and-vanish-input";
import Button from "../../components/common/Button";
import { PlusIcon, RotateCcw, Upload } from "lucide-react";
import Dropdown from "../../components/common/Dropdown";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { getEmbedding } from "../../apis/embedText";
import { getSemanticSearchResults } from "../../utils/semanticSearch";
import { X } from "lucide-react";
import { PuffLoader } from "react-spinners";
import CycleFile from "../../components/cycleManager/CycleFile";
import { useNavigate } from "react-router-dom";
import type { Cycle } from "../../types/common/Cycle";
import {
  fetchAllCycles,
  createCycle,
  selectAllCycles,
  selectCyclesLoading,
  selectCyclesError,
  clearError
} from "../../store/cycleSlice";
import type { LocalCycle } from "../../types/common/LocalCycle";
import JsonUploadModal from "../../components/cycleManager/JsonUploadModal";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCycleName, setNewCycleName] = useState("");
  const [localCycles, setLocalCycles] = useState<LocalCycle[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const loadLocalCycles = () => {
      const storedCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
      setLocalCycles(storedCycles);
      console.log(`Found ${storedCycles.length} local cycles`);
    };

    loadLocalCycles();
    
    // Listen for storage changes to update when cycles are added/modified
    const handleStorageChange = () => {
      loadLocalCycles();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const apiCycles = useSelector(selectAllCycles);
  const isLoading = useSelector(selectCyclesLoading);
  const error = useSelector(selectCyclesError);


  const allCycles = React.useMemo(() => {
    const combinedCycles = [...apiCycles];
    
    // Add local cycles with a flag to identify them
    localCycles.forEach(localCycle => {
      combinedCycles.push({
        ...localCycle,
        isLocal: true
      } as Cycle & { isLocal: boolean });
    });
    
    return combinedCycles;
  }, [apiCycles, localCycles]);

  // Fetch cycles on component mount
  useEffect(() => {
    console.log('Fetching cycles from Redux...');
    dispatch(fetchAllCycles());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        dispatch(clearError());
      }
    };
  }, [error, dispatch]);

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
    const isDuplicate = allCycles.some(
      (cycle) => cycle.displayName?.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      alert(
        `A cycle with the name "${trimmedName}" already exists. Please choose a different name.`
      );
      return;
    }

    setShowAddModal(false);

    try {
      // Try to create cycle via Redux (API)
      const resultAction = await dispatch(createCycle({
        displayName: trimmedName,
        status: "draft",
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
          ]
        },
        engineer_note: "",
        summary: ""
      }));

      if (createCycle.fulfilled.match(resultAction)) {
        // Navigate to the detail page
        navigate(`/cycle/${resultAction.payload.id}`, { 
          state: { cycle: resultAction.payload, isNew: true } 
        });
      } else {
        throw new Error('Failed to create cycle');
      }
    } catch (error) {
      console.error("Failed to create new cycle via API:", error);
      
      // Server is down - create cycle locally
      const localCycle = {
        id: `local-cycle-${Date.now()}`,
        displayName: trimmedName,
        status: "draft" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        engineer_note: "",
        summary: "",
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
                  motorConfig: null
                }
              ]
            }
          ]
        }
      };

      // Save to localStorage
      const localCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
      localCycles.push(localCycle);
      localStorage.setItem('localCycles', JSON.stringify(localCycles));

      // Navigate to local cycle detail page
      navigate(`/cycle-local/${localCycle.id}`, { 
        state: { cycle: localCycle, isNew: true, isLocal: true } 
      });
      
      alert("Server unavailable. Cycle created locally and will sync when connection is restored.");
    } finally {
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
      // Get embedding for the search query
      const queryEmbedding = await getEmbedding(inputVal.trim());
      
      // Perform semantic search on cycles
      interface SearchableField {
        id: string;
        searchableText: string;
      }

      interface CycleComponent {
        id?: string;
        label?: string;
        start?: number;
        compId?: string;
        duration?: number;
        motorConfig?: unknown | null;
      }

      interface CyclePhase {
        id?: string;
        name?: string;
        color?: string;
        startTime?: number;
        components?: CycleComponent[];
      }

      const searchableFields: SearchableField[] = allCycles.map(
        (cycle: Cycle & { isLocal?: boolean }) => ({
          id: cycle.id,
          searchableText: [
        cycle.displayName || "",
        cycle.summary || "",
        cycle.engineer_note || "",
        cycle.status || "",
        // Include phase names and component labels for deeper search
        ...(
          cycle.data?.phases?.map((phase: CyclePhase) => [
            phase.name || "",
            ...(phase.components?.map((comp: CycleComponent) => comp.label || "") || []),
          ]).flat() || []
        ),
          ].filter(Boolean).join(" "),
        })
      );

      // Get semantic search results with similarity threshold
      const sortedIds = getSemanticSearchResults(
        queryEmbedding, 
        searchableFields, 
        0.65 // Lower threshold for more results
      );

      // Set search results - these are cycle IDs
      setSearchResults(sortedIds);
      setSearchPrompt(inputVal.trim());
      setInputVal("");
      setPage(1);

      // Log search results for debugging
      console.log(`Semantic search for "${inputVal.trim()}" found ${sortedIds.length} results`);
      
    } catch (err) {
      console.error("Search error:", err);
      alert("Search failed: " + (err as Error).message);
      
      // Fallback to simple text search if semantic search fails
      const fallbackResults = allCycles
        .filter(cycle => 
          cycle.displayName?.toLowerCase().includes(inputVal.toLowerCase()) ||
          cycle.summary?.toLowerCase().includes(inputVal.toLowerCase()) ||
          cycle.engineer_note?.toLowerCase().includes(inputVal.toLowerCase())
        )
        .map(cycle => cycle.id);
      
      setSearchResults(fallbackResults);
      setSearchPrompt(inputVal.trim() + " (text search)");
      setInputVal("");
      setPage(1);
      
    } finally {
      setLoadingSearch(false);
    }
  };

  // Name filter as you type
  const nameFilteredCycles = React.useMemo(() => {
    if (isTyping && inputVal.trim()) {
      const lower = inputVal.trim().toLowerCase();
      return allCycles.filter((c) => c.displayName?.toLowerCase().includes(lower));
    }
    return [];
  }, [allCycles, inputVal, isTyping]);

  // Cycles to display: searchResults > nameFilteredCycles > all cycles
  const cyclesToDisplay = React.useMemo(() => {
    if (searchResults && searchResults.length > 0) {
      return allCycles.filter((c) => searchResults.includes(c.id));
    }
    if (inputVal.trim() && isTyping) {
      return nameFilteredCycles;
    }
    return allCycles;
  }, [allCycles, searchResults, inputVal, isTyping, nameFilteredCycles]);

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

  // Handler for uploading a cycle from JSON
  const handleUploadCycle = (cycle: LocalCycle) => {
    try {
      // Get existing local cycles
      const existingCycles = JSON.parse(localStorage.getItem('localCycles') || '[]');
      
      // Add the new cycle
      existingCycles.push(cycle);
      
      // Save to localStorage
      localStorage.setItem('localCycles', JSON.stringify(existingCycles));
      
      // Update state to trigger re-render
      setLocalCycles(existingCycles);
      
      // Show success message
      alert(`Cycle "${cycle.displayName}" uploaded successfully!`);
      
      // Navigate to the uploaded cycle
      navigate(`/cycle-local/${cycle.id}`, { 
        state: { cycle, isNew: false, isLocal: true } 
      });
      
    } catch (error) {
      console.error('Failed to upload cycle:', error);
      alert('Failed to upload cycle. Please try again.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with source indicator */}
      <div className="w-full flex flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Source Indicator */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-600/30`}>
            Redux Store (API)
          </div>
          {/* Cycle count */}
          <div className="text-gray-400 text-sm">
            {allCycles.length} cycle{allCycles.length !== 1 ? 's' : ''}
          </div>
          {error && (
            <div className="text-red-400 text-sm">
              Error: {error}
            </div>
          )}
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
        <div className="flex flex-row gap-2 items-center">
          <Button
            func={() => setShowUploadModal(true)}
            
            label="Upload JSON"
            icon={Upload}
          />
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
              {"No cycles found."}
            </span>
            <span className="text-gray-500">
              {"Create a new cycle to get started."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-5 grid-rows-3 gap-4 h-full">
            {pagedCycles.map((cycle) => (
              <CycleFile cycle={cycle} key={cycle.id} />
            ))}
            {Array.from({
              length: CYCLES_PER_PAGE - pagedCycles.length,
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
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload JSON Modal */}
      <JsonUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadCycle}
        existingCycles={localCycles}
      />
    </div>
  );
}

export default CycleManager;