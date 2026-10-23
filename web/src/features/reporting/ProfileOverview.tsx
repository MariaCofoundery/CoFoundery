import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import type { CapabilityMap, CapabilityRole } from "@/features/reporting/capabilityMapModel";

/**
 * „Dein Profil auf einen Blick" - der Kopf von /me/profile (Konzeptboard 31).
 *
 * Fuenf Dinge, von oben nach unten: der Kopf mit dem EINEN naechsten Schritt, der Weg durchs Profil, zwei
 * Spalten („Was ich kann" / „Was mich ausmacht"), das Vorhaben und „Wer sieht was".
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
  hasWorkProfile: boolean;
  ventureName: string | null;
  hasVenture: boolean;
};

const FAMILIES_SHOWN = 3;
const ROWS_PER_FAMILY = 3;

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
const STATION_ICON: Record<OverviewStation, ReactNode> = {
  basis: ICONS.person,
  work: ICONS.chart,
  can: ICONS.tools,
  makes: ICONS.heart,
  venture: ICONS.rocket,
};

const TILE = "flex min-w-0 flex-col gap-2.5 rounded-3xl border border-[#e4e2f0] bg-white p-[26px]";
const LABEL = "text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]";
const MUTED = "text-sm leading-[1.55] text-[#5f5e7a]";
const BTN = "inline-flex min-h-11 items-center justify-center rounded-xl px-[18px] text-[15px] font-semibold";
const BTN_PRIMARY = `${BTN} bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white hover:opacity-90`;
const BTN_QUIET = `${BTN} bg-[#f1f0f7] text-[#0b1f3a] hover:bg-[#e9e7f4]`;
const LINK = "inline-flex min-h-11 items-center font-semibold text-[#6d49e0] hover:underline";

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

  const shownFamilies = props.capabilityMap.families.slice(0, FAMILIES_SHOWN);
  const hiddenAreas =
    props.capabilityMap.counts.areas -
    shownFamilies.reduce((sum, family) => sum + Math.min(family.rows.length, ROWS_PER_FAMILY), 0);
  const rolesShown = new Set<Exclude<CapabilityRole, "unset">>();
  for (const family of shownFamilies) {
    for (const row of family.rows.slice(0, ROWS_PER_FAMILY)) {
      if (row.role !== "unset") rolesShown.add(row.role);
    }
  }

  return (
    <div className="flex flex-col gap-6" data-profile-overview>
      {/* DER KOPF: wer, und der eine naechste Schritt. */}
      <section
        id="auf-einen-blick"
        className="page-section brand-panel grid scroll-mt-6 items-center gap-7 rounded-[28px] px-6 py-8 sm:px-9 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] print:rounded-none print:px-0"
      >
        <div className="flex min-w-0 items-center gap-5">
          {props.avatar}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
            <h1 className="mt-1 break-words text-[32px] font-semibold leading-[1.15] tracking-tight sm:text-[34px]">{props.displayName}</h1>
            {props.headline || props.regionLine ? (
              <p className="mt-1.5 text-base text-white opacity-95">{[props.headline, props.regionLine].filter(Boolean).join(" · ")}</p>
            ) : null}
            {props.asOf ? <p className="mt-1 text-xs text-white opacity-90">{props.asOf}</p> : null}
          </div>
        </div>
        <div className="no-print flex min-w-0 flex-col gap-2.5 rounded-[22px] bg-white p-5 text-[#0b1f3a]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#4a2fb8]">{t("next.label")}</p>
          <strong className="text-[21px] font-semibold leading-tight">{t(`next.${nextKey}.title`)}</strong>
          <p className={MUTED}>{t(`next.${nextKey}.text`)}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={nextHref} className={BTN_PRIMARY}>{t(`next.${nextKey}.cta`)}</Link>
            {next ? <Link href="/dashboard" className={BTN_QUIET}>{t("next.later")}</Link> : null}
          </div>
        </div>
        {props.heroExtra ? <div className="min-w-0 md:col-span-2">{props.heroExtra}</div> : null}
      </section>

      {/* DER WEG: Stationen, kein Fortschritt. */}
      <section className="no-print flex flex-col gap-4 rounded-3xl border border-[#e4e2f0] bg-white px-5 py-6 sm:px-7" aria-labelledby="profile-path-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="profile-path-title" className="text-[22px] font-semibold tracking-tight">{t("path.title")}</h2>
          <span className="text-[13.5px] text-[#5f5e7a]">{t("path.note")}</span>
        </div>
        <ol className="relative -mx-5 flex items-start gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <div aria-hidden="true" className="absolute inset-x-10 top-6 hidden border-t-2 border-dashed border-[#d8d5ea] sm:block" />
          {STATIONS.map(({ key }) => {
            const state = done[key] ? "done" : key === next ? "here" : "open";
            return (
              <li
                key={key}
                aria-current={state === "here" ? "step" : undefined}
                className={`relative flex min-w-[84px] flex-1 flex-col items-center gap-2 text-center text-[13px] font-semibold sm:text-sm ${state === "here" ? "text-[#0b1f3a]" : "text-[#5f5e7a]"}`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                    state === "done"
                      ? "border-[#bfe8d1] bg-[#e3f6ec] text-[#17794a]"
                      : state === "here"
                        ? "profile-step-here border-transparent bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white"
                        : "border-[#d8d5ea] bg-white text-[#8b89aa]"
                  }`}
                >
                  {state === "done" ? ICONS.check : STATION_ICON[key]}
                </span>
                <span className="break-words">{t(`path.${key}`)}</span>
                <span className="sr-only">{t(`path.state.${state}`)}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* WAS ICH KANN: Fachliches. Erfahrung und Rolle getrennt, nie verrechnet. */}
        <article className={TILE} id="was-ich-kann">
          <div className="flex items-center gap-3.5">
            <IconBox icon={ICONS.tools} bg="#efeafd" fg="#4a2fb8" />
            <div className="min-w-0">
              <h2 className="text-[21px] font-semibold leading-tight">{t("can.title")}</h2>
              <p className={MUTED}>{t("can.sub")}</p>
            </div>
          </div>
          {shownFamilies.length > 0 ? (
            <div className="mt-2.5">
              {shownFamilies.map((family) => (
                <div key={family.familyId} className="flex flex-col gap-2.5 border-t border-[#e4e2f0] py-3.5 first:border-t-0">
                  <p className={LABEL}>{props.familyLabel(family.familyId)}</p>
                  {family.rows.slice(0, ROWS_PER_FAMILY).map((row) => (
                    <div key={row.areaId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[15px] sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_auto]">
                      <span className="min-w-0 break-words font-semibold">{props.areaLabel(row.areaId)}</span>
                      <span
                        className="order-3 col-span-2 flex gap-1 sm:order-none sm:col-span-1"
                        role="img"
                        aria-label={row.level ? t("can.level", { level: row.level }) : t("can.noLevel")}
                      >
                        {[1, 2, 3, 4, 5].map((step) => (
                          <span key={step} className={`h-2 flex-1 rounded ${row.level && step <= row.level ? "bg-[#6d49e0]" : "bg-[#ece9f8]"}`} />
                        ))}
                      </span>
                      {row.role !== "unset" ? (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${ROLE_TONE[row.role]}`}>{t(`can.roles.${row.role}`)}</span>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className={`${MUTED} mt-2`}>{t("can.empty")}</p>
          )}
          {rolesShown.size > 0 ? (
            <ul className="mt-1.5 flex flex-wrap gap-2.5">
              {[...rolesShown].map((role) => (
                <li key={role} className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${ROLE_TONE[role]}`}>{t(`can.legend.${role}`)}</li>
              ))}
            </ul>
          ) : null}
          {hiddenAreas > 0 ? <p className={MUTED}>{t("can.more", { count: hiddenAreas })}</p> : null}
          <Link href={props.hrefs.can} className={`${LINK} no-print mt-1.5`}>
            {shownFamilies.length > 0 ? t("can.edit") : t("can.start")}
          </Link>
        </article>

        <div className="flex min-w-0 flex-col gap-5">
          {/* WAS MICH AUSMACHT: Persoenliches. */}
          <article className={TILE} id="was-mich-ausmacht">
            <div className="flex items-center gap-3.5">
              <IconBox icon={ICONS.heart} bg="#fde8f1" fg="#a3195b" />
              <div className="min-w-0">
                <h2 className="text-[21px] font-semibold leading-tight">{t("makes.title")}</h2>
                <p className={MUTED}>{t("makes.sub")}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-2.5">
              <p className={LABEL}>{t("makes.strengths")}</p>
              {props.strengths.length > 0 ? (
                props.strengths.map((line, index) => (
                  <div key={line} className="profile-rise flex items-start gap-3 rounded-2xl bg-[#f7f6fb] px-3.5 py-3" style={{ animationDelay: `${0.1 + index * 0.15}s` }}>
                    <span className="mt-0.5 flex-none text-[#a3195b]">{ICONS.spark}</span>
                    <span className="min-w-0 break-words text-[15.5px] leading-[1.5]">{line}</span>
                  </div>
                ))
              ) : (
                <p className={MUTED}>{t("makes.strengthsEmpty")}</p>
              )}
              <p className={`${LABEL} mt-1.5`}>{t("makes.direction")}</p>
              {props.direction.length > 0 ? (
                props.direction.map((line, index) => (
                  <div key={line} className="profile-rise flex items-start gap-3 rounded-2xl bg-[#fff8e6] px-3.5 py-3" style={{ animationDelay: `${0.4 + index * 0.15}s` }}>
                    <span className="mt-0.5 flex-none text-[#7a4300]">{ICONS.flag}</span>
                    <span className="min-w-0 break-words text-[15.5px] leading-[1.5]">{line}</span>
                  </div>
                ))
              ) : (
                <p className={MUTED}>{t("makes.directionEmpty")}</p>
              )}
            </div>
            <div className="no-print mt-1.5 flex flex-wrap items-center gap-x-5">
              <Link href={props.hasStrengths ? "#staerken" : props.hrefs.strengths} className={LINK}>
                {props.hasStrengths ? t("makes.seeStrengths") : t("makes.startStrengths")}
              </Link>
              <Link href={props.hasDirection ? "#antrieb" : props.hrefs.direction} className={LINK}>
                {props.hasDirection ? t("makes.seeDirection") : t("makes.startDirection")}
              </Link>
            </div>
          </article>

          {/* WIE ICH ARBEITE: nur, was getragen in eine Richtung zeigt - eine Lage zwischen zwei Polen. */}
          <article className={TILE} id="wie-ich-arbeite">
            <div className="flex items-center gap-3.5">
              <IconBox icon={ICONS.chart} bg="#dff4f3" fg="#0b6b6e" />
              <div className="min-w-0">
                <h2 className="text-[21px] font-semibold leading-tight">{t("work.title")}</h2>
                <p className={MUTED}>{t("work.sub")}</p>
              </div>
            </div>
            {props.workBars.length > 0 ? (
              <div className="mt-1.5 flex flex-col gap-3.5">
                {props.workBars.map((bar, index) => (
                  <div key={bar.key} className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-3">
                    <span className="text-[14.5px] font-semibold">{bar.label}</span>
                    <span className="flex min-w-0 flex-col gap-1">
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
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`${MUTED} mt-1.5`}>{props.hasWorkProfile ? t("work.noDirection") : t("work.empty")}</p>
            )}
            <Link href={props.hrefs.work} className={`${LINK} no-print mt-1.5`}>
              {props.hasWorkProfile ? t("work.open") : t("work.start")}
            </Link>
          </article>
        </div>
      </div>

      {/* SO WILLST DU GRUENDEN */}
      <section className={`${TILE} flex-row flex-wrap items-center gap-5`} aria-labelledby="profile-venture-title">
        <IconBox icon={ICONS.rocket} bg="#fdecc8" fg="#7a4300" />
        <div className="min-w-0 flex-[1_1_360px]">
          <h2 id="profile-venture-title" className="text-[21px] font-semibold leading-tight">{t("venture.title")}</h2>
          <p className={`${MUTED} mt-1`}>{props.hasVenture ? t("venture.have", { name: props.ventureName ?? t("venture.unnamed") }) : t("venture.text")}</p>
        </div>
        <Link href={props.hasVenture ? "#vorhaben" : props.hrefs.venture} className={`${BTN_PRIMARY} no-print`}>
          {props.hasVenture ? t("venture.open") : t("venture.create")}
        </Link>
      </section>

      {/* WER SIEHT WAS: Jede Freigabe einzeln, an ihrem eigenen Ort. Hier steht kein Zustand - der liegt dort. */}
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

    </div>
  );
}
