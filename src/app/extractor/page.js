"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_PDF_API_URL || "http://localhost:8000";

export default function ExtractorPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  const [formData, setFormData] = useState({});
  const [asesores, setAsesores] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [selectedAsesor, setSelectedAsesor] = useState("");
  const [selectedGerencia, setSelectedGerencia] = useState("");
  const [quincenaYear, setQuincenaYear] = useState("2026");

  // Cargar plantillas, asesores y gerentes al montar el componente
  useEffect(() => {
    loadTemplates();
    loadAsesores();
    loadGerentes();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/templates`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(
        "Error al cargar plantillas. ¿Está el servidor API ejecutándose?"
      );
      console.error(err);
    }
  };

  const loadAsesores = async () => {
    try {
      const response = await fetch("/api/asesores-list");
      const data = await response.json();
      if (data.success) {
        setAsesores(data.asesores || []);
      }
    } catch (err) {
      console.error("Error al cargar asesores:", err);
    }
  };

  const loadGerentes = async () => {
    try {
      const response = await fetch("/api/gerentes-list");
      const data = await response.json();
      if (data.success) {
        setGerentes(data.gerentes || []);
      }
    } catch (err) {
      console.error("Error al cargar gerentes:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError("");
    } else {
      setError("Por favor selecciona un archivo PDF válido");
      setPdfFile(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedTemplate) {
      setError("Por favor selecciona una plantilla");
      return;
    }
    if (!pdfFile) {
      setError("Por favor selecciona un archivo PDF");
      return;
    }

    setLoading(true);
    setError("");

    const formDataToSend = new FormData();
    formDataToSend.append("file", pdfFile);
    formDataToSend.append("template_name", selectedTemplate);

    try {
      const response = await fetch(`${API_URL}/extract`, {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al procesar el PDF");
      }

      const data = await response.json();
      setExtractedData(data);

      // Inicializar formData con los valores extraídos
      const initialFormData = {};
      const camposFechaList = [
        "fecha_desde",
        "fecha_hasta",
        "fecha_emision",
        "fecha_ingreso_digital",
      ];
      Object.entries(data.data).forEach(([field, fieldData]) => {
        if (fieldData.mapped && !fieldData.value.startsWith("⚠️")) {
          // Parsear primas a número si son campos de prima
          if (field === "prima_neta" || field === "prima_total") {
            initialFormData[field] = parsePrima(fieldData.value);
          } else if (camposFechaList.includes(field)) {
            // Convertir fechas a formato YYYY-MM-DD para input date
            initialFormData[field] = convertirFechaParaInput(fieldData.value);
          } else {
            initialFormData[field] = fieldData.value;
          }
        } else {
          // Si el campo es documentos_faltantes y no se extrajo nada, poner "FALTAN DOCUMENTOS"
          if (field === "documentos_faltantes") {
            initialFormData[field] = "FALTAN DOCUMENTOS";
          } else {
            initialFormData[field] = "";
          }
        }
      });
      setFormData(initialFormData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Función para parsear primas (eliminar comas y convertir a número)
  const parsePrima = (value) => {
    if (!value || value.startsWith("⚠️")) return "";
    // Eliminar espacios, comas y símbolos de moneda
    const cleanValue = value.replace(/[$,\s]/g, "");
    // Verificar si es un número válido
    const numero = parseFloat(cleanValue);
    return isNaN(numero) ? value : numero.toString();
  };

  // Función para convertir fecha de DD/MM/YYYY a YYYY-MM-DD (formato input date)
  const convertirFechaParaInput = (fecha) => {
    if (!fecha || fecha.startsWith("⚠️")) return "";
    // Si ya está en formato ISO (YYYY-MM-DD), retornarla
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    // Convertir de DD/MM/YYYY a YYYY-MM-DD
    const partes = fecha.split("/");
    if (partes.length === 3) {
      const [dia, mes, año] = partes;
      return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }
    return "";
  };

  // Lista de campos de fecha
  const camposFecha = [
    "fecha_desde",
    "fecha_hasta",
    "fecha_emision",
    "fecha_ingreso_digital",
    "fecha_ingreso_fisico",
  ];

  const handleSave = async () => {
    // Validación básica
    if (!selectedAsesor) {
      alert("⚠️ Por favor selecciona un asesor");
      return;
    }
    if (!selectedGerencia) {
      alert("⚠️ Por favor selecciona una gerencia");
      return;
    }
    if (!formData.numero_poliza) {
      alert("⚠️ El número de póliza es requerido");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Preparar datos para enviar
      const datosCompletos = {
        ...formData,
        // Combinar quincena con año si existe
        quincena: formData.quincena ? `${formData.quincena} ${quincenaYear}` : "",
        asesor_id: selectedAsesor,
        gerencia: selectedGerencia,
        aseguradora: selectedTemplate.split(" ")[0], // Primera palabra de la plantilla
      };

      // Enviar a la API
      const response = await fetch("/api/polizas/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosCompletos),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `✅ Póliza guardada exitosamente\n\nID Póliza: ${
            result.data.id_poliza
          }\nAsegurado: ${formData.nombre_asegurado || "N/A"}\nPóliza: ${
            formData.numero_poliza
          }`
        );
        // Resetear formulario después de guardar
        handleReset();
      } else {
        setError(result.error || "Error al guardar la póliza");
        alert(`❌ Error al guardar: ${result.error}`);
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      setError("Error al conectar con el servidor");
      alert(`❌ Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setExtractedData(null);
    setFormData({});
    setPdfFile(null);
    setSelectedTemplate("");
    setSelectedAsesor("");
    setSelectedGerencia("");
    setQuincenaYear("2026");
    setError("");
  };

  // Lista de ubicaciones (estados)
  const ubicaciones = [
    { codigo: "01", nombre: "AGUASCALIENTES" },
    { codigo: "02", nombre: "BAJA CALIFORNIA" },
    { codigo: "03", nombre: "BAJA CALIFORNIA SUR" },
    { codigo: "04", nombre: "CAMPECHE" },
    { codigo: "05", nombre: "COAHUILA" },
    { codigo: "06", nombre: "COLIMA" },
    { codigo: "07", nombre: "CHIAPAS" },
    { codigo: "08", nombre: "CHIHUAHUA" },
    { codigo: "09", nombre: "OFICINAS CENTRALES" },
    { codigo: "10", nombre: "DURANGO" },
    { codigo: "11", nombre: "GUANAJUATO" },
    { codigo: "12", nombre: "GUERRERO" },
    { codigo: "13", nombre: "HIDALGO" },
    { codigo: "14", nombre: "JALISCO" },
    { codigo: "15", nombre: "EDOMEX ORIENTE" },
    { codigo: "16", nombre: "EDOMEX PONIENTE" },
    { codigo: "17", nombre: "MICHOACAN" },
    { codigo: "18", nombre: "MORELOS" },
    { codigo: "19", nombre: "NAYARIT" },
    { codigo: "20", nombre: "NUEVO LEON" },
    { codigo: "21", nombre: "OAXACA" },
    { codigo: "22", nombre: "PUEBLA" },
    { codigo: "23", nombre: "QUERETARO" },
    { codigo: "24", nombre: "QUINTANA ROO" },
    { codigo: "25", nombre: "SAN LUIS POTOSI" },
    { codigo: "26", nombre: "SINALOA" },
    { codigo: "27", nombre: "SONORA" },
    { codigo: "28", nombre: "TABASCO" },
    { codigo: "29", nombre: "TAMAULIPAS" },
    { codigo: "30", nombre: "TLAXCALA" },
    { codigo: "31", nombre: "VARACRUZ NORTE" },
    { codigo: "32", nombre: "VERACRUZ SUR" },
    { codigo: "33", nombre: "YUCATAN" },
    { codigo: "34", nombre: "ZACATECAS" },
    { codigo: "35", nombre: "1 NOROESTE DF" },
    { codigo: "36", nombre: "2 NORESTE DF" },
    { codigo: "37", nombre: "3 SUROESTE DF" },
    { codigo: "38", nombre: "4 SURESTE DF" },
  ];

  // Organización de campos por categorías
  const categories = {
    "Información de la Póliza": [
      "numero_poliza",
      "numero_folio",
      "tipo_solicitud",
      "fecha_desde",
      "fecha_hasta",
      "fecha_emision",
      "prima_neta",
      "prima_total",
      "forma_pago",
      "pago_mixto",
    ],
    "Información del Asegurado": [
      "nombre_asegurado",
      "rfc",
      "direccion",
      "telefono",
      "ubicacion",
      "numero_empleado",
      "tipo_trabajador",
    ],
    "Información del Vehículo": [
      "descripcion_unidad",
      "numero_serie",
      "numero_motor",
      "placas",
      "modelo",
      "tipo_vehiculo",
    ],
    "Control y Administración": [
      "fecha_ingreso_digital",
      "fecha_ingreso_fisico",
      "quincena",
      "documentos_faltantes",
    ],
  };

  const formatFieldName = (field) => {
    return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold mb-2">📄 Lector de pólizas</h1>
          <p className="text-blue-100 text-lg">
            Sistema de Extracción Automática de Datos de Pólizas
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
            <p className="font-semibold">❌ Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Upload Section */}
        {!extractedData && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📤 Cargar PDF
            </h2>

            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🎨 Selecciona la Plantilla
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={loading}
                >
                  <option value="">Selecciona una plantilla...</option>
                  {templates.map((template) => (
                    <option key={template} value={template}>
                      {template}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📁 Selecciona el archivo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={loading}
                />
                {pdfFile && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {pdfFile.name}
                  </p>
                )}
              </div>

              {/* Extract Button */}
              <button
                onClick={handleExtract}
                disabled={loading || !selectedTemplate || !pdfFile}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Procesando PDF...
                  </span>
                ) : (
                  "🚀 Extraer Datos"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {extractedData && (
          <div className="space-y-6">
            {/* Asesor y Gerencia - Arriba */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                👤 Información de Asesor y Gerencia
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Select de Asesor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asesor *
                  </label>
                  <select
                    value={selectedAsesor}
                    onChange={(e) => setSelectedAsesor(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Selecciona un asesor...</option>
                    {asesores.map((asesor) => (
                      <option key={asesor.id} value={asesor.id}>
                        {asesor.nombre} - {asesor.clave}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select de Gerencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gerencia *
                  </label>
                  <select
                    value={selectedGerencia}
                    onChange={(e) => setSelectedGerencia(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Selecciona una gerencia...</option>
                    {gerentes.map((gerente) => (
                      <option key={gerente.id} value={gerente.nombre}>
                        {gerente.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Sección Control y Administración - Debajo de Asesor y Gerencia */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                📋 Control y Administración
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories["Control y Administración"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formatFieldName(field)}
                    </label>
                    {field === "quincena" ? (
                      <div className="flex gap-2">
                        <select
                          value={formData[field] || ""}
                          onChange={(e) =>
                            handleInputChange(field, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        >
                          <option value="">Selecciona una quincena...</option>
                          <option value="1RA ENERO">1RA ENERO</option>
                          <option value="2DA ENERO">2DA ENERO</option>
                          <option value="1RA FEBRERO">1RA FEBRERO</option>
                          <option value="2DA FEBRERO">2DA FEBRERO</option>
                          <option value="1RA MARZO">1RA MARZO</option>
                          <option value="2DA MARZO">2DA MARZO</option>
                          <option value="1RA ABRIL">1RA ABRIL</option>
                          <option value="2DA ABRIL">2DA ABRIL</option>
                          <option value="1RA MAYO">1RA MAYO</option>
                          <option value="2DA MAYO">2DA MAYO</option>
                          <option value="1RA JUNIO">1RA JUNIO</option>
                          <option value="2DA JUNIO">2DA JUNIO</option>
                          <option value="1RA JULIO">1RA JULIO</option>
                          <option value="2DA JULIO">2DA JULIO</option>
                          <option value="1RA AGOSTO">1RA AGOSTO</option>
                          <option value="2DA AGOSTO">2DA AGOSTO</option>
                          <option value="1RA SEPTIEMBRE">1RA SEPTIEMBRE</option>
                          <option value="2DA SEPTIEMBRE">2DA SEPTIEMBRE</option>
                          <option value="1RA OCTUBRE">1RA OCTUBRE</option>
                          <option value="2DA OCTUBRE">2DA OCTUBRE</option>
                          <option value="1RA NOVIEMBRE">1RA NOVIEMBRE</option>
                          <option value="2DA NOVIEMBRE">2DA NOVIEMBRE</option>
                          <option value="1RA DICIEMBRE">1RA DICIEMBRE</option>
                          <option value="2DA DICIEMBRE">2DA DICIEMBRE</option>
                        </select>
                        <input
                          type="number"
                          value={quincenaYear}
                          onChange={(e) => setQuincenaYear(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          placeholder="Año"
                          min="2020"
                          max="2099"
                        />
                      </div>
                    ) : camposFecha.includes(field) ? (
                      <input
                        type="date"
                        value={formData[field] || ""}
                        onChange={(e) =>
                          handleInputChange(field, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[field] || ""}
                        onChange={(e) =>
                          handleInputChange(field, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder={
                          extractedData.data[field]?.mapped
                            ? ""
                            : "No mapeado en plantilla"
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form - Resto de las secciones */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                ✏️ Datos Extraídos (Editables)
              </h2>

              <div className="space-y-8">
                {Object.entries(categories)
                  .filter(
                    ([categoryName]) =>
                      categoryName !== "Control y Administración"
                  )
                  .map(([categoryName, fields]) => (
                    <div
                      key={categoryName}
                      className="border-l-4 border-blue-500 pl-4"
                    >
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {categoryName}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields
                          .filter((field) => {
                            // Mostrar pago_mixto solo si forma_pago es DXN
                            if (field === "pago_mixto") {
                              return formData.forma_pago === "DXN";
                            }
                            return true;
                          })
                          .map((field) => (
                            <div key={field}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {formatFieldName(field)}
                              </label>
                              {field === "ubicacion" ? (
                                <select
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                  <option value="">
                                    Selecciona una ubicación...
                                  </option>
                                  {ubicaciones.map((ubicacion) => (
                                    <option
                                      key={ubicacion.codigo}
                                      value={`${ubicacion.codigo} ${ubicacion.nombre}`}
                                    >
                                      {ubicacion.codigo} {ubicacion.nombre}
                                    </option>
                                  ))}
                                </select>
                              ) : field === "tipo_solicitud" ? (
                                <select
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                  <option value="">
                                    Selecciona un tipo...
                                  </option>
                                  <option value="NUEVA">NUEVA</option>
                                  <option value="RENOVACION">RENOVACION</option>
                                </select>
                              ) : field === "forma_pago" ? (
                                <select
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                  <option value="">
                                    Selecciona una forma de pago...
                                  </option>
                                  <option value="CONT">CONT</option>
                                  <option value="DOM">DOM</option>
                                  <option value="MENS">MENS</option>
                                  <option value="DXN">DXN</option>
                                </select>
                              ) : field === "quincena" ? (
                                <select
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                  <option value="">
                                    Selecciona una quincena...
                                  </option>
                                  <option value="1RA ENERO 2026">
                                    1RA ENERO 2026
                                  </option>
                                  <option value="2DA ENERO 2026">
                                    2DA ENERO 2026
                                  </option>
                                  <option value="1RA FEBRERO 2026">
                                    1RA FEBRERO 2026
                                  </option>
                                  <option value="2DA FEBRERO 2026">
                                    2DA FEBRERO 2026
                                  </option>
                                  <option value="1RA MARZO 2026">
                                    1RA MARZO 2026
                                  </option>
                                  <option value="2DA MARZO 2026">
                                    2DA MARZO 2026
                                  </option>
                                  <option value="1RA ABRIL 2026">
                                    1RA ABRIL 2026
                                  </option>
                                  <option value="2DA ABRIL 2026">
                                    2DA ABRIL 2026
                                  </option>
                                  <option value="1RA MAYO 2026">
                                    1RA MAYO 2026
                                  </option>
                                  <option value="2DA MAYO 2026">
                                    2DA MAYO 2026
                                  </option>
                                  <option value="1RA JUNIO 2026">
                                    1RA JUNIO 2026
                                  </option>
                                  <option value="2DA JUNIO 2026">
                                    2DA JUNIO 2026
                                  </option>
                                  <option value="1RA JULIO 2026">
                                    1RA JULIO 2026
                                  </option>
                                  <option value="2DA JULIO 2026">
                                    2DA JULIO 2026
                                  </option>
                                  <option value="1RA AGOSTO 2026">
                                    1RA AGOSTO 2026
                                  </option>
                                  <option value="2DA AGOSTO 2026">
                                    2DA AGOSTO 2026
                                  </option>
                                  <option value="1RA SEPTIEMBRE 2026">
                                    1RA SEPTIEMBRE 2026
                                  </option>
                                  <option value="2DA SEPTIEMBRE 2026">
                                    2DA SEPTIEMBRE 2026
                                  </option>
                                  <option value="1RA OCTUBRE 2026">
                                    1RA OCTUBRE 2026
                                  </option>
                                  <option value="2DA OCTUBRE 2026">
                                    2DA OCTUBRE 2026
                                  </option>
                                  <option value="1RA NOVIEMBRE 2026">
                                    1RA NOVIEMBRE 2026
                                  </option>
                                  <option value="2DA NOVIEMBRE 2026">
                                    2DA NOVIEMBRE 2026
                                  </option>
                                  <option value="1RA DICIEMBRE 2026">
                                    1RA DICIEMBRE 2026
                                  </option>
                                  <option value="2DA DICIEMBRE 2026">
                                    2DA DICIEMBRE
                                  </option>
                                </select>
                              ) : field === "tipo_trabajador" ? (
                                <select
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                  <option value="">
                                    Selecciona un tipo...
                                  </option>
                                  <option value="166">166 - ACTIVOS</option>
                                  <option value="366">366 - JUBILADOS</option>
                                </select>
                              ) : camposFecha.includes(field) ? (
                                <input
                                  type="date"
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={formData[field] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field, e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                  placeholder={
                                    extractedData.data[field]?.mapped
                                      ? ""
                                      : "No mapeado en plantilla"
                                  }
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  💾 Guardar Datos
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  🔄 Nueva Extracción
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
