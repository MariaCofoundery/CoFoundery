import { getTranslations } from "next-intl/server";
import { ConnectPhotoField } from "@/features/connect/ConnectPhotoField";
import type { IdentityReturnPath } from "@/features/profile/identityReadiness";
import type { PhotoUsage } from "@/features/profile/photoUsageData";
import { savePhotoUsageAction } from "@/features/profile/photoUsageActions";
import { ConnectSubmitButton as SubmitButton } from "@/features/connect/ConnectSubmitButton";

/**
 * "Wo dein Foto zu sehen ist" - unter dem Foto, an demselben Ort: ein Bild, zwei getrennte
 * Entscheidungen (FIND, Mitglieder und Teams / Connect). Keine setzt die andere voraus.
 */
export async function PhotoUsagePanel({
  usage,
  displayName,
  avatarId,
  avatarUrl,
  returnPath,
}: {
  usage: PhotoUsage;
  displayName: string;
  avatarId: string | null;
  avatarUrl: string | null;
  returnPath: IdentityReturnPath | null;
}) {
  const t = await getTranslations("capability");
  const c = await getTranslations("connect");
  return (
    <form action={savePhotoUsageAction} className="mt-6 space-y-4 border-t border-slate-200 pt-5">
      {returnPath ? <input type="hidden" name="next" value={returnPath} /> : null}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{t("identity.photoUsage.title")}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t("identity.photoUsage.text")}</p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
        <input type="checkbox" name="photo_visible_to_members" value="yes" defaultChecked={usage.visibleToMembers} className="mt-1 h-4 w-4 rounded border-slate-300" />
        <span>
          <span className="block text-sm font-semibold text-slate-900">{t("identity.photoVisibleLabel")}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{t("identity.photoVisibleHint")}</span>
        </span>
      </label>
      {usage.connect ? (
        <ConnectPhotoField
          displayName={displayName}
          currentAvatarId={usage.connect.currentAvatarId}
          currentPhotoUrl={usage.connect.currentPhotoUrl}
          existingAvatarId={avatarId}
          existingImageUrl={avatarUrl}
          copy={{
            title: c("profile.photo.title"),
            helper: c("profile.photo.helper"),
            fallbackName: c("profile.photo.fallbackName"),
            keep: c("profile.photo.keep"),
            existing: c("profile.photo.existing"),
            existingHint: c("profile.photo.existingHint"),
            none: c("profile.photo.none"),
            upload: c("profile.photo.upload"),
          }}
        />
      ) : null}
      <SubmitButton intent="photo_usage" label={t("identity.photoUsage.save")} pendingLabel={t("pending.save")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold" />
    </form>
  );
}
