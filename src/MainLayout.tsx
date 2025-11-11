// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import Header from "./components/common/Header";
import { Color } from "./constants";
import { BackgroundBeams } from "./components/ui/background-beams";
import { ShootingStars } from "./components/ui/shooting-stars";
import { useEffect, useRef, useState } from "react";

export default function MainLayout() {

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);


   useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
     
    }

    // Update header height on window resize
    const handleResize = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div
      className="w-[100vw] overflow-x-hidden elegant-scrollbar"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
        <Header  headerRef={headerRef} />
      <main
        style={{
          backgroundColor: Color.lighterDark,
          paddingTop: `${headerHeight+30}px`, // Adjust for header height
        }}
        className=" flex-1  w-full"
      >
        <ShootingStars />
        <div
          style={{
            zIndex: 200,
          }}
          className="  w-full flex-1 relative flex flex-col items-center justify-center"
        >
          
          <Outlet />
        </div>
      </main>
    </div>
  );
}
