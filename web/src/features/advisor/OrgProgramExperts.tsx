import { getTranslations } from "next-intl/server";
import { deleteProgramExpertAction, saveProgramExpertAction, setProgramExpertArchivedAction } from "@/features/advisor/teamProgramActions";
import type { ProgramExpert } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

type T = Awaited<ReturnType<typeof getTranslations>>;

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

function ExpertFields({ expert, t }: { expert?: ProgramExpert; t: T }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className={LABEL}>{t("expertsName")}</span>
        <input name="name" required maxLength={120} defaultValue={expert?.name ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("expertsTopic")}</span>
        <input name="topic" maxLength={200} defaultValue={expert?.topic ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("expertsCompany")}</span>
        <input name="company" maxLength={120} defaultValue={expert?.company ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("expertsWebsite")}</span>
        <input name="website" maxLength={300} placeholder="https://" defaultValue={expert?.website ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("expertsEmail")}</span>
        <input name="email" type="email" maxLength={200} defaultValue={expert?.email ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("expertsPhone")}</span>
        <input name="phone" type="tel" maxLength={50} defaultValue={expert?.phone ?? ""} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("expertsOfferLink")}</span>
        <input name="offerLink" maxLength={500} placeholder="https://" defaultValue={expert?.offerLink ?? ""} className={FIELD} />
        <span className="mt-1 block text-xs text-slate-500">{t("expertsOfferLinkHint")}</span>
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("expertsNote")}</span>
        <textarea name="note" rows={3} maxLength={1000} defaultValue={expert?.note ?? ""} className={`${FIELD} py-2`} />
      </label>
    </div>
  );
}

function ExpertCard({ expert, orgId, isOwner, t }: { expert: ProgramExpert; orgId: string; isOwner: boolean; t: T }) {
  const links: [string, string | null][] = [
    [t("expertsWebsite"), expert.website],
    [t("expertsOfferLink"), expert.offerLink],
  ];
  return (
    <li className="advisor-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-slate-950">{expert.name}</span>
        {expert.topic ? <span className="text-sm text-slate-600">{expert.topic}</span> : null}
      </div>
      {expert.company ? <p className="text-xs text-slate-500">{expert.company}</p> : null}
      <dl className="mt-2 grid gap-1 text-sm text-slate-800 sm:grid-cols-2">
        {expert.email ? <div><dt className="sr-only">{t("expertsEmail")}</dt><dd className="break-all">{expert.email}</dd></div> : null}
        {expert.phone ? <div><dt className="sr-only">{t("expertsPhone")}</dt><dd>{expert.phone}</dd></div> : null}
        {links.map(([label, url]) =>
          url ? (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="break-all">
                <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-violet-800 underline-offset-4 hover:underline">
                  {label}: {hostOf(url)}
                </a>
              </dd>
            </div>
          ) : null,
        )}
      </dl>
      {expert.note ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700"><UserText text={expert.note} /></p> : null}
      {isOwner ? (
        <details className="mt-2 border-t border-slate-100 pt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("expertsEdit")}</summary>
          <form action={saveProgramExpertAction} className="mt-2 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="expertId" value={expert.expertId} />
            <ExpertFields expert={expert} t={t} />
            <SubmitButton label={t("expertsSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
          </form>
          <div className="mt-1 flex flex-wrap gap-2">
            <form action={setProgramExpertArchivedAction}>
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="expertId" value={expert.expertId} />
              <input type="hidden" name="archived" value={expert.archived ? "no" : "yes"} />
              <SubmitButton label={expert.archived ? t("expertsRestore") : t("expertsArchive")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline" />
            </form>
            <form action={deleteProgramExpertAction}>
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="expertId" value={expert.expertId} />
              <SubmitButton label={t("expertsDelete")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
            </form>
          </div>
        </details>
      ) : null}
    </li>
  );
}

/**
 * Experten und Speaker der Organisation: eine interne Liste. Nur die Organisation sieht sie, nie die Teams.
 * Die Suche filtert hier ueber Name, Thema, Firma und Notiz; sortiert wird nach Name, nie nach Bewertung.
 */
export async function OrgProgramExperts({
  orgId,
  isOwner,
  experts,
  query,
}: {
  orgId: string;
  isOwner: boolean;
  experts: ProgramExpert[];
  query: string;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const needle = query.trim().toLowerCase();
  const matches = (expert: ProgramExpert) =>
    !needle || [expert.name, expert.topic, expert.company, expert.note].some((value) => value?.toLowerCase().includes(needle));
  const shown = experts.filter(matches);
  const active = shown.filter((expert) => !expert.archived);
  const archived = shown.filter((expert) => expert.archived);

  return (
    <section aria-labelledby="experts-title" className="grid gap-4">
      <div>
        <h2 id="experts-title" className="text-xl font-semibold text-slate-950">{t("expertsTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("expertsText")}</p>
        <p role="note" className="mt-2 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">{t("expertsPrivacy")}</p>
      </div>

      <form method="get" action="/advisor/organisation" role="search" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="org" value={orgId} />
        <input type="hidden" name="tab" value="experts" />
        <label className="min-w-0 flex-1">
          <span className={LABEL}>{t("expertsSearch")}</span>
          <input name="q" type="search" maxLength={80} defaultValue={query} className={FIELD} />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("expertsSearchGo")}</button>
      </form>

      {experts.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">{t("expertsEmpty")}</p> : null}
      {experts.length > 0 && shown.length === 0 ? <p className="text-sm text-slate-600">{t("expertsNone")}</p> : null}
      {active.length > 0 ? <ul className="grid gap-3">{active.map((expert) => <ExpertCard key={expert.expertId} expert={expert} orgId={orgId} isOwner={isOwner} t={t} />)}</ul> : null}
      {archived.length > 0 ? (
        <details className="grid gap-3">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">{t("expertsArchived", { count: archived.length })}</summary>
          <ul className="mt-2 grid gap-3">{archived.map((expert) => <ExpertCard key={expert.expertId} expert={expert} orgId={orgId} isOwner={isOwner} t={t} />)}</ul>
        </details>
      ) : null}

      {isOwner ? (
        <details open={experts.length === 0} className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("expertsNew")}</summary>
          <form action={saveProgramExpertAction} className="mt-3 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <ExpertFields t={t} />
            <SubmitButton label={t("expertsSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
          </form>
        </details>
      ) : null}
    </section>
  );
}
