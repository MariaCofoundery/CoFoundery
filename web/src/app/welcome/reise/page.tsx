import { redirect } from "next/navigation";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { ProfileJourney } from "@/features/profile/journey/ProfileJourney";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Einstieg als Kartenreise - ein Zusatzweg neben `/welcome`.
 *
 * Gleiche Pforte wie dort: Wer nicht angemeldet ist, geht zum Login; wer schon
 * eingefuehrt wurde, kommt nicht noch einmal hierher. Sonst waere dies eine
 * zweite Tuer an den Pruefungen des Einstiegs vorbei.
 */
export default async function WelcomeJourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = normalizeNextPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent("/welcome/reise")}`);

  const [profile, core] = await Promise.all([
    getProfileBasicsRow(supabase, user.id).catch(() => null),
    Promise.resolve(
      supabase.from("person_core").select("onboarding_completed_at, display_name").eq("user_id", user.id).maybeSingle()
    )
      .then((result) => result.data)
      .catch(() => null),
  ]);
  if (core?.onboarding_completed_at) redirect(next);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(103,232,249,.14),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.09),transparent_34%),linear-gradient(180deg,#fff,#f8fafc)] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4 flex justify-end">
          <PublicLanguageSwitcher />
        </div>
        <ProfileJourney
          initialName={profile?.display_name ?? core?.display_name ?? ""}
          next={next}
          error={params.error ?? null}
        />
      </div>
    </main>
  );
}
