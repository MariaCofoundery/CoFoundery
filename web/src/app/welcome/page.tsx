import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { WelcomeAlignmentVisual } from "@/features/profile/WelcomeAlignmentVisual";
import { createClient } from "@/lib/supabase/server";

function buildWelcomeNextParam(nextPath: string) {
  return nextPath === "/dashboard" ? "/welcome" : `/welcome?next=${encodeURIComponent(nextPath)}`;
}

/**
 * Der Einstieg - jetzt fuer alle drei Zielgruppen.
 *
 * Bis 18.09.2026 kamen hier nur Menschen an, die auf /start "Founder" oder
 * "Advisor" angegeben hatten. Wer nur ins Netzwerk wollte, wurde von
 * resolveProductEntryPath direkt auf /connect/profile geschickt und bekam nie
 * eine Einfuehrung - ausgerechnet die Gruppe mit dem geringsten Vorwissen.
 *
 * Die Weiche ist jetzt person_core.onboarding_completed_at statt "hat diese
 * Person schon ein vollstaendiges Kernprofil". Das Kernprofil beantwortet die
 * Frage nur fuer Founder und Advisors; Menschen ohne Produktrolle legen gar
 * keins an.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; next?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("profile.welcome");
  const nextPath = normalizeNextPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(buildWelcomeNextParam(nextPath))}`);
  }

  const [profile, core] = await Promise.all([
    getProfileBasicsRow(supabase, user.id).catch(() => null),
    Promise.resolve(
      supabase
        .from("person_core")
        .select("onboarding_completed_at, display_name")
        .eq("user_id", user.id)
        .maybeSingle()
    )
      .then((result) => result.data)
      .catch(() => null),
  ]);

  // Wer schon eingefuehrt wurde, wird nicht noch einmal eingefuehrt.
  if (core?.onboarding_completed_at) {
    redirect(nextPath);
  }

  const fallbackAvatarUrl = profile?.avatar_url?.trim() || null;
  /**
   * Rollen werden NICHT vorbelegt.
   *
   * Vorher stand hier `profile?.roles ?? [profileIntent]` mit "founder" als
   * Rueckfall - die Wahl war damit schon getroffen, bevor sie gestellt wurde.
   * Nur wenn ein Magic Link aus der alten Mechanik ausdruecklich "advisor"
   * mitbringt, ist etwas vorausgewaehlt.
   */
  const intentRoles =
    params.intent === "advisor" ? ["advisor"] : params.intent === "founder" ? ["founder"] : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(103,232,249,.14),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.09),transparent_34%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-12 md:px-8">
      {/* Eine Karte, nicht zwei ineinander: Der Einstieg soll leicht wirken,
          und zwei gerahmte Flaechen uebereinander wirken wie ein Aktendeckel. */}
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex justify-end">
          <PublicLanguageSwitcher />
        </div>
        <ProfileBasicsForm
          mode="onboarding"
          initialValues={{
            display_name: profile?.display_name ?? core?.display_name ?? null,
            focus_skill: profile?.focus_skill ?? null,
            intention: profile?.intention ?? null,
            roles: profile?.roles ?? intentRoles,
            avatar_id: profile?.avatar_id ?? null,
            avatar_url: profile?.avatar_url ?? null,
          }}
          submitLabel={t("submit")}
          onSuccessRedirectTo={nextPath}
          variant="accent"
          fallbackAvatarUrl={fallbackAvatarUrl}
          welcomeVisual={<WelcomeAlignmentVisual className="mx-auto w-full max-w-2xl" />}
        />
      </div>
    </main>
  );
}
