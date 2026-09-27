import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildCapabilityReadout } from "@/features/capability/capabilityReadout";
import { CapabilityReadoutSection } from "@/features/capability/CapabilityReadoutSection";
import { getCapabilityVocabulary, getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import { DIRECTION_FACETS } from "@/features/direction/directionInterviewGuide";
import { getDirectionStatements } from "@/features/direction/directionStatementData";
import { getPersonStrengths } from "@/features/capability/strengthData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { getLatestSelfAlignmentReport } from "@/features/reporting/actions";
import { buildFounderProfileCoverage } from "@/features/reporting/founderProfileCoverage";
import { FounderProfileBase } from "@/features/reporting/FounderProfileBase";
import { FounderProfileCapability } from "@/features/reporting/FounderProfileCapability";
import { CoverageMap } from "@/features/reporting/CoverageMap";
import { FounderProfileDirection } from "@/features/reporting/FounderProfileDirection";
import { FounderProfileStrengths } from "@/features/reporting/FounderProfileStrengths";
import { InstrumentNote } from "@/features/reporting/InstrumentNote";
import { OpenDetailsForPrint } from "@/features/reporting/OpenDetailsForPrint";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ProfileDetails } from "@/features/reporting/ProfileDetails";
import { ProfilePillar, type PillarTone } from "@/features/reporting/ProfilePillar";
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
 * ---------------------------------------------------------------------------
 * UMGEBAUT AM 24.09.2026
 * ---------------------------------------------------------------------------
 *
 * GEMELDET: "Ich finde, da muessten viel mehr Sachen zusammengeklappt sein.
 * Sachen, die man selbst beantwortet hat, brauchen nicht mehr so ausfuehrlich
 * dastehen - einfach nur die Zusammenfassung, und dann kann man, wenn man
 * will, seine eigenen Antworten noch mal ausklappen. Ansonsten ist es viel zu
 * erschlagend, und es muesste bitte noch mal ein bisschen sortiert werden."
 *
 * Vorher war die Seite ein Stapel aus dreizehn gleich aussehenden weissen
 * Kaesten. Jeder einzelne war gut; zusammen waren sie eine Wand. Drei
 * Aenderungen:
 *
 *   SORTIERT IN VIER SAEULEN. Die Saeulen waren in der Sprache laengst da -
 *   "Wer du bist", "Wie du arbeitest", "Was du mitbringst", "Was dir wichtig
 *   ist". Sie waren nur nie als Struktur sichtbar. Jede traegt jetzt eine
 *   Nummer ("2 von 4"), weil die Seite vorher weder Anfang noch Ende hatte.
 *
 *   EINGEKLAPPT, WAS AUSFUEHRUNG IST. Offen bleibt die Zusammenfassung - das
 *   Kernmuster, die Deckungskarte, die Auswertung. Eingeklappt sind die langen
 *   Ableitungen aus dem Fragebogen und die eigene Bereichsliste. Wer sein
 *   eigenes Profil ansieht, will sehen, was herausgekommen ist; was er selbst
 *   geantwortet hat, weiss er.
 *
 *   FARBIG - ABER NUR AM RAHMEN. Die Farbe sagt "welche Saeule", nie "wie
 *   gut". Deshalb sitzt sie an Augenbraue und Randlinie und nie auf einer
 *   Inhaltskarte: Innen bleiben Bernstein und Rose fuer ihre Bedeutung
 *   reserviert (Bruchstelle, Luecke).
 *
 * WAS SIE NICHT TUT:
 *
 *   Sie rechnet keine Gesamtzahl. Ein unvalidiertes Instrument, das eine Zahl
 *   je Person ausgibt, wird als Auswahlkriterium benutzt, sobald es existiert -
 *   und dann entscheidet diese Zahl darueber, wer in ein Programm kommt. Den
 *   Schaden traegt die Person. Aus demselben Grund ist die neue Grafik eine
 *   Deckungskarte und kein Netzdiagramm (siehe `founderProfileCoverage.ts`).
 *
 *   Sie zeigt keine Erzaehlungen. Siehe `FounderProfileCapability.tsx`: Ein
 *   Profil, das man weitergibt, gibt Faehigkeiten weiter, nicht die
 *   Geschichten aus dem Interview.
 *
 *   Sie behauptet nichts Ungebautes. Es steht kein "Direction folgt spaeter"
 *   darauf - das Produkt verspricht hier nur, was es hat.
 *
 * SIE GIBT NICHTS FREI. `/me/*` ist die eigene Ansicht; wer sie weitergibt,
 * tut es selbst und bewusst, per Ausdruck oder PDF. Der Freigabeweg fuer
 * Advisors laeuft getrennt darueber, was die Person je Bereich erlaubt hat.
 */
export default async function FounderProfilePage() {
  const locale = await getRequestLocale();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/me/profile");

  const supabase = await createClient();
  const [t, tCapability, tDirection, tNote, core, report, vocabulary, entries, directionStatements, strengths] =
    await Promise.all([
      getTranslations("profile.founderProfile"),
      getTranslations("capability"),
      getTranslations("direction.statements.facets"),
      getTranslations("report.instrumentNote"),
      getPersonCore(supabase, user.id),
      getLatestSelfAlignmentReport({ locale }),
      getCapabilityVocabulary(supabase),
      getOwnCapabilityEntries(supabase, user.id),
      getDirectionStatements(supabase),
      getPersonStrengths(supabase),
    ]);

  const areaLabel = (areaId: string) => tCapability(`areaLabels.${areaId}`);
  const readout = buildCapabilityReadout(entries, vocabulary.areas, vocabulary.families);
  const coverage = buildFounderProfileCoverage(entries, vocabulary.areas, vocabulary.families);
  // Die Reihenfolge des Vokabulars, nicht die der Datenbank: Sonst stehen die
  // Bereiche in der Folge, in der jemand sie eingetragen hat.
  const areaOrder = new Map(vocabulary.areas.map((area) => [area.area_id, area.sort_order]));
  const orderedEntries = entries
    .slice()
    .sort((a, b) => (areaOrder.get(a.area_id) ?? 0) - (areaOrder.get(b.area_id) ?? 0));

  const displayName = core?.display_name?.trim() || t("unnamed");
  const hasBase =
    Boolean(core?.bio?.trim()) ||
    Boolean(core?.location_region?.trim()) ||
    (core?.expertise?.length ?? 0) > 0 ||
    (core?.industries?.length ?? 0) > 0;

  // Die vier Saeulen, einmal als Daten - der Ueberblick oben und die
  // Abschnitte darunter duerfen nicht auseinanderlaufen.
  const pillars: { id: string; tone: PillarTone; eyebrow: string; title: string; done: boolean }[] = [
    { id: "saeule-wer", tone: "slate", eyebrow: t("pillars.base"), title: t("base.title"), done: hasBase },
    {
      id: "saeule-wie",
      tone: "indigo",
      eyebrow: t("pillars.work"),
      title: t("strengths.title"),
      done: Boolean(report),
    },
    {
      id: "saeule-was",
      tone: "emerald",
      eyebrow: t("pillars.bring"),
      title: t("capability.title"),
      done: entries.length > 0,
    },
    {
      id: "saeule-wohin",
      tone: "violet",
      eyebrow: t("pillars.direction"),
      title: t("direction.title"),
      done: directionStatements.length > 0,
    },
  ];
  const step = (index: number) => t("pillars.step", { index: index + 1, total: pillars.length });
  const detailsHint = (count: number) => t("detailsHint", { count });

  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-4xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      {/* Beim Drucken geht alles auf - sonst fehlt in der weitergegebenen
          Fassung genau der Teil, den man weitergeben wollte. */}
      <OpenDetailsForPrint />

      <div className="no-print mb-8 flex items-center justify-between">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          {t("backToDashboard")}
        </a>
        <PrintReportButton eventName="founder_profile_print_clicked" module="base" />
      </div>

      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{displayName}</h1>
        {core?.headline?.trim() ? (
          <p className="mt-2 text-sm font-medium text-slate-700">{core.headline}</p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{t("intro")}</p>
      </section>

      {/* ------------------------------------------------------------------
          Der Ueberblick.

          Er loest "erschlagend" fuer sich genommen schon zur Haelfte: Vier
          Kacheln auf einem Bildschirm sagen, woraus die Seite besteht und wo
          noch etwas fehlt - vorher musste man dafuer scrollen.

          NICHT MITGEDRUCKT. Im Ausdruck waere er ein Inhaltsverzeichnis fuer
          vier Abschnitte, und "noch offen" waere dort eine Aussage ueber die
          Person an die falschen Leser.
          ------------------------------------------------------------------ */}
      <nav aria-label={t("overview.title")} className="no-print mt-6">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => (
            <li key={pillar.id}>
              <a
                href={`#${pillar.id}`}
                className="flex h-full min-h-11 flex-col justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-white"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {step(index)}
                </span>
                <span className="mt-1 text-sm font-medium text-slate-900">{pillar.title}</span>
                <span
                  className={`mt-1 text-xs ${pillar.done ? "text-slate-500" : "text-amber-700"}`}
                >
                  {pillar.done ? t("overview.ready") : t("overview.open")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ------------------------------------------------------------------
          1 - Wer du bist
          ------------------------------------------------------------------ */}
      <ProfilePillar
        id={pillars[0].id}
        tone={pillars[0].tone}
        step={step(0)}
        eyebrow={pillars[0].eyebrow}
        title={pillars[0].title}
      >
        <FounderProfileBase
          core={core}
          copy={{
            title: null,
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
      </ProfilePillar>

      {/* ------------------------------------------------------------------
          2 - Wie du arbeitest

          Der laengste Teil der Seite, und deshalb der, bei dem das Einklappen
          am meisten bringt: Das Kernmuster bleibt offen, seine fuenf
          Ausfuehrungen gehen zu.
          ------------------------------------------------------------------ */}
      <ProfilePillar
        id={pillars[1].id}
        tone={pillars[1].tone}
        step={step(1)}
        eyebrow={pillars[1].eyebrow}
        title={pillars[1].title}
      >
        {report ? (
          <SelfReportView report={report} density="summary" detailsHint={detailsHint} />
        ) : (
          <MissingPillar
            title={t("missingReport.title")}
            text={t("missingReport.text")}
            href="/me/base"
            cta={t("missingReport.cta")}
          />
        )}

        <FounderProfileStrengths
          strengths={strengths}
          copy={{
            title: t("strengths.subtitle"),
            intro: t("strengths.intro"),
            self: t("strengths.self"),
            reflected: (who) => t("strengths.reflected", { who }),
            frequency: (value) => tCapability(`strengths.frequencies.${value}`),
            group: (value) => tCapability(`strengths.groups.${value}`),
            unanswered: t("strengths.unanswered"),
          }}
        />
      </ProfilePillar>

      {/* ------------------------------------------------------------------
          3 - Was du mitbringst

          Erst das Bild (welche Familien sind ueberhaupt besprochen), dann die
          Auswertung, und zuletzt - eingeklappt - die eigene Liste. Genau die
          Reihenfolge, nach der gefragt wurde: Zusammenfassung oben, eigene
          Antworten auf Wunsch.
          ------------------------------------------------------------------ */}
      <ProfilePillar
        id={pillars[2].id}
        tone={pillars[2].tone}
        step={step(2)}
        eyebrow={pillars[2].eyebrow}
        title={pillars[2].title}
      >
        {entries.length > 0 ? (
          <>
            <CoverageMap
              coverage={coverage}
              copy={{
                title: t("coverage.title"),
                intro: t("coverage.intro"),
                familyLabel: (familyId) => tCapability(`families.${familyId}`),
                stateLabel: (state) => t(`coverage.states.${state}`),
                familyCount: (entered, total) => t("coverage.familyCount", { entered, total }),
                familyUnspoken: t("coverage.familyUnspoken"),
                basis: t("coverage.basis"),
                rolesTitle: t("coverage.rolesTitle"),
                rolesIntro: t("coverage.rolesIntro"),
                rolesNone: t("coverage.rolesNone"),
                rolesOpen: (count) => t("coverage.rolesOpen", { count }),
                rolesCaveat: t("coverage.rolesCaveat"),
                areaLabel,
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

            <ProfileDetails
              summary={t("capability.detailsSummary")}
              hint={t("capability.detailsHint", { count: orderedEntries.length })}
            >
              <FounderProfileCapability
                entries={orderedEntries}
                copy={{
                  title: null,
                  intro: t("capability.intro"),
                  areaLabel,
                  levelLabel: (level) => tCapability(`levels.${level}`),
                  wishLabel: (wish) => tCapability(`ownershipWishes.${wish}`),
                  evidenceCount: (count) => t("capability.evidenceCount", { count }),
                  noLevel: t("capability.noLevel"),
                }}
              />
            </ProfileDetails>
          </>
        ) : (
          <MissingPillar
            title={t("missingCapability.title")}
            text={t("missingCapability.text")}
            href="/profile/interview"
            cta={t("missingCapability.cta")}
          />
        )}
      </ProfilePillar>

      {/* ------------------------------------------------------------------
          4 - Was dir wichtig ist

          Bleibt offen: Es sind wenige kurze Saetze, und es ist der Teil, den
          ein Lebenslauf nicht hergibt.
          ------------------------------------------------------------------ */}
      <ProfilePillar
        id={pillars[3].id}
        tone={pillars[3].tone}
        step={step(3)}
        eyebrow={pillars[3].eyebrow}
        title={pillars[3].title}
      >
        {directionStatements.length > 0 ? (
          <FounderProfileDirection
            statements={directionStatements}
            facets={DIRECTION_FACETS}
            copy={{
              title: null,
              intro: t("direction.intro"),
              facetLabel: (facet) => tDirection(facet),
            }}
          />
        ) : (
          <MissingPillar
            title={t("missingDirection.title")}
            text={t("missingDirection.text")}
            href="/profile/direction"
            cta={t("missingDirection.cta")}
          />
        )}
      </ProfilePillar>

      {/* WAS DAS HIER IST - UND WAS NICHT. Unten, weil ein Warnhinweis über
          dem Ergebnis überlesen wird oder es wertlos macht, bevor man es
          gelesen hat. Und mitgedruckt, anders als die Hinweise auf fehlende
          Teile: In der Fassung, die weitergegeben wird, ist dieser Satz am
          wichtigsten. */}
      <div className="mt-10">
        <InstrumentNote
          copy={{
            title: tNote("title"),
            selfReport: tNote("selfReport"),
            notATest: tNote("notATest"),
            snapshot: tNote("snapshot"),
            purpose: tNote("purpose"),
            dated: report?.createdAt
              ? tNote("dated", {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(report.createdAt)
                  ),
                })
              : null,
          }}
        />
      </div>
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
    <section className="no-print rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
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
