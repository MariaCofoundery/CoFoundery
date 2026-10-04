/** Lossless, escaped read-only rendering: no normalizer may discard older payload generations. */
export function HistoricalValue({ value, labels = {} }: { value: unknown; labels?: Record<string, string> }) {
  if (value === null || value === undefined || value === "") return <span>—</span>;
  if (typeof value === "boolean") return <span>{value ? "✓" : "—"}</span>;
  if (typeof value !== "object") return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
  if (Array.isArray(value)) return <ol className="space-y-3">{value.map((item, i) => <li key={i} className="border-l-2 border-slate-200 pl-3"><HistoricalValue value={item} labels={labels} /></li>)}</ol>;
  return <dl className="space-y-3">{Object.entries(value).map(([key, item]) => <div key={key} className="min-w-0"><dt className="text-sm font-medium text-slate-600">{labels[key] ?? key}</dt><dd className="mt-1 min-w-0 pl-3"><HistoricalValue value={item} labels={labels} /></dd></div>)}</dl>;
}
