import React, { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { useParams } from "react-router-dom";
import type { Cycle } from "../../types/common/Cycle";
import Button from "../../components/common/Button";
import { Logs, Pencil, Play, SaveIcon } from "lucide-react";
import Note from "../../components/cycleDetail/Note";
import Section from "../../components/common/Section";
import CycleTimeLinePreview from "../../components/common/CycleTimeLinePreview";

function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const cycles = useSelector((state: RootState) => state.cycles.cycles);

  const cycle: Cycle | undefined = cycles.find((c) => c.id === id);

  if (!cycle) {
    return <div className="text-red-500">Cycle not found</div>;
  }

  const [cycleName, setCycleName] = useState(cycle.displayName);
  const [inputFocus, setInputFocus] = useState(false);

  // Dummy save handler
  const handleSave = () => {
    // TODO: Implement save logic
    alert("Cycle saved!");
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
            label="Save Cycle"
            theme="light"
            func={handleSave}
          />
        </div>
        <div className="flex flex-row absolute left-0 top-16">
          <Note text={cycle.engineer_note || "No notes available"} />
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
              <CycleTimeLinePreview cycle={cycle} size="large" />
            </Section>
          </div>
          <div className=" flex-1 ">
            <Section icon={Logs} title="Phase Breakdown">
              <div>
                <strong>Cycle ID:</strong> {cycle.id}
              </div>
              <div>
                <strong>Display Name:</strong> {cycle.displayName}
              </div>
              <div>
                <strong>Engineer Note:</strong>{" "}
                {cycle.engineer_note || "No notes available"}
              </div>
            </Section>
          </div>
        </div>
        <div className=" flex-1 flex flex-col gap-10 ">
          <Section title="Cycle Summary">
            <div>
              <strong>Cycle ID:</strong> {cycle.id}
            </div>
            <div>
              <strong>Display Name:</strong> {cycle.displayName}
            </div>
            <div>
              <strong>Engineer Note:</strong>{" "}
              {cycle.engineer_note || "No notes available"}
            </div>
          </Section>
        </div>
      </section>
      {/* Render more details here */}
    </div>
  );
}
export default CycleDetail;
