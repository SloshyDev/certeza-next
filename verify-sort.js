
import { query } from "./src/lib/db.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function verifySort() {
    const res = await query(`SELECT DISTINCT mes FROM renovaciones`);
    const months = res.rows.map((r) => r.mes).filter(Boolean);

    const monthMap = {
        ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
        JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11
    };

    const sorted = months.sort((a, b) => {
        // Parse "MES AÑO" e.g. "ENERO 2025"
        const [ma, ya] = a.trim().toUpperCase().split(/\s+/);
        const [mb, yb] = b.trim().toUpperCase().split(/\s+/);

        const yearA = parseInt(ya) || 0;
        const yearB = parseInt(yb) || 0;

        if (yearA !== yearB) {
            return yearB - yearA; // Newest year first
        }

        // Same year, check month
        const idxA = monthMap[ma] ?? -1;
        const idxB = monthMap[mb] ?? -1;

        return idxB - idxA; // Newest month first
    });

    console.log("Sorted months:", sorted);
}

verifySort();
