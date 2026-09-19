import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PrintButton } from "@/features/teams/PrintButton";
import {
  ADVISOR_IMPULSE_SECTION_ORDER,
  getAdvisorImpulseSectionMeta,
} from "@/features/reporting/advisorSectionImpulses";
import { getAdvisorReportPageData } from "@/features/reporting/advisorReportPageData";
import { getAdvisorFollowUp } from "@/features/reporting/advisorWorkspaceData";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Uebergabedokument - was am Ende einer Begleitung herauskommt.
 *
 * DIE LUECKE: Die Founder haben ihr druckbares Setup-Dokument. Der Advisor
 * hatte kein Gegenstueck - nichts zum Mitgeben, nichts zum Ablegen, nichts,
 * woran eine Rechnung haengen kann. Die ganze Arbeit blieb in der App.
 *
 * WAS HIER BEWUSST NICHT DRINSTEHT: seine privaten Notizen.
 *
 *   Das ist die wichtigste Entscheidung an dieser Seite. Ein Dokument mit einem
 *   Haekchen "meine Notizen mitdrucken" waere genau die Art Funktion, die
 *   einmal jemand vergisst auszuschalten - und dann liegt die Handakte bei den
 *   Foundern auf dem Tisch. Die Zusage am Notizfeld lautet "die Founder sehen
 *   sie nicht", und eine Zusage mit Ausnahme ist keine.
 *
 *   Wer seine Notizen auf Papier braucht, druckt das Sitzungsblatt selbst -
 *   das ist eine bewusste Handlung an einer Seite, auf der sichtbar steht, was
 *   privat ist.
 *
 * Drin ist deshalb genau das, was beide Seiten ohnehin kennen: die gemeinsam
 * bestaetigten Staende des Teams und die Impulse, die er den Foundern
 * geschrieben hat. Dazu der Vorbehalt - das Papier landet moeglicherweise bei
 * einer Anwaeltin.
 *
 * Bewusst eine SEITE und kein Dateidownload, wie beim Setup-Dokument: Der
 * Browser druckt sie als PDF, und ein erzeugtes PDF waere eine zweite
 * Darstellung, die neben der ersten veraltet.
 */
export default async function AdvisorSessionDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() ?? "";
  if (!invitationId) redirect("/advisor/dashboard");

  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/advisor/session/document?invitationId=${invitationId}`
      )}`
    );
  }

  const [t, setupT, locale] = await Promise.all([
    getTranslations("advisor"),
    getTranslations("teams.setup"),
    getRequestLocale(),
  ]);
  const data = await getAdvisorReportPageData(invitationId, locale);
  if (data.status !== "ready") redirect("/advisor/dashboard");

  const client = await createClient();
  const followUp = await getAdvisorFollowUp(client, data.relationshipId);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const sectionMeta = getAdvisorImpulseSectionMeta(locale);
  const impulses = ADVISOR_IMPULSE_SECTION_ORDER.map((key) => ({
    key,
    title: sectionMeta[key].title,
    text: data.impulses[key]?.text?.trim() ?? "",
  })).filter((entry) => entry.text.length > 0);

  const settled = data.founderSetupAccess.status === "active" ? data.founderSetupItems : [];
  const sessionHref = `/advisor/session?invitationId=${encodeURIComponent(invitationId)}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 print:max-w-none print:px-0 print:py-0">
      <Link
        href={sessionHref}
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline print:hidden"
      >
        {t("document.back")}
      </Link>

      <header className="mt-6 border-b-2 border-slate-900 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {t("document.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {data.participantAName} · {data.participantBName}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t("document.asOf", { date: dateFormatter.format(new Date()) })}
        </p>
      </header>

      <p className="mt-5 text-sm leading-7 text-slate-700">{t("document.intro")}</p>

      {/* Was das Team festgehalten hat - der freigegebene Teil. */}
      <section className="mt-8">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
          {t("document.settledTitle")}
        </h2>
        {settled.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-slate-600">{t("document.settledEmpty")}</p>
        ) : (
          <ol className="mt-4 space-y-5">
            {settled.map((item) => (
              <li key={item.itemKey} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-slate-950">
                    {setupT(`items.${item.itemKey}.title`)}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {setupT(`outcomes.${item.resolutionStatus}`)} ·{" "}
                    {dateFormatter.format(new Date(item.confirmedAt))}
                  </span>
                </div>
                {item.note ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {item.note}
                  </p>
                ) : null}
                {item.documentationReference ? (
                  <p className="mt-1 text-xs text-slate-500">{item.documentationReference}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Seine Impulse - die kennen die Founder schon, sie standen im Report. */}
      <section className="mt-9">
        <h2 className="border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
          {t("document.impulsesTitle")}
        </h2>
        {impulses.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-slate-600">{t("document.impulsesEmpty")}</p>
        ) : (
          <ol className="mt-4 space-y-5">
            {impulses.map((entry) => (
              <li key={entry.key} className="break-inside-avoid">
                <h3 className="font-semibold text-slate-950">{entry.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                  {entry.text}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {followUp && !followUp.completedAt ? (
        <section className="mt-9 break-inside-avoid rounded-xl border border-slate-300 p-5 print:border-slate-400">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
            {t("document.nextTitle")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {dateFormatter.format(new Date(followUp.dueOn))}
            {followUp.note ? ` · ${followUp.note}` : ""}
          </p>
        </section>
      ) : null}

      {/* Der Hinweis, dass die eigenen Notizen NICHT hier stehen - damit
          niemand glaubt, das Dokument sei vollstaendig, und damit klar ist,
          dass die Zusage am Notizfeld gilt. */}
      <p className="mt-9 border-t border-slate-300 pt-4 text-xs leading-6 text-slate-500">
        {t("document.notesExcluded")}
      </p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{t("document.disclaimer")}</p>

      <p className="mt-6 print:hidden">
        <PrintButton
          label={t("document.print")}
          className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
        />
      </p>
    </main>
  );
}
