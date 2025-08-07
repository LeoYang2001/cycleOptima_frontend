import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

interface DeviceGuardProps {
  children: React.ReactNode;
}

const DeviceGuard: React.FC<DeviceGuardProps> = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">(
    "desktop"
  );

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Check for mobile devices
      const isMobile =
        /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        ) ||
        (screenWidth <= 768 && isTouchDevice);

      // Check for tablets (including iPad)
      const isTablet =
        /ipad|android(?!.*mobile)|tablet/i.test(userAgent) ||
        (screenWidth > 768 && screenWidth <= 1024 && isTouchDevice) ||
        (screenWidth <= 1366 &&
          screenHeight <= 1024 &&
          isTouchDevice &&
          screenWidth > 768);

      // Additional iPad detection
      const isIPad =
        /ipad/i.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isMobile) {
        setDeviceType("mobile");
        setIsDesktop(false);
      } else if (isTablet || isIPad) {
        setDeviceType("tablet");
        setIsDesktop(false);
      } else {
        setDeviceType("desktop");
        setIsDesktop(true);
      }
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  if (!isDesktop) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20 shadow-2xl">
          <div className="mb-6">
            {deviceType === "mobile" ? (
              <Smartphone className="w-20 h-20 mx-auto text-blue-400 mb-4" />
            ) : (
              <Tablet className="w-20 h-20 mx-auto text-blue-400 mb-4" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            Desktop Required
          </h1>

          <p className="text-gray-300 mb-6 leading-relaxed">
            Cycle Optima is designed for desktop and laptop computers only. The
            complex interface and precision controls require a larger screen and
            mouse/keyboard interaction.
          </p>

          <div className="bg-blue-500/20 rounded-lg p-4 mb-6 border border-blue-400/30">
            <Monitor className="w-8 h-8 mx-auto text-blue-400 mb-2" />
            <p className="text-sm text-blue-200">
              Please access this application from a desktop or laptop computer
              with a screen width of at least 1280px.
            </p>
          </div>

          <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">
            <p className="mb-1">
              <strong>Detected Device:</strong>{" "}
              {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
            </p>
            <p className="mb-1">
              <strong>Screen Size:</strong> {window.screen.width} ×{" "}
              {window.screen.height}
            </p>
            <p>
              <strong>User Agent:</strong>{" "}
              {navigator.userAgent.substring(0, 50)}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default DeviceGuard;
