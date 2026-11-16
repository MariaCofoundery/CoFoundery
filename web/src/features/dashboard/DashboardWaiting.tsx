import Link from "next/link";

export type WaitingCard = {
  id: string;
  label: string;
  title: string;
  href: string;
  action: string;
};

export type RunningEntry = { id: string; title: string; href: string };

const SHOWN = 5;

function Row({ card }: { card: WaitingCard }) {
  return (
    <li>
      <Link
        href={card.href}
        className="flex min-h-[52px] items-center gap-3 rounded-xl px-1.5 py-2 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
      >
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#b9a9f5]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-snug text-[#14152b]">{card.label}</span>
          <span className="line-clamp-1 block text-[13px] text-[#5f5e7a]">{card.title}</span>
        </span>
        <span className="sr-only">{card.action}</span>
        <span aria-hidden="true" className="shrink-0 text-xl leading-none text-[#9a9cb8]">&rsaquo;</span>
      </Link>
    </li>
  );
}

/**
 * "Wartet auf dich" (Entwurf 17.11.2026): eine ruhige Liste, jede Zeile ein ganzer Link mit Anlass, Satz und Handlung. Die ersten drei stehen da,
 * der Rest klappt unter "Alle ansehen" auf - nichts ist versteckt, die Zahl steht neben der Ueberschrift. Keine Karussell-Pfeile, keine Farben je
 * Dringlichkeit, keine Rangfolge ausser "zuerst, was andere aufhaelt". Darunter, nur wenn es etwas gibt, eine leise Zeile mit dem, was gerade laeuft.
 */
export function DashboardWaiting({
  cards,
  running,
  labels,
}: {
  cards: WaitingCard[];
  running: RunningEntry[];
  labels: { title: string; count: string; more: string; running: string };
}) {
  if (cards.length === 0 && running.length === 0) return null;
  const first = cards.slice(0, SHOWN);
  const rest = cards.slice(SHOWN);

  return (
    <section
      id="dashboard-block-tasks"
      aria-labelledby={cards.length > 0 ? "dashboard-waiting-title" : undefined}
      aria-label={cards.length > 0 ? undefined : labels.running}
      className="scroll-mt-28"
    >
      {cards.length > 0 ? (
        <>
          <h2 id="dashboard-waiting-title" className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6d28d9]">
            {labels.title}
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#5b3df5] px-2 text-[13px] font-bold normal-case tracking-normal text-white">
              <span aria-hidden="true">{cards.length}</span>
              <span className="sr-only">{labels.count}</span>
            </span>
          </h2>
          <ul className="mt-2 flex flex-col divide-y divide-[#e4def8]">
            {first.map((card) => <Row key={card.id} card={card} />)}
          </ul>
          {rest.length > 0 ? (
            <details className="mt-1.5">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-violet-800">{labels.more}</summary>
              <ul className="mt-1 flex flex-col divide-y divide-[#e4def8]">
                {rest.map((card) => <Row key={card.id} card={card} />)}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
      {running.length > 0 ? (
        <p className={`text-[15px] leading-6 text-[#5f5e7a] ${cards.length > 0 ? "mt-3.5 border-t border-[#d9d0f5] pt-3.5" : ""}`}>
          <span className="font-semibold">{labels.running}</span>{" "}
          {running.map((entry, index) => (
            <span key={entry.id}>
              {index > 0 ? " · " : null}
              <Link href={entry.href} className="text-violet-800 underline underline-offset-4">
                {entry.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
