import { getTranslations } from "next-intl/server";
import { saveProgramOrgDataAction } from "@/features/advisor/teamProgramActions";
import type { ProgramOrgData } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

/** Die Organisation pflegt ihre Stammdaten zum Team. Das Team sieht sie, aber schreibt sie nicht. */
export async function ProgramOrgDataForm({ programId, data }: { programId: string; data: ProgramOrgData | null }) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <section aria-labelledby={`od-${programId}`} className="advisor-card grid gap-3 p-4 sm:p-5">
      <div>
        <h2 id={`od-${programId}`} className="text-base font-semibold text-slate-950">{t("orgDataTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("orgDataText")}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("orgDataTeamSees")}</p>
      </div>
      <form action={saveProgramOrgDataAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="programId" value={programId} />
        <label>
          <span className={LABEL}>{t("orgDataCompany")}</span>
          <input name="companyName" maxLength={120} defaultValue={data?.companyName ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataLegalForm")}</span>
          <input name="legalForm" maxLength={60} defaultValue={data?.legalForm ?? ""} className={FIELD} />
        </label>
        <label className="sm:col-span-2">
          <span className={LABEL}>{t("orgDataAddress")}</span>
          <input name="address" maxLength={300} defaultValue={data?.address ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataContactName")}</span>
          <input name="contactName" maxLength={120} defaultValue={data?.contactName ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataWebsite")}</span>
          <input name="website" maxLength={200} defaultValue={data?.website ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataEmail")}</span>
          <input name="contactEmail" type="email" maxLength={200} defaultValue={data?.contactEmail ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataPhone")}</span>
          <input name="contactPhone" type="tel" maxLength={50} defaultValue={data?.contactPhone ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataAdmittedOn")}</span>
          <input name="admittedOn" type="date" defaultValue={data?.admittedOn ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("orgDataReference")}</span>
          <input name="reference" maxLength={60} defaultValue={data?.reference ?? ""} className={FIELD} />
        </label>
        <label className="sm:col-span-2">
          <span className={LABEL}>{t("orgDataNote")}</span>
          <textarea name="note" maxLength={1000} rows={3} defaultValue={data?.note ?? ""} className={`${FIELD} py-2`} />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton label={t("orgDataSave")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" />
        </div>
      </form>
    </section>
  );
}

/** Die Sicht des Teams: lesen, was die Organisation ueber das Team fuehrt. */
export async function ProgramOrgDataTeamView({ data }: { data: ProgramOrgData | null }) {
  const t = await getTranslations("advisor.teamProgram");
  const rows: [string, string | null][] = data
    ? [
        [t("orgDataCompany"), data.companyName],
        [t("orgDataLegalForm"), data.legalForm],
        [t("orgDataAddress"), data.address],
        [t("orgDataContactName"), data.contactName],
        [t("orgDataWebsite"), data.website],
        [t("orgDataEmail"), data.contactEmail],
        [t("orgDataPhone"), data.contactPhone],
        [t("orgDataAdmittedOn"), data.admittedOn],
        [t("orgDataReference"), data.reference],
        [t("orgDataNote"), data.note],
      ].filter(([, value]) => value) as [string, string | null][]
    : [];
  return (
    <section aria-labelledby="od-team" className="grid gap-2">
      <h2 id="od-team" className="text-xl font-semibold text-slate-950">{t("orgDataTeamTitle")}</h2>
      <p className="max-w-2xl text-sm leading-6 text-slate-600">{t("orgDataTeamText")}</p>
      {rows.length > 0 ? (
        <dl className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{label}</dt>
              <dd className="break-words text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-600">{t("orgDataTeamEmpty")}</p>
      )}
    </section>
  );
}
