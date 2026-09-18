import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  FOUNDER_SETUP_PHASE_KEYS,
  getFounderSetupCatalogItem,
} from "@/features/teams/founderSetupCatalog";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { PrintButton } from "@/features/teams/PrintButton";
import { normalizeLocale } from "@/i18n/config";
import { getRequestUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Was am Ende herauskommt.
 *
 * Nach zwanzig geklaerten Themen gab es nichts zum Mitnehmen: kein Dokument,
 * nichts fuer die Anwaeltin, nichts zum Ablegen. Die ganze Arbeit blieb in
 * der App - dabei ist ihr Zweck, zu etwas Handlungsfaehigem zu kommen.
 *
 * Bewusst eine SEITE und kein Dateidownload: Der Browser druckt sie als PDF,
 * und das Layout ist dafuer gemacht. Ein erzeugtes PDF haette eine zweite
 * Darstellung bedeutet, die neben der ersten veraltet.
 *
 * Und bewusst mit dem, was NOCH OFFEN ist. Ein Dokument, das nur das Geklaerte
 * zeigt, liest sich vollstaendiger als die Lage ist - und genau das waere
 * gefaehrlich bei einem Papier, das jemand einer Beraterin hinlegt.
 */
export default async function FounderSetupDocument({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/setup/document`)}`);

  const supabase = await createClient();
  const [t, rawLocale, setup] = await Promise.all([
    getTranslations("teams.setup"),
    getLocale(),
    getFounderSetup(teamId, user.id, supabase),
  ]);
  if (!setup) notFound();

  const locale = normalizeLocale(rawLocale);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const names = setup.members
    .map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 }))
    .join(" · ");

  const settled = setup.items.filter((item) => item.currentConfirmedRevision);
  const open = setup.items.filter((item) => !item.currentConfirmedRevision);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 print:max-w-none print:px-0 print:py-0">
      <Link
        href={`/teams/${teamId}/setup`}
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline print:hidden"
      >
        {t("backToSetup")}
      </Link>

      <header className="mt-6 border-b-2 border-slate-900 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {t("document.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{names}</p>
        <p className="mt-1 text-sm text-slate-600">
          {t("document.asOf", { date: dateFormatter.format(new Date()) })}
        </p>
      </header>

      <p className="mt-5 text-sm leading-7 text-slate-700">{t("document.intro")}</p>

      {settled.length === 0 ? (
        <p className="mt-8 rounded-xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {t("document.nothingYet")}
        </p>
      ) : (
        FOUNDER_SETUP_PHASE_KEYS.map((phase) => {
          const items = settled.filter(
            (item) => getFounderSetupCatalogItem(item.key)?.phase === phase
          );
          if (items.length === 0) return null;
          return (
            <section key={phase} className="mt-8 break-inside-avoid">
              <h2 className="border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                {t(`phases.${phase}.title`)}
              </h2>
              <ol className="mt-4 space-y-5">
                {items.map((item) => (
                  <li key={item.key} className="break-inside-avoid">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-slate-950">{t(`items.${item.key}.title`)}</h3>
                      <span className="text-xs text-slate-500">
                        {item.outcome ? t(`outcomes.${item.outcome}`) : t(`stages.${item.stage}`)}
                        {item.currentConfirmedRevision?.confirmedAt
                          ? ` · ${t("document.confirmedOn", {
                              date: dateFormatter.format(new Date(item.currentConfirmedRevision.confirmedAt)),
                            })}`
                          : ""}
                      </span>
                    </div>
                    {item.currentConfirmedRevision?.note ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                        {item.currentConfirmedRevision.note}
                      </p>
                    ) : null}
                    {item.currentConfirmedRevision?.documentationReference ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {t("document.reference", { reference: item.currentConfirmedRevision.documentationReference })}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          );
        })
      )}

      {open.length > 0 ? (
        <section className="mt-9 break-inside-avoid rounded-xl border border-amber-300 bg-amber-50/60 p-5 print:bg-white">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-900">
            {t("document.openTitle")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {open.map((item) => t(`items.${item.key}.title`)).join(" · ")}
          </p>
        </section>
      ) : null}

      <p className="mt-9 border-t border-slate-300 pt-4 text-xs leading-6 text-slate-500">
        {t("document.disclaimer")}
      </p>

      <p className="mt-6 print:hidden">
        <PrintButton
          label={t("document.print")}
          className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
        />
      </p>
    </main>
  );
}
