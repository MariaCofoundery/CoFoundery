import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicConnectShell } from "@/features/connect/PublicConnectShell";
import { getPublicConnectProblem } from "@/features/connect/publicConnectData";
import { createClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}): Promise<Metadata> {
  const { publicSlug } = await params;
  const problem = await getPublicConnectProblem(await createClient(), publicSlug).catch(() => null);
  // Kein Eintrag heisst hier auch: zurueckgezogen oder nie freigegeben. In
  // beiden Faellen darf die Seite nicht in den Index.
  if (!problem) return { title: "Connect | CoFoundery", robots: { index: false, follow: false } };

  return {
    title: `${problem.title} | CoFoundery Connect`,
    description: problem.description.slice(0, 155),
    alternates: { canonical: `${getPublicAppOrigin()}/connect/pr/${problem.public_slug}` },
    robots: { index: true, follow: true },
  };
}

/**
 * Ein Problem fuer Menschen ohne Konto.
 *
 * Hier steht weniger als drinnen, und das ist der Punkt: Die einstellende
 * Person hat ihren eigenen Text freigegeben. Die Ansaetze anderer Menschen,
 * die Bestaetigungen und die Zahl der Interessierten bleiben drinnen - dafuer
 * liegt keine Einwilligung vor.
 */
export default async function PublicConnectProblemPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const client = await createClient();
  const [t, problem, auth] = await Promise.all([
    getTranslations("connect"),
    getPublicConnectProblem(client, publicSlug).catch(() => null),
    client.auth.getUser(),
  ]);
  if (!problem) notFound();

  const membershipResult = auth.data.user ? await client.rpc("is_network_member") : null;
  const member = membershipResult?.data === true;
  const internalResult = member
    ? await client
        .from("network_problems")
        .select("id")
        .eq("public_slug", problem.public_slug)
        .maybeSingle()
    : null;
  const internalId = (internalResult?.data as { id: string } | null)?.id ?? null;

  const returnPath = `/connect/pr/${problem.public_slug}`;
  const facts = [
    problem.locations.length ? problem.locations.join(" & ") : null,
    problem.geographic_scope ? t(`scopes.${problem.geographic_scope}`) : null,
  ].filter(Boolean);

  return (
    <PublicConnectShell>
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">
            {t(`problems.intents.${problem.author_intent}`)}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{problem.title}</h1>
          <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-700">{problem.description}</p>

          {problem.topics.length ? (
            <section className="mt-7">
              <h2 className="font-semibold">{t("detail.topics")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {problem.topics.map((topic) => (
                  <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {problem.industries.length ? (
            <section className="mt-7">
              <h2 className="font-semibold">{t("detail.industries")}</h2>
              <p className="mt-2 text-slate-600">{problem.industries.join(" · ")}</p>
            </section>
          ) : null}

          {facts.length ? (
            <section className="mt-7">
              <h2 className="font-semibold">{t("detail.framework")}</h2>
              <p className="mt-2 text-slate-600">{facts.join(" · ")}</p>
            </section>
          ) : null}

          <section className="mt-8 rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">
              {t("detail.person")}
            </p>
            <h2 className="mt-3 text-xl font-semibold">{problem.author_display_name}</h2>
            <p className="mt-1 text-sm text-slate-600">{problem.author_headline}</p>
            {/* Verlinkt nur, wenn diese Person ihr Profil selbst oeffentlich
                gestellt hat - die Freigabe des Problems ist keine des Profils. */}
            {problem.author_profile_slug ? (
              <Link
                href={`/connect/p/${problem.author_profile_slug}`}
                className="mt-2 inline-flex font-semibold text-violet-800 hover:underline"
              >
                {t("public.viewProfile")}
              </Link>
            ) : null}
          </section>

          {/* Was drinnen passiert, steht hier nur als Hinweis. Wer mitreden
              will, braucht ein Konto - und wer eins hat, geht direkt hin. */}
          <section className="mt-8 border-t border-slate-100 pt-6">
            {member && internalId ? (
              <Link
                href={`/connect/problems/${internalId}`}
                className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold"
              >
                {t("problems.publicOpenInside")}
              </Link>
            ) : (
              <div>
                <p className="text-sm leading-6 text-slate-600">{t("problems.publicJoinText")}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/login?next=${encodeURIComponent(returnPath)}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white"
                  >
                    {t("public.login")}
                  </Link>
                  <Link
                    href={`/start?intent=connect&next=${encodeURIComponent(returnPath)}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold"
                  >
                    {t("public.requestAccess")}
                  </Link>
                </div>
              </div>
            )}
          </section>
        </article>
      </main>
    </PublicConnectShell>
  );
}
