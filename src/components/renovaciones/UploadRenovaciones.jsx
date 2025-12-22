"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function UploadRenovaciones() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const router = useRouter();

  function closeModal() {
    setIsOpen(false);
    setResult(null);
    setFile(null);
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
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/renovaciones/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
      if (data.success) {
        setFile(null); // Limpiar archivo tras éxito
      }
    } catch (error) {
      console.error(error);
      setResult({ error: "Error de conexión con el servidor" });
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
        <ArrowUpTrayIcon className="h-4 w-4 text-white" />
        Importar Excel
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
                    Importar Renovaciones
                    <button
                      onClick={closeModal}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </Dialog.Title>

                  <div className="mt-4 space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Sube un archivo Excel (.xlsx) con los registros a
                        importar.
                      </p>
                      <p className="mt-1">
                        Asegúrate de usar la plantilla correcta para evitar
                        errores.
                      </p>
                    </div>

                    <a
                      href="/api/renovaciones/template"
                      download
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400 font-medium"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      Descargar Plantilla
                    </a>

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
                            <p>Insertados correctamente: {result.inserted}</p>
                            <p>Errores encontrados: {result.errorCount}</p>
                            {result.errors && result.errors.length > 0 && (
                              <div className="mt-2 max-h-32 overflow-y-auto pr-1">
                                <p className="font-medium mb-1">
                                  Detalle de errores:
                                </p>
                                <ul className="list-disc list-inside text-xs space-y-0.5">
                                  {result.errors.map((e, i) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                      onClick={closeModal}
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleUpload}
                      disabled={!file || loading}
                    >
                      {loading ? "Procesando..." : "Subir Archivo"}
                    </button>
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
