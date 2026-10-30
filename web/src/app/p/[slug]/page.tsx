import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { accentStyles } from "@/features/advisor/programAccent";
import { ProgramRichText } from "@/features/advisor/programRichText";
import { enterProgramCodeFromPageAction } from "@/features/advisor/teamProgramActions";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Die oeffentliche Programmseite einer Organisation: Logo, Name, Willkommenstext
 * und ein Feld fuer den Programmcode. Sie verraet nichts ueber Teams oder
 * Mitglieder. Unveroeffentlicht oder unbekannt: 404.
 */
export default async function ProgramPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ code?: string }>;
}) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) notFound();
  const client = await createClient();
  const { data } = await client.rpc("get_public_program_page", { p_slug: slug });
  const page = ((data ?? []) as { org_name: string; welcome: string | null; has_logo: boolean; accent: string | null }[])[0];
  if (!page) notFound();
  const t = await getTranslations("advisor.programPage");
  const look = accentStyles(page.accent);
  const prefill = (query.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-50 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-xl justify-end">
        <PublicLanguageSwitcher />
      </div>
      <section className="mx-auto mt-4 w-full max-w-xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(60,40,180,0.35)]">
        <div className="relative overflow-hidden px-6 pb-8 pt-8 text-center text-white sm:px-10" style={{ background: look.hero, backgroundColor: look.heroColor }}>
          <div className="relative z-10 flex flex-col items-center">
            {page.has_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/program-logo/${slug}`} alt="" className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lg" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white/15 text-3xl font-extrabold ring-1 ring-white/25">
                {page.org_name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">{t("eyebrow")}</p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{page.org_name}</h1>
          </div>
        </div>
        <div className="px-6 py-8 sm:px-10">
          {page.welcome ? <ProgramRichText text={page.welcome} className="text-base leading-7 text-slate-700" /> : null}

          <form action={enterProgramCodeFromPageAction} className="mt-7 grid gap-3">
            <input type="hidden" name="slug" value={slug} />
            <label>
              <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("codeLabel")}</span>
              <input
                name="code"
                required
                defaultValue={prefill}
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="ABCD-2345"
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 px-4 text-center text-xl font-semibold uppercase tracking-[.3em] text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100"
              />
            </label>
            {query.code === "invalid" ? <p role="alert" className="text-sm text-rose-700">{t("codeInvalid")}</p> : null}
            <SubmitButton label={t("codeGo")} pendingLabel="…" style={{ backgroundImage: look.button }} className="inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-base font-semibold text-white" />
          </form>

          <ol className="mt-8 grid gap-3 border-t border-slate-100 pt-6 text-sm text-slate-700">
            {[t("step1"), t("step2"), t("step3"), t("step4")].map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-extrabold text-violet-800">{index + 1}</span>
                <span className="pt-0.5 leading-6">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-5 text-slate-500">{t("privacyNote")}</p>
        </div>
      </section>
      <p className="mx-auto mt-6 w-full max-w-xl text-center text-xs text-slate-500">{t("poweredBy")}</p>
    </main>
  );
}
