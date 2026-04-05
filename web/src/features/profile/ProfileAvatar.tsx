import Image from "next/image";
import { getAvatarSrc } from "@/features/profile/avatarLibrary";

type ProfileAvatarProps = {
  displayName: string;
  avatarId?: string | null;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
};

function buildInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function ProfileAvatar({
  displayName,
  avatarId = null,
  imageUrl = null,
  className = "",
  fallbackClassName = "",
  alt,
}: ProfileAvatarProps) {
  const initials = buildInitials(displayName);
  const resolvedSrc = getAvatarSrc(avatarId) ?? resolveProfileAvatarUrl(imageUrl);
  const resolvedAlt = alt ?? `Avatar von ${displayName}`;

  if (resolvedSrc) {
    if (!resolvedSrc.startsWith("/")) {
      return (
        <img
          src={resolvedSrc}
          alt={resolvedAlt}
          className={className}
        />
      );
    }

    return (
      <Image
        src={resolvedSrc}
        alt={resolvedAlt}
        width={256}
        height={256}
        className={className}
      />
    );
  }

  return (
    <div
      className={
        fallbackClassName ||
        `${className} flex items-center justify-center bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(255,255,255,0.9)_48%,rgba(124,58,237,0.08))] text-slate-700`
      }
      aria-label={resolvedAlt}
    >
      <span className="font-semibold">{initials || "F"}</span>
    </div>
  );
}

function resolveProfileAvatarUrl(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:image/")
  ) {
    return normalized;
  }

  if (!normalized.startsWith("avatars/")) {
    return normalized;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${normalized}`;
}
