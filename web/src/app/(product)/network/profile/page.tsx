import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess";
import { getOwnNetworkProfile } from "@/features/network/networkData";
import { reuseExistingProfileAction, saveNetworkProfileAction } from "@/features/network/networkActions";
import { NetworkSubmitButton } from "@/features/network/NetworkSubmitButton";
import { NETWORK_REMOTE_MODES, NETWORK_ROLES } from "@/features/network/networkTypes";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { NetworkPhotoField } from "@/features/network/NetworkPhotoField";
import { networkPhotoUrl } from "@/features/network/NetworkAvatar";

const field = "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";

export default async function NetworkProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("network"); const { client, user } = await requireNetworkMember("/network/profile");
  const [profile, baseProfile, params] = await Promise.all([getOwnNetworkProfile(client, user.id), getProfileBasicsRow(client, user.id).catch(() => null), searchParams]);
  return <main className="mx-auto max-w-4xl px-5 py-10">
    <Link href="/network" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("navigation.overview")}</Link>
    <p className="mt-3 text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold">{t("profile.title")}</h1><p className="mt-2 max-w-2xl text-slate-600">{t("profile.text")}</p>
    {!profile ? <form action={reuseExistingProfileAction} className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><p className="text-sm text-slate-700">{t("profile.reuseText")}</p><NetworkSubmitButton label={t("profile.reuse")} pendingLabel={t("pending.reuse")} className="mt-3 min-h-11 rounded-full border border-cyan-300 bg-white px-5 text-sm font-semibold" /></form> : null}
    {params.reused ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t("profile.reused")}</p> : null}
    {params.saved ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.profile.${params.saved}`)}</p> : null}
    {params.error ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${params.error}`)}</p> : null}
    <form action={saveNetworkProfileAction} className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">{t("profile.name")}<input required maxLength={80} name="display_name" defaultValue={profile?.display_name} className={field} /></label><label className="text-sm font-medium">{t("profile.headline")}<input required maxLength={160} name="headline" defaultValue={profile?.headline} className={field} /></label></div>
      <label className="block text-sm font-medium">{t("profile.bio")}<textarea required minLength={20} maxLength={800} rows={5} name="bio" defaultValue={profile?.bio} className={field} /></label>
      <fieldset><legend className="text-sm font-medium">{t("profile.roles")}</legend><p className={hint}>{t("profile.rolesHint")}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{NETWORK_ROLES.map((role) => <label key={role} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"><input type="checkbox" name="network_roles" value={role} defaultChecked={profile?.network_roles.includes(role)} />{t(`roles.${role}`)}</label>)}</div></fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">{t("profile.expertise")}<input name="expertise" defaultValue={profile?.expertise.join(", ")} className={field} /><span className={hint}>{t("form.topicsHint", { max: 8 })}</span></label>
        <label className="text-sm font-medium">{t("profile.industries")}<input name="industries" defaultValue={profile?.industries.join(", ")} className={field} /><span className={hint}>{t("form.industriesHint", { max: 5 })}</span></label>
        <label className="text-sm font-medium">{t("profile.location")}<input name="location_region" maxLength={120} defaultValue={profile?.location_region || ""} className={field} /></label>
        <label className="text-sm font-medium">{t("profile.remote")}<select name="remote_mode" defaultValue={profile?.remote_mode || ""} className={field}><option value="">{t("form.optional")}</option>{NETWORK_REMOTE_MODES.map((value) => <option key={value} value={value}>{t(`remote.${value}`)}</option>)}</select></label>
      </div>
      <NetworkPhotoField
        displayName={profile?.display_name || baseProfile?.display_name || ""}
        currentAvatarId={profile?.photo_avatar_id}
        currentPhotoUrl={networkPhotoUrl(profile)}
        existingAvatarId={baseProfile?.avatar_id}
        initialVisibility={profile?.photo_visibility || "platform_only"}
        copy={{
          title: t("profile.photo.title"), helper: t("profile.photo.helper"), fallbackName: t("profile.photo.fallbackName"),
          keep: t("profile.photo.keep"), existing: t("profile.photo.existing"), none: t("profile.photo.none"), upload: t("profile.photo.upload"),
          visibilityTitle: t("profile.photo.visibilityTitle"), platformOnly: t("profile.photo.platformOnly"), platformOnlyHint: t("profile.photo.platformOnlyHint"),
          publicAllowed: t("profile.photo.publicAllowed"), publicAllowedHint: t("profile.photo.publicAllowedHint"),
        }}
      />
      <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{t("profile.consent")}</p>
      <div className="flex flex-wrap gap-3"><NetworkSubmitButton intent="publish" label={t("profile.publish")} pendingLabel={t("pending.publish")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold" /><NetworkSubmitButton intent="draft" label={t("actions.saveDraft")} pendingLabel={t("pending.save")} className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold" /></div>
    </form>
  </main>;
}
