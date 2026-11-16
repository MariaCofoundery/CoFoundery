import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { AreasExplainer } from "@/features/onboarding/AreasExplainer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Die Seite hinter dem QR-Code einer Veranstaltung (Entwurf 16.11.2026): "Schoen, dass du da bist", drei Schritte, die kleine Erklaerung, ein
 * Knopf. Der Name der Veranstaltung kommt aus der Datenbank (nur der Name, oeffentlich lesbar); ohne oder mit unbekanntem Namen steht die Seite
 * ohne Etikett da. Es wird nichts mitgezaehlt: kein Cookie, kein Zaehler, keine Kennung in der Anmeldung.
 */
export default async function HalloPage({ searchParams }: { searchParams: Promise<{ event?: string | string[] }> }) {
  const params = await searchParams;
  const slug = (Array.isArray(params.event) ? params.event[0] : params.event)?.slice(0, 60) ?? "";
  const t = await getTranslations("auth.hallo");
  let eventName: string | null = null;
  if (/^[a-zA-Z0-9-]{3,60}$/.test(slug)) {
    const client = await createClient();
    const { data } = await client.rpc("get_public_event_name", { p_slug: slug });
    eventName = typeof data === "string" && data.trim() ? data.trim() : null;
  }
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eaf1ff_0%,#f1ecff_100%)] px-5 py-6 text-[#14152b] md:px-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link href="/" aria-label="Made2Found"><BrandLogo className="h-9" priority sizes="160px" /></Link>
        <PublicLanguageSwitcher />
      </div>
      <div className="mx-auto mt-8 grid w-full max-w-5xl items-center gap-10 md:mt-14 md:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)]">
        <div>
          {eventName ? <span data-hallo-event className="inline-block rounded-full bg-violet-100 px-3 py-1 text-[13px] font-bold text-violet-800">{eventName}</span> : null}
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#0b1f3a] md:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-xl text-lg leading-8 text-slate-700">{t("lead")}</p>
          <ol className="mt-6 grid gap-4">
            {(["one", "two", "three"] as const).map((key, index) => (
              <li key={key} className="flex items-start gap-3">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800">{index + 1}</span>
                <span className="text-[17px] leading-7"><strong>{t(`steps.${key}.title`)}</strong><br /><span className="text-[15px] text-slate-600">{t(`steps.${key}.text`)}</span></span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/start" className="brand-cta inline-flex min-h-14 items-center rounded-2xl px-8 text-lg font-semibold">{t("cta")}</Link>
            <span className="max-w-xs text-sm leading-5 text-slate-600">{t("note")}</span>
          </div>
        </div>
        <div className="md:justify-self-end md:w-full md:max-w-md"><AreasExplainer /></div>
      </div>
    </main>
  );
}
