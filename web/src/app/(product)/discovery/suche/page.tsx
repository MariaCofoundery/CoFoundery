import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { THEME_IDS } from "@/features/find/discoveryThemes";
import { getOwnPreferences } from "@/features/find/preferenceData";
import {
  SearchPreferencesForm,
  type SearchPreferencesCopy,
} from "@/features/find/SearchPreferencesForm";
import { FOUNDER_PROFILE_INSTRUMENT_ID } from "@/features/instruments/instruments";
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
export default async function SearchPreferencesPage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/discovery/suche")}`);
  }

  const t = await getTranslations("find.search");
  const supabase = await createClient();

  const [{ preferences, stale }, { data: assessment }] = await Promise.all([
    getOwnPreferences(auth.user.id),
    supabase
      .from("assessments")
      .select("id, submitted_at")
      .eq("user_id", auth.user.id)
      .eq("instrument_id", FOUNDER_PROFILE_INSTRUMENT_ID)
      .not("submitted_at", "is", null)
      .limit(1)
      .maybeSingle(),
  ]);

  const copy: SearchPreferencesCopy = {
    directionLabel: t("directionLabel"),
    importanceLabel: t("importanceLabel"),
    directions: {
      similar: t("directions.similar"),
      complementary: t("directions.complementary"),
      neutral: t("directions.neutral"),
    },
    importances: {
      "1": t("importances.1"),
      "2": t("importances.2"),
      "3": t("importances.3"),
    },
    themes: Object.fromEntries(
      THEME_IDS.map((themeId) => [
        themeId,
        { title: t(`themes.${themeId}.title`), text: t(`themes.${themeId}.text`) },
      ]),
    ),
    save: t("save"),
    saving: t("saving"),
    saved: t("saved"),
    saveFailed: t("saveFailed"),
    changeLater: t("changeLater"),
  };

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

      {!assessment && (
        <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("needsProfileTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("needsProfileText")}</p>
          <Link
            href="/founder-alignment/profil"
            className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {t("needsProfileCta")}
          </Link>
        </section>
      )}

      {/* Die Auswahl gehört zu einer Fassung des Bogens. Stimmt sie nicht mehr,
          wird nicht still weitergerechnet (Spec, Abschnitt 28). */}
      {stale && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("staleTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("staleText")}</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">{t("themesTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("themesIntro")}</p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("themesNote")}</p>

        <div className="mt-6">
          <SearchPreferencesForm themeIds={THEME_IDS} initial={preferences} copy={copy} />
        </div>
      </section>
    </main>
  );
}
