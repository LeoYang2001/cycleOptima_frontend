import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useParams } from "react-router-dom";
import type { Cycle } from "../../types/common/Cycle";
import Button from "../../components/common/Button";
import { Logs, Pencil, Play, SaveIcon } from "lucide-react";
import Note from "../../components/cycleDetail/Note";
import Section from "../../components/common/Section";
import CycleTimeLinePreview from "../../components/common/CycleTimeLinePreview";
import PhaseBreakdown from "../../components/cycleDetail/PhaseBreakdown";
import { upsertWasherCycle } from "../../apis/cycles";
import CycleSummary from "../../components/cycleDetail/CycleSummary";

function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const cycles = useSelector((state: RootState) => state.cycles.cycles);

  const foundCycle: Cycle | undefined = cycles.find((c) => c.id === id);

  if (!foundCycle) {
    return <div className="text-red-500">Cycle not found</div>;
  }

  // Set up local state for cycle and its components
  const [cycle, setCycle] = useState<Cycle>(foundCycle);
  const [cycleName, setCycleName] = useState(cycle.displayName);
  const [inputFocus, setInputFocus] = useState(false);

  // Set up local state for data and phases
  const [data, setData] = useState(cycle.data);
  const [phases, setPhases] = useState(data.phases || []);
  const [isSaving, setIsSaving] = useState(false);
  const [engineer_note, setEngineer_note] = useState(cycle.engineer_note || "");

  // Sync data.phases when phases changes
  useEffect(() => {
    setData((prevData) => {
      const updatedData = {
        ...prevData,
        phases: phases,
      };

      setCycle((prevCycle) => ({
        ...prevCycle,
        data: updatedData,
      }));

      return updatedData;
    });

    console.log("phases updated", phases);
  }, [phases]);
  // Save handler
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Prepare the data to save
      const updateData = {
        id: cycle.id, // Include the ID for update, or undefined for create
        displayName: cycleName,
        data: {
          ...data,
          phases: phases,
        },
        engineer_note: engineer_note,
      };

      // Call the upsert API to create or update the cycle
      const result = await upsertWasherCycle(updateData);

      // Show success message with operation type
      alert(
        `Cycle ${
          result.operation === "create" ? "created" : "updated"
        } successfully!`
      );

      console.log("Cycle saved:", updateData);
      console.log("Result:", result);
    } catch (error) {
      console.error("Save failed:", error);
      alert(`Failed to save cycle: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addPhase = () => {
    const newPhase = {
      id: Date.now().toString(),
      name: "Untitled",
      color: "ccc",
      startTime: 10000,
      components: [],
    };
    setPhases((prevPhases) => [...prevPhases, newPhase]);
  };

  const deletePhase = (phaseId: string) => {
    setPhases((prevPhases) => prevPhases.filter((p) => p.id !== phaseId));
  };

  return (
    <div className=" w-full h-full  flex flex-col">
      <header className="relative  mb-16">
        <div className=" flex flex-row justify-between items-center  px-4 py-2">
          <input
            value={cycleName}
            onChange={(e) => {
              setCycleName(e.target.value);
            }}
            onFocus={() => {
              setInputFocus(true);
            }}
            onBlur={() => {
              setInputFocus(false);
            }}
            className="w-[40%]  transition-all duration-200"
            style={{
              color: !inputFocus ? "#aaa" : "#fff",
              fontFamily: !inputFocus ? "Andale Mono, monospace" : "sans-serif",
              fontSize: 30,
              fontWeight: 600,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setInputFocus(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <Button
            icon={SaveIcon}
            label={isSaving ? "Saving..." : "Save Cycle"}
            theme="light"
            func={handleSave}
            disabled={isSaving}
          />
        </div>
        <div className="flex flex-row absolute left-0 top-16">
          <Note
            engineer_note={cycle.engineer_note || "No notes available"}
            setEngineer_note={setEngineer_note}
          />
        </div>
      </header>
      <section className="flex-1  flex flex-row gap-10 pb-10 w-full ">
        <div className=" flex flex-col gap-10 w-[70%] h-full ">
          <div className=" ">
            {" "}
            <Section
              icon={Play}
              title="Phases Timeline"
              subtitle="Drag and drop phases to reorder. Phase length represents actual duration."
            >
              <CycleTimeLinePreview
                setPhases={setPhases}
                phases={phases}
                cycle={cycle}
                size="large"
                func={addPhase}
              />
            </Section>
          </div>
          <div className=" flex-1 ">
            <Section icon={Logs} title="Phase Breakdown">
              <PhaseBreakdown
                deletePhase={deletePhase}
                cycle={cycle}
                Phases={phases}
              />
            </Section>
          </div>
        </div>
        <div
          style={{
            height: "50%",
          }}
          className=" flex-1 flex flex-col gap-10 "
        >
          <Section title="Cycle Summary">
            <CycleSummary cycle={cycle} />
          </Section>
        </div>
      </section>
      {/* Render more details here */}
    </div>
  );
}
export default CycleDetail;
