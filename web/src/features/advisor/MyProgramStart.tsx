import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { startMyProgramAction } from "@/features/advisor/orgActions";
import type { OrgActionErrorCode } from "@/features/advisor/orgErrors";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Einstieg fuer Advisor ohne Organisation: "Mein Programm" mit Teams, Meilensteinen und Erfolgen.
 * Ein Klick legt im Hintergrund eine Organisation an, in der die Person allein ist - alles andere
 * (Mitglieder, Freigaben, Programmseite) bleibt zunaechst ausgeblendet, bis es gebraucht wird.
 * Die Zustimmung der Teams aendert sich dadurch nicht: Alle im Team muessen zustimmen.
 */
export async function MyProgramStart({ error }: { error: OrgActionErrorCode | null }) {
  const t = await getTranslations("advisor.myProgram");
  const tOrg = await getTranslations("advisor.org");
  const points = t("points").split(" | ");
  return (
    <section aria-labelledby="my-program-title" className="advisor-card p-5 sm:p-7">
      <h2 id="my-program-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
          {tOrg(`errors.${error}`)}
        </p>
      ) : null}
      <form action={startMyProgramAction} className="mt-5">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("nameLabel")}</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder={t("namePlaceholder")}
            className="mt-1 min-h-11 w-full max-w-md rounded-xl border border-slate-300 px-3 text-sm"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SubmitButton
            label={t("start")}
            pendingLabel={tOrg("pending")}
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          />
          <Link href="/advisor/beispiel" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
            {t("example")}
          </Link>
        </div>
      </form>
      <p className="mt-4 max-w-2xl text-xs leading-6 text-slate-500">{t("hint")}</p>
    </section>
  );
}
