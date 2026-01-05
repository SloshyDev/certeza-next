
import { getRenovacionesMeses } from "./src/lib/renovaciones.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function verifySort() {
    const months = await getRenovacionesMeses();
    console.log("Sorted months from LIB:", months);
}

verifySort();
