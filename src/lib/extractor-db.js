// Wrapper para query que siempre usa la DB del extractor
import { query as dbQuery, isExtractorDbConfigured } from "@/lib/db";

export { isExtractorDbConfigured };

export async function query(text, params) {
  return dbQuery(text, params, true); // Siempre usar DB extractor
}
