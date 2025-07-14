// useDecibelDetector.ts
import { useState, useEffect, useCallback } from "react";

// decibelDetector.ts (or decibelDetector.js) - Your existing code
// You might want to put this existing code in a separate utility file (e.g., audioUtils.ts)
// if you want to keep the hook cleaner, but for this example, we'll assume it's directly accessible.

let decibelAudioContext: AudioContext | null = null;
let decibelAnalyserNode: AnalyserNode | null = null;
let decibelMediaStream: MediaStream | null = null;
let decibelAnimationId: number | null = null;

/**
 * Starts real-time decibel detection from the microphone.
 * @param onDecibelUpdate A callback function that receives the current decibel level (0-100).
 * @returns A promise that resolves when detection starts, or rejects on error.
 */
export const startDecibelDetection = async (
  onDecibelUpdate: (decibel: number) => void
): Promise<void> => {
  // Cleanup any existing decibel detection first
  stopDecibelDetection();

  try {
    decibelMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    decibelAudioContext = new window.AudioContext();
    const source =
      decibelAudioContext.createMediaStreamSource(decibelMediaStream);

    decibelAnalyserNode = decibelAudioContext.createAnalyser();
    decibelAnalyserNode.fftSize = 256; // Smaller for more responsive volume changes
    decibelAnalyserNode.minDecibels = -90; // Adjust as needed
    decibelAnalyserNode.maxDecibels = -10; // Adjust as needed
    const bufferLength = decibelAnalyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(decibelAnalyserNode);
    // Optionally, connect to destination to ensure the stream stays active
    // even if not actively playing, or connect to a silent GainNode.
    // analyser.connect(audioContext.destination);

    const detectDecibels = () => {
      if (!decibelAnalyserNode || !onDecibelUpdate) {
        // If nodes are null or callback is gone, stop the loop
        if (decibelAnimationId) cancelAnimationFrame(decibelAnimationId);
        decibelAnimationId = null;
        return;
      }

      decibelAnalyserNode.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for a more accurate loudness perception
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Normalize RMS to a 0-100 scale for easier visualization
      // The 0-255 range from getByteFrequencyData maps to minDecibels to maxDecibels.
      // Scaling can be tricky, adjust the factor (e.g., *2) for desired sensitivity.
      // A simple linear mapping of RMS from 0-255 to 0-100:
      const normalizedDecibel = Math.min(100, Math.max(0, (rms / 255) * 100));

      onDecibelUpdate(normalizedDecibel); // Call the provided callback

      decibelAnimationId = requestAnimationFrame(detectDecibels);
    };

    decibelAnimationId = requestAnimationFrame(detectDecibels); // Start the loop
    console.log("👂 Decibel detection started.");
  } catch (err) {
    console.error("Error starting decibel detection:", err);
    stopDecibelDetection(); // Ensure cleanup on error
    throw err; // Re-throw to propagate the error
  }
};

/**
 * Stops the decibel detection and cleans up resources.
 */
export const stopDecibelDetection = (): void => {
  if (decibelAnimationId) {
    cancelAnimationFrame(decibelAnimationId);
    decibelAnimationId = null;
  }
  if (decibelAnalyserNode) {
    decibelAnalyserNode.disconnect();
    decibelAnalyserNode = null;
  }
  if (decibelMediaStream) {
    decibelMediaStream.getTracks().forEach((track) => track.stop());
    decibelMediaStream = null;
  }
  if (decibelAudioContext) {
    // Corrected logic: Only close if the context is not already 'closed'.
    // The 'suspended' and 'running' states are the ones we want to close.
    if (decibelAudioContext.state !== "closed") {
      decibelAudioContext
        .close()
        .then(() => {
          console.log("AudioContext successfully closed.");
        })
        .catch((err) => {
          console.error("Error closing AudioContext:", err);
        });
    }
    decibelAudioContext = null; // Always nullify after attempting to close
  }
  console.log("🔇 Decibel detection stopped.");
};

// useDecibelDetector.ts (the custom hook file)
export const useDecibelDetector = () => {
  const [decibelLevel, setDecibelLevel] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleDecibelUpdate = useCallback((decibel: number) => {
    setDecibelLevel(decibel);
  }, []);

  const startDetection = useCallback(async () => {
    try {
      setError(null); // Clear any previous errors
      await startDecibelDetection(handleDecibelUpdate);
      setIsDetecting(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err);
      } else {
        setError(
          new Error("An unknown error occurred during decibel detection.")
        );
      }
      setIsDetecting(false);
    }
  }, [handleDecibelUpdate]);

  const stopDetection = useCallback(() => {
    stopDecibelDetection();
    setIsDetecting(false);
    setDecibelLevel(null); // Optionally reset decibel level on stop
  }, []);

  // Effect to stop detection when the component unmounts
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return { decibelLevel, isDetecting, error, startDetection, stopDetection };
};
