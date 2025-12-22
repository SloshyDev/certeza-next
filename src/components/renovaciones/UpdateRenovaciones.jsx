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

      // Identificar columnas
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      const keyPoliza = keys.find((k) => k.toUpperCase().includes("POLIZA"));
      const keyDocs = keys.find(
        (k) =>
          k.toUpperCase().includes("DOCUMENTOS") ||
          k.toUpperCase().includes("FALTANTES")
      );

      if (!keyPoliza) {
        throw new Error(
          "No se encontró la columna de Póliza (ej. 'NO DE POLIZA')"
        );
      }

      // Preparar datos limpios
      const cleanUpdates = [];
      for (const row of data) {
        const polizaRaw = row[keyPoliza];
        if (!polizaRaw) continue;

        const poliza = String(polizaRaw).trim();
        const docsRaw = keyDocs ? row[keyDocs] : null;

        // Lógica de negocio (Client-side)
        let nuevoEstatus = "PENDIENTE";
        let docsVal = docsRaw ? String(docsRaw).trim() : "";

        if (
          !docsVal ||
          docsVal === "" ||
          docsVal === "-" ||
          docsVal === "0" ||
          docsVal.toUpperCase() === "NINGUNO"
        ) {
          nuevoEstatus = "PENDIENTE";
        } else {
          const docsUpper = docsVal.toUpperCase();
          if (
            docsUpper.includes("RECHAZO PARITARIA") ||
            docsUpper.includes("FALTAN DOCUMENTOS")
          ) {
            nuevoEstatus = "PENDIENTE";
          } else if (docsUpper.includes("FOLIO COMPLETO")) {
            nuevoEstatus = "COLOCADA";
          } else if (docsUpper.includes("CANCEL")) {
            nuevoEstatus = "CANCELADA";
          } else if (docsUpper.includes("REEXPED")) {
            nuevoEstatus = "REEXPEDIDA";
          } else {
            nuevoEstatus = docsVal;
          }
        }
        cleanUpdates.push({ poliza, estatus: nuevoEstatus });
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
                          <strong>NO DE POLIZA</strong> y{" "}
                          <strong>DOCUMENTOS FALTANTES</strong>.
                        </li>
                        <li>
                          El contenido de <strong>DOCUMENTOS FALTANTES</strong>{" "}
                          se usará para definir el estatus.
                        </li>
                        <li>
                          Si está vacío &rarr; Estatus{" "}
                          <strong>PENDIENTE</strong>.
                        </li>
                        <li>
                          "RECHAZO PARITARIA" o "FALTAN DOCUMENTOS" &rarr;
                          Estatus <strong>PENDIENTE</strong>.
                        </li>
                        <li>
                          "FOLIO COMPLETO" &rarr; Estatus{" "}
                          <strong>COLOCADA</strong>.
                        </li>
                        <li>
                          "CANCEL..." &rarr; Estatus <strong>CANCELADA</strong>.
                        </li>
                        <li>
                          "REEXPED..." &rarr; Estatus{" "}
                          <strong>REEXPEDIDA</strong>.
                        </li>
                        <li>Otros valores se guardan tal cual como estatus.</li>
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
                        className={`p-3 rounded-md text-sm border ${
                          result.success
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
