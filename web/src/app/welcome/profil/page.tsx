import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { ProfileJourney } from "@/features/profile/journey/ProfileJourney";
import { JOURNEY_REMOTE_MODES, openSetupSteps, type JourneyRemoteMode } from "@/features/profile/journey/journeyModel";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Profil einrichten, in kleinen Schritten (Entwurf vom 14.11.2026).
 *
 * Das sind die Fragen des fruehen Einstiegs - Zeile, zwei Saetze, Staerken, Arbeitsort -, aber einzeln und
 * jederzeit wieder aufnehmbar: Jede Karte wird beim Weitergehen gespeichert, und die Seite zeigt nur, was
 * noch offen ist. Nichts davon wird veroeffentlicht; Sichtbarkeit und Freigaben haben ihre eigenen Stellen.
 *
 * Gleiche Pforte wie der Einstieg: ohne Anmeldung zum Login, ohne abgeschlossenen Einstieg dorthin zurueck.
 */
export default async function WelcomeSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent("/welcome/profil")}`);

  const { data: core } = await supabase
    .from("person_core")
    .select("onboarding_completed_at, display_name, headline, bio, expertise, remote_mode")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!core?.onboarding_completed_at) redirect("/welcome");

  const openSteps = openSetupSteps(core);
  // Alles gesagt: nichts mehr zu tun hier.
  if (openSteps.length === 0) redirect("/dashboard");

  const t = await getTranslations("profile.journey");
  const remote = (JOURNEY_REMOTE_MODES as readonly string[]).includes(core.remote_mode ?? "") ? (core.remote_mode as JourneyRemoteMode) : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(103,232,249,.14),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.09),transparent_32%)] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <a href="/dashboard" className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900">{t("setup.later")}</a>
          <PublicLanguageSwitcher />
        </div>
        <ProfileJourney
          mode="setup"
          initialName={core.display_name ?? ""}
          next="/dashboard"
          error={null}
          setup={{ headline: core.headline ?? "", bio: core.bio ?? "", where: remote, openSteps }}
        />
        <p className="mt-3 text-center text-xs text-slate-500">{t("setup.autosave")}</p>
      </div>
    </main>
  );
}
