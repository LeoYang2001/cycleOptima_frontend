import React from "react";
import type { LucideIcon } from "lucide-react";

interface SectionProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

function Section({ title, subtitle, icon: Icon, children }: SectionProps) {
  return (
    <section className="bg-black rounded-xl border w-full h-full border-gray-700 p-6 ">
      <div className="flex items-center mb-2 gap-4">
        {Icon && <Icon className="text-white" size={24} />}
        <h2 className="text-white text-2xl font-bold">{title}</h2>
      </div>
      {subtitle && (
        <div className="mb-4">
          <span className="text-gray-500 text-sm">{subtitle}</span>
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export default Section;
