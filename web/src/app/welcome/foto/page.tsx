import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { ProfilePhotoField } from "@/features/profile/ProfilePhotoField";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Der letzte, freiwillige Schritt im Profil-Setup: ein Foto (Entwurf 16.11.2026). Hochladen, eine Illustration waehlen oder spaeter. Nichts wird
 * dadurch sichtbar: Wer das Bild sehen darf, steht in den Einstellungen des Profils, standardmaessig niemand ausser dir.
 *
 * Gleiche Bausteine wie im Profil (ProfilePhotoField, dieselben Speicherwege); der Rueckweg nach dem Speichern fuehrt auf diese Seite zurueck, damit
 * das Weiter-Knopf-Ergebnis zu sehen ist.
 */
export default async function WelcomePhotoPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent("/welcome/foto")}`);
  const [{ data: core }, basics] = await Promise.all([
    supabase.from("person_core").select("onboarding_completed_at, display_name").eq("user_id", user.id).maybeSingle(),
    getProfileBasicsRow(supabase, user.id).catch(() => null),
  ]);
  if (!core?.onboarding_completed_at) redirect("/welcome");
  const t = await getTranslations("profile.journey.photo");
  const tc = await getTranslations("capability");
  const tp = await getTranslations("capability.identity.photo");
  const hasPhoto = Boolean(basics?.avatar_id || basics?.avatar_url);
  const saved = params.saved === "photo" || params.saved === "photo_removed";
  const failed = ["photo_empty", "photo_too_large", "photo_save", "photo_reuse", "photo_upload"].includes(params.error ?? "") ? params.error : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(103,232,249,.14),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.09),transparent_32%)] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4 flex justify-end"><PublicLanguageSwitcher /></div>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_30px_80px_-30px_rgba(76,29,149,.25)] sm:p-9" data-welcome-photo>
          <p className="text-sm font-semibold text-slate-600">{t("step")}</p>
          <h1 className="mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-slate-950">{t("title")}</h1>
          <p className="mt-3 text-lg leading-8 text-slate-700">{t("text")}</p>
          {saved ? <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{t("saved")}</p> : null}
          {failed ? <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{tc(`errors.${failed}`)}</p> : null}
          <div className="mt-5">
            <ProfilePhotoField
              displayName={core.display_name?.trim() || ""}
              avatarId={basics?.avatar_id ?? null}
              avatarUrl={basics?.avatar_url ?? null}
              returnPath="/welcome/foto"
              copy={{
                title: tp("title"), help: tp("help"), add: tp("add"), change: tp("change"), chooseIllustration: tp("chooseIllustration"),
                closeIllustrations: tp("closeIllustrations"), remove: tp("remove"), save: tp("save"), pending: tc("pending.save"), preview: tp("preview"),
              }}
            />
          </div>
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{t("who")}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/dashboard" className="brand-cta inline-flex min-h-14 w-full items-center justify-center rounded-2xl px-6 text-lg font-semibold">{hasPhoto ? t("next") : t("skip")}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
