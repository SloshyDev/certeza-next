"use client";

export default function ExportBitacoraButton() {
  function trigger() {
    const ev = new Event("bitacora-export");
    window.dispatchEvent(ev);
  }
  return (
    <button className="border rounded px-3 py-1 bg-gray-100" onClick={trigger}>
      Exportar
    </button>
  );
}

