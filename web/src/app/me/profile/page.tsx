import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RESOURCE_KINDS } from "@/features/ai/resourceExtraction";
import type { PersonResource } from "@/features/ai/personResources";
import { DIRECTION_FACETS } from "@/features/direction/directionInterviewGuide";
import { getProfileReadModel } from "@/features/reporting/profileReadModel";
// Die beiden Zahlen stehen seit dem 01.10.2026 neben der Seite: Die
// Druckfassung zeigt dieselbe Dichte, und zwei Zahlen fuer dieselbe
// Zusammenfassung laufen auseinander.
import { DIRECTION_PER_FACET, STRENGTHS_IN_SUMMARY } from "@/features/reporting/profileSummary";
import { WorkMap } from "@/features/instruments/align/AlignMaps";
import { WorkProfileSynthesisView } from "@/features/instruments/align/WorkProfileSynthesisView";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { FounderProfileBase } from "@/features/reporting/FounderProfileBase";
import { FounderProfileCapability } from "@/features/reporting/FounderProfileCapability";
import { CoverageMap, CoverageRoles } from "@/features/reporting/CoverageMap";
import { FounderProfileDirection } from "@/features/reporting/FounderProfileDirection";
import { FounderProfileStrengths } from "@/features/reporting/FounderProfileStrengths";
import { InstrumentNote } from "@/features/reporting/InstrumentNote";
import { ProfilePdfChoice } from "@/features/reporting/ProfilePdfChoice";
import { ProfileDetails } from "@/features/reporting/ProfileDetails";
import { ProfilePart } from "@/features/reporting/ProfilePart";
import { ProfilePillar, type PillarTone } from "@/features/reporting/ProfilePillar";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * „Das bist du" — eine Person, an einem Ort.
 *
 * GEWUENSCHT AM 21.09.2026: "Ein Accelerator hat mich jetzt gefragt nach dem
 * Einzeltest, und da haette ich gerne, dass man da eben auch so eine
 * Einzelauswertung hat fuer eine einzelne Person und nicht nur in
 * Kompatibilitaet mit einem anderen Founder."
 *
 * ES IST EINE ZUSAMMENSTELLUNG, KEIN NEUER SPEICHER. Die Seite liest sechs
 * vorhandene Quellen und schreibt nichts. Keine Kopie, keine zweite Wahrheit.
 *
 * ---------------------------------------------------------------------------
 * DREI TEILE, NEUN ABSCHNITTE - SEIT DEM 01.10.2026
 * ---------------------------------------------------------------------------
 *
 * Vorher waren es vier Saeulen, und sie trugen sehr verschieden grosse
 * Inhalte: "Wie du arbeitest" war die laengste Seite des Produkts, "Wer du
 * bist" sechs Zeilen. Unter "Was du mitbringst" lagen vier verschiedene
 * Fragen in einem Block - welche Bereiche, wie tief, was davon verantworten,
 * wohin wachsen.
 *
 * Jetzt: drei Teile, neun Abschnitte, und jeder Abschnitt beantwortet genau
 * eine Frage.
 *
 *   TEIL I  - Wer du bist          1 Ueber dich
 *                                  2 Wie du arbeitest
 *                                  3 Deine Staerken
 *   TEIL II - Was du mitbringst    4 Deine Faehigkeiten
 *                                  5 Erfahrung & Tiefe
 *                                  6 Was du verantworten willst
 *                                  7 Wohin du wachsen willst
 *                                  8 Netzwerk, Zugaenge & Ressourcen
 *   TEIL III- Was dich antreibt    9 Was dich antreibt
 *
 * ---------------------------------------------------------------------------
 * EINE ZUSAMMENFASSUNG, EIN AUFKLAPPER - NICHT MEHR
 * ---------------------------------------------------------------------------
 *
 * Je Abschnitt hoechstens ein `ProfileDetails`. Zwei verschachtelte Ebenen
 * haetten dasselbe Problem wie vorher die dreizehn weissen Kaesten: Man sieht
 * nicht, was offen ist und was nicht, und klappt am Ende alles auf.
 *
 * Wer sein eigenes Profil ansieht, will sehen, was herausgekommen ist; was er
 * selbst geantwortet hat, weiss er.
 *
 * ---------------------------------------------------------------------------
 * WAS SIE NICHT TUT
 * ---------------------------------------------------------------------------
 *
 *   Sie rechnet keine Gesamtzahl. Ein unvalidiertes Instrument, das eine Zahl
 *   je Person ausgibt, wird als Auswahlkriterium benutzt, sobald es existiert -
 *   und dann entscheidet diese Zahl darueber, wer in ein Programm kommt. Den
 *   Schaden traegt die Person. Aus demselben Grund ist die Grafik eine
 *   Deckungskarte und kein Netzdiagramm (siehe `founderProfileCoverage.ts`).
 *
 *   Sie zeigt keine Erzaehlungen. Ein Profil, das man weitergibt, gibt
 *   Faehigkeiten weiter, nicht die Geschichten aus dem Interview.
 *
 *   Sie mischt keine Venture-Angaben hinein. Die gelten fuer EIN Vorhaben und
 *   einen Zeitraum, das Profil fuer die Person. Unten steht ein Verweis und
 *   eine Begruendung - mehr nicht.
 *
 *   Sie behauptet nichts Ungebautes.
 *
 * SIE GIBT NICHTS FREI. `/me/*` ist die eigene Ansicht; wer sie weitergibt,
 * tut es selbst und bewusst, per Ausdruck oder PDF. Der Freigabeweg fuer
 * Advisors laeuft getrennt darueber, was die Person je Bereich erlaubt hat.
 */


type SectionId =
  | "ueber-dich"
  | "arbeitsweise"
  | "staerken"
  | "faehigkeiten"
  | "erfahrung"
  | "verantwortung"
  | "entwicklung"
  | "ressourcen"
  | "antrieb";

export default async function FounderProfilePage() {
  const locale = await getRequestLocale();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/me/profile");

  const supabase = await createClient();

  // DIE DATEN LIEGEN WOANDERS - seit dem 01.10.2026 in `profileReadModel.ts`.
  // Diese Seite und die Druckfassung zeigen dasselbe Bild; zweimal geladen
  // hiesse, zwei Staende derselben Sache zu pflegen, und zwar lautlos.
  const [t, tCapability, tDirection, tNote, modell] = await Promise.all([
    getTranslations("profile.founderProfile"),
    getTranslations("capability"),
    getTranslations("direction.statements.facets"),
    getTranslations("report.instrumentNote"),
    getProfileReadModel(supabase, user.id, locale),
  ]);

  const {
    core,
    report,
    workProfile,
    vocabulary,
    entries,
    orderedEntries,
    directionStatements,
    strengths,
    confirmedResources,
    freshness,
    ventures,
    readout,
    coverage,
    ownershipGroups,
    growingInto,
    deepAreas,
    handsOver,
  } = modell;

  const areaLabel = (areaId: string) => tCapability(`areaLabels.${areaId}`);

  /**
   * Ob der Aufklapper ueberhaupt etwas hinzufuegt.
   *
   * GEMELDET AM 01.10.2026: Bei wenig Inhalt zeigte er dieselben Saetze noch
   * einmal, nur mit der Herkunft daneben. Fuenf lange Saetze ein zweites Mal
   * zu lesen, um drei Woerter Herkunft zu finden, ist ein schlechter Tausch -
   * und es nimmt dem Aufklapper die Bedeutung: Wer einmal nachsieht und
   * dasselbe findet, klappt den naechsten nicht mehr auf.
   *
   * Die Herkunft an jeden Satz der Zusammenfassung zu haengen, waere die
   * andere Loesung und die schlechtere: Neben jeder Aussage gelesen, macht
   * sie aus Aussagen eine Liste von Fussnoten.
   *
   * Die Ressourcen behalten ihren Aufklapper, auch wenn er nichts hinzuzaehlt.
   * Dort stehen oben kurze Schlagworte in Gruppen und unten eine Liste mit
   * Art und Herkunft - zwei Darstellungen, nicht dieselbe zweimal. Sein Name
   * sagt das auch ("Woher diese Eintraege stammen").
   */
  const mehrStaerken = strengths.length > STRENGTHS_IN_SUMMARY;
  const mehrRichtung = DIRECTION_FACETS.some(
    (facet) =>
      directionStatements.filter((statement) => statement.facet === facet).length >
      DIRECTION_PER_FACET
  );

  const displayName = core?.display_name?.trim() || t("unnamed");
  const asOf = freshness
    ? t("head.asOf", {
        date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(freshness)),
      })
    : null;

  // Die Abschnitte einmal als Daten. Der Sprungbalken oben und die
  // Ueberschriften darunter duerfen nicht auseinanderlaufen.
  const sections: { id: SectionId; title: string }[] = [
    { id: "ueber-dich", title: t("sections.about") },
    { id: "arbeitsweise", title: t("sections.work") },
    { id: "staerken", title: t("sections.strengths") },
    { id: "faehigkeiten", title: t("sections.capability") },
    { id: "erfahrung", title: t("sections.depth") },
    { id: "verantwortung", title: t("sections.ownership") },
    { id: "entwicklung", title: t("sections.growing") },
    { id: "ressourcen", title: t("sections.resources") },
    { id: "antrieb", title: t("sections.direction") },
  ];
  // "Abschnitt 4" - OHNE GESAMTZAHL. Siehe `ProfilePillar`: "4 von 9" war
  // als Position gemeint und wurde als Fortschritt gelesen.
  const nummer = (id: SectionId) =>
    t("sections.step", {
      index: sections.findIndex((section) => section.id === id) + 1,
    });
  const detailsHint = (count: number) => t("detailsHint", { count });
  const originLabel = (origin: string) => t(`origins.${origin}`);

  // Welche Abschnitte ueberhaupt erscheinen. Zwei duerfen ganz entfallen:
  // "wohin du wachsen willst" und die Ressourcen. Bei beiden ist NICHTS eine
  // gueltige Antwort, und ein Leerzustand waere die Aufforderung, sich ein
  // Defizit zu suchen.
  const zeigt: Record<SectionId, boolean> = {
    "ueber-dich": true,
    arbeitsweise: true,
    staerken: true,
    faehigkeiten: true,
    erfahrung: entries.length > 0,
    verantwortung: true,
    entwicklung: growingInto.length > 0,
    ressourcen: confirmedResources.length > 0,
    antrieb: true,
  };

  /**
   * Ein Abschnitt - oder nichts, wenn es dazu nichts zu zeigen gibt.
   *
   * Keine Augenbraue: Der Teil darueber sagt schon, worum es geht, und der
   * Titel steht direkt darunter. Zweimal dasselbe Wort liest sich wie ein
   * Fehler.
   *
   * `eigenerTitel = false` fuer den einen Abschnitt, dessen Name derselbe ist
   * wie der seines Teils ("Was dich antreibt"). Dort steht er einmal, oben,
   * und darunter nur noch die Nummer. Die Sprungmarke bleibt, weil sie am
   * Abschnitt haengt und nicht an der Ueberschrift.
   */
  const teil = (
    id: SectionId,
    tone: PillarTone,
    children: React.ReactNode,
    eigenerTitel = true
  ) =>
    zeigt[id] ? (
      <ProfilePillar
        key={id}
        id={id}
        tone={tone}
        step={nummer(id)}
        title={eigenerTitel ? sections.find((section) => section.id === id)?.title ?? "" : null}
      >
        {children}
      </ProfilePillar>
    ) : null;

  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-4xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-8 flex items-center justify-between">
        {/* `min-h-11`: 44 px, gemessen statt angenommen. Vorher 38. */}
        <a
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700"
        >
          {t("backToDashboard")}
        </a>
      </div>

      {/* ------------------------------------------------------------------
          DER KOPF

          Name, Headline, Region - und der Stand. Der Stand kommt NICHT aus
          einem Fragebogen, sondern aus dem juengsten Zeitpunkt ueber alle
          Quellen, die diese Seite zeigt. Gibt es keinen, steht keiner da:
          Ein Datum, das nur die Haelfte der Quellen kennt, ist schlechter als
          keines - man sieht ihm nicht an, dass es die Haelfte ist.
          ------------------------------------------------------------------ */}
      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{displayName}</h1>
        {core?.headline?.trim() ? (
          <p className="mt-2 text-sm font-medium text-slate-700">{core.headline}</p>
        ) : null}
        {core?.location_region?.trim() ? (
          <p className="mt-1 text-sm text-slate-500">{core.location_region}</p>
        ) : null}
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{t("head.intro")}</p>
        {asOf ? <p className="mt-3 text-xs text-slate-500">{asOf}</p> : null}
      </section>

      {/* ZWEI FASSUNGEN ZUM WEITERGEBEN.

          Hier stand bis zum 01.10.2026 ein einzelner Knopf „Als PDF
          speichern" - und was darin landete, hing davon ab, welche Aufklapper
          gerade offen waren. Jetzt fuehrt der Weg auf eine eigene Seite,
          deren Inhalt in der Adresse steht. */}
      <ProfilePdfChoice
        copy={{
          title: t("print.chooseTitle"),
          shortTitle: t("print.badgeShort"),
          shortText: t("print.shortText"),
          fullTitle: t("print.badgeFull"),
          fullText: t("print.fullText"),
        }}
      />

      {/* ------------------------------------------------------------------
          DER SPRUNGBALKEN

          Neun Abschnitte sind laenger als vier Saeulen. Er ist eine Liste von
          Ankern und KEINE Statusanzeige: Hier stand bis zum 01.10.2026
          "ausgefuellt / noch offen" je Kachel, und das war ein
          Fortschrittsbalken in anderer Schreibweise.

          NICHT MITGEDRUCKT. Im Ausdruck waere er ein Inhaltsverzeichnis fuer
          eine Seite, die man am Stueck liest.
          ------------------------------------------------------------------ */}
      <nav aria-label={t("head.jumpTo")} className="no-print mt-6">
        {/* UNTER `sm` EINE ZEILE ZUM SCHIEBEN, DARUEBER UMBRUCH.

            Gemessen am 01.10.2026 im Browser: Bei 320 px standen acht
            Sprungmarken in sieben Zeilen und 356 px hoch - fast ein ganzer
            Bildschirm Inhaltsverzeichnis, bevor der Inhalt anfaengt. Bei
            375 px waren es sechs Zeilen.

            `-mx-6 px-6` laesst die Zeile bis an den Bildschirmrand laufen,
            damit man sieht, dass dort noch etwas kommt. Der Rollbereich ist
            der der Liste; die Seite selbst wird dadurch nicht breiter. */}
        <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
          {sections
            .filter((section) => zeigt[section.id])
            .map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-4 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
                >
                  {section.title}
                </a>
              </li>
            ))}
        </ul>
      </nav>

      {/* ==================================================================
          TEIL I - WER DU BIST
          ================================================================== */}
      <ProfilePart
        id="teil-wer"
        tone="indigo"
        eyebrow={t("parts.one")}
        title={t("parts.oneTitle")}
      >
        {/* 1 - Ueber dich. Kein Aufklapper: Es sind sechs Zeilen. */}
        {teil(
          "ueber-dich",
          "indigo",
          <>
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
                completeHref: "/profile?step=identity",
                completeCta: t("base.completeCta"),
              }}
            />
            <EditLink href="/profile?step=identity" label={t("edit")} />
          </>
        )}

        {/* 2 - Wie du arbeitest.

            Gelesen wird mit derselben Funktion wie in der Advisor-Ansicht.
            KEINE PUNKTZAHL UND KEINE DEUTUNG: Die Registratur sagt
            `overallScore: false` und `dimensionScores: false`; die WorkMap
            setzt einen Punkt je Antwort und rechnet nichts zusammen. */}
        {teil(
          "arbeitsweise",
          "indigo",
          <>
            {workProfile ? (
              <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
                <p className="max-w-3xl text-sm leading-7 text-slate-700">
                  {t("workProfile.intro")}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {t("workProfile.note")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("workProfile.answered", {
                    answered: workProfile.answered,
                    of: workProfile.of,
                  })}
                </p>

                <div className="mt-5">
                  <WorkMap sections={workProfile.sections} />
                </div>

                {/* WAS SICH IN DEN ANTWORTEN ZEIGT - die Ebene zwischen Bild
                    und Liste, neu am 01.10.2026. Sie steht OFFEN: Die
                    Rohantworten sind das Nachschlagewerk und bleiben
                    eingeklappt; dies hier ist das Ergebnis. */}
                <div className="mt-5">
                  <WorkProfileSynthesisView sections={workProfile.sections} heading="h3" />
                </div>

                <div className="mt-4">
                  <ProfileDetails
                    summary={t("workProfile.detailsSummary")}
                    hint={detailsHint(workProfile.sections.length)}
                  >
                    <ReportViewV21
                      sections={workProfile.sections}
                      orphans={workProfile.orphans}
                      marked={workProfile.marked}
                    />
                  </ProfileDetails>
                </div>

                <EditLink href="/founder-alignment/profil" label={t("edit")} />
              </section>
            ) : (
              <MissingSection
                title={t("missingWorkProfile.title")}
                text={t("missingWorkProfile.text")}
                href="/founder-alignment/profil"
                cta={t("missingWorkProfile.cta")}
              />
            )}

            {/* DER ALTBESTAND - DARUNTER, ZUGEKLAPPT, DATIERT.

                Nur fuer Menschen, die den frueheren Bogen tatsaechlich
                abgegeben haben. Er wird NICHT mit dem neuen verrechnet: keine
                gemeinsame Skala, keine gemeinsame Karte, keine Zuordnung
                alter Dimensionen auf neue Abschnitte. Zwei Fassungen messen
                nicht dasselbe, und eine gemeinsame Darstellung waere eine
                Behauptung ueber Vergleichbarkeit. */}
            {report ? (
              <ProfileDetails
                summary={`${t("legacyReport.title")} — ${t("legacyReport.dated", {
                  date: report.createdAt
                    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(report.createdAt)
                      )
                    : "—",
                })}`}
                hint={null}
              >
                <p className="max-w-3xl text-sm leading-6 text-slate-500">
                  {t("legacyReport.text")}
                </p>
                <div className="mt-4">
                  <SelfReportView report={report} density="summary" detailsHint={detailsHint} />
                </div>
              </ProfileDetails>
            ) : null}
          </>
        )}

        {/* 3 - Deine Staerken. Zusammenfassung: die ersten fuenf.
            Aufklapper: alle, und dort die Herkunft. */}
        {teil(
          "staerken",
          "indigo",
          strengths.length > 0 ? (
            <>
              <FounderProfileStrengths
                strengths={strengths}
                limit={STRENGTHS_IN_SUMMARY}
                copy={{
                  title: null,
                  intro: t("strengthsSection.intro"),
                  self: t("strengths.self"),
                  reflected: (who) => t("strengths.reflected", { who }),
                  frequency: (value) => tCapability(`strengths.frequencies.${value}`),
                  group: (value) => tCapability(`strengths.groups.${value}`),
                  unanswered: t("strengths.unanswered"),
                }}
              />
              {mehrStaerken ? (
                <ProfileDetails
                  summary={t("strengthsSection.detailsSummary")}
                  hint={t("strengthsSection.more", {
                    count: strengths.length - STRENGTHS_IN_SUMMARY,
                  })}
                >
                  <FounderProfileStrengths
                    strengths={strengths}
                    originLabel={originLabel}
                    copy={{
                      title: null,
                      intro: null,
                      self: t("strengths.self"),
                      reflected: (who) => t("strengths.reflected", { who }),
                      frequency: (value) => tCapability(`strengths.frequencies.${value}`),
                      group: (value) => tCapability(`strengths.groups.${value}`),
                      unanswered: t("strengths.unanswered"),
                    }}
                  />
                </ProfileDetails>
              ) : null}
              <EditLink href="/profile?step=strengths" label={t("edit")} />
            </>
          ) : (
            <MissingSection
              title={t("strengthsSection.empty")}
              text={t("strengthsSection.intro")}
              href="/profile?step=strengths"
              cta={t("strengthsSection.emptyCta")}
            />
          )
        )}
      </ProfilePart>

      {/* ==================================================================
          TEIL II - WAS DU MITBRINGST
          ================================================================== */}
      <ProfilePart
        id="teil-was"
        tone="emerald"
        eyebrow={t("parts.two")}
        title={t("parts.twoTitle")}
      >
        {/* 4 - Deine Faehigkeiten. Die Landkarte, nicht die Bewertung.
            `unspoken` ist bei 54 Bereichen der Normalfall und wird blass
            gezeichnet, nie wie eine Luecke. */}
        {teil(
          "faehigkeiten",
          "emerald",
          entries.length > 0 ? (
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
                }}
              />
              <EditLink href="/profile?step=areas" label={t("edit")} />
            </>
          ) : (
            <MissingSection
              title={t("missingCapability.title")}
              text={t("missingCapability.text")}
              href="/profile/interview"
              cta={t("missingCapability.cta")}
            />
          )
        )}

        {/* 5 - Erfahrung & Tiefe.

            KEINE "BESTEN SKILLS". `DEPTH_LEVEL` ist die Grenze, ab der eine
            Angabe als Tiefe gilt - das ist eine Selbstauskunft ueber
            Haeufigkeit und keine Rangliste. Und es gibt keine 0: "noch nichts
            eingetragen" ist `null`, nicht die unterste Stufe. */}
        {teil(
          "erfahrung",
          "emerald",
          <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
            <p className="max-w-3xl text-sm leading-7 text-slate-700">{t("depth.intro")}</p>
            <p className="mt-2 text-sm text-slate-600">
              {t("depth.counts", { levelled: readout.levelledCount, areas: readout.areaCount })}
            </p>

            {readout.levelledCount === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">{t("depth.noLevels")}</p>
            ) : deepAreas.length > 0 ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">{t("depth.depthTitle")}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {deepAreas.map((areaId) => (
                    <li
                      key={areaId}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-900"
                    >
                      {areaLabel(areaId)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">{t("depth.depthNone")}</p>
            )}

            <div className="mt-5">
              <ProfileDetails
                summary={t("depth.detailsSummary")}
                hint={detailsHint(orderedEntries.length)}
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
            </div>

            <EditLink href="/profile?step=evidence" label={t("edit")} />
          </section>
        )}

        {/* 6 - Was du verantworten willst.

            KOENNEN UND WOLLEN SIND ZWEI VERSCHIEDENE DINGE - das ist der
            tragende Satz des Modells und steht deshalb als erster da.

            Die Rollenliste nach Faltin bleibt die Zusammenfassung: Ein
            Bereich zaehlt, wenn er ins Team gehoert UND verantwortet werden
            soll. Die Erfahrungsstufe wird dabei NICHT verrechnet. */}
        {teil(
          "verantwortung",
          "emerald",
          entries.length > 0 ? (
            <>
              <p className="max-w-3xl text-sm leading-7 text-slate-700">{t("ownership.intro")}</p>
              <CoverageRoles
                coverage={coverage}
                copy={{
                  rolesTitle: t("coverage.rolesTitle"),
                  rolesIntro: t("coverage.rolesIntro"),
                  rolesNone: t("coverage.rolesNone"),
                  rolesOpen: (count) => t("coverage.rolesOpen", { count }),
                  rolesCaveat: t("coverage.rolesCaveat"),
                  areaLabel,
                }}
              />
              {/* DER EINE BEFUND, DER MEHR SAGT ALS DIE GRUPPEN.

                  "Tiefe angegeben, und trotzdem soll es jemand anders
                  uebernehmen" - das steht in keiner der vier Gruppen, weil
                  die die Erfahrungsstufe gar nicht kennen. Es ist die
                  deutlichste Stelle, an der man sieht, dass Koennen und
                  Wollen zwei verschiedene Dinge sind.

                  Die uebrigen vier Befunde aus `capabilityReadout` stehen
                  hier NICHT: `anchor`, `contributes` und `undecided` sagen
                  dasselbe wie die Gruppen darunter, nur gedeutet, und
                  `growingInto` hat seinen eigenen Abschnitt. */}
              {handsOver.length > 0 ? (
                <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {tCapability("readout.findings.canButHandsOver.title")}
                  </h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {tCapability("readout.findings.canButHandsOver.text")}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {handsOver.map((areaId) => (
                      <li
                        key={areaId}
                        className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-800"
                      >
                        {areaLabel(areaId)}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <ProfileDetails
                summary={t("ownership.detailsSummary")}
                hint={detailsHint(ownershipGroups.length)}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {ownershipGroups.map((group) => (
                    <div key={group.key}>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {t(`ownership.groups.${group.key}`)}
                      </h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {group.areaIds.map((areaId) => (
                          <li
                            key={areaId}
                            className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-800"
                          >
                            {areaLabel(areaId)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ProfileDetails>
              <EditLink href="/profile?step=ownership" label={t("edit")} />
            </>
          ) : (
            <MissingSection
              title={t("ownership.empty")}
              text={t("ownership.intro")}
              href="/profile?step=ownership"
              cta={t("missingCapability.cta")}
            />
          )
        )}

        {/* 7 - Wohin du wachsen willst.

            Abgeleitet, nicht gespeichert: Wunsch `grow_into`, oder `own` bei
            einer Stufe unter vier. Beides heisst "da will ich hin" und nicht
            "da fehlt mir etwas".

            KEIN LEERZUSTAND. Der Abschnitt entfaellt ganz - "hier koennte
            stehen, woran du arbeitest" waere die Aufforderung, sich etwas
            vorzuwerfen. */}
        {teil(
          "entwicklung",
          "emerald",
          <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
            <p className="max-w-3xl text-sm leading-7 text-slate-700">{t("growingInto.intro")}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {growingInto.map((areaId) => (
                <li
                  key={areaId}
                  className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-800"
                >
                  {areaLabel(areaId)}
                </li>
              ))}
            </ul>
            <EditLink href="/profile?step=ownership" label={t("edit")} />
          </section>
        )}

        {/* 8 - Netzwerk, Zugaenge & Ressourcen.

            NUR BESTAETIGTES. Ein offener Vorschlag ist eine
            Modellbehauptung; hier stuende er wie eine Aussage der Person.
            Entschieden wird weiterhin dort, wo der Vorschlag entstanden ist. */}
        {teil(
          "ressourcen",
          "emerald",
          <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
            <p className="max-w-3xl text-sm leading-7 text-slate-700">{t("resources.intro")}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {RESOURCE_KINDS.map((kind) => {
                const darin = confirmedResources.filter((resource) => resource.kind === kind);
                if (darin.length === 0) return null;
                return (
                  <div key={kind}>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {t(`resources.kinds.${kind}`)}
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {darin.map((resource) => (
                        <li
                          key={resource.id}
                          className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-800"
                        >
                          {resource.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <ProfileDetails
                summary={t("resourcesSection.detailsSummary")}
                hint={detailsHint(confirmedResources.length)}
              >
                <ul className="space-y-2">
                  {confirmedResources.map((resource: PersonResource) => (
                    <li key={resource.id} className="text-sm leading-6 text-slate-900">
                      {resource.label}
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {t(`resources.kinds.${resource.kind}`)} · {originLabel(resource.origin)}
                      </span>
                    </li>
                  ))}
                </ul>
              </ProfileDetails>
            </div>

            <EditLink href="/profile?step=resources" label={t("edit")} />
          </section>
        )}
      </ProfilePart>

      {/* ==================================================================
          TEIL III - WAS DICH ANTREIBT
          ================================================================== */}
      <ProfilePart
        id="teil-wohin"
        tone="violet"
        eyebrow={t("parts.three")}
        title={t("parts.threeTitle")}
      >
        {/* 9 - Was dich antreibt.

            NUR BESTAETIGTE AUSSAGEN. Ein Vorschlag eines Modells ist keine
            Aussage ueber einen Menschen, solange der Mensch ihn nicht
            bestaetigt hat.

            DIE RUBRIKEN SIND DIE FACETTEN. Sie tragen laengst Beschriftungen
            in normaler Sprache ("Probleme, die mir wichtig sind"), und sie
            zu sechs groesseren Gruppen zusammenzufassen haette zwei Facetten
            in einen Topf geworfen, die die Person getrennt eingetragen hat.
            Es gibt keine Zusammenfassung darueber und keine Typologie. */}
        {teil(
          "antrieb",
          "violet",
          directionStatements.length > 0 ? (
            <>
              <FounderProfileDirection
                statements={directionStatements}
                facets={DIRECTION_FACETS}
                limitPerFacet={DIRECTION_PER_FACET}
                copy={{
                  title: null,
                  intro: t("direction.intro"),
                  facetLabel: (facet) => tDirection(facet),
                }}
              />
              {mehrRichtung ? (
                <ProfileDetails
                  summary={t("directionSection.detailsSummary")}
                  hint={detailsHint(directionStatements.length)}
                >
                  <FounderProfileDirection
                    statements={directionStatements}
                    facets={DIRECTION_FACETS}
                    originLabel={originLabel}
                    copy={{
                      title: null,
                      intro: null,
                      facetLabel: (facet) => tDirection(facet),
                    }}
                  />
                </ProfileDetails>
              ) : null}
              <EditLink href="/profile/direction" label={t("edit")} />
            </>
          ) : (
            <MissingSection
              title={t("directionSection.empty")}
              text={t("missingDirection.text")}
              href="/profile/direction"
              cta={t("missingDirection.cta")}
            />
          ),
          false
        )}
      </ProfilePart>

      {/* ------------------------------------------------------------------
          DEINE VORHABEN - ALS VERWEIS, NICHT ALS ABSCHNITT

          Was zu einem Vorhaben festgehalten ist, gilt fuer DIESES Vorhaben
          und einen Zeitraum; das Profil gilt fuer die Person. Hier stehen
          deshalb nur Namen und der Weg dorthin - keine Zusagen, keine
          Risikogrenzen, keine Teamregeln, keine Alignment-Ergebnisse.

          Der Satz daneben ist wichtiger als die Liste: Ohne ihn liest sich
          der Verweis wie ein fehlender Abschnitt statt wie eine
          Entscheidung.
          ------------------------------------------------------------------ */}
      {ventures.length > 0 ? (
        <section className="mt-12 rounded-2xl border border-slate-200/80 bg-white/70 p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("ventures.title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("ventures.text")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ventures.map((venture) => (
              <li key={venture.id}>
                <Link
                  href="/founder-alignment/vorhaben"
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 hover:border-slate-300"
                >
                  {venture.name?.trim() || t("ventures.cta")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* WAS DIESE SEITE ZEIGT - UND WAS NICHT. Unten, weil ein Hinweis ueber
          dem Ergebnis ueberlesen wird oder es wertlos macht, bevor man es
          gelesen hat. Und mitgedruckt, anders als die Hinweise auf fehlende
          Teile: In der Fassung, die weitergegeben wird, ist dieser Satz am
          wichtigsten. */}
      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">{t("whatThisIs.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("whatThisIs.text")}</p>
        <p className="no-print mt-2 text-xs leading-5 text-slate-500">{t("whatThisIs.private")}</p>

        {/* DIE VIER EINSCHRAENKUNGEN BLEIBEN. Der Satz darueber sagt, was die
            Seite zusammenfuehrt; dieser Kasten sagt, was sie als Verfahren
            NICHT ist: kein validiertes Testverfahren, kein Normvergleich,
            eine Momentaufnahme, nicht fuer Auswahlentscheidungen.

            Die Dokumentation war darin immer ehrlich - das Produkt lange
            nicht. Beim Umbau am 01.10.2026 waere der Kasten fast
            herausgefallen, weil die Vorgabe "kein langer Disclaimerblock"
            lautete. Er ist kein langer Block: vier kurze Saetze, und in der
            Fassung, die man weitergibt, sind sie das Wichtigste.

            DATIERT JETZT DIE SEITE, nicht mehr nur den v1-Bericht. */}
        <InstrumentNote
          copy={{
            title: tNote("title"),
            selfReport: tNote("selfReport"),
            notATest: tNote("notATest"),
            snapshot: tNote("snapshot"),
            purpose: tNote("purpose"),
            dated: freshness
              ? tNote("dated", {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(freshness)
                  ),
                })
              : null,
          }}
        />
      </section>
    </main>
  );
}

/**
 * Der Weg zurueck zur Werkbank.
 *
 * Nicht mitgedruckt: Im weitergegebenen Profil waere "Bearbeiten" eine
 * Aufforderung an die falsche Person.
 */
function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="no-print mt-4">
      {/* `min-h-11`: Ein Textlink ist 21 px hoch. Am Telefon ist das kein
          Ziel, das man trifft - und er steht neunmal auf dieser Seite. */}
      <Link
        href={href}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline underline-offset-2"
      >
        {label}
      </Link>
    </p>
  );
}

/**
 * Was fehlt, und wie es entsteht.
 *
 * Ein Profil, dem ohne Hinweis ein Drittel fehlt, sieht aus wie ein
 * vollstaendiges Profil einer Person, ueber die es wenig zu sagen gibt.
 *
 * ES SIEHT NICHT WIE EIN FEHLER AUS. Gestrichelter Rahmen, kein Rot, kein
 * Warnzeichen - und genau ein Weg weiter. Was hier fehlt, fehlt nicht am
 * Menschen.
 *
 * Beim Drucken verschwindet der Hinweis (`no-print`): Im weitergegebenen
 * Profil waere er eine Aufforderung an die falsche Person.
 */
function MissingSection({
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
        className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
      >
        {cta}
      </a>
    </section>
  );
}
