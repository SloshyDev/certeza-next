
import { query } from "./src/lib/db.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function checkMonths() {
    try {
        const res = await query("SELECT DISTINCT mes FROM renovaciones");
        console.log("Raw months in DB:", res.rows.map(r => r.mes));
    } catch (e) {
        console.error(e);
    }
}

checkMonths();
