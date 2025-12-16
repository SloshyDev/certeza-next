"use client";

import { useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/20/solid";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const toggle = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark((v) => !v);
  };

  return (
    <button
      onClick={toggle}
      className="btn-secondary h-10 w-10 p-0 flex items-center justify-center"
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {isDark ? (
        <SunIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
      ) : (
        <MoonIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
      )}
    </button>
  );
}
