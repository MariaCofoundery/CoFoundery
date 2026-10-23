/**
 * Abruf der Hacker-News-Suche (Algolia, offizielle oeffentliche API).
 *
 * KEINE URL KOMMT VON AUSSEN. Host und Pfad stehen hier fest, nur der
 * Suchbegriff und der Zeitpunkt werden eingesetzt - damit gibt es nichts, was
 * ein Angreifer auf eine interne Adresse umbiegen koennte (SSRF), und keinen
 * Redirect, dem man folgt. Antwortgroesse und Dauer sind begrenzt.
 *
 * Gelesen werden nur drei Felder: Kennung, Titel, Datum. Der Text des
 * Beitrags und die Namen der Verfasser:innen werden weder gespeichert noch
 * weitergereicht.
 */
export const HN_API_ORIGIN = "https://hn.algolia.com";
export const HN_MAX_RESPONSE_BYTES = 512 * 1024;
export const HN_TIMEOUT_MS = 8000;
export const HN_HITS_PER_QUERY = 20;

export type HnItem = { item_id: string; title: string; source_date: string | null };
export type CollectorFailure = "http_error" | "format_error" | "timeout";
export class CollectorError extends Error {
  code: CollectorFailure;
  constructor(code: CollectorFailure) {
    super(code);
    this.code = code;
  }
}

export function hnSearchUrl(query: string, nowSeconds: number, windowDays = 8) {
  const params = new URLSearchParams({
    query,
    tags: "ask_hn",
    numericFilters: `created_at_i>${Math.floor(nowSeconds - windowDays * 86400)}`,
    hitsPerPage: String(HN_HITS_PER_QUERY),
  });
  return `${HN_API_ORIGIN}/api/v1/search_by_date?${params.toString()}`;
}

/** Nur das, was wir brauchen; alles Unerwartete ist ein Formatfehler, kein Raten. */
export function parseHnResponse(json: unknown): HnItem[] {
  const hits = (json as { hits?: unknown } | null)?.hits;
  if (!Array.isArray(hits)) throw new CollectorError("format_error");
  const items: HnItem[] = [];
  for (const hit of hits) {
    if (typeof hit !== "object" || hit === null) throw new CollectorError("format_error");
    const { objectID, title, created_at_i: createdAt } = hit as Record<string, unknown>;
    if (typeof objectID !== "string" || !/^[0-9]{1,12}$/.test(objectID)) throw new CollectorError("format_error");
    if (typeof title !== "string" || !title.trim()) continue;
    items.push({
      item_id: objectID,
      title: title.trim().slice(0, 200),
      source_date: typeof createdAt === "number" && Number.isFinite(createdAt) ? new Date(createdAt * 1000).toISOString().slice(0, 10) : null,
    });
  }
  return items;
}

/** Liest hoechstens `maxBytes` - eine groessere Antwort ist ein Fehler, kein Speicherproblem. */
export async function readLimited(response: Response, maxBytes = HN_MAX_RESPONSE_BYTES) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new CollectorError("format_error");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new CollectorError("format_error"); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchHnItems(query: string, nowSeconds: number, fetchImpl: typeof fetch = fetch): Promise<HnItem[]> {
  let response: Response;
  try {
    response = await fetchImpl(hnSearchUrl(query, nowSeconds), {
      method: "GET",
      // Einem Redirect folgen wir nicht: er koennte auf eine andere Adresse zeigen.
      redirect: "error",
      headers: { accept: "application/json", "user-agent": "Made2Found-Radar/1.0" },
      signal: AbortSignal.timeout(HN_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CollectorError(error instanceof Error && error.name === "TimeoutError" ? "timeout" : "http_error");
  }
  if (!response.ok) throw new CollectorError("http_error");
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) throw new CollectorError("format_error");
  const text = await readLimited(response);
  try {
    return parseHnResponse(JSON.parse(text));
  } catch (error) {
    throw error instanceof CollectorError ? error : new CollectorError("format_error");
  }
}
