// src/components/VoiceWidget.tsx
import React, { use, useEffect, useState } from "react";
import { usePorcupine } from "@picovoice/porcupine-react";
import HaloVisualizer from "../../components/aiAssistant/HaloVisualizer";
import { useDecibelDetector } from "../session/useDecibelDetector";

const accessKey = import.meta.env.VITE_PICOVOICE_ACCESS_KEY;

function VoiceWidget({ onWakeWord }: { onWakeWord: () => void }) {
  const {
    keywordDetection,
    isLoaded,
    isListening,
    error,
    init,
    start,
    stop,
    release,
  } = usePorcupine();

  const { decibelLevel, startDetection } = useDecibelDetector();
  const [isHome, setIsHome] = useState(true);

  useEffect(() => {
    setIsHome(location.pathname === "/");
  }, [location.pathname]);

  const porcupineKeyword = {
    publicPath: "/wakeup-word.ppn", // ✅ Must match your file in /public
    label: "javis",
  };

  const porcupineModel = {
    publicPath: "/porcupine_params.pv",
  };

  useEffect(() => {
    const initializeAndStart = async () => {
      try {
        await init(accessKey, porcupineKeyword, porcupineModel);
        startDetection(); // Start decibel detection

        await start(); // ✅ Automatically start listening
        console.log("👂 Now listening for 'JAVIS'...");
      } catch (err) {
        console.error("Failed to initialize or start Porcupine:", err);
      }
    };

    initializeAndStart();
  }, []);

  useEffect(() => {
    if (keywordDetection?.label === "javis") {
      onWakeWord();
    }
  }, [keywordDetection]);

  return (
    <div>
      {error && <p style={{ color: "red" }}>Error: {error.toString()}</p>}
      <HaloVisualizer
        size={isHome ? "large" : "small"}
        scaleRange={[0.8, 2]}
        decibel={decibelLevel}
      />
    </div>
  );
}

export default VoiceWidget;
