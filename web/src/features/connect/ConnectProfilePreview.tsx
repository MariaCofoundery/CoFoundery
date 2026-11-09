import { getTranslations } from "next-intl/server";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import type { ConnectProfile } from "@/features/connect/connectTypes";

/**
 * "So sehen andere dich" (Entwurf 09.11.2026): die Karte, wie Mitglieder das gespeicherte Profil sehen. Sie zeigt den
 * gespeicherten Stand und aendert sich nach dem Speichern. Reine Anzeige, kein Score.
 */
export async function ConnectProfilePreview({ profile }: { profile: ConnectProfile }) {
  const t = await getTranslations("connect");
  const roles = profile.network_roles.map((role) => t(`roles.${role}`));
  return (
    <aside aria-label={t("profile.preview.title")} className="grid gap-3 self-start lg:sticky lg:top-6">
      <p className="text-xs font-bold uppercase tracking-[.08em] text-slate-600">{t("profile.preview.title")}</p>
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <ConnectAvatar profile={profile} displayName={profile.display_name} className="h-12 w-12 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-950">{profile.display_name}</p>
            {profile.location_region ? <p className="text-[13px] text-slate-600">{profile.location_region}</p> : null}
          </div>
        </div>
        {profile.headline ? <p className="text-[13.5px] leading-6 text-slate-800">{profile.headline}</p> : null}
        {roles.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {roles.map((role) => <li key={role} className="rounded-full bg-violet-50 px-2.5 py-1 text-[12.5px] font-semibold text-violet-900">{role}</li>)}
          </ul>
        ) : null}
        <dl className="grid gap-1.5 border-t border-slate-100 pt-3 text-[13px] leading-5 text-slate-700">
          <div><dt className="inline font-semibold">{t("profile.preview.reach")}: </dt><dd className="inline">{profile.network_reach?.trim() || <span className="text-slate-500">{t("profile.preview.empty")}</span>}</dd></div>
          <div><dt className="inline font-semibold">{t("profile.preview.open")}: </dt><dd className="inline">{profile.open_to_formats?.length ? profile.open_to_formats.map((format) => t(`profile.openTo.${format}`)).join(", ") : <span className="text-slate-500">{t("profile.preview.empty")}</span>}</dd></div>
        </dl>
      </section>
      <p className="text-[12.5px] leading-5 text-slate-600">{t(profile.visibility === "public" ? "profile.preview.notePublic" : "profile.preview.noteMembers")}</p>
    </aside>
  );
}
