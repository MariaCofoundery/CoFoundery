import { DiscoveryWorkstyleConsent } from "@/features/find/DiscoveryWorkstyleConsent";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { saveDiscoveryV2SearchPreferencesAction } from "@/features/discovery/discoveryActions";
import { getOwnSearchPreferences } from "@/features/discovery/discoveryData";
import { PracticalSearchForm } from "@/features/find/PracticalSearchForm";
import { CapabilityPicker } from "@/features/find/CapabilityPicker";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import { DISCOVERY_SELECTION_LIMITS } from "@/features/discovery/discoveryConfig";
import type { DiscoveryMustHaves } from "@/features/discovery/discoveryTypes";

import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Deine Suche — der private Teil von FIND.
 *
 * ---------------------------------------------------------------------------
 * PRIVAT UND NICHT DAS PROFIL
 * ---------------------------------------------------------------------------
 *
 * Das FIND-Profil sagt, wer du bist und was du mitbringst. Diese Seite sagt,
 * wonach du suchst — und das steht auf keinem Profil. Die Spec trennt beides
 * ausdrücklich (Abschnitt 22): Wer sieht, wonach jemand sucht, sieht etwas,
 * das für ihn selbst gedacht war.
 *
 * ---------------------------------------------------------------------------
 * OHNE EIGENE ANTWORTEN GIBT ES NICHTS ZU VERGLEICHEN
 * ---------------------------------------------------------------------------
 *
 * Die Themen kommen aus den Fragen dazu, wie jemand arbeitet. Wer den Bogen
 * nicht ausgefüllt hat, kann zwar eine Richtung anklicken — verglichen wird
 * aber gegen die eigenen Antworten, und die gibt es dann nicht. Das steht
 * hier als Hinweis und nicht als Sperre: Die Auswahl darf man vorher treffen.
 */
/** Eine Suche ohne Kriterien — der Zustand vor der ersten Eingabe. */
const LEERE_KRITERIEN: DiscoveryMustHaves = {
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  requiredRolesAny: [],
  requiredExpertiseAny: [],
  requiredCapabilityAreasAny: [],
  acceptedSearchIntents: [],
  acceptedStartHorizons: [],
  desiredLocationRegion: null,
  requiredIndustriesAny: [],
  acceptedCommitmentLevels: [],
  acceptedVentureStages: [],
  acceptedVentureGoals: [],
};

export default async function SearchPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; workstyle?: string }>;
}) {
  const { gespeichert, workstyle } = await searchParams;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery/suche")}`);
  }

  const t = await getTranslations("find.search");
  const tDiscovery = await getTranslations("discovery");
  const supabase = await createClient();

  // Dieselbe Aktion wie vorher auf der Ergebnisseite - nur landet man danach
  // wieder hier und nicht bei den Treffern: Diese Seite legt fest, sie sucht
  // nicht.
  async function savePractical(formData: FormData) {
    "use server";
    const result = await saveDiscoveryV2SearchPreferencesAction(formData);
    redirect(`/discovery/suche?gespeichert=${result.ok ? "1" : "0"}`);
  }

  async function resetPractical() {
    "use server";
    const result = await saveDiscoveryV2SearchPreferencesAction(new FormData());
    redirect(`/discovery/suche?gespeichert=${result.ok ? "1" : "0"}`);
  }

  const searchPreferences = await getOwnSearchPreferences(auth.user.id);

  const tCapability = await getTranslations("capability");
  const vocabulary = await getCapabilityVocabulary(supabase);
  const kriterien = searchPreferences?.mustHaves ?? LEERE_KRITERIEN;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      {/* KEIN EIGENER ZURUECK-LINK. Die Seite steht im Menue, also traegt die
          Krume oben "Find › Deine Suche" - und die ist der Weg zurueck. Ein
          "← FIND" darunter waere derselbe Link ein zweites Mal, zwei Zeilen
          tiefer. Die anderen Discovery-Seiten haben einen, weil sie NICHT im
          Menue stehen und deshalb keine Krume bekommen. */}
      <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("subline")}</p>

      {/* WER DAS LIEST, GIBT ANDERE ANTWORTEN. Ohne den Satz beantwortet man
          die Fragen so, wie man gesehen werden will. */}
      <p className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-600">
        {t("private")}
      </p>

      {gespeichert && (
        <p
          role="status"
          className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
            gespeichert === "1"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-rose-50 text-rose-900"
          }`}
        >
          {gespeichert === "1" ? t("savedFeedback") : t("saveFailedFeedback")}
        </p>
      )}

      {/* ------------------------------------------------------------------
          1 — Was muss praktisch passen?

          Diese Felder standen bis zum 30.09.2026 eingeklappt ueber den
          Treffern. Dort mischten sich drei Ebenen: das oeffentliche Profil,
          die privaten Suchkriterien und die Ergebnisse - die FIND-Spec nennt
          genau das in Abschnitt 3 als Grund fuer den Umbau.
          ------------------------------------------------------------------ */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">{t("practicalTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">
          {t("practicalIntro")}
        </p>
        <div className="mt-6">
          <PracticalSearchForm
            // Wer noch nichts gespeichert hat, bekommt leere Felder und
            // keinen Fehler: Eine Suche ohne Kriterien ist eine gueltige
            // Suche.
            mustHaves={kriterien}
            action={savePractical}
            resetAction={resetPractical}
            copy={{
              role: tDiscovery("v2.search.role"),
              // Dieselbe Aufloesung wie in der Ergebnisliste: "anderes" traegt
              // den selbst eingetragenen Text, alles andere seine Beschriftung.
              roleLabel: (role: string) => tDiscovery(`roles.${role}`),
              expertise: tDiscovery("v2.search.expertise"),
              expertisePlaceholder: tDiscovery("v2.search.expertisePlaceholder"),
              expertiseHelp: tDiscovery("v2.search.expertiseHelp"),
              location: tDiscovery("v2.search.location"),
              locationPlaceholder: tDiscovery("v2.search.locationPlaceholder"),
              locationHelp: tDiscovery("v2.search.locationHelp"),
              minimumAvailability: tDiscovery("v2.search.minimumAvailability"),
              remote: tDiscovery("v2.search.remote"),
              remoteLabel: (mode: string) => tDiscovery(`remoteModes.${mode}`),
              // Dieselben Beschriftungen wie am Profil - die kurze Form,
              // weil hier vier davon untereinander stehen.
              searchIntent: t("searchIntent"),
              searchIntentHelp: t("searchIntentHelp"),
              searchIntentLabel: (intent: string) =>
                tDiscovery(`searchIntents.${intent}.short`),
              startHorizon: t("startHorizon"),
              startHorizonHelp: t("startHorizonHelp"),
              startHorizonLabel: (horizon: string) =>
                tDiscovery(`startHorizons.${horizon}.long`),
              apply: tDiscovery("v2.search.apply"),
              applying: tDiscovery("v2.search.applying"),
              reset: tDiscovery("v2.search.reset"),
            }}
            skills={{
              title: t("skillsTitle"),
              intro: t("skillsIntro"),
              node: (
                <>
                  <CapabilityPicker
                    areas={vocabulary.areas
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((area) => ({
                        areaId: area.area_id,
                        familyId: area.family_id,
                        label: tCapability(`areaLabels.${area.area_id}`),
                      }))}
                    families={vocabulary.families
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((family) => ({
                        familyId: family.family_id,
                        label: tCapability(`families.${family.family_id}`),
                      }))}
                    initial={kriterien.requiredCapabilityAreasAny}
                    max={DISCOVERY_SELECTION_LIMITS.requiredCapabilityAreas}
                    copy={{
                      searchPlaceholder: t("skillsSearchPlaceholder"),
                      showAll: t("skillsShowAll"),
                      hideAll: t("skillsHideAll"),
                      noMatch: t("skillsNoMatch"),
                      selected: t("skillsSelected"),
                      removeTemplate: t("skillsRemove", { label: "{label}" }),
                      limitReached: t("skillsLimit", {
                        max: DISCOVERY_SELECTION_LIMITS.requiredCapabilityAreas,
                      }),
                    }}
                  />
                  {/* WER SEINE BEREICHE PRIVAT HAELT, WIRD DARUEBER NICHT
                      GEFUNDEN. Das steht hier, weil man es beim Suchen wissen
                      muss - und am Schalter selbst, weil man es beim
                      Einstellen wissen muss. */}
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    {t("skillsPrivacy")}
                  </p>
                </>
              ),
            }}
          />
        </div>
      </section>

      <DiscoveryWorkstyleConsent userId={auth.user.id} result={workstyle} />

      <p className="mt-10 border-t border-slate-200 pt-6 text-sm">
        <Link href="/discovery?mode=search" className="font-medium text-slate-900 underline">
          {t("resultsLink")}
        </Link>
      </p>
    </main>
  );
}
