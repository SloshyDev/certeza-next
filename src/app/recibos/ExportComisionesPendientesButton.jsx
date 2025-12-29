"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function ExportComisionesPendientesButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    setIsGenerating(true);
    try {
      // Obtener todos los recibos
      const res = await fetch("/api/recibos/list?limit=10000");
      if (!res.ok) {
        throw new Error("Error al obtener recibos");
      }

      const json = await res.json();
      const polizas = json.data || [];

      // Función para determinar cuántas comisiones se pueden liberar
      function getComisionesLiberables(poliza, recibos) {
        const formaPago = (poliza.forma_pago || "").toUpperCase();
        const recibosPagados = recibos.filter(
          (r) => r.estatus_pago === "PAGADO"
        ).length;

        // DXN: Primeras 3 comisiones liberadas
        if (formaPago === "DXN") {
          return 3;
        }

        // CONTADO: Solo cuando el pago esté aplicado
        if (formaPago === "CONT" || formaPago === "CONTADO") {
          return recibosPagados; // Solo recibos pagados tienen comisión liberada
        }

        // MENS (Mensual): 1 pago = 3 comisiones, luego a goteo
        if (formaPago === "MENS" || formaPago === "MENSUAL") {
          if (recibosPagados >= 1) {
            // Primeras 3 comisiones liberadas con 1 pago
            const comisionesBase = 3;
            // Después del recibo 4, se libera a goteo (1 por 1)
            const comisionesAdicionales = Math.max(0, recibosPagados - 3);
            return comisionesBase + comisionesAdicionales;
          }
          return 0; // Sin pagos, no se liberan comisiones
        }

        // Otras formas de pago: liberar todas (comportamiento por defecto)
        return recibos.length;
      }

      // Filtrar recibos con comisión pendiente según reglas de liberación
      const recibosConComisionPendiente = [];

      polizas.forEach((poliza) => {
        const recibos = poliza.recibos || [];
        const comisionesLiberables = getComisionesLiberables(poliza, recibos);

        // Verificar si la póliza está cancelada
        const polizaCancelada =
          (poliza.poliza_estatus || "").toUpperCase() === "CANCELADA" ||
          (poliza.poliza_estatus || "").toUpperCase() === "REEXPEDIDA";

        // Ordenar recibos por número
        const recibosOrdenados = [...recibos].sort(
          (a, b) => a.no_recibo - b.no_recibo
        );

        // Solo incluir recibos que están dentro del límite de liberación
        recibosOrdenados.forEach((recibo, index) => {
          // Incluir si:
          // 1. Tiene comisión pendiente/retenida y está dentro de liberables, O
          // 2. La póliza está cancelada y no tiene fecha de pago de comisión
          const tieneComisionPendiente =
            recibo.estatus_comision === "PENDIENTE" ||
            recibo.estatus_comision === "RETENIDO";

          const canceladaSinFecha = polizaCancelada && !recibo.f_pago_comision;

          if (tieneComisionPendiente || canceladaSinFecha) {
            // Verificar si este recibo está dentro de los liberables o es cancelada
            if (index < comisionesLiberables || canceladaSinFecha) {
              recibosConComisionPendiente.push({
                id_recibo: recibo.id, // ID del recibo para actualización
                asesor_nombre: poliza.asesor_nombre || "SIN ASESOR",
                no_poliza: poliza.no_poliza,
                cia: poliza.cia,
                forma_pago: poliza.forma_pago,
                no_recibo: recibo.no_recibo,
                prima_neta: parseFloat(recibo.prima_neta || 0),
                comision: parseFloat(recibo.comision || 0),
                estatus_comision: recibo.estatus_comision,
                f_desde: recibo.f_desde,
                f_hasta: recibo.f_hasta,
                quincena: poliza.quincena,
              });
            }
          }
        });
      });

      if (recibosConComisionPendiente.length === 0) {
        alert("No hay comisiones pendientes");
        return;
      }

      // Calcular total general
      const totalGeneral = recibosConComisionPendiente.reduce(
        (sum, r) => sum + r.comision,
        0
      );

      // Crear workbook con una sola hoja
      const workbook = XLSX.utils.book_new();

      // Formato de una sola hoja para re-importación
      const data = [
        [
          "ID_RECIBO",
          "NO_POLIZA",
          "NO_RECIBO",
          "ASESOR",
          "CIA",
          "FORMA_PAGO",
          "PRIMA_NETA",
          "COMISION",
          "ESTATUS_COMISION",
          "F_PAGO_COMISION",
          "QUINCENA",
        ],
      ];

      // Agregar todas las comisiones en una sola hoja
      recibosConComisionPendiente.forEach((recibo) => {
        data.push([
          recibo.id_recibo || "", // ID para identificar el recibo al actualizar
          recibo.no_poliza,
          recibo.no_recibo,
          recibo.asesor_nombre,
          recibo.cia,
          recibo.forma_pago,
          recibo.prima_neta.toFixed(2),
          recibo.comision.toFixed(2),
          recibo.estatus_comision,
          "", // Campo vacío para llenar con fecha de pago
          recibo.quincena || "",
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Ajustar anchos de columna
      worksheet["!cols"] = [
        { wch: 12 }, // ID_RECIBO
        { wch: 20 }, // NO_POLIZA
        { wch: 10 }, // NO_RECIBO
        { wch: 30 }, // ASESOR
        { wch: 15 }, // CIA
        { wch: 12 }, // FORMA_PAGO
        { wch: 15 }, // PRIMA_NETA
        { wch: 15 }, // COMISION
        { wch: 18 }, // ESTATUS_COMISION
        { wch: 18 }, // F_PAGO_COMISION
        { wch: 20 }, // QUINCENA
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Comisiones Pendientes"
      );

      // Descargar archivo
      const timestamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `comisiones_pendientes_${timestamp}.xlsx`);

      // Contar asesores únicos
      const asesoresUnicos = new Set(
        recibosConComisionPendiente.map((r) => r.asesor_nombre)
      ).size;

      alert(
        `✅ Exportación exitosa\n\n` +
          `Total de recibos: ${recibosConComisionPendiente.length}\n` +
          `Asesores: ${asesoresUnicos}\n` +
          `Total comisiones pendientes: $${totalGeneral.toFixed(2)}`
      );
    } catch (error) {
      console.error("Error exporting:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
    >
      {isGenerating ? (
        <>
          <span className="inline-block animate-spin mr-2">⏳</span>
          Generando...
        </>
      ) : (
        <>📊 Exportar Comisiones Pendientes</>
      )}
    </button>
  );
}
