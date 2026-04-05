import { redirect } from "next/navigation";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { isCoreProfileComplete } from "@/features/profile/profileCompletion";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { WelcomeAlignmentVisual } from "@/features/profile/WelcomeAlignmentVisual";
import { createClient } from "@/lib/supabase/server";

function buildWelcomeNextParam(nextPath: string) {
  return nextPath === "/dashboard" ? "/welcome" : `/welcome?next=${encodeURIComponent(nextPath)}`;
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(buildWelcomeNextParam(nextPath))}`);
  }

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  if (isCoreProfileComplete(profile)) {
    redirect(nextPath);
  }

  const fallbackAvatarUrl =
    (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.trim()) ||
    (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture.trim()) ||
    null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white/96 p-4 shadow-sm md:p-6">
        <div>
          <ProfileBasicsForm
            mode="onboarding"
            initialValues={{
              display_name: profile?.display_name ?? null,
              focus_skill: profile?.focus_skill ?? null,
              intention: profile?.intention ?? null,
              roles: profile?.roles ?? null,
              avatar_id: profile?.avatar_id ?? null,
            }}
            submitLabel="Los geht's"
            onSuccessRedirectTo={nextPath}
            variant="accent"
            fallbackAvatarUrl={fallbackAvatarUrl}
            welcomeVisual={<WelcomeAlignmentVisual className="mx-auto w-full max-w-2xl" />}
          />
        </div>
      </section>
    </main>
  );
}
