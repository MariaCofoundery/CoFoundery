import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import type { CapabilityMap, CapabilityRole } from "@/features/reporting/capabilityMapModel";

/**
 * „Dein Profil auf einen Blick" - der Kopf von /me/profile (Konzeptboard 31).
 *
 * SEIT 04.11.2026 EINE EIGENE ZONE ueber dem ausfuehrlichen Bericht: der Kopf mit dem EINEN naechsten Schritt,
 * „Auf einen Blick" mit drei Kern-Karten (Wie ich arbeite, Was ich kann, So willst du gründen) und die Leiste
 * „Dazu, wenn du magst". Die Stationen des Wegs bestimmen weiter den naechsten Schritt; gezeigt werden sie als
 * Stand auf den Karten. „Wer sieht was" steht im Anhang (`ProfileShareOverview`).
 *
 * DETERMINISTISCH, OHNE WERT: Es steht da, was die Person selbst angegeben oder bestaetigt hat. Keine Prozente,
 * kein „x von y", keine Rangfolge. Der Weg zeigt Stationen, keinen Fortschritt: eine Station ist erledigt, die
 * erste offene ist die naechste, der Rest wartet. Erfahrung und Rolle bleiben getrennt (`capabilityMapModel`);
 * die Faltin-Einordnung gehoert zum Bereich, nicht zur Person, und steht deshalb im Detail, nicht hier.
 *
 * „Wie ich arbeite" zeigt nur Bereiche, in denen die Antworten getragen in eine Richtung zeigen, und setzt eine
 * Marke zwischen die beiden Pole - eine Lage, kein Fuellstand.
 */
export type OverviewStation = "basis" | "work" | "can" | "makes" | "venture";

export type OverviewWorkBar = { key: string; label: string; left: string; right: string; side: "lower" | "upper" };

export type ProfileOverviewProps = {
  displayName: string;
  headline: string | null;
  regionLine: string | null;
  avatar: ReactNode;
  /** Der Ueber-mich-Text, unter dem Namen im Kopf. */
  heroExtra: ReactNode;
  asOf: string | null;
  done: Record<OverviewStation, boolean>;
  hrefs: { basis: string; work: string; can: string; strengths: string; direction: string; venture: string };
  hasStrengths: boolean;
  hasDirection: boolean;
  capabilityMap: CapabilityMap;
  areaLabel: (areaId: string) => string;
  familyLabel: (familyId: string) => string;
  strengths: string[];
  direction: string[];
  workBars: OverviewWorkBar[];
  /** Wie viele Staerken bestaetigt sind - fuer die Leiste "Dazu, wenn du magst". */
  strengthCount: number;
  hasWorkProfile: boolean;
  ventureName: string | null;
  hasVenture: boolean;
};

const ROWS_IN_GLANCE = 4;

const ROLE_TONE: Record<Exclude<CapabilityRole, "unset">, string> = {
  own: "bg-[#e3f6ec] text-[#17794a]",
  contribute: "bg-[#efeafd] text-[#4a2fb8]",
  grow_into: "bg-[#fdecc8] text-[#7a4300]",
  prefer_other: "bg-[#e1effa] text-[#0b5a8a]",
  prefer_external: "bg-[#e1effa] text-[#0b5a8a]",
  unclear: "bg-[#f1f0f7] text-[#33325e]",
};

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  check: <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>,
  tools: <Svg><path d="M14.5 6.5a4 4 0 0 0 5 5L10 21l-3-3 9.5-9.5" /><path d="M14.5 6.5l3-3" /></Svg>,
  heart: <Svg><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Svg>,
  rocket: <Svg><path d="M5 19c0-3 1.5-4.5 3-4.5M14 4c3.5 0 6 2.5 6 6-3 4-6 6-9 7l-4-4c1-3 3-6 7-9z" /><circle cx="14.5" cy="9.5" r="1.3" /></Svg>,
  chart: <Svg><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" /></Svg>,
  person: <Svg><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.7-5.5 7-5.5s6.2 1.9 7 5.5" /></Svg>,
  spark: <Svg><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Svg>,
  flag: <Svg><path d="M6 21V4M6 5h11l-2 4 2 4H6" /></Svg>,
  lock: <Svg size={18}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>,
  team: <Svg><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 19c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7M15 14.6c2.3-.2 4.2 1.1 4.8 3.6" /></Svg>,
  search: <Svg><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Svg>,
  advisor: <Svg><path d="M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /></Svg>,
};

const STATIONS: { key: OverviewStation }[] = [{ key: "basis" }, { key: "work" }, { key: "can" }, { key: "makes" }, { key: "venture" }];

const CORE_CARD =
  "card-lift relative flex min-w-0 flex-col gap-3.5 overflow-hidden rounded-[26px] bg-white p-6 shadow-[0_10px_28px_rgba(76,52,170,0.10)]";
const CARD_FOOT = "mt-auto inline-flex min-h-11 items-center border-t border-[#eeedf5] pt-3 font-semibold text-[#5b21b6] hover:underline";
const MUTED = "text-sm leading-[1.55] text-[#5f5e7a]";
const BTN = "inline-flex min-h-11 items-center justify-center rounded-xl px-[18px] text-[15px] font-semibold";
const BTN_PRIMARY = `${BTN} bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white hover:opacity-90`;
const BTN_QUIET = `${BTN} bg-[#f1f0f7] text-[#0b1f3a] hover:bg-[#e9e7f4]`;

function IconBox({ icon, bg, fg }: { icon: ReactNode; bg: string; fg: string }) {
  return (
    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px]" style={{ background: bg, color: fg }}>
      {icon}
    </span>
  );
}

export async function ProfileOverview(props: ProfileOverviewProps) {
  const t = await getTranslations("profile.founderProfile.atAGlance");
  const { done } = props;

  // Die erste offene Station ist die naechste - in der Reihenfolge, in der man sie gehen wuerde.
  const next = STATIONS.map((s) => s.key).find((key) => !done[key]) ?? null;
  const nextHref =
    next === null
      ? "#details"
      : next === "makes"
        ? props.hasStrengths
          ? props.hrefs.direction
          : props.hrefs.strengths
        : props.hrefs[next];
  const nextKey = next === "makes" ? (props.hasStrengths ? "direction" : "strengths") : (next ?? "done");

  // In der Kurzfassung hoechstens vier Bereiche - die Karte steht in einer schmalen Spalte. Alles steht im Bericht.
  const shownRows = props.capabilityMap.families.flatMap((family) => family.rows).slice(0, ROWS_IN_GLANCE);
  const hiddenAreas = props.capabilityMap.counts.areas - shownRows.length;
  const rolesShown = new Set<Exclude<CapabilityRole, "unset">>();
  for (const row of shownRows) {
    if (row.role !== "unset") rolesShown.add(row.role);
  }
  const chip = (on: boolean) =>
    `inline-flex items-center self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${on ? "bg-[#e3f6ec] text-[#17794a]" : "bg-[#f1f0f7] text-[#33325e]"}`;

  return (
    // ZONE 1: AUF EINEN BLICK (seit 04.11.2026, Entwurf "Teamseite, Profil, Menü"). Eine eigene, farbig
    // hinterlegte Zone - darunter beginnt der ausfuehrliche Bericht. Im Druck faellt der Hintergrund weg.
    <div
      className="flex flex-col gap-6 rounded-[36px] bg-[linear-gradient(180deg,#ece6fd,#f2eefd,#f7f6fb)] p-3 sm:p-6 print:rounded-none print:bg-none print:p-0"
      data-profile-overview
    >
      {/* DER KOPF: wer, und der eine naechste Schritt. */}
      <section
        id="auf-einen-blick"
        className="page-section brand-panel relative grid scroll-mt-6 items-center gap-7 overflow-hidden rounded-[30px] px-6 py-8 shadow-[0_24px_48px_rgba(76,52,170,0.22)] sm:px-9 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] print:rounded-none print:px-0 print:shadow-none"
      >
        <span aria-hidden="true" className="orb -top-14 left-1/2 hidden h-44 w-44 md:block" />
        <span aria-hidden="true" className="orb bottom-6 right-7 hidden h-10 w-10 bg-white/20 md:block" />
        <div className="relative flex min-w-0 items-center gap-5">
          {props.avatar}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
            <h1 className="mt-1 break-words text-[32px] font-semibold leading-[1.15] tracking-tight sm:text-[34px]">{props.displayName}</h1>
            {props.headline || props.regionLine ? (
              <p className="mt-1.5 text-base text-white opacity-95">{[props.headline, props.regionLine].filter(Boolean).join(" · ")}</p>
            ) : null}
            <Link href={props.hrefs.basis} className="no-print mt-2 inline-flex min-h-10 items-center text-[15px] font-semibold text-white underline underline-offset-4">
              {t("editProfile")}
            </Link>
          </div>
        </div>
        <div className="no-print relative flex min-w-0 flex-col gap-2.5 rounded-[22px] bg-white p-5 text-[#0b1f3a]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#4a2fb8]">{t("next.label")}</p>
          <strong className="text-[21px] font-semibold leading-tight">{t(`next.${nextKey}.title`)}</strong>
          <p className={MUTED}>{t(`next.${nextKey}.text`)}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={nextHref} className={BTN_PRIMARY}>{t(`next.${nextKey}.cta`)}</Link>
            {next ? <Link href="/dashboard" className={BTN_QUIET}>{t("next.later")}</Link> : null}
          </div>
        </div>
        {props.heroExtra ? <div className="relative min-w-0 md:col-span-2">{props.heroExtra}</div> : null}
      </section>

      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-1 px-1 sm:px-2">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#6d49e0]">{t("glanceEyebrow")}</p>
          <h2 className="mt-1 text-[28px] font-semibold tracking-tight text-[#0b1f3a]">{t("glanceTitle")}</h2>
        </div>
        <p className="text-[14.5px] text-[#5f5e7a]">{t("glanceNote")}</p>
      </div>

      {/* DIE DREI KERN-KARTEN: gleich hoch, jede mit Farbstreifen, Stand und dem Sprung in den Bericht. */}
      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {/* WIE ICH ARBEITE: nur, was getragen in eine Richtung zeigt - eine Lage zwischen zwei Polen. */}
        <article className={CORE_CARD} id="wie-ich-arbeite">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[5px] bg-[#7c6cf0]" />
          <div className="flex items-center justify-between gap-3">
            <IconBox icon={ICONS.chart} bg="#efeafd" fg="#4a2fb8" />
            <span className={chip(props.hasWorkProfile)}>{props.hasWorkProfile ? t("status.ready") : t("status.open")}</span>
          </div>
          <div>
            <h3 className="text-[21px] font-semibold leading-tight">{t("work.title")}</h3>
            <p className={MUTED}>{t("work.sub")}</p>
          </div>
          {props.workBars.length > 0 ? (
            <div className="flex flex-col gap-3.5">
              {props.workBars.map((bar, index) => (
                <div key={bar.key} className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[14.5px] font-semibold">{bar.label}</span>
                  <span className="relative block h-2 rounded bg-[#ece9f8]">
                    <i
                      className={`profile-grow absolute top-1/2 -ml-2 block h-4 w-4 rounded-full border-[3px] border-white bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] shadow ${bar.side === "upper" ? "left-5/6" : "left-1/6"}`}
                      style={{ animationDelay: `${index * 0.15}s` }}
                    />
                  </span>
                  <span className="flex justify-between gap-3 text-[12.5px] text-[#5f5e7a]">
                    <span className="min-w-0 break-words">{bar.left}</span>
                    <span className="min-w-0 break-words text-right">{bar.right}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={MUTED}>{props.hasWorkProfile ? t("work.noDirection") : t("work.empty")}</p>
          )}
          <Link href={props.hasWorkProfile ? "#arbeitsweise" : props.hrefs.work} className={`${CARD_FOOT} no-print`}>
            {props.hasWorkProfile ? t("readInReport") : t("work.start")}
          </Link>
        </article>

        {/* WAS ICH KANN: Fachliches. Erfahrung und Rolle getrennt, nie verrechnet. */}
        <article className={CORE_CARD} id="was-ich-kann">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[5px] bg-[#3b8fd1]" />
          <div className="flex items-center justify-between gap-3">
            <IconBox icon={ICONS.tools} bg="#e1effa" fg="#0b5a8a" />
            <span className={chip(props.capabilityMap.counts.areas > 0)}>
              {props.capabilityMap.counts.areas > 0 ? t("status.areas", { count: props.capabilityMap.counts.areas }) : t("status.open")}
            </span>
          </div>
          <div>
            <h3 className="text-[21px] font-semibold leading-tight">{t("can.title")}</h3>
            <p className={MUTED}>{t("can.sub")}</p>
          </div>
          {shownRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              {shownRows.map((row) => (
                <div key={row.areaId} className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex items-center justify-between gap-2 text-[15px]">
                    <span className="min-w-0 break-words font-semibold">{props.areaLabel(row.areaId)}</span>
                    {row.role !== "unset" ? (
                      <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${ROLE_TONE[row.role]}`}>{t(`can.roles.${row.role}`)}</span>
                    ) : null}
                  </span>
                  <span className="flex gap-1" role="img" aria-label={row.level ? t("can.level", { level: row.level }) : t("can.noLevel")}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <span key={step} className={`h-2 flex-1 rounded ${row.level && step <= row.level ? "bg-[#6d49e0]" : "bg-[#ece9f8]"}`} />
                    ))}
                  </span>
                </div>
              ))}
              {hiddenAreas > 0 ? <p className={MUTED}>{t("can.more", { count: hiddenAreas })}</p> : null}
            </div>
          ) : (
            <p className={MUTED}>{t("can.empty")}</p>
          )}
          <Link href={shownRows.length > 0 ? "#mitbringst" : props.hrefs.can} className={`${CARD_FOOT} no-print`}>
            {shownRows.length > 0 ? t("readInReport") : t("can.start")}
          </Link>
        </article>

        {/* SO WILLST DU GRUENDEN */}
        <article className={CORE_CARD} aria-labelledby="profile-venture-title">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[5px] bg-[#1f9e9a]" />
          <div className="flex items-center justify-between gap-3">
            <IconBox icon={ICONS.rocket} bg="#dff4f3" fg="#0b6b6e" />
            <span className={chip(props.hasVenture)}>{props.hasVenture ? t("status.answered") : t("status.open")}</span>
          </div>
          <div>
            <h3 id="profile-venture-title" className="text-[21px] font-semibold leading-tight">{t("venture.title")}</h3>
            <p className={`${MUTED} mt-1`}>{props.hasVenture ? t("venture.have", { name: props.ventureName ?? t("venture.unnamed") }) : t("venture.text")}</p>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {(["time", "money", "decisions", "goals", "limits"] as const).map((key) => (
              <li key={key} className="rounded-full bg-[#dff4f3] px-2.5 py-0.5 text-[13px] font-semibold text-[#0b6b6e]">{t(`venture.themes.${key}`)}</li>
            ))}
          </ul>
          <Link href={props.hasVenture ? "#vorhaben" : props.hrefs.venture} className={`${CARD_FOOT} no-print`}>
            {props.hasVenture ? t("readInReport") : t("venture.create")}
          </Link>
        </article>
      </div>

      {/* DAZU, WENN DU MAGST: die Ergaenzungen als Leiste, nicht als Karten. */}
      <nav aria-label={t("extrasLabel")} className="no-print flex flex-wrap items-center gap-2.5 rounded-[20px] border border-[#e4e2f0] bg-white/70 px-3.5 py-3">
        <span className="mr-1 text-[15px] font-semibold text-[#33325e]">{t("extrasLabel")}</span>
        {(
          [
            { key: "strengths", href: props.hasStrengths ? "#staerken" : props.hrefs.strengths, icon: ICONS.spark, bg: "#fdecc8", fg: "#7a4300", label: props.hasStrengths ? t("extras.strengthsCount", { count: props.strengthCount }) : t("extras.strengths") },
            { key: "direction", href: props.hasDirection ? "#antrieb" : props.hrefs.direction, icon: ICONS.flag, bg: "#fde8f1", fg: "#a3195b", label: props.hasDirection ? t("extras.direction") : t("extras.directionOpen") },
            { key: "background", href: "#hintergrund", icon: ICONS.person, bg: "#e3f6ec", fg: "#17794a", label: t("extras.background") },
            { key: "questionnaires", href: "/fragebogen", icon: ICONS.chart, bg: "#efeafd", fg: "#4a2fb8", label: t("extras.questionnaires") },
          ] as const
        ).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e4e2f0] bg-white py-1 pl-1.5 pr-3.5 text-[15px] text-[#0b1f3a] transition hover:border-[#6d49e0]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4" style={{ background: item.bg, color: item.fg }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** "Wer sieht was" - seit 04.11.2026 im Anhang des Berichts: jede Freigabe einzeln, an ihrem eigenen Ort. */
export async function ProfileShareOverview() {
  const t = await getTranslations("profile.founderProfile.atAGlance");
  return (
    <section className="no-print flex flex-col gap-3.5 rounded-3xl border border-[#e4e2f0] bg-white px-5 py-6 sm:px-7" aria-labelledby="profile-share-title">
      <div className="flex items-center gap-3">
        <span className="text-[#4a2fb8]">{ICONS.lock}</span>
        <h2 id="profile-share-title" className="text-[22px] font-semibold tracking-tight">{t("share.title")}</h2>
      </div>
      <p className={`${MUTED} max-w-[640px]`}>{t("share.text")}</p>
      <ul className="grid gap-3 md:grid-cols-3">
        {(
          [
            { key: "team", href: "/connections", icon: ICONS.team },
            { key: "find", href: "/profile?step=sichtbarkeit", icon: ICONS.search },
            { key: "advisor", href: "/account", icon: ICONS.advisor },
          ] as const
        ).map((item) => (
          <li key={item.key}>
            <Link href={item.href} className="flex items-center gap-3 rounded-2xl border border-[#e4e2f0] bg-white px-3.5 py-3 text-[14.5px] transition-colors hover:border-[#6d49e0] hover:bg-[#f5f2fe]">
              <span className="flex-none text-[#4a2fb8]">{item.icon}</span>
              <span className="min-w-0">
                <strong className="block">{t(`share.${item.key}.title`)}</strong>
                <span className="block text-[13px] text-[#5f5e7a]">{t(`share.${item.key}.text`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
