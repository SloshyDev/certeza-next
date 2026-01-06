// Wrapper para query que siempre usa la DB del extractor
import { query as dbQuery } from "@/lib/db";

export async function query(text, params) {
  return dbQuery(text, params, true); // Siempre usar DB extractor
}
