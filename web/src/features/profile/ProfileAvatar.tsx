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

const PHOTO_ROUTE_PREFIX = "/api/profile/photo/";

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
    // Nicht ueber next/image ausliefern, wenn die Quelle eine Sitzung braucht.
    // Der Bild-Optimierer holt die Datei serverseitig und ohne die Cookies der
    // Nutzerin; eine authentifizierte Route antwortet ihm mit 404, und das Bild
    // bleibt leer. Statische Bibliotheks-Illustrationen sind davon nicht
    // betroffen, deshalb faellt der Fehler nur bei eigenen Fotos auf.
    if (!resolvedSrc.startsWith("/") || resolvedSrc.startsWith(PHOTO_ROUTE_PREFIX)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
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

  // Der avatars-Bucket ist privat. Die Auslieferung laeuft ueber eine
  // authentifizierte Route statt ueber eine oeffentliche Storage-URL - vorher
  // war jede hochgeladene Datei ohne Login per Direkt-URL abrufbar.
  return `${PHOTO_ROUTE_PREFIX}${normalized.slice("avatars/".length)}`;
}
