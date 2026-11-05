import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { setSetupHiddenAction } from "@/features/advisor/setup/setupActions";
import type { SetupItem, SetupStep } from "@/features/advisor/setup/setupModel";

export type StartTile = { key: "program" | "teamraum" | "follow" | "events"; href: string; text: string };
export type StartEvent = { key: string; title: string; startsAt: string; href: string; ecosystem: boolean; needsPosts: string | null };

/** Einrichtungsstand auf dem Start (Entwurf 05.11.2026): solange etwas offen ist und die Liste nicht ausgeblendet. */
export async function SetupCard({ orgId, items, done, next }: { orgId: string; items: SetupItem[]; done: number; next: SetupStep }) {
  const t = await getTranslations("advisor.setup");
  return (
    <section aria-labelledby="setup-card-title" className="flex flex-wrap items-center gap-4 rounded-[18px] border border-violet-200 bg-white px-5 py-4 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <h2 id="setup-card-title" className="text-[16px] font-semibold text-slate-950">{t("card.title", { done, total: items.length })}</h2>
        <p className="mt-1 text-[14px] text-slate-700">
          {t("card.next")} <strong>{t(`steps.${next}.title`)}</strong> – {t(`steps.${next}.short`)}
        </p>
        <div aria-hidden="true" className="mt-2.5 grid max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => <span key={item.key} className={`h-1.5 rounded-full ${item.state === "done" ? "bg-violet-600" : "bg-slate-200"}`} />)}
        </div>
      </div>
      <Link href={`/advisor/los-gehts?org=${encodeURIComponent(orgId)}`} className="brand-cta inline-flex min-h-12 items-center rounded-xl px-5 text-[15px] font-semibold">{t("card.continue")}</Link>
      <form action={setSetupHiddenAction}>
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="hidden" value="yes" />
        <button type="submit" aria-label={t("card.hide")} className="grid h-11 w-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100">×</button>
      </form>
    </section>
  );
}

/** Vier Wege vom Start in die Bereiche - mit dem, was dort gerade ansteht. */
export async function StartTiles({ tiles }: { tiles: StartTile[] }) {
  const t = await getTranslations("advisor.area.start.tiles");
  return (
    <nav aria-label={t("label")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Link key={tile.key} href={tile.href} className="card-lift flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-slate-950">
          <span className="text-[13px] font-semibold text-violet-800">{t(`${tile.key}.area`)}</span>
          <span className="text-[16px] font-semibold">{t(`${tile.key}.title`)}</span>
          <span className="text-[13.5px] text-slate-600">{tile.text}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Die naechsten Termine aus Programmplan und Oekosystem - mit Hinweis, wenn zu einem noch kein Posting geplant ist. */
export async function StartEvents({ events, locale }: { events: StartEvent[]; locale: string }) {
  const t = await getTranslations("advisor.area.start.nextEvents");
  const when = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  return (
    <section aria-labelledby="start-events-title" className="work-ui rounded-[18px] border border-slate-200 bg-white px-5 py-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="start-events-title" className="text-[15px] font-semibold text-slate-950">{t("title")}</h2>
        <Link href="/events" className="text-[13.5px] font-medium text-violet-800 underline-offset-4 hover:underline">{t("all")}</Link>
      </div>
      {events.length === 0 ? <p className="mt-3 text-[15px] text-slate-700">{t("none")}</p> : null}
      <ul className="mt-1">
        {events.map((event) => (
          <li key={event.key} className="border-t border-slate-100 py-2.5 first:border-t-0">
            <Link href={event.href} className="text-[15px] font-medium text-slate-950 underline-offset-4 hover:underline">{event.title}</Link>
            <span className="text-[13px] text-slate-600"> · {event.ecosystem ? `${t("ecosystem")} · ` : ""}{when.format(new Date(event.startsAt))}</span>
            {event.needsPosts ? (
              <p className="mt-0.5 text-[13px] text-amber-800">
                {t("noPosts")} · <Link href={event.needsPosts} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("suggestions")}</Link>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

