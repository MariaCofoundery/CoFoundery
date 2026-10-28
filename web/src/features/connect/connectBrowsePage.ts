export const CONNECT_PAGE_SIZE = 24;
/** Das Problembrett zeigt grosse Notizen: weniger je Seite, sonst wird die Seite sehr lang und schwer. */
export const PROBLEM_PAGE_SIZE = 12;
export function connectPage(value?: string) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 4000) : 1;
}
export function connectOffset(value?: string, size: number = CONNECT_PAGE_SIZE) { return (connectPage(value) - 1) * size; }
export function connectPageHref(path: string, filters: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && key !== "page" && key !== "error") params.set(key, value);
  params.set("page", String(page));
  return `${path}?${params}`;
}
