export const CONNECT_PAGE_SIZE = 24;
export function connectPage(value?: string) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 4000) : 1;
}
export function connectOffset(value?: string) { return (connectPage(value) - 1) * CONNECT_PAGE_SIZE; }
export function connectPageHref(path: string, filters: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && key !== "page" && key !== "error") params.set(key, value);
  params.set("page", String(page));
  return `${path}?${params}`;
}
