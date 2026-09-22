import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildCapabilityReadout } from "@/features/capability/capabilityReadout";
import { CapabilityReadoutSection } from "@/features/capability/CapabilityReadoutSection";
import { getCapabilityVocabulary, getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { getLatestSelfAlignmentReport } from "@/features/reporting/actions";
import { FounderProfileBase } from "@/features/reporting/FounderProfileBase";
import { FounderProfileCapability } from "@/features/reporting/FounderProfileCapability";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Founderprofil - eine Person, an einem Ort.
 *
 * GEWUENSCHT AM 21.09.2026: "Ein Accelerator hat mich jetzt gefragt nach dem
 * Einzeltest, und da haette ich gerne, dass man da eben auch so eine
 * Einzelauswertung hat fuer eine einzelne Person und nicht nur in
 * Kompatibilitaet mit einem anderen Founder."
 *
 * ES IST EINE ZUSAMMENSTELLUNG, KEIN NEUER SPEICHER. Drei Saeulen waren schon
 * gebaut und lagen auf drei Seiten: Wer heute gefragt wurde "schick mir dein
 * Founderprofil", schickte drei Links. Diese Seite legt sie nebeneinander und
 * liest dabei genau die vorhandenen Quellen - keine Kopie, keine zweite
 * Wahrheit. Begruendung in
 * `web/docs/founder-profile-and-advisor-access-brief.md`.
 *
 * WAS SIE NICHT TUT:
 *
 *   Sie rechnet keine Gesamtzahl. Ein unvalidiertes Instrument, das eine Zahl
 *   je Person ausgibt, wird als Auswahlkriterium benutzt, sobald es existiert -
 *   und dann entscheidet diese Zahl darueber, wer in ein Programm kommt. Den
 *   Schaden traegt die Person.
 *
 *   Sie zeigt keine Erzaehlungen. Siehe `FounderProfileCapability.tsx`: Ein
 *   Profil, das man weitergibt, gibt Faehigkeiten weiter, nicht die
 *   Geschichten aus dem Interview.
 *
 *   Sie behauptet nichts Ungebautes. Es steht kein "Direction folgt spaeter"
 *   darauf - das Produkt verspricht hier nur, was es hat.
 *
 * SIE GIBT NICHTS FREI. `/me/*` ist die eigene Ansicht; wer sie weitergibt,
 * tut es selbst und bewusst, per Ausdruck oder PDF. Ein Freigabeweg fuer
 * Advisors und Acceleratoren ist ein eigenes Vorhaben mit eigener
 * Einwilligung - er steht im Brief, nicht hier.
 */
export default async function FounderProfilePage() {
  const locale = await getRequestLocale();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/me/profile");

  const supabase = await createClient();
  const [t, tCapability, core, report, vocabulary, entries] = await Promise.all([
    getTranslations("profile.founderProfile"),
    getTranslations("capability"),
    getPersonCore(supabase, user.id),
    getLatestSelfAlignmentReport({ locale }),
    getCapabilityVocabulary(supabase),
    getOwnCapabilityEntries(supabase, user.id),
  ]);

  const areaLabel = (areaId: string) => tCapability(`areaLabels.${areaId}`);
  const readout = buildCapabilityReadout(entries, vocabulary.areas, vocabulary.families);
  // Die Reihenfolge des Vokabulars, nicht die der Datenbank: Sonst stehen die
  // Bereiche in der Folge, in der jemand sie eingetragen hat.
  const areaOrder = new Map(vocabulary.areas.map((area) => [area.area_id, area.sort_order]));
  const orderedEntries = entries
    .slice()
    .sort((a, b) => (areaOrder.get(a.area_id) ?? 0) - (areaOrder.get(b.area_id) ?? 0));

  const displayName = core?.display_name?.trim() || t("unnamed");

  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-4xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-8 flex items-center justify-between">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          {t("backToDashboard")}
        </a>
        <PrintReportButton eventName="founder_profile_print_clicked" module="base" />
      </div>

      <section className="page-section mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{displayName}</h1>
        {core?.headline?.trim() ? (
          <p className="mt-2 text-sm font-medium text-slate-700">{core.headline}</p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{t("intro")}</p>
      </section>

      <FounderProfileBase
        core={core}
        copy={{
          title: t("base.title"),
          region: t("base.region"),
          remoteMode: (mode) => tCapability(`remoteModes.${mode}`),
          expertise: t("base.expertise"),
          industries: t("base.industries"),
          linkedin: t("base.linkedin"),
          empty: t("base.empty"),
          completeHref: "/profile",
          completeCta: t("base.completeCta"),
        }}
      />

      {/* Das Selbstbild aus dem Fragebogen, in derselben Ansicht wie unter
          /me/report - nicht nachgebaut, sondern dasselbe Bauteil. */}
      {report ? (
        <SelfReportView report={report} />
      ) : (
        <MissingPillar
          title={t("missingReport.title")}
          text={t("missingReport.text")}
          href="/me/base"
          cta={t("missingReport.cta")}
        />
      )}

      {entries.length > 0 ? (
        <>
          <FounderProfileCapability
            entries={orderedEntries}
            copy={{
              title: t("capability.title"),
              intro: t("capability.intro"),
              areaLabel,
              levelLabel: (level) => tCapability(`levels.${level}`),
              wishLabel: (wish) => tCapability(`ownershipWishes.${wish}`),
              evidenceCount: (count) => t("capability.evidenceCount", { count }),
              noLevel: t("capability.noLevel"),
            }}
          />
          <CapabilityReadoutSection
            readout={readout}
            copy={{
              title: tCapability("readout.title"),
              coverage: tCapability("readout.coverage", {
                areas: readout.areaCount,
                levelled: readout.levelledCount,
                wished: readout.wishedCount,
              }),
              focus: readout.focusFamilyId
                ? tCapability("readout.focus", { family: tCapability(`families.${readout.focusFamilyId}`) })
                : null,
              basis: tCapability("readout.basis"),
              findingTitle: (key) => tCapability(`readout.findings.${key}.title`),
              findingText: (key) => tCapability(`readout.findings.${key}.text`),
              areaLabel,
            }}
          />
        </>
      ) : (
        <MissingPillar
          title={t("missingCapability.title")}
          text={t("missingCapability.text")}
          href="/profile/interview"
          cta={t("missingCapability.cta")}
        />
      )}
    </main>
  );
}

/**
 * Was fehlt, und wie es entsteht.
 *
 * Eine fehlende Saeule wird benannt und nicht verschwiegen: Ein Profil, dem
 * ohne Hinweis ein Drittel fehlt, sieht aus wie ein vollstaendiges Profil
 * einer Person, ueber die es wenig zu sagen gibt.
 *
 * Beim Drucken verschwindet der Hinweis (`no-print`): Im weitergegebenen
 * Profil waere er eine Aufforderung an die falsche Person.
 */
function MissingPillar({
  title,
  text,
  href,
  cta,
}: {
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="no-print mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{text}</p>
      <a
        href={href}
        className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
      >
        {cta}
      </a>
    </section>
  );
}
