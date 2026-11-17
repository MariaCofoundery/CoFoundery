import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import type { ConnectProfile } from "@/features/connect/connectTypes";

/**
 * Eine Person in Connect - egal wo sie auftaucht, fuehrt Bild UND Name zu ihrem Profil im Netzwerk (/connect/people/<id>).
 *
 * EIN Baustein fuer alle Stellen, damit es ueberall gleich aussieht und sich gleich verhaelt: Name wird beim Darüberfahren unterstrichen,
 * die Tastatur bekommt einen sichtbaren Rahmen, die Klickflaeche ist mindestens 44 px hoch, der Link sagt Screenreadern, wohin er fuehrt.
 * Ohne userId (die Person ist gegangen) bleibt es derselbe Anblick, aber ohne Link - kein Weg ins Leere.
 *
 * Nicht in einen anderen Link schachteln: Liegt die ganze Karte schon in einem Link, bleibt dort der Name ein Text (`plain`).
 */
export function ConnectPersonLink({
  userId,
  name,
  profile,
  headline,
  avatar = true,
  plain = false,
  avatarClassName = "h-11 w-11 rounded-full object-cover",
  className = "",
  nameClassName = "text-sm font-semibold text-slate-900",
  headlineClassName = "text-xs text-slate-500",
}: {
  userId: string | null | undefined;
  name: string;
  profile?: ConnectProfile | null;
  headline?: string | null;
  avatar?: boolean;
  plain?: boolean;
  avatarClassName?: string;
  className?: string;
  nameClassName?: string;
  headlineClassName?: string;
}) {
  const t = useTranslations("connect");
  const inner = (
    <>
      {avatar ? <span className="shrink-0"><ConnectAvatar profile={profile} displayName={name} className={`${avatarClassName} shrink-0`} /></span> : null}
      <span className="min-w-0">
        <span className={`block truncate ${nameClassName} ${userId && !plain ? "group-hover/person:underline group-focus-visible/person:underline" : ""}`}>{name}</span>
        {headline ? <span className={`block truncate ${headlineClassName}`}>{headline}</span> : null}
      </span>
    </>
  );
  const base = `flex min-w-0 items-center gap-3 ${className}`;
  if (!userId || plain) return <span className={base}>{inner}</span>;
  return (
    <Link
      href={`/connect/people/${userId}`}
      aria-label={t("linkPerson", { name })}
      className={`group/person ${base} min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
    >
      {inner}
    </Link>
  );
}
