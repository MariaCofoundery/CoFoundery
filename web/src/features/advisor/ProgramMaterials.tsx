import { getTranslations } from "next-intl/server";
import { deleteProgramMaterialAction, saveProgramMaterialAction } from "@/features/advisor/teamProgramActions";
import type { ProgramMaterial } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

/** Nur die Adresse des Ablageorts, nicht den ganzen Pfad: so sieht man, wohin der Link fuehrt. */
const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

function MaterialLink({ material }: { material: ProgramMaterial }) {
  return (
    <div className="min-w-0">
      <a href={material.url} target="_blank" rel="noopener noreferrer" className="break-words text-base font-semibold text-violet-800 underline-offset-4 hover:underline">
        {material.title}
      </a>
      <p className="break-all text-xs text-slate-500">{hostOf(material.url)}</p>
      {material.note ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{material.note}</p> : null}
    </div>
  );
}

function MaterialFields({ material, t }: { material?: ProgramMaterial; t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <div className="grid gap-3">
      <label>
        <span className={LABEL}>{t("materialsTitleField")}</span>
        <input name="title" required maxLength={160} defaultValue={material?.title ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("materialsUrl")}</span>
        <input name="url" type="url" required maxLength={500} placeholder="https://" defaultValue={material?.url ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("materialsNote")}</span>
        <input name="note" maxLength={300} defaultValue={material?.note ?? ""} className={FIELD} />
      </label>
    </div>
  );
}

/** Die Organisation: Links zu den Unterlagen des Programms. Anlegen, aendern und loeschen darf nur der Inhaber. */
export async function OrgProgramMaterials({ orgId, isOwner, materials }: { orgId: string; isOwner: boolean; materials: ProgramMaterial[] }) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <section aria-labelledby="materials-title" className="grid gap-3">
      <div>
        <h2 id="materials-title" className="text-xl font-semibold text-slate-950">{t("materialsTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("materialsText")}</p>
        <p className="mt-2 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("materialsNote2")}</p>
      </div>
      {materials.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">{t("materialsEmpty")}</p> : null}
      {materials.length > 0 ? (
        <ul className="grid gap-3">
          {materials.map((material) => (
            <li key={material.materialId} className="advisor-card p-4">
              <MaterialLink material={material} />
              {isOwner ? (
                <details className="mt-2 border-t border-slate-100 pt-2">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("materialsEdit")}</summary>
                  <form action={saveProgramMaterialAction} className="mt-2 grid gap-3">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="materialId" value={material.materialId} />
                    <MaterialFields material={material} t={t} />
                    <SubmitButton label={t("materialsSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
                  </form>
                  <form action={deleteProgramMaterialAction} className="mt-1">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="materialId" value={material.materialId} />
                    <SubmitButton label={t("materialsDelete")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
                  </form>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {isOwner ? (
        <details open={materials.length === 0} className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("materialsNew")}</summary>
          <form action={saveProgramMaterialAction} className="mt-3 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <MaterialFields t={t} />
            <SubmitButton label={t("materialsSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
          </form>
        </details>
      ) : null}
    </section>
  );
}

/** Die Sicht des Teams: die Links der Organisation, nur lesen. */
export async function TeamProgramMaterials({ materials }: { materials: (ProgramMaterial & { orgName: string })[] }) {
  const t = await getTranslations("advisor.teamProgram");
  if (materials.length === 0) return null;
  return (
    <section aria-labelledby="my-materials-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
      <h2 id="my-materials-title" className="text-lg font-semibold text-slate-950">{t("myMaterialsTitle")}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-600">{t("myMaterialsText")}</p>
      <ul className="mt-3 divide-y divide-slate-100">
        {materials.map((material) => (
          <li key={material.materialId} className="py-3">
            <MaterialLink material={material} />
            <p className="mt-1 text-xs text-slate-500">{material.orgName}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
