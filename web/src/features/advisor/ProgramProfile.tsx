import { getTranslations } from "next-intl/server";
import { saveProgramProfileAction } from "@/features/advisor/teamProgramActions";
import type { ProgramProfile } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

/** Das Team pflegt sein Programmprofil. */
export async function TeamProgramProfileForm({ programId, profile }: { programId: string; profile: ProgramProfile | null }) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <section aria-labelledby={`pf-${programId}`} className="grid gap-3">
      <div>
        <h2 id={`pf-${programId}`} className="text-xl font-semibold text-slate-950">{t("profileTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("profileText")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("profileTeamNote")}</p>
      </div>
      <form action={saveProgramProfileAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <input type="hidden" name="programId" value={programId} />
        <label className="sm:col-span-2">
          <span className={LABEL}>{t("profileCompany")}</span>
          <input name="companyName" maxLength={120} defaultValue={profile?.companyName ?? ""} className={FIELD} />
        </label>
        <label className="sm:col-span-2">
          <span className={LABEL}>{t("profileFounders")}</span>
          <input name="founders" maxLength={300} defaultValue={profile?.founders ?? ""} className={FIELD} />
        </label>
        <label className="sm:col-span-2">
          <span className={LABEL}>{t("profileAddress")}</span>
          <input name="address" maxLength={300} autoComplete="street-address" defaultValue={profile?.address ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("profileEmail")}</span>
          <input name="contactEmail" type="email" maxLength={200} defaultValue={profile?.contactEmail ?? ""} className={FIELD} />
        </label>
        <label>
          <span className={LABEL}>{t("profilePhone")}</span>
          <input name="contactPhone" type="tel" maxLength={50} defaultValue={profile?.contactPhone ?? ""} className={FIELD} />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton label={t("profileSave")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" />
        </div>
      </form>
    </section>
  );
}

/** Die Sicht der Bezugspersonen: nur lesen. */
export async function ProgramProfileView({ profile }: { profile: ProgramProfile | null }) {
  const t = await getTranslations("advisor.teamProgram");
  const rows: [string, string | null][] = profile
    ? [
        [t("profileCompany"), profile.companyName],
        [t("profileFounders"), profile.founders],
        [t("profileAddress"), profile.address],
        [t("profileEmail"), profile.contactEmail],
        [t("profilePhone"), profile.contactPhone],
      ]
    : [];
  return (
    <section aria-labelledby="pf-view" className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <h2 id="pf-view" className="text-sm font-semibold text-slate-900">{t("profileTitle")}</h2>
      {profile ? (
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{label}</dt>
              <dd className="break-words text-sm text-slate-800">{value ?? "–"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-sm text-slate-600">{t("profileEmpty")}</p>
      )}
    </section>
  );
}
