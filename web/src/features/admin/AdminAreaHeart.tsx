/** Das rosa Herz an einem Admin-Bereich: Dort wartet etwas oder ist etwas passiert. Ohne Zahl im Herz selbst; Screenreader hoeren, wie viel es ist. */
export function AdminAreaHeart({ count, label }: { count: number; label: string }) {
  if (count < 1) return null;
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex items-center gap-1 text-[13px] font-bold text-[#be185d]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c1.9 0 3.3 1 4.1 2.3L12 9.6l1.9-2.3C14.7 6 16.1 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" fill="#ec4899" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span aria-hidden="true">{count}</span>
    </span>
  );
}
