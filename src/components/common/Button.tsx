import React from "react";
import type { LucideIcon } from "lucide-react";
import "./../../style.css";

type ButtonProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  func?: () => void;
  theme?: "light" | "dark";
  disabled?: boolean;
};

const sizeClasses = {
  sm: "px-2 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

const themeClasses = {
  light: "button-light",
  dark: "button-dark",
};

function Button({
  label,
  size = "md",
  icon: Icon,
  func,
  theme = "dark",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded transition-colors duration-150
        ${themeClasses[theme]} focus:outline-none ${sizeClasses[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={func}
      disabled={disabled}
    >
      {Icon && <Icon size={18} />}
      {label}
    </button>
  );
}

export default Button;
