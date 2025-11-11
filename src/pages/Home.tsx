import React, { useState, useEffect, useRef } from "react";
import { ColourfulText } from "../components/ui/colourful-text";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import NavigationCard from "../components/home/NavigationCard";
import { Cog, MonitorCog, Zap } from "lucide-react";

const washerCards = [
  {
    url: "/cycle-manager",
    title: "Cycle Designer",
    des: "Create, edit, and visualize washer test cycles. Launch tests or review results.",
    Icon: Cog,
  },
  {
    url: "/system-monitor",
    title: "System Monitor",
    des: "Monitor live system feedback, machine status, and test progress in real time.",
    Icon: MonitorCog,
  },
];

const dryerCards = [
  {
    title: "Dryer Control",
    des: "Coming soon - Dryer cycle management and monitoring will be available here.",
    Icon: Zap,
  },
];

interface SectionState {
  intro: number;
  washer: number;
  dryer: number;
}

function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<SectionState>({
    intro: 0,
    washer: 0,
    dryer: 0,
  });

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const viewportHeight = containerRef.current.clientHeight;

      // Calculate progress for each section (0 to 1)
      const introProgress = Math.max(0, 1 - scrollTop / viewportHeight);
      const washerProgress = Math.max(
        0,
        Math.min(
          1,
          (scrollTop - viewportHeight + viewportHeight / 2) / viewportHeight
        )
      );
      const dryerProgress = Math.max(
        0,
        Math.min(
          1,
          (scrollTop - viewportHeight * 2 + viewportHeight / 2) / viewportHeight
        )
      );

      setScrollProgress({
        intro: introProgress,
        washer: washerProgress,
        dryer: dryerProgress,
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollToSection = (index: number) => {
    if (!containerRef.current) return;
    const targetScroll = index * containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-y-scroll snap-y snap-mandatory"
      style={{
        scrollBehavior: "smooth",
        scrollSnapType: "y mandatory",
      }}
    >
      {/* Navigation Dots */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
        {[
          { label: "Intro", index: 0 },
          { label: "Washer", index: 1 },
          { label: "Dryer", index: 2 },
        ].map(({ label, index }) => (
          <button
            key={index}
            onClick={() => scrollToSection(index)}
            className="group relative"
            title={label}
          >
            <div
              className="w-3 h-3 rounded-full bg-gray-600 transition-all duration-300 cursor-pointer"
              style={{
                backgroundColor:
                  index === 0
                    ? `rgba(34, 197, 94, ${0.3 + scrollProgress.intro * 0.7})`
                    : index === 1
                      ? `rgba(59, 130, 246, ${0.3 + scrollProgress.washer * 0.7})`
                      : `rgba(249, 115, 22, ${0.3 + scrollProgress.dryer * 0.7})`,
                transform: `scale(${1 + scrollProgress[index === 0 ? "intro" : index === 1 ? "washer" : "dryer"] * 0.5})`,
              }}
            />
            <span className="absolute right-8 whitespace-nowrap text-xs font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* INTRO SECTION */}
      <section
        className="w-full h-screen flex items-center justify-center snap-start relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
        }}
      >
        {/* Background glow based on scroll */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, rgba(34, 197, 94, ${scrollProgress.intro * 0.3}) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 text-center px-6">
          {/* Header with dynamic brightness */}
          <div
            style={{
              opacity: 0.5 + scrollProgress.intro * 0.5,
              transform: `scale(${0.9 + scrollProgress.intro * 0.1})`,
              transition: "all 0.1s ease-out",
            }}
          >
            <h1 className="gradient-text py-2 text-6xl font-bold mb-4">
              Cycle Optima
            </h1>
            <div className="h-1 w-20 mx-auto bg-gradient-to-r from-green-500 to-transparent rounded-full" />
          </div>

          {/* Content with fade-in */}
          <div
            style={{
              opacity: scrollProgress.intro,
              transform: `translateY(${(1 - scrollProgress.intro) * 20}px)`,
              transition: "all 0.1s ease-out",
            }}
            className="mt-8"
          >
            <div className="flex flex-row justify-center mt-6">
              <TextGenerateEffect words="Control meets intelligence. Begin building your perfect cycle." />
            </div>
            <div className="mt-12 text-sm text-gray-400">
              ↓ Scroll to explore ↓
            </div>
          </div>
        </div>
      </section>

      {/* WASHER SECTION */}
      <section
        className="w-full h-screen flex flex-col items-center justify-center snap-start relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)",
        }}
      >
        {/* Background glow based on scroll */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, rgba(59, 130, 246, ${scrollProgress.washer * 0.3}) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 w-full px-6">
          {/* Header with dynamic brightness */}
          <div
            className="text-center mb-16"
            style={{
              opacity: 0.5 + scrollProgress.washer * 0.5,
              transform: `scale(${0.9 + scrollProgress.washer * 0.1})`,
              transition: "all 0.1s ease-out",
            }}
          >
            <h2 className="text-5xl font-bold text-blue-400 mb-2">
              Washer Control
            </h2>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-blue-500 to-transparent rounded-full" />
          </div>

          {/* Content with fade-in and stagger */}
          <div
            style={{
              opacity: scrollProgress.washer,
              transform: `translateY(${(1 - scrollProgress.washer) * 30}px)`,
              transition: "all 0.1s ease-out",
            }}
            className="flex flex-row justify-center gap-8 max-w-6xl mx-auto"
          >
            {washerCards.map((card, index) => (
              <div
                key={card.url}
                style={{
                  opacity: scrollProgress.washer,
                  transform: `translateY(${(1 - scrollProgress.washer) * (20 + index * 10)}px)`,
                  transition: "all 0.1s ease-out",
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <NavigationCard navCard={card} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DRYER SECTION */}
      <section
        className="w-full h-screen flex flex-col items-center justify-center snap-start relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
        }}
      >
        {/* Background glow based on scroll */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, rgba(249, 115, 22, ${scrollProgress.dryer * 0.3}) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 w-full px-6">
          {/* Header with dynamic brightness */}
          <div
            className="text-center mb-16"
            style={{
              opacity: 0.5 + scrollProgress.dryer * 0.5,
              transform: `scale(${0.9 + scrollProgress.dryer * 0.1})`,
              transition: "all 0.1s ease-out",
            }}
          >
            <h2 className="text-5xl font-bold text-orange-400 mb-2">
              Dryer Control
            </h2>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-orange-500 to-transparent rounded-full" />
          </div>

          {/* Placeholder content */}
          <div
            style={{
              opacity: scrollProgress.dryer,
              transform: `translateY(${(1 - scrollProgress.dryer) * 30}px)`,
              transition: "all 0.1s ease-out",
            }}
            className="flex flex-col items-center gap-6"
          >
            <div className="text-6xl">🔧</div>
            <p className="text-xl text-gray-400 text-center max-w-md">
              Dryer cycle management and monitoring coming soon
            </p>
            <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
              <Zap size={16} />
              Feature in development
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;