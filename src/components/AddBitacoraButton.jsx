"use client";
export default function AddBitacoraButton() {
  function openModal() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-bitacora-form"));
    }
  }
  return (
    <button className="border rounded px-3 py-1 bg-gray-100" onClick={openModal}>
      Añadir registro
    </button>
  );
}

