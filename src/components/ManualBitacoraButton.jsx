"use client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function ManualBitacoraButton() {
  function openManual() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-manual-bitacora"));
    }
  }

  return (
    <button
      onClick={openManual}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors shadow-sm text-sm font-medium border border-gray-200"
      title="Ver manual de usuario"
    >
      <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500" />
      <span className="hidden sm:inline">Manual</span>
    </button>
  );
}
