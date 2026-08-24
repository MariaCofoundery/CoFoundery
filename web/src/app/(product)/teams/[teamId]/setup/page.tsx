import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FOUNDER_SETUP_CATEGORY_KEYS } from "@/features/teams/founderSetupCatalog";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { countFounderSetupStatuses } from "@/features/teams/founderSetupModel";
import { FounderSetupStatusChip } from "@/features/teams/FounderSetupStatusChip";

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
      <Link href={`/teams/${teamId}`} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
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
            <ul className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.035)]">
              {setup.items.filter((item) => item.category === category).map((item) => (
                <li key={item.key} className="border-b border-slate-200 last:border-b-0">
                  <Link
                    href={`/teams/${teamId}/setup/${item.key}`}
                    className="group flex min-h-16 w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--brand-accent)] sm:px-5"
                  >
                    <span className="min-w-0 flex-1 font-medium text-slate-950">
                      {t(`items.${item.key}.title`)}
                    </span>
                    <FounderSetupStatusChip
                      status={item.displayStatus}
                      label={t(`statuses.${item.displayStatus}`)}
                    />
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="h-5 w-5 shrink-0 fill-none stroke-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:stroke-slate-600"
                      strokeWidth="1.8"
                    >
                      <path d="m7.5 4.5 5 5.5-5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("legalGeneral")}</p>
    </main>
  );
}
