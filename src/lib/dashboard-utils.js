
export function normalizeDate(val, fallback) {
    const v = Array.isArray(val) ? val[0] : val;
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
        ? v
        : fallback;
}

export function getDateRange(searchParams) {
    const today = new Date().toISOString().slice(0, 10);
    const defaultStart = today;

    const rawStart = searchParams?.start;
    const rawEnd = searchParams?.end;

    let start = normalizeDate(rawStart, defaultStart);
    let end = normalizeDate(rawEnd, today);

    if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
    }

    return { start, end, isSingleDay: start === end };
}

export function getSelectedTypes(searchParams) {
    const rawTipos = searchParams?.tipo;
    const tiposArray = Array.isArray(rawTipos)
        ? rawTipos
        : rawTipos
            ? [rawTipos]
            : [];
    return new Set(tiposArray.map((t) => String(t).toUpperCase()));
}

export function filterBySelectedTypes(data, selectedTipos) {
    if (selectedTipos.size === 0) return data;
    return data.filter(
        (r) => !selectedTipos.has(String(r.tipo || "").toUpperCase())
    );
}
