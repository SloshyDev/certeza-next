import { useState, useEffect, useCallback } from "react";

export function usePolizasFilters() {
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsesor, setSelectedAsesor] = useState("");
  const [selectedGerente, setSelectedGerente] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Listas para filtros
  const [asesores, setAsesores] = useState([]);
  const [gerentes, setGerentes] = useState([]);

  const loadAsesores = useCallback(async () => {
    try {
      const response = await fetch("/api/asesores-list");
      const data = await response.json();
      if (data.success) {
        setAsesores(data.asesores || []);
      }
    } catch (err) {
      console.error("Error al cargar asesores:", err);
    }
  }, []);

  const loadGerentes = useCallback(async () => {
    try {
      const response = await fetch("/api/gerentes-list");
      const data = await response.json();
      if (data.success) {
        setGerentes(data.gerentes || []);
      }
    } catch (err) {
      console.error("Error al cargar gerentes:", err);
    }
  }, []);

  // Cargar listas al montar
  useEffect(() => {
    loadAsesores();
    loadGerentes();
  }, [loadAsesores, loadGerentes]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedAsesor("");
    setSelectedGerente("");
    setSelectedEstado("");
    setFechaDesde("");
    setFechaHasta("");
  }, []);

  const getFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("search", searchTerm);
    if (selectedAsesor) params.append("asesor", selectedAsesor);
    if (selectedGerente) params.append("gerente", selectedGerente);
    if (selectedEstado) params.append("estado", selectedEstado);
    if (fechaDesde) params.append("fechaDesde", fechaDesde);
    if (fechaHasta) params.append("fechaHasta", fechaHasta);
    return params;
  }, [
    searchTerm,
    selectedAsesor,
    selectedGerente,
    selectedEstado,
    fechaDesde,
    fechaHasta,
  ]);

  return {
    // Estados
    searchTerm,
    setSearchTerm,
    selectedAsesor,
    setSelectedAsesor,
    selectedGerente,
    setSelectedGerente,
    selectedEstado,
    setSelectedEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    
    // Listas
    asesores,
    gerentes,

    // Acciones
    clearFilters,
    getFilterParams,
  };
}
