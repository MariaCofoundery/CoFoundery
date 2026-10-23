import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getModuleAdapter } from "@/features/modules/adapters";
import { loadModuleContext } from "@/features/modules/loadModuleContext";
import { MODULE_REGISTRY } from "@/features/modules/registry";
import type { ModuleDefinition, ModuleState } from "@/features/modules/types";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import { AppIcon, IconTile } from "@/features/ui/Icons";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Fragebögen - die Bibliothek (Align).
 *
 * EIN ORT FUER ALLES, WAS MAN BEANTWORTEN KANN: Jede Karte hat denselben Aufbau - Ebene, Titel, Zweck,
 * Dauer, Status, eine Aktion. Die Karten kommen aus der Modul-Registry (Titel und Zweck aus dem
 * Sprachbundle `modules`), der Zustand aus dem Adapter des Moduls, das Ziel aus dem Adapter. Hier steht
 * keine zweite Modulliste.
 *
 * Vier Ebenen: Über mich · Für dieses Vorhaben · Zum Vertiefen · Mit dem Team. Eine Vertiefung ist ein
 * Angebot, nie eine Lücke. Keine Prozente, kein „x von y".
 *
 * Venture Alignment (Beta) erscheint fuer alle angemeldeten Konten.
 */
const MINUTES: Record<string, number> = {
  workstyle: 12,
  capability: 6,
  strengths: 15,
  direction: 5,
  venture_core: 12,
  venture_core_beta: 10,
  venture_tradeoffs: 5,
};

const STATE_CLASS: Record<ModuleState, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-violet-100 text-violet-800",
  done_for_now: "bg-emerald-100 text-emerald-800",
};

export default async function QuestionnairesPage({ searchParams }: { searchParams?: Promise<{ vorhaben?: string; gruppe?: string }> }) {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) redirect("/login?next=/fragebogen");
  const user = auth.user;
  const query = (await searchParams) ?? {};

  const [t, tModules, tRoot, locale, client, ventures] = await Promise.all([
    getTranslations("questionnaires"),
    getTranslations("modules"),
    getTranslations(),
    getLocale(),
    createClient(),
    findVentures(user.id),
  ]);

  const venture = ventures.find((entry) => entry.id === query.vorhaben) ?? ventures[0] ?? null;
  const context = await loadModuleContext(client, user.id, {
    ventureId: venture?.id ?? null,
    includeBeta: true,
    translate: (key, values) => tRoot(key as never, values as never),
    locale: locale === "en" ? "en" : "de",
  });

  type Card = { def: ModuleDefinition; state: ModuleState; href: string };
  const cardOf = (def: ModuleDefinition): Card | null => {
    const adapter = getModuleAdapter(def.moduleId);
    if (!adapter) return null;
    try {
      const state = adapter.status({ id: user.id }, context).state;
      const href = adapter.profileTeaser({ id: user.id }, context)?.href ?? def.renderers.detail;
      return { def, state, href };
    } catch {
      // Nicht lesbar (z. B. kein Vorhaben): lieber keine Karte als eine falsche.
      return null;
    }
  };
  const products = MODULE_REGISTRY.filter(
    (def) => def.usage === "product" && def.scope !== "team"
  );
  const cards = (filter: (def: ModuleDefinition) => boolean) =>
    products.filter(filter).map(cardOf).filter((card): card is Card => card !== null);

  const groups = [
    { key: "person", cards: cards((def) => def.scope === "person") },
    { key: "venture", cards: cards((def) => def.scope === "person_in_venture" && def.tier === "core") },
    { key: "deepening", cards: cards((def) => def.tier === "deepening") },
  ];

  const filter = ["person", "venture", "team", "deepening"].includes(query.gruppe ?? "") ? (query.gruppe as string) : null;
  const shown = (key: string) => !filter || filter === key;
  const teamBase = venture ? `/teams/${encodeURIComponent(venture.id)}` : "/connections";
  const teamCards = [
    { key: "setup", tag: "together", href: venture ? `${teamBase}/setup` : "/invite/new" },
    { key: "commitment", tag: "pair", href: venture ? `${teamBase}#team-deep-dives` : "/invite/new" },
    { key: "exercises", tag: "pair", href: venture ? `${teamBase}#team-deep-dives` : "/invite/new" },
  ] as const;

  // „Beginne hier": EIN naechster Schritt, in einer festen Reihenfolge. Der Rest steht leiser
  // darunter ("Danach") und in den Gruppen unten - kein Fortschrittsbalken, keine Zaehler.
  const ORDER = ["workstyle", "capability", "venture_core_beta", "venture_core"];
  const open = ORDER.map((id) => groups.flatMap((group) => group.cards).find((card) => card.def.moduleId === id))
    .filter((card): card is Card => card !== undefined && card.state !== "done_for_now");
  const first = open[0] ?? null;
  const later = open.slice(1, 3);

  const cta = (state: ModuleState) => (state === "done_for_now" ? t("cta.view") : state === "in_progress" ? t("cta.continue") : t("cta.start"));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{t("intro")}</p>

      {first && !filter ? (
        <section aria-labelledby="q-start" className="brand-panel relative mt-8 overflow-hidden rounded-[28px] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <IconTile name="check" tone="white" />
              <div className="max-w-xl">
                <p id="q-start" className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  {first.def.moduleId === "workstyle" ? t("start.here") : t("start.next")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{tModules(`${first.def.moduleId}.title`)}</h2>
                <p className="mt-2 text-sm leading-7 text-white">
                  {first.def.moduleId === "workstyle" ? t("start.workstyleLead") : tModules(`${first.def.moduleId}.summary`)}
                </p>
                <p className="mt-1 text-xs text-white">{t("minutes", { minutes: MINUTES[first.def.moduleId] ?? 10 })}</p>
              </div>
            </div>
            <Link href={first.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-violet-800">
              {cta(first.state)}
              <AppIcon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          {later.length > 0 ? (
            <p className="mt-5 border-t border-white/30 pt-4 text-sm text-white">
              <span className="font-semibold">{t("start.after")}</span>{" "}
              {later.map((card) => `${tModules(`${card.def.moduleId}.title`)} (${t("minutes", { minutes: MINUTES[card.def.moduleId] ?? 10 })})`).join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}

      <nav aria-label={t("filters.label")} className="mt-6 flex flex-wrap gap-2">
        {([null, "person", "venture", "team", "deepening"] as const).map((key) => {
          const active = (filter ?? null) === key;
          const qs = new URLSearchParams();
          if (query.vorhaben) qs.set("vorhaben", query.vorhaben);
          if (key) qs.set("gruppe", key);
          return (
            <Link
              key={key ?? "all"}
              href={`/fragebogen${qs.toString() ? `?${qs}` : ""}`}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm ${active ? "bg-slate-900 font-semibold text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {t(`filters.${key ?? "all"}`)}
            </Link>
          );
        })}
      </nav>

      {groups.map((group) =>
        group.cards.length === 0 || !shown(group.key) ? null : (
          <section key={group.key} className="mt-10" aria-labelledby={`q-${group.key}`} data-group={group.key}>
            <h2 id={`q-${group.key}`} className="text-lg font-semibold text-slate-950">
              {t(`groups.${group.key}.title`)}
              {group.key === "venture" && venture?.name ? <span className="ml-2 text-sm font-normal text-slate-500">· {venture.name}</span> : null}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t(`groups.${group.key}.lead`)}</p>
            <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.cards.map(({ def, state, href }) => (
                <li
                  key={def.moduleId}
                  data-module={def.moduleId}
                  data-state={state}
                  className={`flex flex-col gap-2 rounded-2xl border bg-white p-5 ${group.key === "deepening" ? "border-dashed border-slate-300" : "border-slate-200"}`}
                >
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_CLASS[state]}`}>{t(`state.${state}`)}</span>
                    {def.moduleId === "venture_core_beta" ? (
                      <span className="rounded-full border border-violet-300 px-2.5 py-0.5 text-xs font-semibold text-violet-800">{t("beta")}</span>
                    ) : null}
                  </div>
                  <h3 className="text-base font-semibold text-slate-950">{tModules(`${def.moduleId}.title`)}</h3>
                  <p className="text-sm leading-6 text-slate-600">{tModules(`${def.moduleId}.summary`)}</p>
                  <p className="text-xs text-slate-500">{t("minutes", { minutes: MINUTES[def.moduleId] ?? 10 })}</p>
                  <Link
                    href={href}
                    className={`mt-auto inline-flex min-h-11 items-center self-start rounded-xl px-4 text-sm font-semibold ${
                      state === "done_for_now" ? "border border-slate-200 bg-slate-50 text-slate-800" : "brand-here"
                    }`}
                  >
                    {cta(state)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      {!venture ? (
        <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm leading-6 text-slate-600">
          {t("noVenture")}
        </section>
      ) : null}

      {shown("team") ? (
      <section className="mt-10" aria-labelledby="q-team" data-group="team">
        <h2 id="q-team" className="text-lg font-semibold text-slate-950">{t("groups.team.title")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("groups.team.lead")}</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamCards.map(({ key, tag, href }) => (
            <li key={key} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
              <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${tag === "pair" ? "bg-amber-100 text-amber-900" : "bg-violet-100 text-violet-800"}`}>{t(`tags.${tag}`)}</span>
              <h3 className="text-base font-semibold text-slate-950">{t(`team.${key}.title`)}</h3>
              <p className="text-sm leading-6 text-slate-600">{t(`team.${key}.text`)}</p>
              <Link href={href} className="mt-auto inline-flex min-h-11 items-center self-start rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800">
                {venture ? t("team.cta") : t("team.ctaNoTeam")}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      ) : null}

      <section className="mt-10 rounded-2xl bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-slate-950">{t("how.title")}</h2>
        <dl className="mt-3 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-4">
          {(["purpose", "not", "method", "privacy"] as const).map((key) => (
            <div key={key}>
              <dt className="font-semibold text-violet-800">{t(`how.${key}.label`)}</dt>
              <dd className="mt-1">{t(`how.${key}.text`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
