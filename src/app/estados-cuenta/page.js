"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UploadEstadosCuentaButton from "@/components/UploadEstadosCuentaButton";

export default function EstadosCuentaPage() {
  const router = useRouter();
  const [cortes, setCortes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCortes();
  }, []);

  const fetchCortes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/estados-cuenta");
      const data = await response.json();

      if (data.ok) {
        setCortes(data.cortes || []);
      }
    } catch (error) {
      console.error("Error al cargar cortes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (corteId) => {
    router.push(`/estados-cuenta/${corteId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Estados de Cuenta
              </h1>
              <p className="text-sm text-muted">
                Cortes históricos de comisiones pagadas por quincena
              </p>
            </div>
            <UploadEstadosCuentaButton onUploadSuccess={fetchCortes} />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        )}

        {/* Lista de Cortes */}
        {!loading && cortes.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border p-8 text-center">
            <p className="text-muted text-lg">
              No hay estados de cuenta cargados
            </p>
            <p className="text-sm text-muted mt-2">
              Usa el botón "Cargar Estado de Cuenta" para subir un corte
            </p>
          </div>
        )}

        {!loading && cortes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cortes.map((corte) => (
              <div
                key={corte.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleVerDetalle(corte.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {corte.nombre_quincena}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                    {corte.num_asesores} asesores
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Total Comisiones:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${parseFloat(corte.total_comisiones || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Fecha de Corte:</span>
                    <span className="text-foreground">
                      {new Date(corte.fecha_corte).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <button className="text-sm text-primary hover:text-primary/80 font-medium">
                    Ver Detalles →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
