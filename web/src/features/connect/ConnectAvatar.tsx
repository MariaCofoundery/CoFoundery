import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { ConnectProfile } from "./connectTypes";

export function connectPhotoUrl(profile: Pick<ConnectProfile, "user_id" | "photo_path" | "updated_at"> | null | undefined) {
  if (!profile?.photo_path) return null;
  return `/api/connect/photos/${profile.user_id}?v=${encodeURIComponent(profile.updated_at)}`;
}

export function ConnectAvatar({ profile, displayName, className = "h-11 w-11 rounded-full object-cover" }: {
  profile?: ConnectProfile | null;
  displayName: string;
  className?: string;
}) {
  return <ProfileAvatar
    displayName={displayName}
    avatarId={profile?.photo_avatar_id}
    imageUrl={connectPhotoUrl(profile)}
    className={className}
    fallbackClassName={`${className} flex items-center justify-center bg-slate-100 text-xs font-semibold text-slate-700`}
  />;
}
