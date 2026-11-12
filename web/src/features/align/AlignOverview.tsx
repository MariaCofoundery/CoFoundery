import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  ALIGN_PART_HREF,
  ALIGN_PART_KEYS,
  initialOf,
  nextOwnPart,
  ownPartsDone,
  type AlignPartKey,
  type AlignPartState,
} from "@/features/align/alignModel";
import type { AlignOverview as AlignOverviewData, AlignTeamView } from "@/features/align/alignOverviewData";
import { SpaceBackdrop } from "@/features/align/SpaceBackdrop";
import "@/features/align/align.css";

type Tone = "done" | "progress" | "open" | "info";
type Row = { key: string; name: string; href: string; status?: { label: string; tone: Tone } };
type Next = { title: string; text: string; cta: string; href: string };
type T = Awaited<ReturnType<typeof getTranslations>>;

const TONE_BADGE: Record<Tone, string> = {
  done: "bg-[#e3f3ef] text-[#0b5f57]",
  progress: "bg-[#fdf0e1] text-[#8a4300]",
  open: "bg-[#f0f1f6] text-[#4a4d68]",
  info: "bg-transparent text-[#4a4d68]",
};
const TONE_DOT: Record<Tone, string> = {
  done: "bg-[#0f8a7e]",
  progress: "bg-[#d97706]",
  open: "bg-[#a3a5bd]",
  info: "bg-[#6d49e0]",
};

const PART_TONE: Record<AlignPartState, Tone> = { done: "done", started: "progress", open: "open" };

/**
 * Die Übersicht von Align (Entwurf vom 12.11.2026): drei Räume, Ich, Wir, Unser Vorhaben.
 *
 * Alles hier beschreibt Stände, nichts bewertet: keine Punkte, keine Prozent, kein "von" bei den
 * Vereinbarungen. Zu jedem Raum gibt es genau EINEN nächsten Schritt. Was andere über dich sehen,
 * steht nirgends auf dieser Seite - sie zeigt nur, was du selbst lesen darfst.
 */
export async function AlignOverview({
  data,
  hasTeamProgram,
}: {
  data: AlignOverviewData;
  hasTeamProgram: boolean;
}) {
  const [t, tCapability] = await Promise.all([getTranslations("align.overview"), getTranslations("capability")]);
  const team = data.team;
  // Das Gesamtbild gibt es fuer ein Team; ohne Team erscheint das Band nicht - kein Knopf ins Leere.
  const gesamtbildHref = team ? `/teams/${encodeURIComponent(team.id)}/gesamtbild` : null;

  const ownDone = ownPartsDone(data.own);
  const ownRows: Row[] = ALIGN_PART_KEYS.map((key) => ({
    key,
    name: t(`parts.${key}`),
    href: ALIGN_PART_HREF[key],
    status: { label: t(`status.${data.own[key]}`), tone: PART_TONE[data.own[key]] },
  }));
  const ownNext = nextStepForOwn(t, data.own);

  const teamBase = team ? `/teams/${encodeURIComponent(team.id)}` : null;
  const wirRows: Row[] = team && teamBase
    ? [
        {
          key: "workstyleTeam",
          name: t("parts.workstyleTeam"),
          href: `${teamBase}/workstyle`,
          status:
            team.workstyleReport === "ready"
              ? { label: t("status.reportReady"), tone: "done" }
              : { label: t("status.reportWaiting"), tone: "progress" },
        },
        { key: "values", name: t("parts.values"), href: `${teamBase}/werte` },
        { key: "roles", name: t("parts.roles"), href: `${teamBase}/roles` },
        { key: "strengthsTeam", name: t("parts.strengthsTeam"), href: `${teamBase}/staerken` },
        ...(hasTeamProgram ? [{ key: "program", name: t("parts.program"), href: "/programm", status: { label: t("status.programHint"), tone: "info" as Tone } }] : []),
      ]
    : [];
  const wirNext: Next = !team || !teamBase
    ? nextText(t, "invite", "/invite/new")
    : nextText(t, team.workstyleReport === "ready" ? "reportReady" : "reportWaiting", `${teamBase}/workstyle`);

  const setup = team?.setup ?? null;
  const vorhabenRows: Row[] = team && teamBase
    ? [
        { key: "venture", name: t("parts.venture"), href: `${teamBase}/vorhaben-beta` },
        {
          key: "setup",
          name: t("parts.setup"),
          href: `${teamBase}/setup`,
          status: setup?.started
            ? {
                label:
                  setup.awaitingConfirmation > 0
                    ? t("status.setupAwaiting", { count: setup.awaitingConfirmation })
                    : t("status.setupSettled", { count: setup.settled }),
                tone: setup.awaitingConfirmation > 0 ? "progress" : "info",
              }
            : undefined,
        },
        { key: "funding", name: t("parts.funding"), href: `${teamBase}/finanzierung` },
        { key: "tradeoffs", name: t("parts.tradeoffs"), href: `${teamBase}/zielkonflikte` },
        { key: "testProject", name: t("parts.testProject"), href: `${teamBase}/test-project` },
      ]
    : [];
  const vorhabenNext: Next = !team || !teamBase
    ? nextText(t, "noTeam", "/connections")
    : setup && setup.awaitingConfirmation > 0
      ? nextText(t, "setupConfirm", `${teamBase}/setup`, { count: setup.awaitingConfirmation })
      : setup?.started
        ? nextText(t, "setupContinue", `${teamBase}/setup`, { count: setup.settled })
        : nextText(t, "setupStart", `${teamBase}/setup`);

  const rooms = [
    { key: "ich" as const, num: "01", level: 1, rows: ownRows, next: ownNext, footer: { label: t("rooms.ich.footer"), href: "/me/profile" }, progress: t("rooms.ich.progress", { done: ownDone, total: ALIGN_PART_KEYS.length }) },
    { key: "wir" as const, num: "02", level: 2, rows: wirRows, next: wirNext, footer: { label: t("rooms.wir.footer"), href: teamBase ?? "/connections" }, progress: null },
    { key: "vorhaben" as const, num: "03", level: 3, rows: vorhabenRows, next: vorhabenNext, footer: { label: t("rooms.vorhaben.footer"), href: teamBase ? `${teamBase}/setup` : "/connections" }, progress: null },
  ];

  return (
    <div className="align-dots work-ui min-h-screen text-[#14152b]">
      <div className="align-stage">
        <section className="align-hero pb-[150px]">
          <SpaceBackdrop />
          <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-12 gap-y-8 px-6 pt-12">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[18px]">
              <p className="align-fade-up text-[13px] font-semibold uppercase tracking-[0.16em] text-[#c9bbf7]">{t("eyebrow")}</p>
              <h1
                className="align-fade-up font-brand text-[clamp(40px,5.4vw,68px)] font-normal leading-[1.04] tracking-[-0.015em]"
                style={{ animationDelay: "0.1s" }}
              >
                {t("title")}
              </h1>
              <p className="align-fade-up max-w-[540px] text-lg leading-relaxed text-[#b9bbd6]" style={{ animationDelay: "0.25s" }}>
                {t("text")}
              </p>
              <div className="align-fade-up flex flex-wrap gap-2.5" style={{ animationDelay: "0.4s" }}>
                {rooms.map((room) => (
                  <a key={room.key} href={`#raum-${room.key}`} data-room={room.key} className="align-pill">
                    <span className="align-pill-dot" aria-hidden="true" />
                    {t(`rooms.${room.key}.title`)}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-[0_1_440px] justify-center">
              <RoomRings label={t("ringsLabel")} ich={t("rooms.ich.title")} wir={t("rooms.wir.title")} vorhaben={t("rooms.vorhaben.title")} members={team?.members.map((member) => initialOf(member.name)) ?? []} />
            </div>
          </div>
        </section>

        <main className="relative z-10 mx-auto -mt-[110px] flex max-w-[1240px] flex-col gap-10 px-6 pb-[72px]">
          <section aria-label={t("pageTitle")} className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {rooms.map((room, index) => (
              <article
                key={room.key}
                id={`raum-${room.key}`}
                data-room={room.key}
                className="align-room align-rise flex flex-col gap-[18px] rounded-[26px] border border-[#e6e4f2] bg-white p-6 shadow-[0_20px_50px_-34px_rgba(46,30,120,0.45)]"
                style={{ animationDelay: `${(0.15 + index * 0.12).toFixed(2)}s` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-brand text-[15px] tracking-[0.08em] text-[#6f5bc9]">{room.num}</span>
                  <MiniRings level={room.level} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h2 className="font-brand text-4xl font-normal leading-[1.05]">{t(`rooms.${room.key}.title`)}</h2>
                    {room.key === "ich" && room.progress ? <span className="ml-auto text-[13px] text-[#4a4d68]">{room.progress}</span> : null}
                    {room.key === "wir" && team ? <TeamSwitcher team={team} others={data.otherTeams} label={t("rooms.wir.switchTeam")} /> : null}
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#4a4d68]">{t(`rooms.${room.key}.text`)}</p>
                </div>

                <NextBox label={t("next")} next={room.next} />

                {room.rows.length > 0 ? (
                  <ul className="m-0 flex list-none flex-col p-0">
                    {room.rows.map((row) => (
                      <li key={row.key} className="flex items-center justify-between gap-3 border-t border-[#eeedf6] py-[11px]">
                        <Link href={row.href} className="align-row-link flex items-center gap-2.5 font-medium">
                          <span className={`size-2 flex-none rounded-full ${TONE_DOT[row.status?.tone ?? "info"]}`} aria-hidden="true" />
                          {row.name}
                        </Link>
                        {row.status ? (
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-[3px] text-[13px] font-medium ${TONE_BADGE[row.status.tone]}`}>{row.status.label}</span>
                        ) : (
                          <span aria-hidden="true" className="text-[#a3a5bd]">→</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : room.key === "vorhaben" ? (
                  <p className="rounded-2xl bg-[#f6f5fb] p-4 text-sm leading-relaxed text-[#4a4d68]">{t("rooms.vorhaben.noTeam")}</p>
                ) : null}

                {room.key === "wir" && team && teamBase ? (
                  <div className="flex flex-col gap-2 rounded-[14px] bg-[#f6f5fb] p-3.5">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-semibold">{t("pair.title")}</span>
                      <span className="text-[#4a4d68]">{t("pair.note")}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: t("pair.commitment"), href: `${teamBase}/commitment-lab` },
                        { label: t("pair.readMyMind"), href: `${teamBase}/collaboration-lab/read-my-mind` },
                        { label: t("pair.inTheWild"), href: `${teamBase}/collaboration-lab/founder-in-the-wild` },
                      ].map((chip) => (
                        <Link key={chip.href} href={chip.href} className="rounded-full border border-[#e2e0ef] bg-white px-3 py-[5px] text-[13px] text-[#14152b] hover:border-[#9c86f0]">
                          {chip.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {room.key === "vorhaben" && team ? <TeamMap team={team} t={t} tCapability={tCapability} /> : null}

                <Link href={room.footer.href} className="text-sm font-semibold text-[#5b36d4] hover:text-[#3f1fb0]">
                  {room.footer.label} →
                </Link>
              </article>
            ))}
          </section>

          {gesamtbildHref ? <GesamtbildBand t={t} href={gesamtbildHref} /> : null}

          <section aria-label={t("seen.title")} className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {(["ich", "wir", "vorhaben"] as const).map((key) => (
              <div key={key} className="flex gap-3 rounded-[18px] border border-[#e6e4f2] bg-white p-[18px]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b36d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none">
                  {key === "ich" ? (
                    <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>
                  ) : key === "wir" ? (
                    <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>
                  ) : (
                    <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="3" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M15.5 14.2c3.3-.4 6 1.7 6 5.3" /></>
                  )}
                </svg>
                <div>
                  <div className="font-semibold">{t(`seen.${key}.title`)}</div>
                  <div className="text-sm text-[#4a4d68]">{t(`seen.${key}.text`)}</div>
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

function nextText(t: T, key: string, href: string, values?: Record<string, string | number>): Next {
  return { title: t(`nextStep.${key}.title`), text: t(`nextStep.${key}.text`, values), cta: t(`nextStep.${key}.start`), href };
}

function nextStepForOwn(t: T, states: Record<AlignPartKey, AlignPartState>): Next {
  const key = nextOwnPart(states);
  if (!key) return nextText(t, "allDone", "/me/profile");
  const next = nextText(t, key, ALIGN_PART_HREF[key]);
  if (key === "work" && states.work === "started") return { ...next, cta: t("nextStep.work.continue") };
  return next;
}

function NextBox({ label, next }: { label: string; next: Next }) {
  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-[18px] bg-[#14152b] p-[18px] text-white">
      <svg aria-hidden="true" width="160" height="160" viewBox="0 0 160 160" className="pointer-events-none absolute -right-[50px] -top-[50px] opacity-50">
        <circle cx="80" cy="80" r="70" fill="none" stroke="#3b2c8a" strokeWidth="1" />
        <circle cx="80" cy="80" r="45" fill="none" stroke="#3b2c8a" strokeWidth="1" />
      </svg>
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c9bbf7]">{label}</p>
      <p className="font-brand relative text-[22px] leading-[1.2]">{next.title}</p>
      <p className="relative text-sm text-[#b9bbd6]">{next.text}</p>
      <Link href={next.href} className="relative mt-1 self-start rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#14152b] hover:bg-[#efeafd]">
        {next.cta} →
      </Link>
    </div>
  );
}

function MiniRings({ level }: { level: number }) {
  const on = (n: number) => (n === level ? "#6d49e0" : "#d9d5ec");
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" strokeWidth="1.5" stroke={on(3)} />
      <circle cx="20" cy="20" r="12" fill="none" strokeWidth="1.5" stroke={on(2)} />
      <circle cx="20" cy="20" r="6" strokeWidth="1.5" stroke={on(1)} fill={level === 1 ? "#6d49e0" : "none"} />
    </svg>
  );
}

/** Drei Ringe: innen Ich, in der Mitte Wir (mit den Initialen des Teams), außen Unser Vorhaben. */
function RoomRings({ label, ich, wir, vorhaben, members }: { label: string; ich: string; wir: string; vorhaben: string; members: string[] }) {
  return (
    <svg viewBox="0 0 440 440" role="img" aria-label={label} className="h-auto w-full max-w-[440px] overflow-visible">
      <circle className="align-ring align-ring-vorhaben" cx="220" cy="220" r="190" fill="none" strokeWidth="1.5" />
      <circle className="align-ring align-ring-wir" cx="220" cy="220" r="130" fill="none" strokeWidth="1.5" />
      <circle className="align-ring align-ring-ich" cx="220" cy="220" r="70" fill="none" strokeWidth="1.5" />
      <g className="align-orbit-c">
        <circle cx="410" cy="220" r="4" fill="#9c86f0" />
        <circle cx="30" cy="220" r="3" fill="#6f5bc9" />
        <circle cx="220" cy="410" r="4" fill="#9c86f0" />
        <circle cx="85.6" cy="85.6" r="3" fill="#6f5bc9" />
        <circle cx="354.4" cy="354.4" r="3" fill="#6f5bc9" />
      </g>
      <g className="align-orbit-b">
        {members.slice(0, 4).map((initial, index) => {
          const angle = (index / Math.min(members.length, 4)) * 2 * Math.PI;
          const x = 220 + 130 * Math.cos(angle);
          const y = 220 + 130 * Math.sin(angle);
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="15" fill="#2a1f6b" stroke="#c9bbf7" strokeWidth="1.5" />
              <text x={x} y={y + 5} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#fff">{initial}</text>
            </g>
          );
        })}
      </g>
      <g className="align-orbit-a"><circle cx="290" cy="220" r="5" fill="#fff" /></g>
      <circle className="align-core" cx="220" cy="220" r="34" fill="#6d49e0" opacity="0.5" />
      <circle cx="220" cy="220" r="20" fill="#e6deff" />
      <g fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" textAnchor="middle">
        <rect className="align-label-bg align-label-ich" x="196" y="270" width="48" height="24" rx="12" />
        <text x="220" y="286" fill="#fff">{ich}</text>
        <rect className="align-label-bg align-label-wir" x="190" y="78" width="60" height="24" rx="12" />
        <text x="220" y="94" fill="#fff">{wir}</text>
        <rect className="align-label-bg align-label-vorhaben" x="150" y="18" width="140" height="24" rx="12" />
        <text x="220" y="34" fill="#fff">{vorhaben}</text>
      </g>
    </svg>
  );
}

function TeamSwitcher({ team, others, label }: { team: AlignTeamView; others: { id: string; name: string }[]; label: string }) {
  const pill = "ml-auto max-w-[60%] truncate rounded-full border border-[#e2e0ef] bg-white px-3 py-1.5 text-[13px] font-medium text-[#14152b]";
  if (others.length === 0) return <span className={pill}>{team.name}</span>;
  return (
    <details className="relative ml-auto max-w-[60%]">
      <summary aria-label={label} className={`${pill} ml-0 block cursor-pointer list-none`}>
        {team.name} ▾
      </summary>
      <ul className="absolute right-0 z-20 mt-1 flex min-w-[200px] list-none flex-col rounded-2xl border border-[#e6e4f2] bg-white p-1.5 shadow-lg">
        {others.map((other) => (
          <li key={other.id}>
            <Link href={`/align?team=${encodeURIComponent(other.id)}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-[#f6f5fb]">
              {other.name}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

function TeamMap({ team, t, tCapability }: { team: AlignTeamView; t: T; tCapability: T }) {
  const map = team.teamMap;
  const base = `/teams/${encodeURIComponent(team.id)}`;
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-[#f6f5fb] p-3.5">
      <div className="text-sm font-semibold">{t("teamMap.title")}</div>
      {map && map.tiles.length > 0 ? (
        <>
          <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-3">
            {map.tiles.map((tile) => {
              const family = tCapability(`families.${tile.familyId}`);
              if (tile.kind === "free") {
                return (
                  <li key={tile.familyId}>
                    <Link
                      href={`/discovery/suche?familie=${encodeURIComponent(tile.familyId)}`}
                      aria-label={`${family}: ${t("teamMap.free")}. ${t("teamMap.findLink")}`}
                      className="align-gap-tile flex h-full flex-col items-center gap-1 rounded-[10px] border-[1.5px] border-dashed border-[#b9b5d6] p-2 text-center text-[#4b2bb8]"
                    >
                      <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#9c86f0] text-sm">+</span>
                      <span className="text-[11px] leading-tight">{family}</span>
                    </Link>
                  </li>
                );
              }
              const names = tile.holders.map((id) => map.memberNames[id] ?? "").filter(Boolean);
              return (
                <li key={tile.familyId} className="flex flex-col items-center gap-1 rounded-[10px] bg-white p-2 text-center">
                  <span className="flex -space-x-1.5" aria-hidden="true">
                    {tile.holders.slice(0, 3).map((id) => (
                      <span key={id} className="flex size-6 items-center justify-center rounded-full bg-[#6d49e0] text-[11px] font-semibold text-white ring-2 ring-white">
                        {initialOf(map.memberNames[id])}
                      </span>
                    ))}
                  </span>
                  <span className="text-[11px] leading-tight">{family}</span>
                  <span className="sr-only">{t("teamMap.heldBy", { names: names.join(", ") })}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-[#4a4d68]">{t("teamMap.note")}</p>
        </>
      ) : (
        <p className="text-sm text-[#4a4d68]">
          {t("teamMap.empty")}{" "}
          <Link href={`${base}/roles`} className="font-semibold text-[#5b36d4]">{t("teamMap.emptyLink")} →</Link>
        </p>
      )}
    </div>
  );
}

function GesamtbildBand({ t, href }: { t: T; href: string }) {
  return (
    <section className="align-hero flex flex-wrap items-center gap-9 rounded-[28px] p-11">
      <SpaceBackdrop count={20} seed={5} glowClassName="-bottom-[120px] -left-[80px] h-[320px] w-[420px]" />
      <div className="relative flex min-w-0 flex-[1_1_400px] flex-col gap-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9bbf7]">{t("gesamtbild.eyebrow")}</p>
        <h2 className="font-brand text-[clamp(34px,4vw,52px)] font-normal leading-[1.05]">{t("gesamtbild.title")}</h2>
        <p className="max-w-[520px] text-[17px] text-[#b9bbd6]">{t("gesamtbild.text")}</p>
        <Link href={href} className="mt-2 self-start rounded-xl bg-white px-5 py-3 font-semibold text-[#14152b]">{t("gesamtbild.open")}</Link>
      </div>
      <div aria-hidden="true" className="relative h-[280px] flex-[0_1_340px]">
        {[
          { r: "-8deg", left: 20, top: 30, bg: "#1c1d36", num: "03", color: "#6f5bc9", delay: "0.6s" },
          { r: "-2deg", left: 80, top: 14, bg: "#24254a", num: "02", color: "#9c86f0", delay: "0.3s" },
          { r: "5deg", left: 140, top: 0, bg: "#ffffff", num: "01", color: "#6d49e0", delay: "0s" },
        ].map((page) => (
          <div
            key={page.num}
            className="align-page absolute box-border h-[240px] w-[190px] rounded-[14px] border border-[#2e3050] p-[18px]"
            style={{ ["--r" as string]: page.r, left: page.left, top: page.top, background: page.bg, color: page.bg === "#ffffff" ? "#14152b" : "#fff", animationDelay: page.delay }}
          >
            <div className="font-brand text-[40px] leading-none" style={{ color: page.color }}>{page.num}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
