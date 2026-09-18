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

/**
 * Woher ein Bild kommt - und ob es ueber den Bildoptimierer darf.
 *
 * Statische Bibliotheks-Illustrationen duerfen; sie liegen offen im
 * Dateisystem. Alles andere kommt aus einer Route, die eine Sitzung verlangt -
 * und der Optimierer holt die Datei serverseitig OHNE die Cookies der
 * Nutzerin. Er bekommt 401 oder 404, und statt des Bildes bleibt ein kaputtes
 * Symbol stehen.
 *
 * Genau das ist am 18.09.2026 aufgefallen: Die Ausnahme stand als Praefix
 * "/api/profile/photo/" da und traf den Connect-Pfad "/api/connect/photos/"
 * nicht - dort waren also ALLE Fotos kaputt. Eine Liste von Praefixen haette
 * beim naechsten Pfad wieder gefehlt, deshalb jetzt andersherum: Der
 * Optimierer bekommt nur, was aus der Bibliothek stammt.
 */
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
  const librarySrc = getAvatarSrc(avatarId);
  const resolvedSrc = librarySrc ?? resolveProfileAvatarUrl(imageUrl);
  const resolvedAlt = alt ?? `Avatar von ${displayName}`;

  if (resolvedSrc) {
    // Nur die Bibliothek geht ueber den Optimierer. Alles andere ist ein
    // eigenes Bild hinter einer Sitzung.
    if (librarySrc) {
      return (
        <Image
          src={librarySrc}
          alt={resolvedAlt}
          width={256}
          height={256}
          className={className}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolvedSrc} alt={resolvedAlt} className={className} />
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
