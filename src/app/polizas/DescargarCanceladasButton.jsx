"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function DescargarCanceladasButton({ filters }) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      // Construir query params desde los filtros
      const params = new URLSearchParams();
      if (filters.no_poliza) params.set("no_poliza", filters.no_poliza);
      if (filters.asesor_id) params.set("asesor_id", filters.asesor_id);
      if (filters.cia) params.set("cia", filters.cia);
      if (filters.forma_pago) params.set("forma_pago", filters.forma_pago);
      if (filters.folio) params.set("folio", filters.folio);
      if (filters.quincena) params.set("quincena", filters.quincena);

      // Obtener pólizas con los filtros aplicados
      const res = await fetch(`/api/polizas?${params.toString()}&limit=10000`);
      if (!res.ok) {
        throw new Error("Error al obtener pólizas");
      }

      const json = await res.json();
      const polizas = json.polizas || [];

      // Filtrar solo CANCELADA o REEXPEDIDA
      const canceladas = polizas.filter(
        (p) =>
          p.estatus === "CANCELADA" ||
          p.estatus === "REEXPEDIDA" ||
          p.estatus === "Cancelada" ||
          p.estatus === "Reexpedida"
      );

      if (canceladas.length === 0) {
        alert(
          "No hay pólizas canceladas o reexpedidas con los filtros aplicados"
        );
        return;
      }

      // Generar Excel con formato de descuentos
      const workbook = XLSX.utils.book_new();

      const data = [
        ["NO POLIZA", "CIA", "PRIMA TOTAL", "PRIMA NETA", "COMISION", "MOTIVO"],
      ];

      for (const poliza of canceladas) {
        const primaNeta = parseFloat(poliza.prima_neta || 0);
        const commissionRate =
          parseFloat(poliza.commission_percentage || 0) / 100;
        const comision = primaNeta * commissionRate;

        data.push([
          poliza.no_poliza || "",
          poliza.cia || "",
          -Math.abs(parseFloat(poliza.prima_total || 0)),
          -Math.abs(primaNeta),
          -Math.abs(comision),
          poliza.estatus || "CANCELADA",
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Ajustar anchos de columna
      worksheet["!cols"] = [
        { wch: 20 }, // NO POLIZA
        { wch: 15 }, // CIA
        { wch: 15 }, // PRIMA TOTAL
        { wch: 15 }, // PRIMA NETA
        { wch: 15 }, // COMISION
        { wch: 20 }, // MOTIVO
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Descuentos");

      // Descargar archivo
      const timestamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `descuentos_canceladas_${timestamp}.xlsx`);

      alert(
        `✅ Se generó el archivo con ${canceladas.length} pólizas canceladas`
      );
    } catch (error) {
      console.error("Error generating canceladas:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
    >
      {isGenerating ? (
        <>
          <span className="inline-block animate-spin mr-2">⏳</span>
          Generando...
        </>
      ) : (
        <>📥 Descargar Canceladas</>
      )}
    </button>
  );
}
