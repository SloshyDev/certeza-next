"use client";

import { useState, useEffect } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/20/solid";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      const isDarkStored = stored === "dark";
      const isSystemDark =
        !stored && window.matchMedia("(prefers-color-scheme: dark)").matches;

      if (isDarkStored || isSystemDark) {
        document.documentElement.classList.add("dark");
        setIsDark(true);
      } else {
        document.documentElement.classList.remove("dark");
        setIsDark(false);
      }
    }
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
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
