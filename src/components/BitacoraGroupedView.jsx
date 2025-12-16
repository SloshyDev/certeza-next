"use client";
import { useMemo, useState, useEffect } from "react";
import BitacoraTable from "@/components/tables/BitacoraTable";

const TIPO_OPTIONS = [
  "EMISION",
  "COTIZACION",
  "CANCELACION",
  "ENDOSO",
  "REEXPEDICION",
  "OTRO",
];

export default function BitacoraGroupedView({ data }) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState(Array.isArray(data) ? data : []);
  const [extra, setExtra] = useState([]);
  const [searchId, setSearchId] = useState("");
  const [searchAsunto, setSearchAsunto] = useState("");
  const [filterAsesor, setFilterAsesor] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setRows(Array.isArray(data) ? data : []);
  }, [data]);

  const asesorOptions = useMemo(() => {
    const s = new Set();
    for (const r of rows) if (r.asesor) s.add(r.asesor);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const estatusOptions = useMemo(() => {
    const s = new Set();
    for (const r of rows) if (r.estatus) s.add(r.estatus);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const allRows = useMemo(() => {
    const byId = new Map();
    for (const r of rows) byId.set(r.id, r);
    for (const r of extra) byId.set(r.id, r);
    return Array.from(byId.values());
  }, [rows, extra]);

  const filtered = useMemo(() => {
    const sid = searchId.trim();
    const sas = searchAsunto.trim().toLowerCase();
    return allRows.filter((r) => {
      if (sid && !String(r.id).includes(sid)) return false;
      if (sas && !String(r.asunto || "").toLowerCase().includes(sas)) return false;
      if (filterAsesor && String(r.asesor || "") !== filterAsesor) return false;
      if (filterTipo && String(r.tipo || "") !== filterTipo) return false;
      if (filterEstatus && String(r.estatus || "") !== filterEstatus) return false;
      return true;
    });
  }, [allRows, searchId, searchAsunto, filterAsesor, filterTipo, filterEstatus]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const key = r.emisor || "(vacío)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(r);
    }
    return m;
  }, [filtered]);
  const groupKeys = useMemo(() => Array.from(groups.keys()).sort((a, b) => a.localeCompare(b)), [groups]);

  function clearFilters() {
    setSearchId("");
    setSearchAsunto("");
    setFilterAsesor("");
    setFilterTipo("");
    setFilterEstatus("");
  }

  useEffect(() => {
    const sid = searchId.trim();
    const sas = searchAsunto.trim();
    if (!sid && !sas) {
      setExtra([]);
      return;
    }
    const url = new URL(window.location.origin + "/api/bitacora/search");
    if (sid) url.searchParams.set("id", sid);
    if (sas) url.searchParams.set("asunto", sas);
    fetch(url.toString())
      .then((r) => r.json())
      .then((rows) => setExtra(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [searchId, searchAsunto]);

  if (!mounted) return null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Buscar por ID</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="Ej. 123"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Buscar por asunto</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="Texto en asunto"
            value={searchAsunto}
            onChange={(e) => setSearchAsunto(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Asesor</label>
          <select
            className="border rounded px-2 py-1"
            value={filterAsesor}
            onChange={(e) => setFilterAsesor(e.target.value)}
          >
            <option value="">Todos</option>
            {asesorOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Tipo</label>
          <select
            className="border rounded px-2 py-1"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {TIPO_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Estatus</label>
          <select
            className="border rounded px-2 py-1"
            value={filterEstatus}
            onChange={(e) => setFilterEstatus(e.target.value)}
          >
            <option value="">Todos</option>
            {estatusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button className="border rounded px-3 py-1 bg-gray-100" onClick={clearFilters}>Limpiar</button>
      </div>
      <div className="space-y-8">
        {groupKeys.map((key) => (
          <div key={key} className="space-y-2">
            <h2 className="text-lg font-semibold">Emisor: {key}</h2>
            <BitacoraTable data={groups.get(key)} showEmisor={false} />
          </div>
        ))}
        {groupKeys.length === 0 ? (
          <p className="opacity-70">Sin resultados con los filtros/búsquedas aplicados.</p>
        ) : null}
      </div>
    </div>
  );
}
