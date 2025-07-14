import React from "react";
import { ColourfulText } from "../components/ui/colourful-text";
import { ShootingStars } from "../components/ui/shooting-stars";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import { PinContainer } from "../components/ui/3d-pin";
import NavigationCard from "../components/home/NavigationCard";
import { AudioLines, Cog, MonitorCog } from "lucide-react";

const navigationCardList = [
  {
    url: "/cycle-manager",
    title: "Cycle Designer",
    des: "Create, edit, and visualize washer/dryer test cycles. Launch tests or review results.",
    Icon: Cog,
  },
  {
    url: "/ai-assistant",
    title: "AI Assistant",
    des: "Collaborate with AI to analyze test feedback and optimize your next cycle.",
    Icon: AudioLines,
  },
  {
    url: "/system-monitor",
    title: "System Monitor",
    des: "Monitor live system feedback, machine status, and test progress in real time.",
    Icon: MonitorCog,
  },
];

function Home() {
  return (
    <div className=" flex-1 w-full h-full flex flex-col  items-center">
      <div
        style={{
          marginTop: 200,
        }}
        className="p-2 "
      >
        <h1 className="gradient-text  py-2 text-center">Cycle Optima</h1>

        <div className="  flex flex-row justify-center">
          <TextGenerateEffect words="Control meets intelligence. Begin building your perfect cycle." />
        </div>
        <div className=" flex flex-row  mt-10">
          {navigationCardList.map((navCard) => (
            <NavigationCard navCard={navCard} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
