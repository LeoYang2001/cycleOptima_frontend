import React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

type DropdownProps = {
  options: string[];
  value: string;
  setValue: (val: string) => void;
  theme?: "light" | "dark";
  className?: string;
  func?: (val: string) => void;
};

function Dropdown({
  options,
  value,
  setValue,
  theme = "dark",
  className = "",
  func,
}: DropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value);
    if (func) func(e.target.value);
  };

  const themeClass =
    theme === "dark"
      ? "bg-zinc-800 text-gray-100 border border-gray-700 hover:bg-zinc-700"
      : "bg-white text-black border border-gray-300 hover:bg-gray-100";

  // Option text color based on theme
  const optionClass =
    theme === "dark" ? "bg-zinc-800 text-gray-100" : "bg-white text-black";

  return (
    <div className="flex flex-row relative items-center">
      <select
        value={value}
        onChange={handleChange}
        className={cn(
          `appearance-none w-full px-4 pr-8 py-2 h-12 rounded-lg overflow-hidden shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),_0px_1px_0px_0px_rgba(25,28,33,0.02),_0px_0px_0px_1px_rgba(25,28,33,0.08)] transition-colors duration-200 ${themeClass}`,
          className
        )}
      >
        {options.map((option) => (
          <option key={option} value={option} className={optionClass}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-gray-400 flex items-center">
        <ChevronDown size={20} />
      </span>
    </div>
  );
}

export default Dropdown;
