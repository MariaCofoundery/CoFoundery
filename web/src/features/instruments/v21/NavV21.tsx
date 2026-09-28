import Link from "next/link";

/** Die zwei Seiten, die es zu v2.1 gibt. Mehr wird es erst, wenn es mehr gibt. */
const PAGES = [
  { href: "/debug/alignment-v2-1", label: "Fragebogen" },
  { href: "/debug/alignment-v2-1/report", label: "Deine Antworten" },
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
