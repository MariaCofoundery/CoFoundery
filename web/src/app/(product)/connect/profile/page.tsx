import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectProfile } from "@/features/connect/connectData";
import { saveConnectProfileAction } from "@/features/connect/connectActions";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { CONNECT_ROLES } from "@/features/connect/connectTypes";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { ConnectPhotoField } from "@/features/connect/ConnectPhotoField";
import { connectPhotoUrl } from "@/features/connect/ConnectAvatar";
import { ConnectVisibilityField } from "@/features/connect/ConnectVisibilityField";

const hint = "mt-1 block text-xs leading-5 text-slate-500";

export default async function ConnectProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("connect"); const { client, user } = await requireConnectMember("/connect/profile");
  const [profile, baseProfile, core, params] = await Promise.all([getOwnConnectProfile(client, user.id), getProfileBasicsRow(client, user.id).catch(() => null), getPersonCore(client, user.id), searchParams]);
  const continuation = params.next?.startsWith("/connect/l/") && !params.next.startsWith("//") ? params.next : "";
  return <main className="mx-auto max-w-4xl px-5 py-10">
    <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("navigation.overview")}</Link>
    <p className="mt-3 text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold">{t("profile.title")}</h1><p className="mt-2 max-w-2xl text-slate-600">{t("profile.text")}</p>
    {params.saved ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.profile.${params.saved}`)}</p> : null}
    {params.error ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${params.error}`)}</p> : null}
    <form action={saveConnectProfileAction} className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
      {continuation ? <input type="hidden" name="next" value={continuation} /> : null}
      {/* Identitaet wird zentral auf /profile gepflegt und von dort verteilt.
          Diese Seite entscheidet nur noch das Kontextspezifische: Rollen, Foto
          und Sichtbarkeit. */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold">{t("profile.identityTitle")}</h2>
        {core?.display_name ? (
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p className="font-medium">{core.display_name}</p>
            {core.headline ? <p>{core.headline}</p> : null}
            {core.bio ? <p className="line-clamp-2 text-slate-600">{core.bio}</p> : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-amber-900">{t("profile.identityMissing")}</p>
        )}
        <p className={hint}>{t("profile.identityText")}</p>
        <Link href="/profile" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">
          {t("profile.identityLink")}
        </Link>
      </section>
      <fieldset><legend className="text-sm font-medium">{t("profile.roles")}</legend><p className={hint}>{t("profile.rolesHint")}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{CONNECT_ROLES.map((role) => <label key={role} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"><input type="checkbox" name="network_roles" value={role} defaultChecked={profile?.network_roles.includes(role)} />{t(`roles.${role}`)}</label>)}</div></fieldset>
      <ConnectPhotoField
        displayName={profile?.display_name || baseProfile?.display_name || ""}
        currentAvatarId={profile?.photo_avatar_id}
        currentPhotoUrl={connectPhotoUrl(profile)}
        existingAvatarId={baseProfile?.avatar_id}
        initialVisibility={profile?.photo_visibility || "platform_only"}
        copy={{
          title: t("profile.photo.title"), helper: t("profile.photo.helper"), fallbackName: t("profile.photo.fallbackName"),
          keep: t("profile.photo.keep"), existing: t("profile.photo.existing"), none: t("profile.photo.none"), upload: t("profile.photo.upload"),
          visibilityTitle: t("profile.photo.visibilityTitle"), platformOnly: t("profile.photo.platformOnly"), platformOnlyHint: t("profile.photo.platformOnlyHint"),
          publicAllowed: t("profile.photo.publicAllowed"), publicAllowedHint: t("profile.photo.publicAllowedHint"),
        }}
      />
      <ConnectVisibilityField initial={profile?.visibility} copy={{
        title: t("visibility.profileTitle"), membersOnly: t("visibility.membersOnly"), public: t("visibility.public"),
        publicHint: t("visibility.profilePublicHint"), confirm: t("visibility.profileConfirm"),
        previewTitle: t("visibility.publicFields"), previewItems: t("visibility.profileFields"),
      }} />
      {profile?.visibility === "public" && profile.status === "active" ? <Link href={`/connect/p/${profile.public_slug}`} className="inline-flex min-h-11 items-center font-semibold text-violet-800 hover:underline">{t("visibility.openPublicPage")}</Link> : null}
      <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("profile.consent")} <Link href="/datenschutz" className="font-semibold underline underline-offset-2">{t("profile.privacyLink")}</Link></p>
      <div className="flex flex-wrap gap-3"><ConnectSubmitButton intent="publish" label={t("profile.publish")} pendingLabel={t("pending.publish")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold" /><ConnectSubmitButton intent="draft" label={t("actions.saveDraft")} pendingLabel={t("pending.save")} className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold" /></div>
    </form>
  </main>;
}
