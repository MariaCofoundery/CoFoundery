import { getRequestLocale as getDisplayLocale } from "@/i18n/getLocale";
import { IndividualWorkstyle } from "@/features/reporting/workstyle/IndividualWorkstyle";
import { WorkstyleProfileSummary } from "@/features/reporting/workstyle/WorkstyleProfileSummary";
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
import { CapabilityMap } from "@/features/reporting/CapabilityMap";
import { VentureSnapshot } from "@/features/reporting/VentureSnapshot";
import { getVentureSnapshot, type VentureSnapshot as VentureSnapshotData } from "@/features/reporting/ventureSnapshotData";
import type { ProfileVenture } from "@/features/reporting/profileVentures";
import { alignmentDisplayText } from "@/features/instruments/align/display";
import { isIsoDate } from "@/features/instruments/v21/answersV21";
import type { AppLocale } from "@/i18n/config";
import { CoverageMap, CoverageRoles } from "@/features/reporting/CoverageMap";
import { FounderProfileDirection } from "@/features/reporting/FounderProfileDirection";
import { FounderProfileStrengths } from "@/features/reporting/FounderProfileStrengths";
import { InstrumentNote } from "@/features/reporting/InstrumentNote";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ProfilePdfChoice } from "@/features/reporting/ProfilePdfChoice";
import { ProfileDetails } from "@/features/reporting/ProfileDetails";
import { ProfilePart } from "@/features/reporting/ProfilePart";
import { ProfilePillar, type PillarTone } from "@/features/reporting/ProfilePillar";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { getRequestLocale } from "@/i18n/getLocale";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
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
 * SIEBEN ABSCHNITTE - SEIT PHASE 1 (PROFIL), 17.10.2026
 * ---------------------------------------------------------------------------
 *
 * Vorher neun Abschnitte, und unter „Was du mitbringst" lagen vier davon fuer
 * EINE Frage (welche Bereiche, wie tief, was verantworten, wohin wachsen) -
 * dazu eine Deckungskarte, die nur zaehlte, wie viel ausgefuellt ist.
 * Gemeldet: zu textlastig, zu viele Wiederholungen, Nummern mit Spruengen.
 *
 *   TEIL I  - Wer du bist          1 Ueber dich
 *                                  2 Wie du arbeitest      (Kurzfassung)
 *                                  3 Deine Staerken
 *   TEIL II - Was du mitbringst    4 Was du mitbringst     (Capability Map + Ressourcen)
 *   TEIL III- Was dich antreibt    5 Was dich antreibt
 *                                  6 Deine Vorhaben        (nur Namen und Weg dorthin)
 *                                  7 Details & Methodik    (vollstaendiger Bericht,
 *                                                           Abdeckung, Archiv, Hinweis)
 *
 * DIE NUMMER ZAEHLT NUR, WAS ZU SEHEN IST. Vorher behielt ein ausgeblendeter
 * Abschnitt seinen Platz, und die Zaehlung sprang von 7 auf 9.
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
  | "mitbringst"
  | "antrieb"
  | "vorhaben"
  | "details";

export default async function FounderProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ vorhaben?: string | string[] }>;
}) {
  const locale = await getRequestLocale();
  const gewaehlt = (await searchParams)?.vorhaben;
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
    workstyleV04,
    workProfile,
    entries,
    directionStatements,
    strengths,
    confirmedResources,
    freshness,
    visibleVentures,
    photo,
    coverage,
    capabilityMap,
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
    { id: "mitbringst", title: t("sections.bring") },
    { id: "antrieb", title: t("sections.direction") },
    { id: "vorhaben", title: t("venture.title") },
    { id: "details", title: t("sections.details") },
  ];

  // Welche Abschnitte ueberhaupt erscheinen. Nur die Vorhaben duerfen ganz
  // entfallen - ohne Vorhaben gibt es nichts zu verlinken, und ein Leerzustand
  // waere eine Aufforderung, eines anzulegen. Alle anderen stehen immer und
  // tragen bei leerer Datenlage einen Hinweis mit einem Weg.
  const zeigt: Record<SectionId, boolean> = {
    "ueber-dich": true,
    arbeitsweise: true,
    staerken: true,
    mitbringst: true,
    antrieb: true,
    // Phase 1.1: immer - ohne Antworten mit einem direkten Einstieg.
    vorhaben: true,
    details: true,
  };
  const sichtbar = sections.filter((section) => zeigt[section.id]);

  // "Abschnitt 4" - OHNE GESAMTZAHL. Siehe `ProfilePillar`: "4 von 9" war
  // als Position gemeint und wurde als Fortschritt gelesen.
  // GEZAEHLT WIRD NUR, WAS ZU SEHEN IST (Phase 1): Vorher behielt ein
  // ausgeblendeter Abschnitt seinen Platz, und die Nummern sprangen.
  const nummer = (id: SectionId) =>
    t("sections.step", {
      index: sichtbar.findIndex((section) => section.id === id) + 1,
    });
  const detailsHint = (count: number) => t("detailsHint", { count });
  const originLabel = (origin: string) => t(`origins.${origin}`);
  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
  const ventureLabel = (venture: ProfileVenture) => {
    const label =
      venture.name ??
      (venture.createdAt ? t("ventures.unnamedDated", { date: dateLabel(venture.createdAt) }) : t("ventures.unnamed"));
    return venture.duplicateIndex ? `${label} (${venture.duplicateIndex})` : label;
  };

  // „SO WILLST DU GRÜNDEN" (Phase 1.1): EIN aktuelles Vorhaben - das gewaehlte,
  // sonst das zuletzt geaenderte. Archivierte kommen gar nicht vor
  // (`profileVentures`). Gelesen werden nur die EIGENEN Antworten dazu.
  const wahl = Array.isArray(gewaehlt) ? gewaehlt[0] : gewaehlt;
  const aktuellesVorhaben = visibleVentures.find((venture) => venture.id === wahl) ?? visibleVentures[0] ?? null;
  const snapshot: VentureSnapshotData = aktuellesVorhaben
    ? await getVentureSnapshot(supabase, user.id, aktuellesVorhaben.id, locale as AppLocale)
    : { status: "none" };
  const fragebogenHref = aktuellesVorhaben
    ? `/founder-alignment/vorhaben?venture=${encodeURIComponent(aktuellesVorhaben.id)}`
    : "/founder-alignment/vorhaben";

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

        {/* DAS FOTO - gelesen, nicht gespeichert. Geaendert wird es unter
            „Ueber dich"; hier gibt es keinen Upload.

            `alt=""`: Der Name steht direkt daneben. Ein Alternativtext waere
            eine zweite Fassung desselben - und im Druck stuende er mitten in
            der Ueberschrift, wenn das Bild nicht laedt. */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {photo.avatarId || photo.avatarUrl ? (
            <ProfileAvatar
              displayName={displayName}
              avatarId={photo.avatarId}
              imageUrl={photo.avatarUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            />
          ) : null}
          <h1 className="text-3xl font-semibold text-slate-900">{displayName}</h1>
        </div>
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
        {/* UNTER `lg` EINE ZEILE ZUM SCHIEBEN, DARUEBER UMBRUCH.

            Bis Phase 6 lag die Grenze bei `sm` (640 px). Nachgemessen am
            01.10.2026: Neun Sprungmarken brauchen zusammen rund 1490 px. Bei
            768 und 820 px wurden daraus drei Zeilen und 148 px - auf einem
            Tablet wieder ein Inhaltsverzeichnis vor dem Inhalt. Erst ab
            1024 px (848 px Spalte) sind es zwei Zeilen; das ist die
            Desktop-Fassung, und die bleibt umbrechend.

            Gemessen am 01.10.2026 im Browser: Bei 320 px standen acht
            Sprungmarken in sieben Zeilen und 356 px hoch - fast ein ganzer
            Bildschirm Inhaltsverzeichnis, bevor der Inhalt anfaengt. Bei
            375 px waren es sechs Zeilen.

            `-mx-6 px-6` laesst die Zeile bis an den Bildschirmrand laufen,
            damit man sieht, dass dort noch etwas kommt. Der Rollbereich ist
            der der Liste; die Seite selbst wird dadurch nicht breiter. */}
        <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-x-visible lg:px-0 lg:pb-0">
          {sichtbar
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

        {/* 2 - Wie du arbeitest. DIE KURZFASSUNG (Phase 1).

            Je Bereich EIN Satz auf der Karte, dazu was die Karten nicht sagen:
            wo die Antworten durchgehend in eine Richtung zeigen und - bei
            „je nach Situation" - je Pol eine konkrete Situation. Der
            vollstaendige Bericht (Bereich fuer Bereich, Legende, „So liest du
            das", Anhang) steht unveraendert unter „Details & Methodik" und
            auf der eigenen Berichtsseite.

            KEINE PUNKTZAHL UND KEINE DEUTUNG: dieselbe Auswertung wie dort
            (`narrative.ts`), nichts neu gerechnet. */}
        {teil(
          "arbeitsweise",
          "indigo",
          workstyleV04 ? (
            <>
              <WorkstyleProfileSummary locale={await getDisplayLocale()} profile={workstyleV04} />
              <Link className="mt-4 inline-block underline" href="/me/profile/workstyle">
                {t("currentWorkstyle.openReport")}
              </Link>
            </>
          ) : (
            <MissingSection
              title={t("currentWorkstyle.empty")}
              href={CURRENT_WORKSTYLE_HREF}
              cta={t("currentWorkstyle.cta")}
            />
          )
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
            // EIN WEG, DIREKT: `/profile?step=strengths` ist ein eigener Schritt
            // im Editor (PAGE_STEPS) mit Formular zum Festhalten. Keine zweite
            // Aktion fuer KI-Vorschlaege - die entstehen nur, wenn der
            // Worker laeuft, und ein Knopf, der dann nichts tut, waere eine
            // Attrappe.
            <MissingSection
              title={t("strengthsSection.empty")}
              text={t("strengthsSection.emptyText")}
              href="/profile?step=strengths"
              cta={t("strengthsSection.emptyCta")}
              // Das Stärken-Interview - ein eigenes Gespräch, nicht das
              // Capability-Interview (bis 18.10.2026 führte dieser Link dorthin).
              secondary={{ href: "/profile/strengths-interview", cta: t("strengthsSection.interviewCta") }}
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
        {/* 4 - Was du mitbringst. EIN Abschnitt statt vier (Phase 1).

            Je Bereich stehen Erfahrung und Rolle nebeneinander - getrennt,
            nicht verrechnet: Koennen ist nicht Wollen. „Will verantworten,
            bisher weniger Erfahrung" bleibt genau das; „hineinwachsen" steht
            nur da, wo es jemand so angegeben hat (`grow_into`).

            Die Deckungskarte („x von y Bereichen") war eine Zaehlung, keine
            Aussage ueber die Person. Sie steht jetzt unter „Details &
            Methodik"; hier bleibt eine dezente Zeile, wie viel beschrieben ist. */}
        {teil(
          "mitbringst",
          "emerald",
          <>
            {entries.length > 0 ? (
              <>
                <p className="max-w-3xl text-sm leading-7 text-slate-700">{t("bring.intro")}</p>
                <div className="mt-5">
                  <CapabilityMap
                    map={capabilityMap}
                    copy={{
                      familyLabel: (familyId) => tCapability(`families.${familyId}`),
                      areaLabel,
                      experience: t("bring.experience"),
                      role: t("bring.role"),
                      levelLabel: (level) => tCapability(`levels.${level}`),
                      levelUnset: tCapability("levels.unset"),
                      roleLabel: (role) => t(`bring.roles.${role}`),
                      sourcingLabel: (sourcing) => tCapability(`sourcing.${sourcing}`),
                      lessExperience: t("bring.lessExperience"),
                    }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {t("bring.counts", {
                    areas: capabilityMap.counts.areas,
                    levelled: capabilityMap.counts.levelled,
                    withRole: capabilityMap.counts.withRole,
                  })}
                </p>

                {/* DER EINE BEFUND, DER MEHR SAGT ALS DIE ZEILEN: Tiefe
                    angegeben, und trotzdem soll es jemand anders
                    uebernehmen. Die deutlichste Stelle, an der man sieht,
                    dass Koennen und Wollen zwei verschiedene Dinge sind. */}
                {handsOver.length > 0 ? (
                  <section className="page-section mt-5 rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
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

                {/* Die Rollen nach Faltin: was ins Team gehoert UND verantwortet
                    werden soll. Eine Teamfrage - deshalb eingeklappt. */}
                <div className="mt-5">
                  <ProfileDetails summary={t("bring.rolesSummary")} hint={null}>
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
                  </ProfileDetails>
                </div>
                <EditLink href="/profile?step=areas" label={t("edit")} />
              </>
            ) : (
              <MissingSection
                title={t("missingCapability.title")}
                text={t("missingCapability.text")}
                href="/profile/interview"
                cta={t("missingCapability.cta")}
              />
            )}

            {/* Netzwerk, Zugaenge & Ressourcen - Teil dessen, was jemand
                mitbringt. NUR BESTAETIGTES: Ein offener Vorschlag ist eine
                Modellbehauptung. Ohne Bestaetigtes entfaellt der Block ganz. */}
            {confirmedResources.length > 0 ? (
              <section className="page-section mt-8 rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
                <h3 className="text-base font-semibold text-slate-900">{t("sections.resources")}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{t("resources.intro")}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {RESOURCE_KINDS.map((kind) => {
                    const darin = confirmedResources.filter((resource) => resource.kind === kind);
                    if (darin.length === 0) return null;
                    return (
                      <div key={kind}>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {t(`resources.kinds.${kind}`)}
                        </h4>
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
            ) : null}
          </>,
          false
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
        {/* 5 - Was dich antreibt.

            NUR BESTAETIGTE AUSSAGEN. Ein Vorschlag eines Modells ist keine
            Aussage ueber einen Menschen, solange der Mensch ihn nicht
            bestaetigt hat.

            DIE RUBRIKEN SIND DIE FACETTEN. Es gibt keine Zusammenfassung
            darueber und keine Typologie. */}
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
          6 - SO WILLST DU GRÜNDEN (Phase 1.1)

          Die EIGENE Sicht auf EIN konkretes Vorhaben - jede beteiligte Person
          beantwortet das fuer sich; erst der Teamvergleich (im Team) stellt
          die Sichten nebeneinander. Deshalb hier: ein aktuelles Vorhaben (bei
          mehreren eine schlichte Auswahl statt Teamkarten), die eigenen
          Antworten als kurze Karten, und der Weg zur ausfuehrlichen
          Auswertung. Keine Teammitglieder, keine Antworten anderer.

          Kein Gesamtwert, kein Prozent, keine Rangfolge (`ventureSnapshotModel`).
          Und NICHT in der Druckfassung: Vorhabensangaben gelten fuer ein
          Vorhaben und einen Zeitraum, nicht fuer die Person.
          ------------------------------------------------------------------ */}
      <div className="mt-12">
        {teil(
          "vorhaben",
          "slate",
          <>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">{t("venture.intro")}</p>
            {aktuellesVorhaben && visibleVentures.length > 1 ? (
              <form method="get" action="/me/profile#vorhaben" className="no-print mt-4 flex flex-wrap items-end gap-2">
                <label className="text-sm text-slate-700">
                  {t("venture.select")}
                  <select
                    name="vorhaben"
                    defaultValue={aktuellesVorhaben.id}
                    className="mt-1 block min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  >
                    {visibleVentures.map((venture) => (
                      <option key={venture.id} value={venture.id}>
                        {ventureLabel(venture)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700"
                >
                  {t("venture.show")}
                </button>
              </form>
            ) : aktuellesVorhaben ? (
              <p className="mt-3 text-sm text-slate-500">{t("venture.current", { name: ventureLabel(aktuellesVorhaben) })}</p>
            ) : null}

            {snapshot.status !== "none" && snapshot.cards.length > 0 ? (
              <>
                <div className="mt-5">
                  <VentureSnapshot
                    cards={snapshot.cards}
                    copy={{
                      cardTitle: (key) => t(`venture.cards.${key}`),
                      factLabel: (itemId) => t(`venture.facts.${itemId}`),
                      number: (value) => new Intl.NumberFormat(locale).format(value),
                      money: (amount, currency) => `${new Intl.NumberFormat(locale).format(amount)} ${currency}`,
                      unit: (unit) => alignmentDisplayText(unit, locale as AppLocale),
                      detail: (detail) => (isIsoDate(detail) ? dateLabel(detail) : detail),
                    }}
                  />
                </div>
                {snapshot.status === "draft" ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">{t("venture.draft")}</p>
                ) : null}
                <p className="no-print mt-4 flex flex-wrap gap-x-5">
                  <Link
                    href={`/founder-alignment/vorhaben/antworten?venture=${encodeURIComponent(aktuellesVorhaben!.id)}`}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline underline-offset-2"
                  >
                    {t("venture.allAnswers")}
                  </Link>
                  {snapshot.status === "draft" ? (
                    <Link
                      href={fragebogenHref}
                      className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline underline-offset-2"
                    >
                      {t("venture.continue")}
                    </Link>
                  ) : null}
                </p>
              </>
            ) : (
              <MissingSection
                title={t("venture.empty")}
                text={t("venture.emptyText")}
                href={fragebogenHref}
                cta={t("venture.emptyCta")}
              />
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------
          7 - DETAILS & METHODIK

          Was nicht weg soll, aber nicht ins aktuelle Bild gehoert: der
          vollstaendige Workstyle-Bericht, die Abdeckung nach Familien, das
          Archiv frueherer Auswertungen - und EIN Hinweis, was diese Seite ist.
          Vorher stand dieser Hinweis viermal auf der Seite.

          ARCHIV, NICHT VERRECHNET. Fruehere Fassungen messen nicht dasselbe;
          keine gemeinsame Skala, keine gemeinsame Karte. Alte Punktwerte oder
          Ampeln werden hier nicht neu eingebunden.
          ------------------------------------------------------------------ */}
      {teil(
        "details",
        "slate",
        <>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">{t("details.intro")}</p>
          <div className="mt-4 space-y-3">
            {workstyleV04 ? (
              <ProfileDetails summary={t("details.workstyle")} hint={null}>
                <IndividualWorkstyle locale={await getDisplayLocale()} profile={workstyleV04} />
              </ProfileDetails>
            ) : null}

            {entries.length > 0 ? (
              <ProfileDetails summary={t("details.coverage")} hint={null}>
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
              </ProfileDetails>
            ) : null}

            {/* Phase 10: Das fruehere Arbeitsprofil (founder-profile-v1) nur
                noch datiert zum Nachlesen - im Archiv, nie ein Ersatz fuer
                den aktuellen Bericht. */}
            {workProfile && (
              <ProfileDetails
                summary={`${t("historicalWorkProfile.title")} — ${t("historicalWorkProfile.dated", {
                  date: workProfile.submittedAt
                    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(workProfile.submittedAt)
                      )
                    : "—",
                })}`}
                hint={null}
              >
              <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
                <p className="max-w-3xl text-sm leading-7 text-slate-700">
                  {t("historicalWorkProfile.text")}
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

                <div className="mt-5">
                  <WorkProfileSynthesisView sections={workProfile.sections} heading="h3" />
                </div>

                <div className="mt-4">
                  <div>
                    <ReportViewV21
                      sections={workProfile.sections}
                      orphans={workProfile.orphans}
                      marked={workProfile.marked}
                    />
                  </div>
                </div>
              </section>
              </ProfileDetails>
            )}

            {/* DER ALTBESTAND - IM ARCHIV, ZUGEKLAPPT, DATIERT. Nur fuer
                Menschen, die den frueheren Bogen tatsaechlich abgegeben haben;
                er wird NICHT mit dem neuen verrechnet. */}
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
                  <SelfReportView report={report} density="summary" detailsHint={detailsHint} legacy />
                </div>
              </ProfileDetails>
            ) : null}
          </div>

          {/* UEBER DIESE AUSWERTUNG - EINMAL. Die vier Einschraenkungen bleiben
              (kein validiertes Testverfahren, kein Normvergleich,
              Momentaufnahme, nicht fuer Auswahlentscheidungen), dazu „keine
              Erfolgsprognose". Mitgedruckt: In der weitergegebenen Fassung
              sind diese Saetze am wichtigsten. DATIERT DIE SEITE. */}
          <InstrumentNote
            copy={{
              title: tNote("title"),
              selfReport: tNote("selfReport"),
              notATest: tNote("notATest"),
              snapshot: tNote("snapshot"),
              purpose: tNote("purpose"),
              extra: t("whatThisIs.noPrediction"),
              dated: freshness
                ? tNote("dated", {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      new Date(freshness)
                    ),
                  })
                : null,
            }}
          />
          <p className="no-print mt-3 text-xs leading-5 text-slate-500">{t("whatThisIs.private")}</p>
        </>
      )}
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
  secondary,
}: {
  title: string;
  text?: string;
  href: string;
  cta: string;
  /** Ein zweiter, gleichwertig echter Weg - nur wo es ihn wirklich gibt (Phase 1.1: Staerken-Interview). */
  secondary?: { href: string; cta: string };
}) {
  return (
    <section className="no-print rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {text ? <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{text}</p> : null}
      {/* EINE KLARE AKTION (Phase 1): vorher ein grauer Rahmenknopf, der wie
          ein Nebenlink aussah. Kein Warnton - was hier fehlt, fehlt nicht am
          Menschen. */}
      <a
        href={href}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
      >
        {cta}
      </a>
      {secondary ? (
        <a
          href={secondary.href}
          className="ml-3 mt-4 inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 hover:border-slate-400"
        >
          {secondary.cta}
        </a>
      ) : null}
    </section>
  );
}
