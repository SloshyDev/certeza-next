"use client";

import { useMemo, useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BitacoraTable from "@/components/tables/BitacoraTable";

const TIPO_OPTIONS = [
  "EMISION",
  "COTIZACION",
  "CANCELACION",
  "ENDOSO",
  "REEXPEDICION",
  "OTRO",
];

export default function BitacoraGroupedView({
  data,
  start,
  end,
  canDelete = false,
  canCreate = false,
  canEdit = false,
}) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState(Array.isArray(data) ? data : []);
  const [extra, setExtra] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [asesores, setAsesores] = useState([]);
  const [emisores, setEmisores] = useState([]);
  const [form, setForm] = useState({
    emisor: "",
    tipo: "EMISION",
    asesor: "",
    asunto: "",
    dia_llegada: "",
    hora_llegada: "",
    fecha_asignada: "",
    hora_asignado: "",
  });
  const [searchId, setSearchId] = useState("");
  const [searchAsunto, setSearchAsunto] = useState("");
  const [filterAsesor, setFilterAsesor] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setRows(Array.isArray(data) ? data : []);
  }, [data]);

  useEffect(() => {
    function handleOpen() {
      if (!canCreate) return;
      setShowForm(true);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("open-bitacora-form", handleOpen);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("open-bitacora-form", handleOpen);
      }
    };
  }, [canCreate]);

  useEffect(() => {
    fetch("/api/asesores")
      .then((r) => r.json())
      .then((list) => setAsesores(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/emisores")
      .then((r) => r.json())
      .then((list) => setEmisores(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

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
      if (
        sas &&
        !String(r.asunto || "")
          .toLowerCase()
          .includes(sas)
      )
        return false;
      if (filterAsesor && String(r.asesor || "") !== filterAsesor) return false;
      if (filterTipo && String(r.tipo || "") !== filterTipo) return false;
      if (filterEstatus && String(r.estatus || "") !== filterEstatus)
        return false;
      return true;
    });
  }, [
    allRows,
    searchId,
    searchAsunto,
    filterAsesor,
    filterTipo,
    filterEstatus,
  ]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const key = r.emisor || "(vacío)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(r);
    }
    return m;
  }, [filtered]);
  const groupKeys = useMemo(
    () => Array.from(groups.keys()).sort((a, b) => a.localeCompare(b)),
    [groups]
  );

  async function getFirstResponses(ids) {
    try {
      const res = await fetch("/api/bitacora/first-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      const arr = Array.isArray(json?.results) ? json.results : [];
      const map = new Map(arr.map((r) => [r.id, r.first_response_iso]));
      return ids.map((id) => {
        const iso = map.get(id);
        return iso ? new Date(iso) : null;
      });
    } catch (e) {
      return ids.map(() => null);
    }
  }

  async function getFirstResponseFor(id) {
    try {
      const url = new URL(window.location.origin + "/api/bitacora/history");
      url.searchParams.set("bitacoraId", String(id));
      const res = await fetch(url.toString());
      const json = await res.json();
      const his = Array.isArray(json?.bitacora_historial)
        ? json.bitacora_historial
        : [];
      let best = null;
      for (const h of his) {
        const frn = h.fecha_respondido_nueva;
        const hrn = h.hora_respondido_nueva;
        const fra = h.fecha_respondido_anterior;
        const hra = h.hora_respondido_anterior;
        const candA =
          fra && hra ? new Date(`${fra}T${String(hra).slice(0, 5)}:00`) : null;
        const candN =
          frn && hrn ? new Date(`${frn}T${String(hrn).slice(0, 5)}:00`) : null;
        const cand =
          candA && candN ? (candA < candN ? candA : candN) : candA || candN;
        if (cand && (!best || cand < best)) best = cand;
      }
      return best;
    } catch (e) {
      return null;
    }
  }

  function toCsv(rows, headers) {
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const head = headers.map(esc).join(",");
    const body = rows.map((r) => r.map(esc).join(",")).join("\n");
    return head + "\n" + body + "\n";
  }

  async function onExport() {
    try {
      const ids = filtered.map((r) => r.id);
      const firstResponses = await getFirstResponses(ids);
      const generalAoA = [
        [
          "ID",
          "Emisor",
          "Asesor",
          "Tipo",
          "Estatus",
          "Asunto",
          "Fecha llegada",
          "Hora llegada",
          "Resp (min)",
          "Primera respuesta",
        ],
        ...filtered.map((r, idx) => [
          r.id,
          r.emisor || "",
          r.asesor || "",
          r.tipo || "",
          r.estatus || "",
          r.asunto || "",
          r.dia_llegada || "",
          r.hora_llegada || "",
          r.tiempo_respuesta_min == null ? "" : r.tiempo_respuesta_min,
          firstResponses[idx]
            ? firstResponses[idx].toISOString().slice(0, 16).replace("T", " ")
            : "",
        ]),
      ];

      const tipos = [
        "EMISION",
        "COTIZACION",
        "CANCELACION",
        "ENDOSO",
        "REEXPEDICION",
        "OTRO",
      ];
      const byEmisor = groupKeys.map((em) => {
        const rows = groups.get(em) || [];
        const counts = Object.fromEntries(tipos.map((t) => [t, 0]));
        let acc = 0,
          c = 0;
        for (const r of rows) {
          const t = String(r.tipo || "").toUpperCase();
          if (counts[t] != null) counts[t]++;
          if (typeof r.tiempo_respuesta_min === "number") {
            acc += r.tiempo_respuesta_min;
            c++;
          }
        }
        const avg = c ? Math.round((acc / c) * 100) / 100 : "";
        return [em, ...tipos.map((t) => counts[t]), avg];
      });
      const emisorAoA = [
        ["Emisor", ...tipos.map((t) => `# ${t}`), "Promedio resp (min)"],
        ...byEmisor,
      ];

      const asesoresSet = new Set(filtered.map((r) => r.asesor || ""));
      const asesorRows = Array.from(asesoresSet)
        .sort()
        .map((as) => {
          const rows = filtered.filter((r) => (r.asesor || "") === as);
          const counts = Object.fromEntries(tipos.map((t) => [t, 0]));
          for (const r of rows) {
            const t = String(r.tipo || "").toUpperCase();
            if (counts[t] != null) counts[t]++;
          }
          return [as || "(vacío)", ...tipos.map((t) => counts[t])];
        });
      const asesorAoA = [
        ["Asesor", ...tipos.map((t) => `# ${t}`)],
        ...asesorRows,
      ];

      const wb = XLSX.utils.book_new();
      const wsGeneral = XLSX.utils.aoa_to_sheet(generalAoA);
      const wsEmisor = XLSX.utils.aoa_to_sheet(emisorAoA);
      const wsAsesor = XLSX.utils.aoa_to_sheet(asesorAoA);
      XLSX.utils.book_append_sheet(wb, wsGeneral, "General");
      XLSX.utils.book_append_sheet(wb, wsEmisor, "Por Emisor");
      XLSX.utils.book_append_sheet(wb, wsAsesor, "Por Asesor");
      const dateStamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `reporte-bitacora-${dateStamp}.xlsx`);
    } catch (e) {}
  }

  useEffect(() => {
    function handleExportTrigger() {
      onExport();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("bitacora-export", handleExportTrigger);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("bitacora-export", handleExportTrigger);
      }
    };
  }, [filtered, groups, groupKeys]);

  function clearFilters() {
    setSearchId("");
    setSearchAsunto("");
    setFilterAsesor("");
    setFilterTipo("");
    setFilterEstatus("");
  }

  function onExport() {
    try {
      const url = new URL(window.location.origin + "/api/bitacora/export");
      url.searchParams.set("startDate", String(start));
      url.searchParams.set("endDate", String(end));
      window.location.href = url.toString();
    } catch (_) {}
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

  useEffect(() => {
    function isTodayStr(s) {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const today = `${yyyy}-${mm}-${dd}`;
      return s === today;
    }
    const shouldPoll =
      typeof start === "string" &&
      typeof end === "string" &&
      start === end &&
      isTodayStr(end);
    let timeoutId = null;
    let aborted = false;
    async function tick() {
      if (aborted) return;
      if (document.visibilityState !== "visible") {
        timeoutId = setTimeout(tick, 60000);
        return;
      }
      try {
        setIsRefreshing(true);
        const url = new URL(window.location.origin + "/api/bitacora/list");
        url.searchParams.set("startDate", start);
        url.searchParams.set("endDate", end);
        const res = await fetch(url.toString(), { cache: "no-store" });
        const rowsNew = await res.json();
        if (Array.isArray(rowsNew)) {
          setRows(rowsNew);
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const min = String(now.getMinutes()).padStart(2, "0");
          const sec = String(now.getSeconds()).padStart(2, "0");
          setLastUpdatedAt(`${hh}:${min}:${sec}`);
        }
      } catch (_) {
      } finally {
        setIsRefreshing(false);
        timeoutId = setTimeout(tick, 45000);
      }
    }
    if (shouldPoll) {
      timeoutId = setTimeout(tick, 45000);
    }
    return () => {
      aborted = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [start, end]);

  async function submitForm(e) {
    e.preventDefault();
    if (!canCreate) return;
    try {
      const payload = {
        emisor: form.emisor.trim(),
        tipo: form.tipo,
        asesor: Number(form.asesor),
        asunto: form.asunto.trim(),
        dia_llegada: form.dia_llegada,
        hora_llegada: form.hora_llegada,
        fecha_asignada: form.fecha_asignada,
        hora_asignado: form.hora_asignado,
      };
      const res = await fetch("/api/bitacora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("create-failed");
      const row = json.row;
      setRows((prev) => [row, ...prev]);
      setShowForm(false);
      setForm({
        emisor: "",
        tipo: "EMISION",
        asesor: "",
        asunto: "",
        dia_llegada: "",
        hora_llegada: "",
        fecha_asignada: "",
        hora_asignado: "",
      });
    } catch (e) {}
  }

  if (!mounted) return null;
  return (
    <div className="space-y-6 overflow-visible">
      {showForm ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-lg overflow-visible">
              <div className="flex items-center justify-between border-b p-3">
                <h3 className="text-lg font-semibold">Nuevo registro</h3>
                <button
                  className="px-2 py-1"
                  onClick={() => setShowForm(false)}
                >
                  ✕
                </button>
              </div>
              <form
                className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                onSubmit={submitForm}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Emisor</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={form.emisor}
                    onFocus={() => {
                      const now = new Date();
                      const yyyy = String(now.getFullYear());
                      const mm = String(now.getMonth() + 1).padStart(2, "0");
                      const dd = String(now.getDate()).padStart(2, "0");
                      const hh = String(now.getHours()).padStart(2, "0");
                      const min = String(now.getMinutes()).padStart(2, "0");
                      const dateStr = `${yyyy}-${mm}-${dd}`;
                      const timeStr = `${hh}:${min}`;
                      setForm((f) => ({
                        ...f,
                        dia_llegada: f.dia_llegada || dateStr,
                        hora_llegada: f.hora_llegada || timeStr,
                        fecha_asignada: f.fecha_asignada || dateStr,
                        hora_asignado: f.hora_asignado || timeStr,
                      }));
                    }}
                    onChange={(e) =>
                      setForm({ ...form, emisor: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecciona</option>
                    {emisores.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Tipo</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  >
                    {TIPO_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Asesor</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={form.asesor}
                    onChange={(e) =>
                      setForm({ ...form, asesor: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecciona</option>
                    {asesores.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
                  <label className="text-sm">Asunto</label>
                  <input
                    className="border rounded px-2 py-1"
                    value={form.asunto}
                    onChange={(e) =>
                      setForm({ ...form, asunto: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Fecha llegada</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={form.dia_llegada}
                    onChange={(e) =>
                      setForm({ ...form, dia_llegada: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Hora llegada</label>
                  <input
                    type="time"
                    className="border rounded px-2 py-1"
                    value={form.hora_llegada}
                    onChange={(e) =>
                      setForm({ ...form, hora_llegada: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Fecha asignación</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={form.fecha_asignada}
                    onChange={(e) =>
                      setForm({ ...form, fecha_asignada: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm">Hora asignación</label>
                  <input
                    type="time"
                    className="border rounded px-2 py-1"
                    value={form.hora_asignado}
                    onChange={(e) =>
                      setForm({ ...form, hora_asignado: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex items-center gap-2">
                  <button
                    type="submit"
                    className="border rounded px-3 py-1 bg-gray-100"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="border rounded px-3 py-1"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">
            Buscar por ID
          </label>
          <input
            className="h-10 border border-border rounded-lg px-3 bg-white/10 backdrop-blur-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm w-32"
            placeholder="Ej. 123"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">
            Buscar por asunto
          </label>
          <input
            className="h-10 border border-border rounded-lg px-3 bg-white/10 backdrop-blur-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm w-48"
            placeholder="Texto en asunto"
            value={searchAsunto}
            onChange={(e) => setSearchAsunto(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">
            Asesor
          </label>
          <select
            className="h-10 border border-border rounded-lg px-3 bg-white/10 backdrop-blur-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm min-w-[140px]"
            value={filterAsesor}
            onChange={(e) => setFilterAsesor(e.target.value)}
          >
            <option value="" className="bg-background text-foreground">
              Todos
            </option>
            {asesorOptions.map((a) => (
              <option
                key={a}
                value={a}
                className="bg-background text-foreground"
              >
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">
            Tipo
          </label>
          <select
            className="h-10 border border-border rounded-lg px-3 bg-white/10 backdrop-blur-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm min-w-[140px]"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="" className="bg-background text-foreground">
              Todos
            </option>
            {TIPO_OPTIONS.map((t) => (
              <option
                key={t}
                value={t}
                className="bg-background text-foreground"
              >
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-muted-foreground">
            Estatus
          </label>
          <select
            className="h-10 border border-border rounded-lg px-3 bg-white/10 backdrop-blur-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm min-w-[140px]"
            value={filterEstatus}
            onChange={(e) => setFilterEstatus(e.target.value)}
          >
            <option value="" className="bg-background text-foreground">
              Todos
            </option>
            {estatusOptions.map((s) => (
              <option
                key={s}
                value={s}
                className="bg-background text-foreground"
              >
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          className="h-10 px-4 rounded-lg bg-muted text-white hover:bg-muted/90 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-medium"
          onClick={clearFilters}
        >
          <XMarkIcon className="h-4 w-4" />
          Limpiar
        </button>
        <button
          className="border rounded px-3 py-1 bg-gray-100"
          onClick={onExport}
        >
          Exportar
        </button>
      </div>
      <div className="fixed bottom-4 left-4 z-50">
        <span className="text-sm px-3 py-2 rounded-md border bg-black text-white shadow-md">
          {isRefreshing
            ? "Actualizando…"
            : lastUpdatedAt
            ? `Actualizado ${lastUpdatedAt}`
            : "Sin actualizaciones"}
        </span>
      </div>
      <div className="fixed bottom-16 left-4 z-50">
        <button
          className="flex items-center gap-2 rounded-md px-3 py-2 shadow-md bg-[#217346] text-white hover:bg-[#1b633e]"
          onClick={onExport}
          aria-label="Exportar Excel"
        >
          <DocumentArrowDownIcon className="h-5 w-5" aria-hidden="true" />
          Exportar
        </button>
      </div>
      <div className="space-y-8">
        {groupKeys.map((key) => (
          <div key={key} className="space-y-2">
            <h2 className="text-lg font-semibold">Emisor: {key}</h2>
            <BitacoraTable
              data={groups.get(key)}
              showEmisor={false}
              canDelete={canDelete}
              canEdit={canEdit}
            />
          </div>
        ))}
        {groupKeys.length === 0 ? (
          <p className="opacity-70">
            Sin resultados con los filtros/búsquedas aplicados.
          </p>
        ) : null}
      </div>
    </div>
  );
}
