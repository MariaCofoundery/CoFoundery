import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
// Bewusste Wiederverwendung statt Kopie: die Komponente ist generisch, nur ihr
// Name traegt noch das Feature, in dem sie entstanden ist.
import { ConnectSubmitButton as SubmitButton } from "@/features/connect/ConnectSubmitButton";
import {
  deleteCapabilityEvidenceAction,
  saveCapabilityAreasAction,
  saveCapabilityDisclosureAction,
  saveCapabilityEvidenceAction,
  saveCapabilityOwnershipAction,
} from "@/features/capability/capabilityActions";
import { CapabilityReadoutSection } from "@/features/capability/CapabilityReadoutSection";
import { StrengthsSection } from "@/features/capability/StrengthsSection";
import {
  getPendingStrengthProposals,
  getPersonStrengths,
} from "@/features/capability/strengthData";
import { buildCapabilityReadout } from "@/features/capability/capabilityReadout";
import { CapabilitySnapshotStart } from "@/features/capability/CapabilitySnapshotStart";
import { getUnsortedInterviewAnswers } from "@/features/capability/capabilityInterviewData";
import { getComparablePeople, type ComparablePerson } from "@/features/capability/capabilityComparisonData";
import { getCapabilityVocabulary, getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import {
  CAPABILITY_DISCLOSURE_LEVELS,
  OWNERSHIP_WISHES,
  groupEntriesByFamily,
  isSnapshotStep,
} from "@/features/capability/capabilityTypes";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { PROFILE_ROLE_OPTIONS, normalizeProfileRoles, type ProfileRole } from "@/features/profile/profileRoles";
import {
  IDENTITY_THRESHOLDS,
  getIdentityGaps,
  parseIdentityReturnPath,
} from "@/features/profile/identityReadiness";
import { ANALYZED_AREA_IDS } from "@/features/capability/narrativeAnalysis";
import { CvImportField } from "@/features/profile/CvImportField";
import { CV_INDUSTRY_KEYS } from "@/features/profile/cvIndustries";
import { LinkedInField } from "@/features/profile/LinkedInField";
import { isLinkedInVisibility } from "@/features/profile/linkedInVisibility";
import { getPersonCore } from "@/features/profile/personCoreData";
import { saveIdentityAction } from "@/features/profile/personCoreActions";
import { getOwnPersonResources, type PersonResource } from "@/features/ai/personResources";
import { ResourceProposalSection } from "@/features/ai/ResourceProposalSection";
import { RESOURCE_LABEL_MAX } from "@/features/ai/resourceExtraction";
import { OwnResourcesSection } from "@/features/profile/OwnResourcesSection";
import {
  buildAboutYou,
  recommendNextStep,
  isMarkableStep,
  type AboutYouStation as AboutYouStationModel,
  type StationId,
  type StepId,
} from "@/features/profile/aboutYou";
import { getAboutYouFacts } from "@/features/profile/aboutYouData";
import { AboutYouStation } from "@/features/profile/AboutYouStation";
import { SectionMarkToggle } from "@/features/profile/SectionMarkToggle";
import { buildFounderProfileCoverage } from "@/features/reporting/founderProfileCoverage";
import { CoverageMap, CoverageRoles } from "@/features/reporting/CoverageMap";
import { FounderProfileBase } from "@/features/reporting/FounderProfileBase";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const field =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";
const primary =
  "min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold";
const secondary = "inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold";

/**
 * Die Schritte, die diese Seite selbst traegt.
 *
 * `evidence`, `areas` und `ownership` gab es vorher und sie bleiben Wort fuer
 * Wort - sie stehen in Links, in Lesezeichen und in den Weiterleitungen der
 * Erfassungsaktionen.
 *
 * `identity`, `strengths`, `resources` und `sichtbarkeit` sind am 01.10.2026
 * dazugekommen: Diese vier Abschnitte lagen bis dahin alle gleichzeitig auf
 * der Startansicht. Sie haben jetzt eine eigene Adresse, damit die Uebersicht
 * eine Uebersicht sein kann und damit die Bearbeiten-Links aus "Das bist du"
 * irgendwo landen koennen.
 */
const PAGE_STEPS = [
  "evidence",
  "areas",
  "ownership",
  "identity",
  "strengths",
  "resources",
  "sichtbarkeit",
] as const;
type PageStep = (typeof PAGE_STEPS)[number];
const isPageStep = (value: unknown): value is PageStep =>
  typeof value === "string" && (PAGE_STEPS as readonly string[]).includes(value);

/** Zu welcher Station ein Schritt gehoert - fuer den Weg zurueck. */
const STATION_OF_STEP: Record<StepId, StationId> = {
  basis: "basis",
  arbeitsweise: "arbeitsweise",
  gespraech: "mitbringen",
  faehigkeiten: "mitbringen",
  erfahrung: "mitbringen",
  verantwortung: "mitbringen",
  staerken: "mitbringen",
  antrieb: "antrieb",
  ressourcen: "ressourcen",
};

// Muessen mit den Schluesseln in messages/<sprache>/capability.json
// uebereinstimmen.
//
// DER STERN STAND HIER FRUEHER ALS PFADMUSTER. Er ist am 01.10.2026
// verschwunden, weil `messages/` gefolgt von Stern-Schraegstrich fuer jede
// Testhilfe, die Kommentare entfernt, ein geoeffneter Blockkommentar ist -
// und dann verschwand ab hier der halbe Rest der Datei, lautlos. Gefunden
// von einem Test, der eine Zeile nicht fand, die dasteht.

const SAVED_KEYS = [
  "snapshot",
  "evidence_removed",
  "identity",
  "disclosure",
  "interview_done",
  "resource_added",
  "resource_updated",
  "resource_removed",
];
const ERROR_KEYS = [
  "narrative",
  "area",
  "save",
  "published_incomplete",
  "roles",
  "linkedin",
  "strength_length",
  "resource_empty",
  "resource_duplicate",
];
const NOTICE_KEYS = ["recognised", "confirmed", "unmatched", "interview_paused"];
const REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/profile");

  const [t, tDirection, tProfile, locale, params, vocabulary, strengths, strengthProposals, entries, core, disclosure, connectProfile, isConnectMember, hasDiscovery, currentRoles, comparablePeople, unsortedAnswers, resources] = await Promise.all([
    getTranslations("capability"),
    getTranslations("direction"),
    // DIESELBEN SAETZE WIE AUF „DAS BIST DU". Die Deckungskarte, die
    // Rollenliste und die Kurzvorstellung sind dort schon beschriftet; ihre
    // Texte hier ein zweites Mal zu schreiben hiesse, zwei Fassungen
    // derselben Erklaerung zu pflegen - und sie laufen auseinander.
    getTranslations("profile.founderProfile"),
    getLocale(),
    searchParams,
    getCapabilityVocabulary(supabase),
    getPersonStrengths(supabase),
    getPendingStrengthProposals(supabase),
    getOwnCapabilityEntries(supabase, user.id),
    getPersonCore(supabase, user.id),
    Promise.resolve(supabase.from("person_core").select("capability_disclosure").eq("user_id", user.id).maybeSingle())
      .then(({ data }) => (data?.capability_disclosure as string | undefined) ?? "private")
      .catch(() => "private"),
    // Nur fuer den Hinweis, dass Aenderungen sofort oeffentlich wirken.
    Promise.resolve(supabase.from("network_profiles").select("status").eq("user_id", user.id).maybeSingle())
      .then(({ data }) => data)
      .catch(() => null),
    Promise.resolve(supabase.rpc("is_network_member")).then(({ data }) => data === true).catch(() => false),
    hasFounderDiscoveryAccess(user.id, supabase).catch(() => false),
    // Rollen liegen weiterhin auf profiles; person_core traegt Identitaet,
    // nicht Zugehoerigkeit.
    Promise.resolve(supabase.from("profiles").select("roles").eq("user_id", user.id).maybeSingle())
      .then(({ data }) => normalizeProfileRoles(data?.roles ?? null))
      .catch((): ProfileRole[] => []),
    // Wer verglichen werden darf. Eine leere Liste ist der Normalfall am
    // Anfang und laesst den Abschnitt einfach entfallen.
    getComparablePeople(supabase, user.id).catch((): ComparablePerson[] => []),
    // Wie viele Antworten aus dem Gespraech noch nicht eingeordnet sind. Nur
    // die Zahl - die Antworten selbst gehoeren auf ihre eigene Seite.
    getUnsortedInterviewAnswers(supabase)
      .then((answers) => answers.length)
      .catch(() => 0),
    // Netzwerk, Zugaenge und Angebote. Sie gehoeren zur Person und nicht zu
    // Connect - deshalb liegen sie seit dem 01.10.2026 auch hier. Der
    // kanonische Speicher bleibt `person_resources`; dies ist eine zweite
    // Tuer, keine zweite Tabelle.
    getOwnPersonResources(supabase).catch((): PersonResource[] => []),
  ]);

  const step = isPageStep(params.step) ? params.step : null;
  // Nur bekannte Schluessel an t() geben. Ein manipulierter Query-Parameter
  // wuerde sonst als roher Schluesselpfad auf der Seite landen: next-intl
  // wirft bei einem fehlenden Schluessel nicht, es loggt einen IntlError und
  // rendert den Pfad selbst - etwa "capability.errors.abc". Kein Absturz,
  // aber sichtbarer Muell. Mit Version 3.26.5 nachgemessen.
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const errorKey = ERROR_KEYS.includes(params.error ?? "") ? params.error : null;
  const notice = NOTICE_KEYS.includes(params.notice ?? "") ? params.notice : null;
  const { families, areas } = vocabulary;
  const areasByFamily = families.map((family) => ({
    family,
    areas: areas.filter((area) => area.family_id === family.family_id),
  }));
  const selectedAreaIds = new Set(entries.map((entry) => entry.area_id));
  const grouped = groupEntriesByFamily(entries, areas, families);
  const areaLabel = (areaId: string) => t(`areaLabels.${areaId}`);
  const readout = buildCapabilityReadout(entries, areas, families);
  // Woher jemand kam, und was den Kernangaben zum Veroeffentlichen fehlt.
  // Hoechstens zwei, sonst liest sich der Hinweis wie eine Aufzaehlung statt
  // wie ein Beispiel.
  const disclosureExamples = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
    entries.slice(0, 2).map((entry) => areaLabel(entry.area_id))
  );
  const returnPath = parseIdentityReturnPath(params.next);
  const identityGaps = getIdentityGaps(core);

  // ------------------------------------------------------------------------
  // DIE FUENF STATIONEN
  //
  // Sie entstehen aus dem Bestand und speichern nichts. Was abgeleitet werden
  // kann, wird abgeleitet; fuer die drei Bereiche ohne ableitbares Ende steht
  // `person_section_marks` daneben. Siehe `features/profile/aboutYou.ts`.
  // ------------------------------------------------------------------------
  const facts = await getAboutYouFacts(supabase, user.id, {
    core,
    entries,
    strengthCount: strengths.length,
  });
  const stations = buildAboutYou(facts);
  const naechster = recommendNextStep(stations);
  const coverage = buildFounderProfileCoverage(entries, areas, families);
  const confirmedResources = resources.filter((resource) => resource.status === "confirmed");

  /**
   * Der kleine Payoff auf der Karte.
   *
   * EIN SATZ AUS DEN EIGENEN ANGABEN - keine Punktzahl, kein „gut gemacht",
   * keine Einordnung. Die ausfuehrliche Fassung steht nach dem Erfassen auf
   * der Schrittseite und vollstaendig auf „Das bist du".
   *
   * Ist noch nichts da, steht hier nichts. Ein Satz ueber nichts waere ein
   * Hinweis auf eine Luecke, und Luecken sind hier keine.
   */
  const satz = (text: string) => (
    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{text}</p>
  );

  const stationPayoff = (station: AboutYouStationModel) => {
    switch (station.id) {
      case "basis": {
        const name = core?.display_name?.trim();
        const headline = core?.headline?.trim();
        if (!name && !headline) return null;
        return satz([name, headline].filter(Boolean).join(" — "));
      }
      case "arbeitsweise":
        if (facts.workSubmitted) return satz(t("aboutYou.payoff.workDone"));
        if (facts.workAnswers > 0)
          return satz(t("aboutYou.payoff.workStarted", { count: facts.workAnswers }));
        return null;
      case "mitbringen":
        if (facts.areaCount === 0 && facts.strengthCount === 0) return null;
        return satz(
          t("aboutYou.payoff.bring", {
            areas: facts.areaCount,
            levelled: facts.levelledCount,
            strengths: facts.strengthCount,
          })
        );
      case "antrieb":
        if (facts.directionStatements === 0) return null;
        return satz(t("aboutYou.payoff.direction", { count: facts.directionStatements }));
      case "ressourcen":
        if (facts.confirmedResources === 0 && facts.pendingResources === 0) return null;
        return satz(
          t("aboutYou.payoff.resources", {
            confirmed: facts.confirmedResources,
            pending: facts.pendingResources,
          })
        );
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      {/* DER WEG ZURUECK, auf jeder Schrittseite. Vorher gab es ihn nur im
          dreiteiligen Faehigkeitsablauf; wer ueber einen Bearbeiten-Link
          hereinkam, hatte nur den Browser-Zurueck. */}
      {step ? (
        <Link
          href="/profile"
          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          {t("aboutYou.backToOverview")}
        </Link>
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      {/* DIE SEITE FAENGT NICHT MIT FORMULARFELDERN AN. Was hier steht, ist
          die Zusage: nicht alles auf einmal, und kein Pflichtformular. */}
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("aboutYou.intro")}</p>
      {/* DER WEG ZUM ZUSAMMENGESTELLTEN PROFIL, neu am 22.09.2026. Diese Seite
          hier ist die Werkbank - Angaben eintragen, Bereiche sortieren,
          Sichtbarkeit setzen. Was daraus entsteht, lag auf drei Seiten
          verteilt; `/me/profile` legt es nebeneinander und laesst sich
          ausdrucken. Der Link steht hier und nicht in der Leiste: Ein
          zusammengestelltes Profil ist das Ergebnis dieser Seite, kein
          eigener Bereich. */}
      <Link
        href="/me/profile"
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-violet-200 bg-violet-50 px-5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {t("viewFounderProfile")}
      </Link>

      {saved ? (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.${saved}`)}</p>
      ) : null}
      {errorKey ? (
        <p role="alert" className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${errorKey}`)}</p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{t(`notices.${notice}`)}</p>
      ) : null}

      {isSnapshotStep(step) ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {/* Erledigte Schritte sahen genauso aus wie kommende - die Anzeige
              zeigte, wo man ist, aber nicht, was schon sitzt. */}
          <ol className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            {(["evidence", "areas", "ownership"] as const).map((name, index) => {
              const position = ["evidence", "areas", "ownership"].indexOf(step ?? "");
              const done = index < position;
              return (
                <li
                  key={name}
                  aria-current={step === name ? "step" : undefined}
                  className={`rounded-full px-3 py-1 ${
                    step === name
                      ? "bg-slate-900 text-white"
                      : done
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100"
                  }`}
                >
                  {done ? "✓" : `${index + 1}.`} {t(`steps.${name}`)}
                </li>
              );
            })}
          </ol>
          {/* Der Fluss hatte keinen Ausgang: nur vorwaerts oder einen Schritt
              zurueck. Wer spaeter weitermachen will, brauchte den
              Browser-Zurueck. Eingetragenes bleibt ohnehin gespeichert. */}
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:underline"
          >
            {t("steps.later")}
          </Link>
        </div>
      ) : null}

      {/* ==================================================================
          DIE UEBERSICHT - FUENF STATIONEN

          Vorher lagen hier alle Abschnitte gleichzeitig: Gespraech,
          Staerken, Richtung, Identitaet, Auswertung, Liste, Vergleich,
          Freigabe, Kontexte. Das war die Pflegeseite, und sie sah aus wie
          ein langes Formular.

          Jetzt steht hier, was es gibt und was als Naechstes dran waere -
          und die Formulare haben eigene Adressen.

          KEIN GESAMTFORTSCHRITT, auch nicht nebenbei: Es gibt keine Zahl
          ueber die Stationen, keinen Anteil und keine Reihenfolge.
          ================================================================== */}
      {step === null ? (
        <>
          {/* „Weiter dort, wo du aufgehoert hast" - ein Vorschlag, kein
              Zwang. Es wird nichts umgeleitet und nichts gesperrt; die
              anderen Stationen bleiben anwaehlbar. Gibt es nichts mehr,
              steht hier nichts: Ein Satz ins Leere klaenge nach Aufgabe. */}
          {naechster ? (
            <section className="mt-8 rounded-3xl border border-violet-200 bg-violet-50/40 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                {t("aboutYou.next.eyebrow")}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-800">
                {/* WARTENDE ANTWORTEN HABEN IHREN EIGENEN SATZ, und es ist
                    derselbe wie vorher: „Drei Antworten warten darauf,
                    eingeordnet zu werden." „Als Naechstes koenntest du"
                    waere untertrieben fuer etwas, das schon getan ist und
                    nur noch nirgends steht - und die Zahl gehoert dazu. */}
                {naechster.urgent
                  ? t("interview.sortPending", { count: unsortedAnswers })
                  : t(`aboutYou.next.steps.${naechster.id}`)}
              </p>
              <Link href={naechster.href} className={`${primary} mt-4 inline-flex items-center`}>
                {naechster.urgent ? t("interview.sortCta") : t("aboutYou.next.cta")}
              </Link>
            </section>
          ) : null}

          <div className="mt-6 grid gap-4">
            {stations.map((station) => (
              <AboutYouStation
                key={station.id}
                id={station.id}
                title={t(`aboutYou.stations.${station.id}.title`)}
                text={t(`aboutYou.stations.${station.id}.text`)}
                status={station.status}
                statusLabel={t(`aboutYou.status.${station.status}`)}
                payoff={stationPayoff(station)}
                substeps={
                  // Nur die grosse Station. Eine Liste mit einem Eintrag
                  // waere eine Liste, die etwas verspricht.
                  station.steps.length > 1
                    ? station.steps.map((schritt) => ({
                        id: schritt.id,
                        label: t(`aboutYou.steps.${schritt.id}`),
                        status: schritt.status,
                        statusLabel: t(`aboutYou.status.${schritt.status}`),
                        href: schritt.href,
                      }))
                    : undefined
                }
                cta={{
                  // Fuer jetzt fertig heisst nicht abgeschlossen: Auch dann
                  // fuehrt ein Weg hinein, nur heisst er anders.
                  label: t(`aboutYou.cta.${station.status}`),
                  href: (station.next ?? station.steps[0]).href,
                }}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Schritt 1: die erzaehlte Sache, dann die Rueckfrage, was davon
          wirklich eine Staerke war. Beides in einer Client-Komponente, weil
          die Zuordnung im Browser laeuft und die Person sie vor dem Speichern
          bestaetigen soll. */}
      {step === "evidence" ? (
        <CapabilitySnapshotStart
          action={saveCapabilityEvidenceAction}
          fieldClassName={field}
          hintClassName={hint}
          primaryClassName={primary}
          secondaryClassName={secondary}
        />
      ) : null}

      {/* Schritt 2: Familien aufklappen, darunter die Bereiche. Natives
          details/summary - das progressive Aufklappen braucht kein JavaScript. */}
      {step === "areas" ? (
        <form action={saveCapabilityAreasAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("areas.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("areas.text")}</p>
          </div>
          <div className="space-y-3">
            {areasByFamily.map(({ family, areas: familyAreas }) => {
              const selectedInFamily = familyAreas.filter((area) => selectedAreaIds.has(area.area_id)).length;
              return (
                <details
                  key={family.family_id}
                  open={selectedInFamily > 0}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                    {t(`families.${family.family_id}`)}
                    {selectedInFamily > 0 ? <span className="ml-2 text-violet-700">({selectedInFamily})</span> : null}
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {familyAreas.map((area) => (
                      <label
                        key={area.area_id}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="area_id"
                          value={area.area_id}
                          defaultChecked={selectedAreaIds.has(area.area_id)}
                        />
                        {areaLabel(area.area_id)}
                      </label>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("areas.submit")} pendingLabel={t("pending.save")} className={primary} />
            <Link href="/profile?step=evidence" className={secondary}>
              {t("areas.back")}
            </Link>
          </div>
        </form>
      ) : null}

      {/* WAS DARAUS ENTSTANDEN IST - die Deckungskarte, dieselbe wie auf
          „Das bist du". Keine neue Auswertung und keine zweite Fassung
          derselben Grafik. */}
      {step === "areas" && entries.length > 0 ? (
        <div className="mt-8">
          <CoverageMap
            coverage={coverage}
            copy={{
              title: tProfile("coverage.title"),
              intro: tProfile("coverage.intro"),
              familyLabel: (familyId) => t(`families.${familyId}`),
              stateLabel: (state) => tProfile(`coverage.states.${state}`),
              familyCount: (entered, total) => tProfile("coverage.familyCount", { entered, total }),
              familyUnspoken: tProfile("coverage.familyUnspoken"),
              basis: tProfile("coverage.basis"),
            }}
          />
          <SectionMarkToggle
            section="faehigkeiten"
            marked={facts.marks.has("faehigkeiten")}
            copy={{
              markedNote: t("aboutYou.mark.markedNote"),
              mark: t("aboutYou.mark.mark"),
              unmark: t("aboutYou.mark.unmark"),
            }}
          />
        </div>
      ) : null}

      {/* Schritt 3: Ownership. Bewusst als Verneinung gefragt - das ist die
          Frage, die sonst niemand stellt, und sie klaert spaeter viel. */}
      {step === "ownership" ? (
        <form action={saveCapabilityOwnershipAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("ownership.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("ownership.text")}</p>
          </div>
          {entries.length ? (
            <div className="space-y-3">
              {grouped.map(({ familyId, entries: familyEntries }) => (
                <section key={familyId}>
                  <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                    {t(`families.${familyId}`)}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {familyEntries.map((entry) => (
                      <label key={entry.id} className="block rounded-xl border border-slate-200 p-3 text-sm">
                        <span className="font-medium">{areaLabel(entry.area_id)}</span>
                        <select
                          name={`ownership_${entry.area_id}`}
                          defaultValue={entry.ownership_wish ?? ""}
                          className={field}
                        >
                          <option value="">{t("ownershipWishes.unset")}</option>
                          {OWNERSHIP_WISHES.map((wish) => (
                            <option key={wish} value={wish}>
                              {t(`ownershipWishes.${wish}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">{t("ownership.noEntries")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("ownership.submit")} pendingLabel={t("pending.save")} className={primary} />
            <Link href="/profile?step=areas" className={secondary}>
              {t("ownership.back")}
            </Link>
          </div>
        </form>
      ) : null}

      {/* KOENNEN IST NICHT WOLLEN. Die Rollenliste nach Faltin zaehlt die
          Bereiche, die ins Team gehoeren UND verantwortet werden sollen -
          die Erfahrungsstufe wird dabei nicht verrechnet. */}
      {step === "ownership" && entries.length > 0 ? (
        <div className="mt-8">
          <CoverageRoles
            coverage={coverage}
            copy={{
              rolesTitle: tProfile("coverage.rolesTitle"),
              rolesIntro: tProfile("coverage.rolesIntro"),
              rolesNone: tProfile("coverage.rolesNone"),
              rolesOpen: (count) => tProfile("coverage.rolesOpen", { count }),
              rolesCaveat: tProfile("coverage.rolesCaveat"),
              areaLabel,
            }}
          />
        </div>
      ) : null}

      {/* Identitaet. Der eine Ort, an dem sie bearbeitet wird - der Kern
          propagiert sie in Basis-, Discovery- und Connect-Profil.

          EIGENE ADRESSE SEIT DEM 01.10.2026. Das Formular stand bis dahin
          mitten auf der Startansicht, zwischen Staerken und Auswertung -
          eines von neun Dingen gleichzeitig. */}
      {step === "identity" ? (
        <form action={saveIdentityAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          {/* Reist mit, damit das Speichern zurueckfuehrt, wo es hergekommen
              ist - siehe parseIdentityReturnPath fuer die Allowlist. */}
          {returnPath ? <input type="hidden" name="next" value={returnPath} /> : null}
          <div>
            <h2 className="text-xl font-semibold">{t("identity.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("identity.text")}</p>
          </div>
          {/* Was zum Veroeffentlichen noch fehlt, steht dort, wo man es
              aendert. Vorher stand es nur dort, wo es abgewiesen wurde -
              man speicherte erfolgreich und scheiterte eine Seite spaeter,
              ohne zu erfahren, an welcher Angabe. */}
          {identityGaps.length > 0 && (isConnectMember || hasDiscovery) ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-900">{t("identity.publishTitle")}</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {identityGaps.map((gap) => (
                  <li key={gap}>
                    · {t(`identity.gaps.${gap}`, { min: IDENTITY_THRESHOLDS[gap] })}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-5 text-amber-900/80">{t("identity.publishNote")}</p>
            </div>
          ) : null}
          {connectProfile?.status === "active" ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("identity.publishedNote")}</p>
          ) : null}
          {/* Das Bild selbst wird im Schritt "Bild" gewaehlt; hier steht die
              Frage, wer es sehen darf. Sie gehoert zur Identitaet, nicht in
              einen eigenen Abschnitt - es ist dieselbe Entscheidung wie Name
              und Headline, nur fuer das Gesicht. */}
          {/* DREI KLEINE GRUPPEN STATT EINES LANGEN FORMULARS.

              Elf Felder untereinander sind ein Antrag. Die Gruppen beantworten
              je eine Frage - wer du bist, wo und wie du arbeitest, woran -,
              und man kann eine davon ausfuellen und aufhoeren.

              `fieldset`/`legend` und nicht `div`/`h3`: Dieselbe Gliederung,
              die man sieht, hoert auch, wer das Formular vorgelesen bekommt. */}
          <fieldset className="space-y-5 border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
              {t("aboutYou.groups.who")}
            </legend>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="photo_visible_to_members"
              value="yes"
              defaultChecked={core?.photo_visible_to_members ?? false}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                {t("identity.photoVisibleLabel")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {t("identity.photoVisibleHint")}
              </span>
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("identity.name")}
              <input name="display_name" maxLength={80} defaultValue={core?.display_name ?? ""} className={field} />
            </label>
            <label className="text-sm font-medium">
              {t("identity.headline")}
              <input name="headline" maxLength={160} defaultValue={core?.headline ?? ""} className={field} />
              <span className={hint}>{t("identity.headlineHint")}</span>
            </label>
          </div>
          <label className="block text-sm font-medium">
            {t("identity.bio")}
            <textarea name="bio" rows={4} maxLength={1200} defaultValue={core?.bio ?? ""} className={field} />
            <span className={hint}>{t("identity.bioHint")}</span>
          </label>
          </fieldset>

          <fieldset className="space-y-5 border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
              {t("aboutYou.groups.where")}
            </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("identity.region")}
              <input name="location_region" maxLength={120} defaultValue={core?.location_region ?? ""} className={field} />
              <span className={hint}>{t("identity.regionHint")}</span>
            </label>
            <label className="text-sm font-medium">
              {t("identity.remote")}
              <select name="remote_mode" defaultValue={core?.remote_mode ?? ""} className={field}>
                <option value="">{t("identity.remoteUnset")}</option>
                {REMOTE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`remoteModes.${mode}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          </fieldset>

          <fieldset className="space-y-5 border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
              {t("aboutYou.groups.what")}
            </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("identity.expertise")}
              <input name="expertise" defaultValue={(core?.expertise ?? []).join(", ")} className={field} />
              <span className={hint}>{t("identity.expertiseHint", { max: 8 })}</span>
            </label>
            <label className="text-sm font-medium">
              {t("identity.industries")}
              <input name="industries" defaultValue={(core?.industries ?? []).join(", ")} className={field} />
              <span className={hint}>{t("identity.industriesHint", { max: 5 })}</span>
            </label>
          </div>

          {/* Direkt unter den beiden Feldern, die es fuellt - und eingeklappt,
              weil es eine Abkuerzung ist und kein Schritt. Wer die Felder
              lieber selbst ausfuellt, soll nicht daran vorbei muessen.

              Die Beschriftungen werden hier aufgeloest, weil CvImportField
              eine Client-Komponente ist: Eine Uebersetzungsfunktion laesst sich
              nicht ueber die Grenze reichen. */}
          <CvImportField
            expertiseLabels={Object.fromEntries(
              ANALYZED_AREA_IDS.map((areaId) => [areaId, t(`areaLabels.${areaId}`)])
            )}
            industryLabels={Object.fromEntries(
              CV_INDUSTRY_KEYS.map((key) => [key, t(`industryLabels.${key}`)])
            )}
            copy={{
              title: t("identity.cv.title"),
              betaBadge: t("identity.cv.betaBadge"),
              betaNote: t("identity.cv.betaNote"),
              text: t("identity.cv.text"),
              privacyNote: t("identity.cv.privacyNote"),
              textareaLabel: t("identity.cv.textareaLabel"),
              placeholder: t("identity.cv.placeholder"),
              fileLabel: t("identity.cv.fileLabel"),
              analyze: t("identity.cv.analyze"),
              tooShort: t("identity.cv.tooShort"),
              nothingFound: t("identity.cv.nothingFound"),
              nothingFoundHint: t("identity.cv.nothingFoundHint"),
              expertiseTitle: t("identity.cv.expertiseTitle"),
              industriesTitle: t("identity.cv.industriesTitle"),
              because: t("identity.cv.because"),
              apply: t("identity.cv.apply"),
              applied: t("identity.cv.applied"),
              clear: t("identity.cv.clear"),
              chosenCount: t("identity.cv.chosenCount"),
              fileUnsupported: t("identity.cv.fileUnsupported"),
            }}
          />
          </fieldset>

          {/* Das LinkedIn-Profil steht hier und nicht in einem eigenen
              Bereich: Es ist dieselbe Art Angabe wie Name und Headline - eine
              Eigenschaft des Menschen, nicht eines Produktbereichs. Deshalb
              wird sie einmal eingetragen und gilt ueberall.

              Die Texte werden hier aufgeloest, weil LinkedInField eine
              Client-Komponente ist: Eine Uebersetzungsfunktion laesst sich
              nicht als Prop ueber die Grenze reichen - das hat in dieser
              Codebasis schon zweimal die Produktion lahmgelegt. */}
          <LinkedInField
            initialUrl={core?.linkedin_url ?? ""}
            initialVisibility={
              isLinkedInVisibility(core?.linkedin_visibility) ? core.linkedin_visibility : "private"
            }
            copy={{
              title: t("identity.linkedin.title"),
              urlLabel: t("identity.linkedin.urlLabel"),
              urlPlaceholder: t("identity.linkedin.urlPlaceholder"),
              urlHint: t("identity.linkedin.urlHint"),
              urlInvalid: t("identity.linkedin.urlInvalid"),
              visibilityTitle: t("identity.linkedin.visibilityTitle"),
              options: {
                private: {
                  label: t("identity.linkedin.options.private.label"),
                  hint: t("identity.linkedin.options.private.hint"),
                },
                contacts: {
                  label: t("identity.linkedin.options.contacts.label"),
                  hint: t("identity.linkedin.options.contacts.hint"),
                },
                members: {
                  label: t("identity.linkedin.options.members.label"),
                  hint: t("identity.linkedin.options.members.hint"),
                },
                public: {
                  label: t("identity.linkedin.options.public.label"),
                  hint: t("identity.linkedin.options.public.hint"),
                },
              },
              publicWarning: t("identity.linkedin.publicWarning"),
              publicConfirm: t("identity.linkedin.publicConfirm"),
            }}
          />
          {/* Rollen sind eine Navigationsangabe, keine Berechtigung: Wer
              "Advisor" anhakt, sieht das Advisor-Dashboard - was darauf steht,
              entscheidet weiterhin RLS ueber advisor_user_id. Deshalb darf das
              hier aenderbar sein.

              Nur sichtbar fuer Menschen, die schon eine dieser Rollen haben.
              Einem Connect-Konto hier "Founder" anzubieten waere eine
              Selbstfreischaltung ins Founder-Produkt und damit eine
              Produktentscheidung, nicht ein Formularfeld. */}
          {currentRoles.length > 0 ? (
            <fieldset>
              <legend className="text-sm font-medium">{t("identity.rolesLegend")}</legend>
              <p className={hint}>{t("identity.rolesHint")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PROFILE_ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={role}
                      defaultChecked={currentRoles.includes(role)}
                    />
                    {t(`identity.roles.${role}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("identity.submit")} pendingLabel={t("pending.save")} className={primary} />
            {/* Der Weg zurueck, wenn Connect oder Discovery hierher geschickt
                hat. Ohne ihn war die Identitaetsseite eine Sackgasse. */}
            {returnPath ? (
              <Link href={returnPath} className={secondary}>
                {t(`identity.backTo.${returnPath === "/connect/profile" ? "connect" : "discovery"}`)}
              </Link>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* SO SIEHT ES AUS. Dieselbe Darstellung wie auf „Das bist du" - wer
          gerade Bio und Branchen eingetragen hat, sieht hier, was daraus
          geworden ist, und muss dafuer nicht die Seite wechseln. */}
      {step === "identity" ? (
        <div className="mt-8">
          <FounderProfileBase
            core={core}
            copy={{
              title: t("aboutYou.payoffTitles.identity"),
              region: tProfile("base.region"),
              remoteMode: (mode) => t(`remoteModes.${mode}`),
              expertise: tProfile("base.expertise"),
              industries: tProfile("base.industries"),
              linkedin: tProfile("base.linkedin"),
              empty: tProfile("base.empty"),
              completeHref: "/profile?step=identity",
              completeCta: tProfile("base.completeCta"),
            }}
          />
        </div>
      ) : null}

      {/* DEINE STAERKEN. Dieselbe Komponente wie vorher, nur an einer eigenen
          Adresse: Sie ist Erfassung und Ergebnis in einem - die Vorschlaege
          stehen oben, die bestaetigten Saetze darunter. */}
      {step === "strengths" ? (
        <>
          <StrengthsSection strengths={strengths} proposals={strengthProposals} />
          <SectionMarkToggle
            section="staerken"
            marked={facts.marks.has("staerken")}
            copy={{
              markedNote: t("aboutYou.mark.markedNote"),
              mark: t("aboutYou.mark.mark"),
              unmark: t("aboutYou.mark.unmark"),
            }}
          />
        </>
      ) : null}

      {/* NETZWERK, ZUGAENGE UND ANGEBOTE.

          Sie lagen bisher nur unter /connect/profile. Das war die Stelle, an
          der die Vorschlaege ENTSTEHEN - aus den dort veroeffentlichten
          Texten -, aber nicht die Stelle, zu der sie GEHOEREN: Ein Netzwerk
          ist eine Eigenschaft der Person und nicht eines Produktbereichs.

          Dieselbe Komponente, dieselbe Tabelle, dieselben beiden Aktionen.
          Keine Kopie, kein zweites Ressourcenmodell - eine zweite Tuer. In
          Connect bleibt alles, wo es war: Wo ein Vorschlag entstanden ist,
          darf er auch weiterhin auftauchen. */}
      {step === "resources" ? (
        <>
          {/* ZUERST DIE EIGENEN, DANN DIE VORSCHLAEGE. Was dasteht, gehoert
              der Person; was vorgeschlagen ist, wartet auf eine Entscheidung
              und ist deshalb das Zweite.

              DIE DREI NAMEN SIND DIESELBEN WIE AUF „DAS BIST DU"
              (`profile.founderProfile.resources.kinds`). Dieselbe Sache an
              zwei Orten verschieden zu benennen waere eine zweite Sache. */}
          <OwnResourcesSection
            resources={confirmedResources}
            copy={{
              title: t("aboutYou.resources.ownTitle"),
              text: t("aboutYou.resources.ownText"),
              kindLabel: (kind) => tProfile(`resources.kinds.${kind}`),
              example: (kind) => t(`aboutYou.resources.examples.${kind}`),
              addSummary: t("aboutYou.resources.add"),
              kindField: t("aboutYou.resources.kindField"),
              labelField: t("aboutYou.resources.labelField"),
              labelHint: t("aboutYou.resources.labelHint", { max: RESOURCE_LABEL_MAX }),
              save: t("aboutYou.resources.save"),
              pending: t("pending.save"),
              edit: t("aboutYou.resources.edit"),
              remove: t("aboutYou.resources.remove"),
              removeQuestion: t("aboutYou.resources.removeQuestion"),
              removeConfirm: t("aboutYou.resources.removeConfirm"),
              removeCancel: t("aboutYou.resources.removeCancel"),
              fromProposal: t("aboutYou.resources.fromProposal"),
              empty: t("aboutYou.resources.empty"),
            }}
          />
          {/* Nur noch das Offene: Das Bestaetigte steht darueber, und zwar
              mit Knoepfen. */}
          <ResourceProposalSection proposals={resources} showConfirmed={false} />
          <SectionMarkToggle
            section="ressourcen"
            marked={facts.marks.has("ressourcen")}
            copy={{
              markedNote: t("aboutYou.mark.markedNote"),
              mark: t("aboutYou.mark.mark"),
              unmark: t("aboutYou.mark.unmark"),
            }}
          />
        </>
      ) : null}

      {/* Die Auswertung steht vor der Liste: Wer die Schritte ausgefuellt hat,
          soll ein Ergebnis sehen und nicht zuerst seine eigene Eingabe.

          SEIT DEM 01.10.2026 AM ERFAHRUNGSSCHRITT. Sie ist der Payoff zu
          genau diesem Schritt und stand vorher auf der Startansicht, wo sie
          mit acht anderen Abschnitten um Aufmerksamkeit rang. */}
      {step === "evidence" ? (
        <CapabilityReadoutSection
          readout={readout}
          copy={{
            title: t("readout.title"),
            coverage: t("readout.coverage", {
              areas: readout.areaCount,
              levelled: readout.levelledCount,
              wished: readout.wishedCount,
            }),
            focus: readout.focusFamilyId
              ? t("readout.focus", { family: t(`families.${readout.focusFamilyId}`) })
              : null,
            basis: t("readout.basis"),
            findingTitle: (key) => t(`readout.findings.${key}.title`),
            findingText: (key) => t(`readout.findings.${key}.text`),
            areaLabel,
          }}
        />
      ) : null}

      {step === "evidence" ? (
        <section className="mt-8">
          {/* Der Abschnittstitel: Er stand vorher als h1 ueber der ganzen
              Seite und beschrieb damit nur einen von sechs Abschnitten. */}
          <h2 className="text-xl font-semibold">{t("summary.sectionTitle")}</h2>
          {entries.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-sm leading-6 text-slate-600">{t("summary.empty")}</p>
              <Link href="/profile?step=evidence" className={`${primary} mt-5 inline-flex items-center`}>
                {t("summary.start")}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {grouped.map(({ familyId, entries: familyEntries }) => (
                <article key={familyId} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="text-lg font-semibold">{t(`families.${familyId}`)}</h2>
                  <ul className="mt-4 space-y-4">
                    {familyEntries.map((entry) => (
                      <li key={entry.id}>
                        <p className="font-medium">{areaLabel(entry.area_id)}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {t("levels.label")}: {entry.application_level ? t(`levels.${entry.application_level}`) : t("levels.unset")}
                          {" · "}
                          {t("ownershipWishes.label")}:{" "}
                          {entry.ownership_wish ? t(`ownershipWishes.${entry.ownership_wish}`) : t("ownershipWishes.unset")}
                        </p>
                        {entry.evidence.length ? (
                          <ul className="mt-3 space-y-2">
                            {entry.evidence.map((evidence) => (
                              <li key={evidence.id} className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                <p className="whitespace-pre-wrap">{evidence.narrative}</p>
                                {/* Rueckfrage vor dem Loeschen: Das hier ist
                                    der laengste selbst geschriebene Text im
                                    Produkt und war auf einen Klick weg. */}
                                <form action={deleteCapabilityEvidenceAction} className="mt-2">
                                  <input type="hidden" name="evidence_id" value={evidence.id} />
                                  <ConfirmSubmitButton
                                    label={t("summary.removeEvidence")}
                                    question={t("summary.removeEvidenceQuestion")}
                                    confirmLabel={t("summary.removeEvidenceConfirm")}
                                    cancelLabel={t("summary.removeEvidenceCancel")}
                                    pendingLabel={t("pending.save")}
                                    className="inline-flex min-h-11 items-center text-xs font-semibold text-slate-500 underline underline-offset-2"
                                    confirmClassName="min-h-11 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-900"
                                  />
                                </form>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {t("summary.incompleteNote")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/profile?step=evidence" className={`${primary} inline-flex items-center`}>
                  {t("summary.edit")}
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* ==================================================================
          WAS DANEBEN LIEGT

          Freigabe, Vergleich, Kontexte: drei Dinge, die zur Pflege gehoeren,
          aber keine Station sind. Eine Station ist etwas, das man ueber sich
          erfasst; dies hier sind Entscheidungen darueber, was damit geschieht.

          Deshalb stehen sie unter einer leisen Ueberschrift am Ende und nicht
          als sechste und siebte Karte dazwischen.
          ================================================================== */}
      {step === null && (entries.length > 0 || comparablePeople.length > 0 || isConnectMember || hasDiscovery) ? (
        <h2
          id="besides"
          className="mt-12 scroll-mt-20 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
        >
          {t("aboutYou.besides")}
        </h2>
      ) : null}

      {/* Die Freigabe hat seit dem 01.10.2026 eine eigene Adresse. Als
          Formular zwischen den Abschnitten war sie eine Entscheidung, die man
          im Vorbeigehen traf. */}
      {step === null && entries.length > 0 ? (
        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">{t("disclosure.title")}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("disclosure.text")}</p>
          <Link href="/profile?step=sichtbarkeit" className={`${secondary} mt-4`}>
            {t("aboutYou.disclosureCta")}
          </Link>
        </section>
      ) : null}

      {/* Der Vergleich. Nur mit verbundenen Menschen, und nur wenn es
          ueberhaupt einen eigenen Snapshot gibt - sonst waere es eine
          Einladung zu einer leeren Seite. */}
      {step === null && entries.length > 0 && comparablePeople.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">{t("comparison.sectionTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("comparison.sectionText")}</p>
          <ul className="mt-4 space-y-2">
            {comparablePeople.map((person) => (
              <li key={person.userId}>
                <Link
                  href={`/profile/compare/${person.userId}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50"
                >
                  {t("comparison.openFor", { name: person.displayName })}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Die Freigabe. Eigener Abschnitt, weil es eine eigene Entscheidung ist:
          was ich eingetragen habe und wie weit ich es weitergebe sind zwei
          Fragen. Erscheint nur, wenn es ueberhaupt etwas freizugeben gibt. */}
      {step === "sichtbarkeit" ? (
        <form action={saveCapabilityDisclosureAction} className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("disclosure.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("disclosure.text")}</p>
          </div>
          {/* has-[:checked]: hebt die GANZE gewaehlte Zeile hervor, inklusive
              des Knopfes darin - peer-checked haette das nicht gekonnt, weil
              es nur auf Geschwister wirkt und der Text ein Kind ist.

              Der native Radio-Knopf bleibt stehen: Ihn zu verstecken und
              nachzubauen heisst, Tastatur und Screenreader selbst zu
              bedienen - fuer einen Punkt, den der Browser richtig kann. */}
          <div className="grid gap-3">
            {CAPABILITY_DISCLOSURE_LEVELS.map((level) => (
              <label
                key={level}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50/80 has-[:checked]:border-violet-300/70 has-[:checked]:bg-[linear-gradient(120deg,rgba(124,58,237,.06),rgba(34,211,238,.08))] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-300"
              >
                <input
                  type="radio"
                  name="capability_disclosure"
                  value={level}
                  defaultChecked={disclosure === level}
                  className="mt-1 accent-violet-600"
                />
                <span>
                  <span className="block text-sm font-semibold">{t(`disclosure.${level}`)}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {/* Das Beispiel kommt aus den EIGENEN Eintraegen. "Bereiche
                        zeigen" blieb abstrakt, solange nicht dastand, was
                        konkret gezeigt wuerde. */}
                    {level === "areas"
                      ? t("disclosure.areasHint", { examples: disclosureExamples })
                      : t(`disclosure.${level}Hint`)}
                  </span>
                  {/* WAS ES KOSTET, STEHT DANEBEN. Entschieden von Maria am
                      30.09.2026: Wer seine Bereiche privat haelt, wird ueber
                      eine Suche nach Faehigkeiten nicht gefunden - und das
                      soll man beim Einstellen wissen und nicht danach. */}
                  {level === "private" && (
                    <span className="mt-2 block rounded-xl bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-900">
                      {t("disclosure.privateNotFound")}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("disclosure.note")}</p>
          <SubmitButton label={t("disclosure.submit")} pendingLabel={t("pending.save")} className={primary} />
        </form>
      ) : null}

      {/* Rueckverweise in die Kontexte. Hier stehen Inhalte, dort wird
          entschieden, was davon wo gezeigt wird. */}
      {step === null && (isConnectMember || hasDiscovery) ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-sm font-semibold">{t("contexts.title")}</h2>
          <p className={hint}>{t("contexts.text")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {hasDiscovery ? (
              <Link href="/discovery/profile" className={secondary}>
                {t("contexts.discovery")}
              </Link>
            ) : null}
            {isConnectMember ? (
              <Link href="/connect/profile" className={secondary}>
                {t("contexts.connect")}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
