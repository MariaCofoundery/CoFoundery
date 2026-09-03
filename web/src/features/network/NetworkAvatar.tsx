import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { NetworkProfile } from "./networkTypes";

export function networkPhotoUrl(profile: Pick<NetworkProfile, "user_id" | "photo_path" | "updated_at"> | null | undefined) {
  if (!profile?.photo_path) return null;
  return `/api/network/photos/${profile.user_id}?v=${encodeURIComponent(profile.updated_at)}`;
}

export function NetworkAvatar({ profile, displayName, className = "h-11 w-11 rounded-full object-cover" }: {
  profile?: NetworkProfile | null;
  displayName: string;
  className?: string;
}) {
  return <ProfileAvatar
    displayName={displayName}
    avatarId={profile?.photo_avatar_id}
    imageUrl={networkPhotoUrl(profile)}
    className={className}
    fallbackClassName={`${className} flex items-center justify-center bg-slate-100 text-xs font-semibold text-slate-700`}
  />;
}
