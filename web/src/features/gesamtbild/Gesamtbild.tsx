import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { initialOf } from "@/features/align/alignModel";
import { SpaceBackdrop } from "@/features/align/SpaceBackdrop";
import type { GesamtbildData } from "@/features/gesamtbild/gesamtbildData";
import { capabilityGroups, type CapabilityGroupKey } from "@/features/gesamtbild/gesamtbildModel";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import { workstyleSetupHref } from "@/features/reporting/workstyle/setupHandoff";
import { PrintButton } from "@/features/teams/PrintButton";
import { UserText } from "@/features/ui/UserText";
import type { OwnershipWish } from "@/features/capability/capabilityTypes";
import "@/features/align/align.css";

type T = Awaited<ReturnType<typeof getTranslations>>;

const H3 = "m-0 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#5b36d4]";
const TILE = "gb-tile rounded-[20px] border border-[#e6e4f2] bg-white p-5";
const WHO_PILL = "inline-flex items-center gap-2 self-start rounded-full border border-[#e6e4f2] bg-white px-3.5 py-1.5 text-sm text-[#4a4d68]";
const EYE = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4d68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/**
 * Das Gesamtbild (Entwurf vom 12.11.2026): drei Kapitel - Ich, Du, Unser Startup.
 *
 * Es beschreibt und bewertet nicht: keine Zahl, kein Typ, keine Rangfolge, nie „passt“. Jedes Kapitel
 * nennt, wer es sieht. Was nicht geteilt wurde, steht nicht da - auch nicht als Lücke. Die Seite ist
 * zugleich das PDF: Der Browser druckt sie hell, ohne Bewegung und ohne Knöpfe (`@media print`).
 */
export async function Gesamtbild({ data, locale }: { data: GesamtbildData; locale: string }) {
  const [t, tCapability, tStrengths, tSetup] = await Promise.all([
    getTranslations("align.report"),
    getTranslations("capability"),
    getTranslations("strengths"),
    getTranslations("teams.setup"),
  ]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Berlin" }).format(data.generatedAt);
  const teamBase = `/teams/${encodeURIComponent(data.teamId)}`;

  const groups = capabilityGroups(data.ich.capability.map((entry) => ({ areaId: entry.areaId, ownershipWish: entry.ownershipWish as OwnershipWish | null })));
  const groupKeys: CapabilityGroupKey[] = ["own", "grow", "handOff"];

  const chapters = [
    { href: "#ich", num: "01", key: "ich" as const, who: t("chapters.ich.who") },
    { href: "#du", num: "02", key: "du" as const, who: t("chapters.du.who") },
    { href: "#startup", num: "03", key: "startup" as const, who: t("chapters.startup.who") },
  ];

  const ownStrengthItems = data.ich.strengths.map((strength) => ({ label: strength.label, statement: strength.statement }));
  const strengthColumns = [
    { id: "viewer", name: data.viewerName, items: ownStrengthItems },
    ...data.du.strengths.filter((person) => !person.isViewer).map((person) => ({ id: person.userId, name: person.name, items: person.items })),
  ].filter((column) => column.items.length > 0);

  return (
    <div className="gb-page align-dots work-ui text-base leading-relaxed text-[#14152b]">
      <header className="gb-cover align-hero">
        <SpaceBackdrop count={60} seed={23} glowClassName="left-1/2 top-10 -ml-[60px] h-[520px] w-[640px]" />
        <div className="relative mx-auto flex max-w-[1120px] flex-col gap-12 px-6 pb-16 pt-12">
          <div className="gb-screen-only flex flex-wrap items-center gap-3">
            <Link href="/align" className="text-sm text-[#b9bbd6] hover:text-white">{t("back")}</Link>
            <PrintButton
              label={t("pdf")}
              className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#14152b]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
              <p className="align-fade-up text-[13px] font-semibold uppercase tracking-[0.18em] text-[#c9bbf7]">{t("cover.eyebrow")}</p>
              <h1 className="font-brand m-0 text-[clamp(56px,8vw,104px)] font-light leading-[0.95] tracking-[-0.02em]">
                <span className="align-fade-up block" style={{ animationDelay: "0.1s" }}>{t("cover.line1")}</span>
                <span className="align-fade-up block" style={{ animationDelay: "0.3s" }}>{t("cover.line2")}</span>
                <span className="align-fade-up block italic text-[#c9bbf7]" style={{ animationDelay: "0.5s" }}>{t("cover.line3")}</span>
              </h1>
              <p className="align-fade-up text-[15px] text-[#a9abcb]" style={{ animationDelay: "0.7s" }}>
                {t("cover.meta", { team: data.teamName, date, name: data.viewerName })}
              </p>
            </div>
            <div className="gb-cover-deco flex flex-[0_1_400px] justify-center">
              <svg viewBox="0 0 480 480" role="img" aria-label={t("cover.ringsLabel")} className="h-auto w-full max-w-[400px] overflow-visible">
                <circle className="gb-ring" cx="240" cy="240" r="210" fill="none" stroke="#4a3a9e" strokeWidth="1.5" />
                <g className="gb-orbit">
                  <circle cx="450" cy="240" r="5" fill="#c9bbf7" />
                  <circle cx="30" cy="240" r="3" fill="#9c86f0" />
                  <circle cx="240" cy="30" r="3" fill="#9c86f0" />
                </g>
                <g className="gb-drift-l">
                  <circle cx="190" cy="240" r="100" fill="#6d49e0" fillOpacity="0.28" stroke="#9c86f0" strokeWidth="1.5" />
                  <text x="150" y="246" textAnchor="middle" fontFamily="Spectral, Georgia, serif" fontSize="24" fill="#fff">{t("chapters.ich.title")}</text>
                </g>
                <g className="gb-drift-r">
                  <circle cx="290" cy="240" r="100" fill="#34c3a9" fillOpacity="0.16" stroke="#7fdccb" strokeWidth="1.5" />
                  <text x="330" y="246" textAnchor="middle" fontFamily="Spectral, Georgia, serif" fontSize="24" fill="#fff">{t("chapters.du.title")}</text>
                </g>
              </svg>
            </div>
          </div>
          <p className="align-fade-up font-brand m-0 max-w-[760px] text-[23px] leading-normal text-[#d6d7e4]" style={{ animationDelay: "0.9s" }}>{t("cover.intro")}</p>
          <nav aria-label={t("cover.contents")} className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {chapters.map((chapter, index) => (
              <a
                key={chapter.key}
                href={chapter.href}
                className="align-fade-up flex flex-col gap-2 rounded-[20px] border border-white/10 bg-white/5 p-5"
                style={{ animationDelay: `${(1.05 + index * 0.12).toFixed(2)}s` }}
              >
                <span className="font-brand text-[34px] leading-none text-[#9c86f0]">{chapter.num}</span>
                <span className="font-brand text-2xl text-white">{t(`chapters.${chapter.key}.title`)}</span>
                <span className="text-sm text-[#b9bbd6]">{t(`chapters.${chapter.key}.text`)}</span>
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#9c86f0]/20 px-2.5 py-0.5 text-xs font-semibold text-[#e6deff]">
                  {chapter.who}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-[1120px] px-6 pb-20">
        {/* ------------------------------ 01 Ich ------------------------------ */}
        <section id="ich" className="gb-section flex flex-col gap-10 pb-6 pt-20">
          <ChapterHead num="01" title={t("chapters.ich.title")} who={t("who")} whoText={t("chapters.ich.who")} />

          <div className="gb-reveal flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={H3}>{t("ich.workstyleTitle")}</h3>
              {data.ich.workstyle.state !== "missing" ? (
                <Link href="/me/profile/workstyle" className="gb-screen-only text-sm font-semibold text-[#5b36d4]">{t("ich.fullReport")} →</Link>
              ) : null}
            </div>
            {data.ich.workstyle.state === "missing" ? (
              <Empty text={t("ich.workstyleMissing")} href={CURRENT_WORKSTYLE_HREF} cta={t("ich.workstyleStart")} />
            ) : (
              <>
                {data.ich.workstyle.state === "older" ? <p className="m-0 text-sm text-[#4a4d68]">{t("ich.workstyleOlder")}</p> : null}
                <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
                  {data.ich.workstyle.areas.map((area) => (
                    <div key={area.key} className={`${TILE} flex flex-col gap-2`}>
                      <span className="text-sm text-[#4a4d68]">{area.title}</span>
                      <span className="font-brand text-xl leading-snug">{area.core}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="gb-reveal grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            <div className="flex flex-col gap-4 rounded-[22px] border border-[#e6e4f2] bg-white p-6">
              <h3 className={H3}>{t("ich.capabilityTitle")}</h3>
              {data.ich.capability.length === 0 || groupKeys.every((key) => groups[key].length === 0) ? (
                <Empty text={t("ich.capabilityEmpty")} href="/profile?step=areas" cta={t("ich.capabilityStart")} />
              ) : (
                <div className="flex flex-col gap-3.5">
                  {groupKeys.filter((key) => groups[key].length > 0).map((key) => (
                    <div key={key} className="flex gap-3.5">
                      <span aria-hidden="true" className={`mt-[7px] size-2.5 flex-none rounded-full border-2 border-[#6d49e0] box-border ${key === "own" ? "bg-[#6d49e0]" : key === "grow" ? "bg-transparent" : "border-dashed border-[#9c86f0] bg-transparent"}`} />
                      <div>
                        <div className="text-sm text-[#4a4d68]">{t(`ich.groups.${key}`)}</div>
                        <div className="font-medium">{groups[key].map((areaId) => tCapability(`areaLabels.${areaId}`)).join(", ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative flex flex-col gap-3.5 overflow-hidden rounded-[22px] bg-[#6d49e0] p-6 text-white">
              <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#e6deff]">{t("ich.directionTitle")}</h3>
              {data.ich.direction.length === 0 ? (
                <div className="relative flex flex-col gap-2">
                  <p className="m-0 text-[#e6deff]">{t("ich.directionEmpty")}</p>
                  <Link href="/profile/direction" className="gb-screen-only self-start text-sm font-semibold text-white underline underline-offset-4">{t("ich.directionStart")} →</Link>
                </div>
              ) : (
                data.ich.direction.slice(0, 3).map((entry, index) => (
                  <p key={index} className="font-brand relative m-0 text-[22px] font-light italic leading-snug">
                    »<UserText text={entry.statement} />«
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="gb-reveal flex flex-col gap-4">
            <h3 className={H3}>{t("ich.strengthsTitle")}</h3>
            {data.ich.strengths.length === 0 ? (
              <Empty text={t("ich.strengthsEmpty")} href="/profile/strengths-interview" cta={t("ich.strengthsStart")} />
            ) : (
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                {data.ich.strengths.map((strength) => (
                  <div key={strength.id} className={`${TILE} flex flex-col gap-2.5`}>
                    {strength.domain ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4a4d68]">{tStrengths(`themes.domains.${strength.domain}.title`)}</span>
                    ) : null}
                    <span className="font-brand text-[26px] leading-[1.1]">{strength.label ?? strength.statement}</span>
                    {strength.label ? <span className="text-sm text-[#4a4d68]"><UserText text={strength.statement} /></span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------ 02 Du ------------------------------- */}
        <section id="du" className="gb-section flex flex-col gap-10 pb-6 pt-20">
          <ChapterHead num="02" title={t("chapters.du.title")} who={t("who")} whoText={t("chapters.du.who")} />

          {data.du.others.length === 0 ? (
            <p className="m-0 text-[#4a4d68]">{t("du.alone")}</p>
          ) : (
            <>
              <div className="gb-reveal flex flex-col gap-2.5">
                {data.du.others.map((other) => (
                  <div key={other.userId} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-[#4a4d68]">{t("du.sharedLabel", { name: other.name })}</span>
                    {other.shared.length === 0 ? <span className="text-[#4a4d68]">–</span> : null}
                    {other.shared.map((part) => (
                      <span key={part} className="rounded-full bg-[#e3f3ef] px-3 py-1 font-medium text-[#0b5f57]">✓ {t(`du.parts.${part}`)}</span>
                    ))}
                  </div>
                ))}
                <p className="m-0 text-sm text-[#4a4d68]">{t("du.notShared")}</p>
              </div>

              {data.du.workstyle.state === "waiting" ? (
                <div className="gb-reveal flex flex-col gap-2.5 rounded-[20px] border border-dashed border-[#c9c6dd] p-5">
                  <p className="m-0 text-[#4a4d68]">{t("du.waiting")}</p>
                  <Link href={`${teamBase}/workstyle`} className="gb-screen-only self-start text-sm font-semibold text-[#5b36d4]">{t("du.waitingLink")} →</Link>
                </div>
              ) : (
                <>
                  {data.du.workstyle.similar.length > 0 ? (
                    <div className="gb-reveal flex flex-col gap-4">
                      <h3 className={H3}>{t("du.similarTitle")}</h3>
                      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
                        {data.du.workstyle.similar.map((item) => (
                          <div key={item.key} className={`${TILE} flex items-center gap-4`}>
                            <svg width="56" height="36" viewBox="0 0 56 36" aria-hidden="true" className="flex-none">
                              <circle cx="20" cy="18" r="15" fill="#6d49e0" fillOpacity="0.25" stroke="#6d49e0" strokeWidth="1.5" />
                              <circle cx="36" cy="18" r="15" fill="#34c3a9" fillOpacity="0.2" stroke="#0f8a7e" strokeWidth="1.5" />
                            </svg>
                            <div>
                              <div className="text-sm text-[#4a4d68]">{item.title}</div>
                              <div className="font-brand text-xl leading-snug">{item.summary}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="gb-reveal flex flex-col gap-4">
                    <h3 className={H3}>{t("du.differentTitle")}</h3>
                    {data.du.workstyle.different.length === 0 ? (
                      <p className="m-0 text-[#4a4d68]">{t("du.noDifferences")}</p>
                    ) : (
                      data.du.workstyle.different.map((item) => (
                        <div key={item.key} className="overflow-hidden rounded-3xl border border-[#e6e4f2] bg-white shadow-[0_24px_50px_-36px_rgba(46,30,120,0.5)]">
                          <div className="border-b border-[#eeedf6] px-6 py-4 font-semibold">{item.title}</div>
                          <p className="m-0 px-6 pt-4 text-sm text-[#4a4d68]">{item.label ?? item.summary}</p>
                          <div className="grid gap-px p-0 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                            {item.groups.map((group, index) => (
                              <div key={index} className="px-6 py-5">
                                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#4b2bb8]">
                                  <span aria-hidden="true" className="flex size-[22px] items-center justify-center rounded-full bg-[#6d49e0] text-[11px] text-white">{initialOf(group.names[0])}</span>
                                  {group.names.join(", ")}
                                </div>
                                <div className="font-brand mt-2 text-xl leading-snug">{group.answers.join(" · ")}</div>
                              </div>
                            ))}
                          </div>
                          {item.question ? (
                            <div className="gb-dark-band flex flex-wrap items-baseline gap-x-5 gap-y-2.5 bg-[#14152b] px-6 py-5 text-white">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c9bbf7]">{t("du.talkPrompt")}</span>
                              <span className="font-brand min-w-[240px] flex-1 text-[21px] leading-snug">{item.question}</span>
                              <Link href={workstyleSetupHref(data.teamId, item.key)} className="gb-screen-only rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#14152b]">{t("du.toSetup")}</Link>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div className="gb-reveal flex flex-col gap-4">
                <h3 className={H3}>{t("du.strengthsTitle")}</h3>
                {strengthColumns.length < 2 ? (
                  <p className="m-0 text-[#4a4d68]">{t("du.strengthsNone")}</p>
                ) : (
                  <>
                    <div className="grid gap-5 rounded-3xl border border-[#e6e4f2] bg-white p-6 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                      {strengthColumns.map((column) => (
                        <div key={column.id} className="flex flex-col gap-2">
                          <div className="text-[13px] font-semibold text-[#4a4d68]">{column.name}</div>
                          <div className="flex flex-wrap gap-2">
                            {column.items.map((item, index) => (
                              <span key={index} className="rounded-xl bg-[#efeafd] px-3.5 py-2 font-medium text-[#3f1fb0]">{item.label ?? item.statement}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="m-0 max-w-[760px] text-[#4a4d68]">{t("du.strengthsNote")}</p>
                  </>
                )}
              </div>
            </>
          )}
          <p className="gb-reveal m-0 border-t border-[#e6e4f2] pt-4 text-sm text-[#4a4d68]">{t("du.labsNote")}</p>
        </section>

        {/* ------------------------- 03 Unser Startup ------------------------- */}
        <section id="startup" className="gb-section flex flex-col gap-10 pb-6 pt-20">
          <ChapterHead num="03" title={t("chapters.startup.title")} who={t("who")} whoText={t("chapters.startup.who")} />

          <div className="gb-reveal flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={H3}>{t("startup.teamMapTitle")}</h3>
              <span className="text-sm text-[#4a4d68]">{t("startup.teamMapText")}</span>
            </div>
            {data.startup.teamMap && data.startup.teamMap.tiles.length > 0 ? (
              <>
                <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                  {data.startup.teamMap.tiles.map((tile) => {
                    const family = tCapability(`families.${tile.familyId}`);
                    if (tile.kind === "free") {
                      return (
                        <li key={tile.familyId} className="flex min-h-[130px] flex-col gap-3.5 rounded-[20px] border-2 border-dashed border-[#c9c6dd] p-5">
                          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-[#9c86f0] text-xl text-[#5b36d4]">+</span>
                          <div>
                            <div className="font-brand text-[22px] leading-tight">{family}</div>
                            <div className="text-sm text-[#4a4d68]">{t("startup.free")}</div>
                            <div className="gb-screen-only mt-1 flex flex-col gap-0.5 text-sm font-semibold">
                              <Link href={`/discovery/suche?familie=${encodeURIComponent(tile.familyId)}`} className="text-[#5b36d4]">{t("startup.findLink")} →</Link>
                              <Link href="/connect" className="text-[#5b36d4]">{t("startup.connectLink")} →</Link>
                            </div>
                          </div>
                        </li>
                      );
                    }
                    const names = tile.holders.map((id) => data.startup.teamMap?.memberNames[id] ?? "").filter(Boolean);
                    return (
                      <li key={tile.familyId} className={`${TILE} flex min-h-[130px] flex-col gap-3.5`}>
                        <span className="flex -space-x-2" aria-hidden="true">
                          {tile.holders.slice(0, 3).map((id) => (
                            <span key={id} className="flex size-10 items-center justify-center rounded-full bg-[#6d49e0] font-semibold text-white ring-2 ring-white">{initialOf(data.startup.teamMap?.memberNames[id])}</span>
                          ))}
                        </span>
                        <div>
                          <div className="font-brand text-[22px] leading-tight">{family}</div>
                          <div className="text-sm text-[#4a4d68]">{names.join(", ")}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="m-0 text-sm text-[#4a4d68]">{t("startup.freeFieldNote")}</p>
              </>
            ) : (
              <Empty text={t("startup.teamMapEmpty")} href={`${teamBase}/roles`} cta={t("startup.teamMapEmptyLink")} />
            )}
          </div>

          <div className="gb-reveal flex flex-wrap items-center gap-x-6 gap-y-2.5 rounded-[22px] border border-[#e6e4f2] bg-white p-6">
            <h3 className={H3}>{t("startup.ventureTitle")}</h3>
            <p className="m-0 min-w-[260px] flex-1 text-[#2b2d47]">
              {data.startup.venture === "ready" ? t("startup.ventureReady") : data.startup.venture === "waiting" ? t("startup.ventureWaiting") : t("startup.ventureUnknown")}
            </p>
            <Link href={`${teamBase}/vorhaben-beta`} className="gb-screen-only text-sm font-semibold text-[#5b36d4]">{t("startup.ventureLink")} →</Link>
          </div>

          <div className="gb-reveal flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={H3}>{t("startup.agreedTitle")}</h3>
              <Link href={`${teamBase}/setup`} className="gb-screen-only text-sm font-semibold text-[#5b36d4]">{t("startup.toSetup")} →</Link>
            </div>
            {data.startup.agreedKeys.length === 0 ? (
              <p className="m-0 text-[#4a4d68]">{t("startup.agreedEmpty")}</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {data.startup.agreedKeys.map((key) => (
                  <span key={key} className="inline-flex items-center gap-2 rounded-full border border-[#cfeae3] bg-white px-3.5 py-[7px] font-medium text-[#0b5f57]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f8a7e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                    {tSetup(`items.${key}.title`)}
                  </span>
                ))}
              </div>
            )}
            {data.startup.awaitingConfirmation > 0 ? <p className="m-0 text-sm text-[#4a4d68]">{t("startup.awaiting", { count: data.startup.awaitingConfirmation })}</p> : null}
          </div>
        </section>

        {/* ------------------------ Worüber ihr sprechen könnt ------------------------ */}
        <section className="gb-section gb-dark-band align-hero gb-reveal mt-16 flex flex-col gap-7 rounded-[30px] p-12">
          <SpaceBackdrop count={14} seed={31} glowClassName="-right-[60px] -top-[80px] h-[340px] w-[420px]" />
          <div className="relative flex flex-col gap-2.5">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#c9bbf7]">{t("next.eyebrow")}</p>
            <h2 className="font-brand m-0 text-[clamp(34px,4.4vw,52px)] font-light leading-[1.05]">{t("next.title")}</h2>
          </div>
          {data.startup.talking.length === 0 ? (
            <p className="relative m-0 text-[#b9bbd6]">{t("next.empty")}</p>
          ) : (
            <ol className="relative m-0 grid list-none gap-3.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {data.startup.talking.map((point, index) => (
                <li key={index} className="flex flex-col gap-2 rounded-[20px] border border-white/10 bg-white/5 p-5">
                  <span className="font-brand text-[30px] leading-none text-[#9c86f0]">{index + 1}</span>
                  {point.kind === "workstyle" ? (
                    <>
                      <span className="font-semibold">{data.du.workstyle.different.find((item) => item.key === point.area)?.title}</span>
                      <span className="text-sm text-[#b9bbd6]">{point.question ?? t("next.workstyleLead")}</span>
                    </>
                  ) : (
                    <span className="font-semibold">{t("next.freeField", { family: tCapability(`families.${point.familyId}`) })}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div className="gb-screen-only relative flex flex-wrap gap-2.5">
            <Link href={`${teamBase}/setup`} className="rounded-xl bg-white px-5 py-3 font-semibold text-[#14152b]">{t("next.toSetup")}</Link>
            <PrintButton label={t("pdf")} className="rounded-xl border border-[#3a3c66] px-5 py-3 font-semibold text-white" />
          </div>
        </section>

        <footer className="flex flex-col gap-1 pt-8 text-[13px] text-[#4a4d68]">
          <div>{t("footer.basis", { date })}</div>
          <div>{t("footer.private")}</div>
        </footer>
      </article>
    </div>
  );
}

function ChapterHead({ num, title, who, whoText }: { num: string; title: string; who: string; whoText: string }) {
  return (
    <div className="gb-reveal flex flex-wrap items-end gap-x-8 gap-y-4">
      <span className="gb-outline-num text-[140px]" aria-hidden="true">{num}</span>
      <div className="flex min-w-[260px] flex-[1_1_360px] flex-col gap-2 pb-2.5">
        <h2 className="font-brand m-0 text-[56px] font-normal leading-none">{title}</h2>
        <div className={WHO_PILL}>
          {EYE}
          <span><b className="font-semibold text-[#14152b]">{who}</b> {whoText}</span>
        </div>
      </div>
    </div>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[18px] border border-dashed border-[#c9c6dd] p-5">
      <p className="m-0 text-[#4a4d68]">{text}</p>
      <Link href={href} className="gb-screen-only self-start text-sm font-semibold text-[#5b36d4]">{cta} →</Link>
    </div>
  );
}
