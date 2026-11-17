import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isValidNewsletterToken } from "@/features/newsletter/newsletterToken";
import { unsubscribePublicNewsletter } from "@/features/newsletter/publicNewsletter";
import { publicNewsletterCopy } from "@/features/newsletter/publicNewsletterCopy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Vom Newsletter (ohne Konto) abmelden - aus der Mail, mit einem Klick. Der Abruf aendert nichts; erst der Knopf. */
export default async function Page({ searchParams }: { searchParams: Promise<{ i?: string; t?: string; l?: string; fertig?: string }> }) {
  const params = await searchParams;
  const language = params.l === "en" ? "en" : "de";
  const copy = publicNewsletterCopy(language);
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const valid = isValidNewsletterToken(params.i ?? "", "unsubscribe", params.t ?? "", secret);

  async function unsubscribe(formData: FormData) {
    "use server";
    const id = String(formData.get("i") ?? "");
    const token = String(formData.get("t") ?? "");
    const lang = formData.get("l") === "en" ? "en" : "de";
    if (isValidNewsletterToken(id, "unsubscribe", token, process.env.CRON_SECRET?.trim() ?? "")) await unsubscribePublicNewsletter(id);
    redirect(`/abmelden/newsletter/extern?fertig=1&l=${lang}`);
  }

  return (
    <main lang={language} className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        {params.fertig === "1" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-950">{copy.unsubscribe.doneTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.unsubscribe.doneText}</p>
          </>
        ) : valid ? (
          <form action={unsubscribe}>
            <input type="hidden" name="i" value={params.i} />
            <input type="hidden" name="t" value={params.t} />
            <input type="hidden" name="l" value={language} />
            <h1 className="text-2xl font-semibold text-slate-950">{copy.unsubscribe.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.unsubscribe.text}</p>
            <button className="mt-6 min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-base font-semibold text-white">{copy.unsubscribe.button}</button>
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
