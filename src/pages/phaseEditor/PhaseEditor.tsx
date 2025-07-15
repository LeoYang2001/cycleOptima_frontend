import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import type { RootState } from "../../store";
import { selectCycleById } from "../../store/cycleSlice";
import Section from "../../components/common/Section";

function PhaseEditor() {
  // Extract both cycle id and phase id from the URL parameters
  const { id: cycleId, phaseId } = useParams<{
    id: string;
    phaseId: string;
  }>();

  // Handle cases where parameters might be undefined
  if (!cycleId || !phaseId) {
    return (
      <div className="text-red-500">
        Error: Missing cycle ID or phase ID in URL
      </div>
    );
  }

  const cycle = useSelector((state: RootState) =>
    selectCycleById(state, cycleId!)
  );
  const phase = cycle?.data.phases.find((p) => p.id === phaseId);

  const [phaseName, setPhaseName] = useState(phase?.name || "");
  const [inputFocus, setInputFocus] = useState(false);

  return (
    <div className="w-full h-full flex flex-col  ">
      <header className=" flex flex-row items-start ">
        <div className="flex flex-col justify-center items-start w-[50%] py-2">
          <input
            value={phaseName}
            onChange={(e) => {
              setPhaseName(e.target.value);
            }}
            onFocus={() => {
              setInputFocus(true);
            }}
            onBlur={() => {
              setInputFocus(false);
            }}
            className="w-[100%] transition-all duration-200"
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
          <span className="text-gray-400 text-sm">
            Configure components and timing for this phase
          </span>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto gap-10  py-10  flex flex-row">
        <div className="w-[70%] flex flex-col gap-10 ">
          <Section title="Phase Configuration">demo</Section>
          <Section title="Phase Configuration">demo</Section>
        </div>
        <div className="w-[30%]   ">
          <Section title="Phase Details">demo</Section>
        </div>
      </section>
    </div>
  );
}

export default PhaseEditor;
