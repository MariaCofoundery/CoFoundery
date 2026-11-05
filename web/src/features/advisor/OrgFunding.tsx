import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";
import {
  addRequirementEntryAction,
  deleteFundingSnapshotAction,
  deleteGrantAction,
  deleteRequirementAction,
  deleteRequirementEntryAction,
  requirementTaskAction,
  saveGrantAction,
  saveRequirementAction,
  takeFundingSnapshotAction,
} from "@/features/advisor/fundingActions";
import {
  EVENT_KINDS,
  MEASURES_OF_KIND,
  REQUIREMENT_KINDS,
  teamsFulfilled,
  type FundingReport,
  type FundingSnapshot,
  type Grant,
  type Requirement,
  type RequirementEntry,
  type ReportRequirement,
} from "@/features/advisor/fundingModel";

/**
 * Foerderauflagen (seit 05.11.2026): Foerderung anlegen, Auflagen einpflegen, Nachweise abhaken,
 * Bericht ziehen. Keine Prozente, keine Ampel - "6 von 8", "erfuellt", "noch offen".
 */

const CARD = "advisor-card p-5 sm:p-6";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const PRIMARY = "brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold";
const QUIET = "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50";
const CHIP = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";

export const REQUIREMENT_SUGGESTIONS = {
  workshops: { kind: "count", measure: "events", eventKind: "education", target: 8, unit: "" },
  teams: { kind: "count", measure: "teams", eventKind: "", target: 10, unit: "" },
  attendance: { kind: "per_team", measure: "event_attendance", eventKind: "education", target: 6, unit: "" },
  coaching: { kind: "per_team", measure: "manual", eventKind: "", target: 10, unit: "hours" },
  talks: { kind: "per_team", measure: "check_ins", eventKind: "", target: 4, unit: "" },
  interim: { kind: "once", measure: "manual", eventKind: "", target: null, unit: "" },
  final: { kind: "once", measure: "manual", eventKind: "", target: null, unit: "" },
} as const;
export type SuggestionKey = keyof typeof REQUIREMENT_SUGGESTIONS;
export const isSuggestionKey = (value: unknown): value is SuggestionKey => typeof value === "string" && value in REQUIREMENT_SUGGESTIONS;

export type FundingContext = {
  orgId: string;
  isOwner: boolean;
  canWrite: boolean;
  locale: string;
  today: string;
  programs: { programId: string; name: string }[];
  feedback: { error: string | null; saved: boolean; deleted: boolean; snapshot: boolean };
};

function dayFormatter(locale: string) {
  const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
  return (iso: string) => format.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
const num = (locale: string, value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

function Hidden({ ctx, grantId, requirementId }: { ctx: FundingContext; grantId?: string; requirementId?: string }) {
  return (
    <>
      <input type="hidden" name="orgId" value={ctx.orgId} />
      {grantId ? <input type="hidden" name="grantId" value={grantId} /> : null}
      {requirementId ? <input type="hidden" name="requirementId" value={requirementId} /> : null}
    </>
  );
}

/** Der Bericht - im Reiter, in der Druckansicht und fuer festgehaltene Staende derselbe. */
export async function FundingReportView({ report, locale, compact = false, firstNumber = 1 }: { report: FundingReport; locale: string; compact?: boolean; firstNumber?: number }) {
  const t = await getTranslations("advisor.funding");
  const day = dayFormatter(locale);
  const amount = (requirement: ReportRequirement, value: number) =>
    requirement.unit ? `${num(locale, value)} ${requirement.unit}` : num(locale, value);
  return (
    <ol className="grid gap-4">
      {report.requirements.map((requirement, index) => (
        <li key={requirement.id} className={`break-inside-avoid rounded-2xl border bg-white p-4 sm:p-5 ${requirement.fulfilled ? "border-emerald-200" : requirement.overdue ? "border-rose-200" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{`${firstNumber + index}. ${t(`kinds.${requirement.kind}`)}`}</p>
              <h3 className="mt-0.5 text-base font-semibold text-slate-950">{requirement.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {t(`measures.${requirement.measure}`, { kind: requirement.eventKind ? t(`eventKinds.${requirement.eventKind}`) : t("eventKinds.any") })}
                {requirement.dueOn ? ` · ${t("dueOn", { date: day(requirement.dueOn) })}` : ""}
              </p>
            </div>
            <span className={`${CHIP} ${requirement.fulfilled ? "bg-emerald-100 text-emerald-900" : requirement.overdue ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
              {requirement.fulfilled ? t("fulfilled") : requirement.overdue ? t("overdue") : t("open")}
            </span>
          </div>
          {requirement.kind === "count" && requirement.target !== null ? (
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {t("ofTarget", { achieved: amount(requirement, requirement.achieved), target: amount(requirement, requirement.target) })}
            </p>
          ) : null}
          {requirement.kind === "per_team" && requirement.target !== null ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-slate-900">
                {t("teamsFulfilled", { done: teamsFulfilled(requirement), total: requirement.teams.length, target: amount(requirement, requirement.target) })}
              </p>
              {requirement.teams.length === 0 ? <p className="mt-1 text-xs text-slate-500">{t("noTeamsVisible")}</p> : (
                <table className="mt-2 w-full border-collapse text-sm">
                  <tbody>
                    {requirement.teams.map((team) => (
                      <tr key={team.programId} className="border-t border-slate-100">
                        <td className="py-1.5 pr-3 text-slate-800">{team.name}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-slate-800">{t("ofTarget", { achieved: amount(requirement, team.achieved), target: amount(requirement, requirement.target as number) })}</td>
                        <td className="py-1.5 text-right">
                          <span className={`${CHIP} ${team.fulfilled ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>{team.fulfilled ? t("fulfilled") : t("open")}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
          {!compact && requirement.evidence.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-600">{t("evidenceTitle")}</p>
              <ul className="mt-1 grid gap-1 text-sm text-slate-700">
                {requirement.evidence.map((entry, entryIndex) => (
                  <li key={entryIndex}>
                    {[day(entry.doneOn), requirement.kind === "once" ? null : amount(requirement, entry.amount), entry.teamName].filter(Boolean).join(" · ")}
                    {entry.note ? <span className="text-slate-600"> – <UserText text={entry.note} /></span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

async function RequirementForm({ ctx, grantId, requirement, suggestion }: { ctx: FundingContext; grantId: string; requirement?: Requirement; suggestion?: SuggestionKey | null }) {
  const t = await getTranslations("advisor.funding");
  const preset = suggestion ? REQUIREMENT_SUGGESTIONS[suggestion] : null;
  const kind = requirement?.kind ?? preset?.kind ?? "count";
  const measures = [...new Set(REQUIREMENT_KINDS.flatMap((entry) => MEASURES_OF_KIND[entry]))];
  return (
    <form action={saveRequirementAction} className="grid gap-4">
      <Hidden ctx={ctx} grantId={grantId} requirementId={requirement?.id} />
      <label className="block">
        <span className={LABEL}>{t("form.title")}</span>
        <input name="title" required maxLength={200} defaultValue={requirement?.title ?? (suggestion ? t(`suggestions.${suggestion}`) : "")} className={INPUT} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={LABEL}>{t("form.kind")}</span>
          <select name="kind" defaultValue={kind} className={INPUT}>
            {REQUIREMENT_KINDS.map((entry) => <option key={entry} value={entry}>{t(`kinds.${entry}`)}</option>)}
          </select>
        </label>
        <label className="lg:col-span-2">
          <span className={LABEL}>{t("form.measure")}</span>
          <select name="measure" defaultValue={requirement?.measure ?? preset?.measure ?? "manual"} className={INPUT}>
            {measures.map((entry) => <option key={entry} value={entry}>{t(`measureOptions.${entry}`)}</option>)}
          </select>
        </label>
        <label>
          <span className={LABEL}>{t("form.eventKind")}</span>
          <select name="eventKind" defaultValue={requirement?.eventKind ?? preset?.eventKind ?? ""} className={INPUT}>
            <option value="">{t("eventKinds.any")}</option>
            {EVENT_KINDS.map((entry) => <option key={entry} value={entry}>{t(`eventKinds.${entry}`)}</option>)}
          </select>
        </label>
        <label>
          <span className={LABEL}>{t("form.target")}</span>
          <input name="target" inputMode="decimal" defaultValue={requirement?.target ?? preset?.target ?? ""} className={INPUT} />
        </label>
        <label>
          <span className={LABEL}>{t("form.unit")}</span>
          <input name="unit" maxLength={40} defaultValue={requirement?.unit ?? (preset?.unit === "hours" ? t("hours") : "")} placeholder={t("form.unitPlaceholder")} className={INPUT} />
        </label>
        <label>
          <span className={LABEL}>{t("form.dueOn")}</span>
          <input type="date" name="dueOn" defaultValue={requirement?.dueOn ?? ""} className={INPUT} />
        </label>
      </div>
      <p className="text-xs leading-5 text-slate-500">{t("form.hint")}</p>
      <label className="block">
        <span className={LABEL}>{t("form.notes")}</span>
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={requirement?.notes ?? ""} className={`${INPUT} py-2`} />
      </label>
      <SubmitButton label={requirement ? t("form.save") : t("form.add")} pendingLabel="…" className={PRIMARY} />
    </form>
  );
}

async function GrantForm({ ctx, grant }: { ctx: FundingContext; grant?: Grant }) {
  const t = await getTranslations("advisor.funding");
  return (
    <form action={saveGrantAction} className="grid gap-4 sm:grid-cols-2">
      <Hidden ctx={ctx} grantId={grant?.id} />
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("grant.name")}</span>
        <input name="name" required maxLength={160} defaultValue={grant?.name ?? ""} placeholder={t("grant.namePlaceholder")} className={INPUT} />
      </label>
      <label>
        <span className={LABEL}>{t("grant.funder")}</span>
        <input name="funder" maxLength={160} defaultValue={grant?.funder ?? ""} className={INPUT} />
      </label>
      <label>
        <span className={LABEL}>{t("grant.reference")}</span>
        <input name="reference" maxLength={80} defaultValue={grant?.reference ?? ""} className={INPUT} />
      </label>
      <label>
        <span className={LABEL}>{t("grant.startsOn")}</span>
        <input type="date" name="startsOn" required defaultValue={grant?.startsOn ?? ""} className={INPUT} />
      </label>
      <label>
        <span className={LABEL}>{t("grant.endsOn")}</span>
        <input type="date" name="endsOn" required defaultValue={grant?.endsOn ?? ""} className={INPUT} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("grant.notes")}</span>
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={grant?.notes ?? ""} className={`${INPUT} py-2`} />
      </label>
      <SubmitButton label={grant ? t("grant.save") : t("grant.add")} pendingLabel="…" className={PRIMARY} />
    </form>
  );
}

export async function OrgFunding({
  ctx,
  grants,
  grant,
  requirements,
  entries,
  report,
  snapshots,
  suggestion,
  newGrant,
}: {
  ctx: FundingContext;
  grants: Grant[];
  grant: Grant | null;
  requirements: Requirement[];
  entries: RequirementEntry[];
  report: FundingReport | null;
  snapshots: FundingSnapshot[];
  suggestion: SuggestionKey | null;
  newGrant: boolean;
}) {
  const t = await getTranslations("advisor.funding");
  const day = dayFormatter(ctx.locale);
  const href = (extra: Record<string, string>) => `/advisor/organisation?${new URLSearchParams({ org: ctx.orgId, tab: "funding", ...extra }).toString()}`;
  const ownerCanEdit = ctx.isOwner && ctx.canWrite;
  const message = ctx.feedback.error
    ? { tone: "rose", text: t(`errors.${["owner", "team", "program", "invalid"].includes(ctx.feedback.error) ? ctx.feedback.error : "failed"}`) }
    : ctx.feedback.snapshot
      ? { tone: "emerald", text: t("snapshotSaved") }
      : ctx.feedback.saved || ctx.feedback.deleted
        ? { tone: "emerald", text: t("saved") }
        : null;

  return (
    <div className="grid gap-6">
      {message ? (
        <p role={message.tone === "rose" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${message.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
        </div>
        {grants.length > 0 ? (
          <nav aria-label={t("grantsLabel")} className="flex flex-wrap gap-1.5">
            {grants.map((entry) => (
              <Link key={entry.id} href={href({ grant: entry.id })} aria-current={grant?.id === entry.id ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${grant?.id === entry.id ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                {entry.name}
              </Link>
            ))}
            {ownerCanEdit ? <Link href={href({ newGrant: "1" })} className="inline-flex min-h-10 items-center rounded-full border border-dashed border-violet-300 px-4 text-sm text-violet-800">+ {t("grant.add")}</Link> : null}
          </nav>
        ) : null}
      </div>

      {grants.length === 0 || newGrant ? (
        <section className="brand-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-950">{grants.length === 0 ? t("emptyTitle") : t("grant.add")}</h2>
          {grants.length === 0 ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("emptyText")}</p> : null}
          <div className="mt-5">{ownerCanEdit ? <GrantForm ctx={ctx} /> : <p className="text-sm text-slate-600">{t("ownerOnly")}</p>}</div>
        </section>
      ) : null}

      {grant && report && !newGrant ? (
        <>
          <section className={CARD}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-700">{[grant.funder, grant.reference].filter(Boolean).join(" · ") || t("grant.label")}</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{grant.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("grant.period", { from: day(grant.startsOn), to: day(grant.endsOn), until: day(report.countedUntil) })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/advisor/organisation/foerderung?${new URLSearchParams({ org: ctx.orgId, grant: grant.id }).toString()}`} className={QUIET}>{t("report.view")}</Link>
                <a href={`/advisor/organisation/foerderung/csv?${new URLSearchParams({ org: ctx.orgId, grant: grant.id }).toString()}`} className={QUIET}>{t("report.csv")}</a>
              </div>
            </div>
            {grant.notes ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700"><UserText text={grant.notes} /></p> : null}
            {!ctx.isOwner ? <p className="mt-3 text-xs text-slate-500">{t("visibleTeamsOnly")}</p> : null}
            {ownerCanEdit ? (
              <details className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-800">{t("grant.edit")}</summary>
                <div className="mt-3"><GrantForm ctx={ctx} grant={grant} /></div>
                <form action={deleteGrantAction} className="mt-4 border-t border-slate-100 pt-3">
                  <Hidden ctx={ctx} grantId={grant.id} />
                  <SubmitButton label={t("grant.delete")} pendingLabel="…" className="text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
                </form>
              </details>
            ) : null}
          </section>

          {report.requirements.length === 0 ? <p className="text-sm text-slate-600">{t("requirementsEmpty")}</p> : null}
          <ol className="grid gap-4">
            {report.requirements.map((item, index) => {
              const requirement = requirements.find((entry) => entry.id === item.id);
              const mine = entries.filter((entry) => entry.requirementId === item.id);
              return (
                <li key={item.id} className="grid gap-3">
                  <FundingReportView report={{ ...report, requirements: [item] }} locale={ctx.locale} compact firstNumber={index + 1} />
                  <details className="-mt-2 rounded-b-2xl border border-t-0 border-slate-200 bg-slate-50/70 px-4 py-2">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">
                      {t("evidenceSummary", { count: mine.length, index: index + 1 })}
                    </summary>
                    <ul className="mt-1 grid gap-1.5">
                      {mine.map((entry) => (
                        <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                          <span>
                            {[day(entry.doneOn), item.kind === "once" ? null : `${num(ctx.locale, entry.amount)}${item.unit ? ` ${item.unit}` : ""}`, entry.programId ? ctx.programs.find((program) => program.programId === entry.programId)?.name ?? null : null].filter(Boolean).join(" · ")}
                            {entry.note ? <span className="text-slate-600"> – <UserText text={entry.note} /></span> : null}
                          </span>
                          {ctx.canWrite ? (
                            <form action={deleteRequirementEntryAction}>
                              <Hidden ctx={ctx} grantId={grant.id} />
                              <input type="hidden" name="entryId" value={entry.id} />
                              <SubmitButton label={t("evidenceDelete")} pendingLabel="…" className="text-xs text-slate-500 underline-offset-4 hover:underline" />
                            </form>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {ctx.canWrite ? (
                      <form action={addRequirementEntryAction} className="mt-3 grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
                        <Hidden ctx={ctx} grantId={grant.id} requirementId={item.id} />
                        <label>
                          <span className={LABEL}>{t("entry.doneOn")}</span>
                          <input type="date" name="doneOn" required defaultValue={ctx.today} className={INPUT} />
                        </label>
                        {item.kind === "once" ? <input type="hidden" name="amount" value="1" /> : (
                          <label>
                            <span className={LABEL}>{item.unit ?? t("entry.amount")}</span>
                            <input name="amount" inputMode="decimal" defaultValue="1" className={`${INPUT} w-24`} />
                          </label>
                        )}
                        {item.kind === "per_team" ? (
                          <label>
                            <span className={LABEL}>{t("entry.team")}</span>
                            <select name="programId" required className={INPUT}>
                              {ctx.programs.map((program) => <option key={program.programId} value={program.programId}>{program.name}</option>)}
                            </select>
                          </label>
                        ) : <span className="hidden sm:block" />}
                        <label>
                          <span className={LABEL}>{t("entry.note")}</span>
                          <input name="note" maxLength={1000} placeholder={t("entry.notePlaceholder")} className={INPUT} />
                        </label>
                        <SubmitButton label={item.kind === "once" ? t("entry.markDone") : t("entry.add")} pendingLabel="…" className={PRIMARY} />
                      </form>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 pb-2">
                      {item.kind === "once" && ctx.canWrite ? (
                        <form action={requirementTaskAction}>
                          <Hidden ctx={ctx} grantId={grant.id} requirementId={item.id} />
                          <SubmitButton label={t("asTask")} pendingLabel="…" className="inline-flex min-h-10 items-center rounded-full border border-dashed border-violet-300 bg-white px-4 text-sm font-semibold text-violet-800" />
                        </form>
                      ) : null}
                      {ownerCanEdit && requirement ? (
                        <details className="w-full">
                          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-slate-600">{t("editRequirement")}</summary>
                          <div className="mt-2"><RequirementForm ctx={ctx} grantId={grant.id} requirement={requirement} /></div>
                          <form action={deleteRequirementAction} className="mt-3">
                            <Hidden ctx={ctx} grantId={grant.id} requirementId={item.id} />
                            <SubmitButton label={t("deleteRequirement")} pendingLabel="…" className="text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>

          {ownerCanEdit ? (
            <section className={CARD} id="new-requirement">
              <h2 className="text-lg font-semibold text-slate-950">{t("addTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("suggestionsText")}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(Object.keys(REQUIREMENT_SUGGESTIONS) as SuggestionKey[]).map((key) => (
                  <Link key={key} href={`${href({ grant: grant.id, suggest: key })}#new-requirement`} aria-current={suggestion === key ? "true" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm ${suggestion === key ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    {t(`suggestions.${key}`)}
                  </Link>
                ))}
              </div>
              <div className="mt-5"><RequirementForm key={suggestion ?? "blank"} ctx={ctx} grantId={grant.id} suggestion={suggestion} /></div>
            </section>
          ) : null}

          {ctx.isOwner ? (
            <section className={CARD}>
              <h2 className="text-lg font-semibold text-slate-950">{t("snapshots.title")}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("snapshots.text")}</p>
              {ctx.canWrite ? (
                <form action={takeFundingSnapshotAction} className="mt-4 flex flex-wrap items-end gap-3">
                  <Hidden ctx={ctx} grantId={grant.id} />
                  <label className="min-w-0 flex-1">
                    <span className={LABEL}>{t("snapshots.note")}</span>
                    <input name="note" maxLength={500} placeholder={t("snapshots.notePlaceholder")} className={INPUT} />
                  </label>
                  <SubmitButton label={t("snapshots.take")} pendingLabel="…" className={PRIMARY} />
                </form>
              ) : null}
              {snapshots.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {snapshots.map((snapshot) => (
                    <li key={snapshot.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="text-slate-800">{[day(snapshot.takenAt), snapshot.note].filter(Boolean).join(" · ")}</span>
                      <span className="flex flex-wrap items-center gap-3">
                        <Link href={`/advisor/organisation/foerderung?${new URLSearchParams({ org: ctx.orgId, grant: grant.id, snapshot: snapshot.id }).toString()}`} className="text-violet-800 underline-offset-4 hover:underline">{t("report.view")}</Link>
                        <a href={`/advisor/organisation/foerderung/csv?${new URLSearchParams({ org: ctx.orgId, grant: grant.id, snapshot: snapshot.id }).toString()}`} className="text-violet-800 underline-offset-4 hover:underline">{t("report.csv")}</a>
                        {ctx.canWrite ? (
                          <form action={deleteFundingSnapshotAction}>
                            <Hidden ctx={ctx} grantId={grant.id} />
                            <input type="hidden" name="snapshotId" value={snapshot.id} />
                            <SubmitButton label={t("snapshots.delete")} pendingLabel="…" className="text-xs text-slate-500 underline-offset-4 hover:underline" />
                          </form>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
