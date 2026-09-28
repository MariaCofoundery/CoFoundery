import Link from "next/link";

/** Die zwei Seiten, die es zu v2.1 gibt. Mehr wird es erst, wenn es mehr gibt. */
const PAGES = [
  { href: "/founder-alignment/pilot", label: "Fragebogen" },
  { href: "/founder-alignment/pilot/report", label: "Deine Antworten" },
  { href: "/founder-alignment/pilot/discovery", label: "Wonach du suchst" },
  { href: "/founder-alignment/versionen", label: "Beide Fassungen" },
];

export function NavV21({ current }: { current: string }) {
  return (
    <nav className="mb-6 flex gap-2 text-sm">
      {PAGES.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className={`rounded-full px-3 py-1 ${
            page.href === current
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
