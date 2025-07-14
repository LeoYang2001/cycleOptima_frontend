import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Color } from "../../constants";
import { TextRevealCard } from "../ui/text-reveal-card";
import HaloVisualizer from "../aiAssistant/HaloVisualizer";
import { useDecibelDetector } from "../../hooks/useDecibelDetector";

function Header() {
  const { decibelLevel, startDetection } = useDecibelDetector();
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef<string | null>(null);

  const [isHome, setIsHome] = useState(true);

  // Save last path
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    startDetection();
  }, []);

  const basePages = ["/cycle-manager", "/ai-assistant", "/system-monitor"];

  const shouldShowHome = basePages.includes(location.pathname);
  const shouldShowBack = location.pathname !== "/" && !shouldShowHome;

  useEffect(() => {
    setIsHome(location.pathname === "/");
  }, [location.pathname]);

  return (
    <div
      style={{
        height: "8%",
        minHeight: 90,
        backgroundColor: Color.darkerColor,
        zIndex: 999,
      }}
      className="w-full py-4 flex relative flex-row justify-between px-10 items-center"
    >
      {shouldShowHome ? (
        <Link
          to="/"
          className="hover:transform hover:-translate-y-1 transition-all duration-300"
        >
          <span className="text-lg font-semibold text-white cursor-pointer">
            Home
          </span>
        </Link>
      ) : shouldShowBack ? (
        <div
          className="hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <span className="text-lg font-semibold text-white">Back</span>
        </div>
      ) : (
        <div className="opacity-0">home</div>
      )}

      <div>
        <TextRevealCard
          text="Test. Tweak. Repeat."
          revealText="Master Your Machine"
          textSize={40}
        />
      </div>

      <div className="opacity-0">placeholder</div>

      <div
        className={`absolute transition-all duration-800`}
        style={
          isHome
            ? {
                left: "50%",
                top: "140%",
                transform: "translate(-50%)",
              }
            : {
                left: "93%",
                top: "50%",
                transform: "translateY(-50%)",
              }
        }
      >
        <HaloVisualizer
          size={isHome ? "large" : "small"}
          scaleRange={[0.8, 2]}
          decibel={decibelLevel}
        />
      </div>
    </div>
  );
}

export default Header;
