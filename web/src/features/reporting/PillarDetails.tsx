"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Aufklappbarer Rahmen eines Profilabschnitts. Oeffnet sich, wenn ein Sprunglink
 * (Seitennavigation, „Auf einen Blick") auf ihn zeigt. Im Ausdruck ist alles offen.
 */
export function PillarDetails({
  id,
  className,
  defaultOpen,
  summary,
  children,
}: {
  id: string;
  className: string;
  defaultOpen: boolean;
  summary: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${id}` && ref.current) ref.current.open = true;
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [id]);

  return (
    <details ref={ref} id={id} open={defaultOpen} className={`group ${className}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        {summary}
        <span aria-hidden className="no-print mt-1 text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      {children}
    </details>
  );
}
