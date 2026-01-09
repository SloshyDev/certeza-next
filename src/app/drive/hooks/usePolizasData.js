import { useState, useCallback } from "react";

export function usePolizasData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPolizas = useCallback(async (paramsOrString) => {
    setLoading(true);
    setError("");

    try {
      // paramsOrString puede ser un objeto URLSearchParams o un string
      const queryString = paramsOrString.toString();
      const response = await fetch(`/api/polizas/list?${queryString}`);
      const result = await response.json();

      if (result.success) {
        setData(result.polizas || []);
      } else {
        setError(result.error || "Error al cargar pólizas");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePoliza = useCallback(async (id_poliza, numero_poliza) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar la póliza ${numero_poliza}?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return { success: false, cancelled: true };
    }

    try {
      const response = await fetch(`/api/polizas/delete?id=${id_poliza}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchPolizas,
    deletePoliza,
  };
}
