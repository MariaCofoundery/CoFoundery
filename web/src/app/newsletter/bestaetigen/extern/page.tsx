import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isValidNewsletterToken } from "@/features/newsletter/newsletterToken";
import { confirmPublicNewsletter } from "@/features/newsletter/publicNewsletter";
import { publicNewsletterCopy } from "@/features/newsletter/publicNewsletterCopy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Die Newsletter-Anmeldung ohne Konto bestaetigen (Double-Opt-in). Der Abruf der Seite aendert nichts - Mail-Programme rufen Links vorab ab -,
 * erst der Knopf tut es. Der Link traegt eine Unterschrift mit Zweck; ohne sie kann niemand fuer eine fremde Adresse zusagen.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ i?: string; t?: string; l?: string; fertig?: string }> }) {
  const params = await searchParams;
  const language = params.l === "en" ? "en" : "de";
  const copy = publicNewsletterCopy(language);
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const valid = isValidNewsletterToken(params.i ?? "", "confirm", params.t ?? "", secret);

  async function confirm(formData: FormData) {
    "use server";
    const id = String(formData.get("i") ?? "");
    const token = String(formData.get("t") ?? "");
    const lang = formData.get("l") === "en" ? "en" : "de";
    const key = process.env.CRON_SECRET?.trim() ?? "";
    if (!isValidNewsletterToken(id, "confirm", token, key)) redirect(`/newsletter/bestaetigen/extern?l=${lang}`);
    await confirmPublicNewsletter(id, key);
    redirect(`/newsletter/bestaetigen/extern?fertig=1&l=${lang}`);
  }

  return (
    <main lang={language} className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        {params.fertig === "1" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{copy.done.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.done.text}</p>
            <div className="mt-6 rounded-2xl border border-[#cfc6f6] bg-[linear-gradient(120deg,#f4f0ff,#eaf6fb)] p-5">
              <h2 className="text-lg font-semibold text-slate-950">{copy.done.appTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">{copy.done.appText}</p>
              <Link href="/me/profile" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-base font-semibold text-white">{copy.done.appButton}</Link>
            </div>
          </>
        ) : valid ? (
          <form action={confirm}>
            <input type="hidden" name="i" value={params.i} />
            <input type="hidden" name="t" value={params.t} />
            <input type="hidden" name="l" value={language} />
            <h1 className="text-2xl font-semibold text-slate-950">{copy.confirm.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.confirm.text}</p>
            <button className="mt-6 min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-base font-semibold text-white">{copy.confirm.button}</button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{copy.invalid.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.invalid.text}</p>
          </>
        )}
      </section>
    </main>
  );
}
