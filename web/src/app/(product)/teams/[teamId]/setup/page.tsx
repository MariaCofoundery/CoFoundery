import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FOUNDER_SETUP_CATEGORY_KEYS } from "@/features/teams/founderSetupCatalog";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { countFounderSetupStatuses } from "@/features/teams/founderSetupModel";

type Props = { params: Promise<{ teamId: string }> };

export default async function FounderSetupPage({ params }: Props) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/setup`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) notFound();
  const t = await getTranslations("teams.setup");
  const counts = countFounderSetupStatuses(setup);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${teamId}`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">
        {t("backToCollaboration")}
      </Link>
      <header className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{t("subtitle")}</p>
        {setup.started ? (
          <p className="mt-4 text-sm font-medium text-slate-700">
            {t("summary", {
              clarified: counts.clarified + counts.documented + counts.not_relevant,
              discussing: counts.discussing,
              open: counts.open,
              pending: counts.confirmation_pending,
            })}
          </p>
        ) : null}
      </header>

      <div className="mt-7 grid gap-8">
        {FOUNDER_SETUP_CATEGORY_KEYS.map((category) => (
          <section key={category} aria-labelledby={`setup-category-${category}`}>
            <h2 id={`setup-category-${category}`} className="text-xl font-semibold text-slate-950">
              {t(`categories.${category}`)}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {setup.items.filter((item) => item.category === category).map((item) => (
                <article key={item.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">{t(`items.${item.key}.title`)}</h3>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {t(`statuses.${item.displayStatus}`)}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{t(`items.${item.key}.question`)}</p>
                  <Link href={`/teams/${teamId}/setup/${item.key}`} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    {t("openItem")}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("legalGeneral")}</p>
    </main>
  );
}
