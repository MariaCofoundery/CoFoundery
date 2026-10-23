import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getModuleAdapter } from "@/features/modules/adapters";
import { loadModuleContext } from "@/features/modules/loadModuleContext";
import { MODULE_REGISTRY } from "@/features/modules/registry";
import type { ModuleDefinition, ModuleState } from "@/features/modules/types";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import { AppIcon, IconTile, type IconName, type IconTone } from "@/features/ui/Icons";
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
  not_started: "bg-[#f1f0f7] text-[#33325e]",
  in_progress: "bg-[#efeafd] text-[#4a2fb8]",
  done_for_now: "bg-[#e3f6ec] text-[#17794a]",
};

/** Symbol und Farbe je Fragebogen (Konzeptboard 33): die Farbe sagt, WELCHER Fragebogen es ist - nie, wie gut. */
const MODULE_ICON: Record<string, { icon: IconName; tone: IconTone }> = {
  workstyle: { icon: "chart", tone: "teal" },
  strengths: { icon: "heart", tone: "pink" },
  capability: { icon: "tools", tone: "violet" },
  direction: { icon: "spark", tone: "amber" },
  venture_core: { icon: "rocket", tone: "amber" },
  venture_core_beta: { icon: "rocket", tone: "violet" },
  venture_tradeoffs: { icon: "scale", tone: "amber" },
};
const TEAM_ICON: Record<string, { icon: IconName; tone: IconTone }> = {
  setup: { icon: "pencil", tone: "green" },
  commitment: { icon: "link", tone: "amber" },
  exercises: { icon: "game", tone: "blue" },
};
const CARD = "card-lift flex flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6";
const BTN_PRIMARY = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white hover:opacity-90";
const BTN_QUIET = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] hover:bg-[#e9e7f4]";

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
      <h1 className="text-[34px] font-semibold leading-[1.2] tracking-tight text-[#0b1f3a]">{t("title")}</h1>
      <p className="mt-1.5 max-w-xl text-base leading-7 text-[#5f5e7a]">{t("intro")}</p>

      {first && !filter ? (
        <section aria-labelledby="q-start" className="brand-panel relative mt-7 overflow-hidden rounded-[28px] px-6 py-7 sm:px-9">
          <span aria-hidden="true" className="orb -top-12 right-36 hidden h-36 w-36 sm:block" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-[18px]">
              <span aria-hidden="true" className="hidden h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-white/20 sm:inline-flex">
                <AppIcon name={MODULE_ICON[first.def.moduleId]?.icon ?? "check"} />
              </span>
              <div className="max-w-xl">
                <p id="q-start" className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">
                  {first.def.moduleId === "workstyle" ? t("start.here") : t("start.next")}
                </p>
                <h2 className="mt-0.5 text-[28px] font-semibold leading-tight sm:text-[30px]">{tModules(`${first.def.moduleId}.title`)}</h2>
                <p className="mt-1.5 text-[15.5px] leading-6 text-white opacity-95">
                  {first.def.moduleId === "workstyle" ? t("start.workstyleLead") : tModules(`${first.def.moduleId}.summary`)}
                </p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
              <Link href={first.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-[18px] text-[15px] font-semibold text-[#4a2fb8]">
                {cta(first.state)}
                <AppIcon name="arrow" className="h-4 w-4" />
              </Link>
              <span className="flex items-center gap-1.5 text-[13.5px] text-white opacity-90">
                <AppIcon name="clock" className="h-4 w-4" />
                {t("minutes", { minutes: MINUTES[first.def.moduleId] ?? 10 })}
              </span>
            </div>
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
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${active ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#d8d5ea] bg-white text-[#33325e] hover:bg-[#f5f2fe]"}`}
            >
              {t(`filters.${key ?? "all"}`)}
            </Link>
          );
        })}
      </nav>

      {groups.map((group) =>
        group.cards.length === 0 || !shown(group.key) ? null : (
          <section key={group.key} className="mt-10" aria-labelledby={`q-${group.key}`} data-group={group.key}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`q-${group.key}`} className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">
                {t(`groups.${group.key}.title`)}
                {group.key === "venture" && venture?.name ? <span className="ml-2 text-sm font-normal text-[#5f5e7a]">· {venture.name}</span> : null}
              </h2>
              <p className="text-sm text-[#5f5e7a]">{t(`groups.${group.key}.lead`)}</p>
            </div>
            <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.cards.map(({ def, state, href }) => (
                <li
                  key={def.moduleId}
                  data-module={def.moduleId}
                  data-state={state}
                  className={`${CARD} ${group.key === "deepening" ? "border-dashed !border-[#d8d5ea]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <IconTile name={MODULE_ICON[def.moduleId]?.icon ?? "check"} tone={MODULE_ICON[def.moduleId]?.tone ?? "violet"} />
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${STATE_CLASS[state]}`}>{t(`state.${state}`)}</span>
                      {def.moduleId === "venture_core_beta" ? (
                        <span className="rounded-full bg-[#fdecc8] px-2.5 py-0.5 text-[13px] font-semibold text-[#7a4300]">{t("beta")}</span>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{tModules(`${def.moduleId}.title`)}</h3>
                  <p className="text-sm leading-[1.55] text-[#5f5e7a]">{tModules(`${def.moduleId}.summary`)}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-[13.5px] text-[#5f5e7a]">
                      <AppIcon name="clock" className="h-4 w-4" />
                      {t("minutes", { minutes: MINUTES[def.moduleId] ?? 10 })}
                    </span>
                    <Link href={href} className={first && href === first.href && state !== "done_for_now" ? BTN_PRIMARY : BTN_QUIET}>
                      {cta(state)}
                    </Link>
                  </div>
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
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="q-team" className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("groups.team.title")}</h2>
          <p className="text-sm text-[#5f5e7a]">{t("groups.team.lead")}</p>
        </div>
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamCards.map(({ key, tag, href }) => (
            <li key={key} className={CARD}>
              <div className="flex items-center justify-between gap-2">
                <IconTile name={TEAM_ICON[key].icon} tone={TEAM_ICON[key].tone} />
                <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${tag === "pair" ? "bg-[#fdecc8] text-[#7a4300]" : "bg-[#e3f6ec] text-[#17794a]"}`}>{t(`tags.${tag}`)}</span>
              </div>
              <h3 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t(`team.${key}.title`)}</h3>
              <p className="text-sm leading-[1.55] text-[#5f5e7a]">{t(`team.${key}.text`)}</p>
              <div className="mt-auto pt-1">
                <Link href={href} className={BTN_QUIET}>
                  {venture ? t("team.cta") : t("team.ctaNoTeam")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
      ) : null}

      <section className="mt-10 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-label={t("how.title")}>
        <dl className="grid gap-5 md:grid-cols-4">
          {(
            [
              { key: "purpose", icon: "spark", tone: "violet" },
              { key: "not", icon: "shield", tone: "green" },
              { key: "method", icon: "book", tone: "blue" },
              { key: "privacy", icon: "lock", tone: "amber" },
            ] as const
          ).map(({ key, icon, tone }) => (
            <div key={key} className="flex items-start gap-3">
              <IconTile name={icon} tone={tone} size="sm" />
              <div className="min-w-0">
                <dt className="font-semibold text-[#0b1f3a]">{t(`how.${key}.label`)}</dt>
                <dd className="mt-0.5 text-[13.5px] leading-[1.5] text-[#5f5e7a]">{t(`how.${key}.text`)}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
