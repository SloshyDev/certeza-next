"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowPathRoundedSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function UpdateRenovaciones() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const router = useRouter();

  function closeModal() {
    setIsOpen(false);
    setResult(null);
    setFile(null);
    setProgress(0);
    if (result?.success) {
      router.refresh();
    }
  }

  function openModal() {
    setIsOpen(true);
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length === 0) {
        throw new Error("El archivo está vacío");
      }

      // Preparar datos limpios
      const cleanUpdates = [];

      // Iterar sobre los datos y preparar actualizaciones
      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Búsqueda flexible de columnas
        const keys = Object.keys(row);
        // Busca columna "no_poliza" o similar
        const polizaKey = keys.find((k) =>
          k.toLowerCase().replace(/[^a-z0-9]/g, "") === "nopoliza" ||
          k.toLowerCase().includes("poliza")
        );
        // Busca columna "estatus"
        const statusKey = keys.find((k) => k.toLowerCase() === "estatus");

        if (!polizaKey) continue;

        const poliza = String(row[polizaKey]).trim();
        const rawStatus = statusKey ? String(row[statusKey]).trim() : "";

        let estatus = rawStatus;

        if (!rawStatus) {
          estatus = "PENDIENTE";
        } else {
          const upperStatus = rawStatus.toUpperCase();
          if (upperStatus === "FOLIO COMPLETO" || upperStatus === "RECHAZO PARITARIA" || upperStatus === "RECHAZO PARITARITA") {
            estatus = "COLOCADA";
          } else if (upperStatus === "FALTAN DOCUMENTOS") {
            estatus = "PENDIENTE";
          } else {
            estatus = upperStatus;
          }
        }

        cleanUpdates.push({ poliza, estatus });
      }

      // Enviar por lotes (Chunks)
      const CHUNK_SIZE = 500; // Aumentado para velocidad
      const totalChunks = Math.ceil(cleanUpdates.length / CHUNK_SIZE);
      let processedCount = 0;
      let successCount = 0;

      for (let i = 0; i < cleanUpdates.length; i += CHUNK_SIZE) {
        const chunk = cleanUpdates.slice(i, i + CHUNK_SIZE);

        const res = await fetch("/api/renovaciones/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: chunk }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.error("Error en chunk", i, errData);
        } else {
          const resData = await res.json();
          successCount += resData.updated || 0;
        }

        processedCount += chunk.length;
        const currentProgress = Math.round(
          (processedCount / cleanUpdates.length) * 100
        );
        setProgress(currentProgress);
      }

      setResult({
        success: true,
        message: `Procesado: ${successCount} registros actualizados.`,
      });
    } catch (error) {
      console.error(error);
      setResult({ error: error.message || "Error al procesar el archivo" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
      >
        <ArrowPathRoundedSquareIcon className="h-4 w-4 text-white" />
        Actualizar Estatus
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-zinc-900 border border-border">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground flex justify-between items-center"
                  >
                    Actualizar Estatus Masivo
                    <button
                      onClick={closeModal}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </Dialog.Title>

                  <div className="mt-4 space-y-4">
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      <p className="font-medium mb-1">Instrucciones:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          Sube un Excel con las columnas:{" "}
                          <strong>no_poliza</strong> y{" "}
                          <strong>estatus</strong>.
                        </li>
                        <li>
                          El contenido de <strong>estatus</strong> define la actualización.
                        </li>
                        <li>
                          Si dice <strong>"FOLIO COMPLETO"</strong> &rarr;
                          Se guarda como <strong>COLOCADA</strong>.
                        </li>
                        <li>
                          VALORES VÁLIDOS: <strong>PENDIENTE, COLOCADA, REEXPEDIDA, CANCELADA</strong>.
                        </li>
                      </ul>
                    </div>

                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => {
                          setFile(e.target.files[0]);
                          setResult(null);
                        }}
                        className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>

                    {result && (
                      <div
                        className={`p-3 rounded-md text-sm border ${result.success
                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                          }`}
                      >
                        {result.error ? (
                          <p className="font-semibold">Error: {result.error}</p>
                        ) : (
                          <div>
                            <p className="font-semibold">Proceso completado</p>
                            <p>Actualizados: {result.updated}</p>
                            {/* <p>No encontrados: {result.notFound}</p> - API ya no devuelve notFound detallado en bulk */}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!file || loading}
                        className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? (
                          <>
                            <ArrowPathRoundedSquareIcon className="h-4 w-4 animate-spin" />
                            Procesando {progress}%
                          </>
                        ) : (
                          <>
                            <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                            Actualizar Datos
                          </>
                        )}
                      </button>

                      {loading && (
                        <div className="w-full bg-secondary/20 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
