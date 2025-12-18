"use client";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function AddBitacoraButton() {
  function openModal() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-bitacora-form"));
    }
  }
  return (
    <button
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
      onClick={openModal}
    >
      <PlusIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Añadir registro</span>
      <span className="sm:hidden">Añadir</span>
    </button>
  );
}
