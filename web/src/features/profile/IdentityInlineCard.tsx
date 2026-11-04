import { getTranslations } from "next-intl/server";
import { IdentityEditor } from "@/features/profile/IdentityEditor";
import { getIdentityGaps, IDENTITY_THRESHOLDS, type IdentityReturnPath } from "@/features/profile/identityReadiness";
import type { PersonCore } from "@/features/profile/personCoreData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { getPhotoUsage } from "@/features/profile/photoUsageData";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { normalizeProfileRoles } from "@/features/profile/profileRoles";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Nur bekannte Schluessel an t() geben (ein erfundener Parameter wuerde als Pfad auf der Seite landen).
const ERROR_KEYS = ["save", "published_incomplete", "roles", "linkedin", "photo_reuse", "photo_upload", "photo_save", "photo_empty", "photo_too_large"];

/**
 * "Aus deinem Profil" auf FIND und Connect: dieselbe Identitaet wie in `/profile`,
 * dort bearbeitbar, wo sie angezeigt wird. Eine kurze Zusammenfassung, ein Klick
 * klappt das Formular auf; Speichern bleibt auf der Seite.
 *
 * SEIT 04.11.2026 (Feedback an Maria: "Angaben bearbeiten ist komisch"): Vorher war der
 * Aufklapper ein kleiner Textlink, und dahinter stand das ganze Identitaetsformular samt
 * Lebenslauf-Import und Plattform-Rollen mitten auf der Seite - mit einem eigenen Speichern
 * vor dem eigentlichen Formular. Jetzt: eine Vorschau mit Foto, ein echter Knopf, ein
 * abgesetzter Bereich, und eingebettet nur, was die Identitaet ausmacht (`inline`).
 *
 * STEHT AUSSERHALB DES FORMULARS der Seite: Formulare lassen sich nicht
 * verschachteln, und die Identitaet hat ihre eigene Speicherung (`person_core`).
 */
export async function IdentityInlineCard({
  client,
  userId,
  returnPath,
  params,
  showPhoto = true,
}: {
  client: Client;
  userId: string;
  returnPath: IdentityReturnPath;
  params: { saved?: string; error?: string };
  /** Auf Connect steht das Bild im eigenen Feld des Formulars (Verwendung dort waehlbar). */
  showPhoto?: boolean;
}) {
  const t = await getTranslations("capability");
  const [core, basics] = await Promise.all([
    getPersonCore(client, userId),
    getProfileBasicsRow(client, userId).catch(() => null),
  ]);
  const photoUsage = await getPhotoUsage(client, userId, core?.photo_visible_to_members ?? false);
  const saved = (["identity", "photo_usage", "photo", "photo_removed"] as const).find((key) => key === params.saved) ?? null;
  const error = ERROR_KEYS.includes(params.error ?? "") ? params.error : null;
  const gaps = getIdentityGaps(core);
  const summary = (c: PersonCore | null) => [c?.headline, c?.location_region].filter(Boolean).join(" · ");

  return (
    <section id="identity" className="mt-6 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="identity-inline-title">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="identity-inline-title" className="text-base font-semibold text-slate-950">{t("identity.inline.title")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("identity.inline.text")}</p>
        </div>
      </div>
      {saved ? <p role="status" className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{t(`success.${saved}`)}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(`errors.${error}`)}</p> : null}
      <div className="mt-4 flex items-start gap-4">
        <ProfileAvatar
          displayName={core?.display_name || "?"}
          avatarId={basics?.avatar_id ?? null}
          imageUrl={basics?.avatar_url ?? null}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover"
          fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-800"
        />
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-950">{core?.display_name || t("identity.inline.empty")}</p>
          {summary(core) ? <p className="text-sm text-slate-600">{summary(core)}</p> : null}
          {core?.bio?.trim() ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{core.bio.trim()}</p> : null}
        </div>
      </div>
      {/* Fehlt etwas zum Veroeffentlichen, steht es hier - nicht erst im
          zugeklappten Formular. Die Karte ist dann auch gleich offen. */}
      {gaps.length > 0 ? (
        <p role="status" className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {t("identity.publishTitle")}{" "}
          {gaps.map((gap) => t(`identity.gaps.${gap}`, { min: IDENTITY_THRESHOLDS[gap] })).join(" · ")}
        </p>
      ) : null}
      <details className="group mt-4" open={Boolean(error) || gaps.length > 0}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-900 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 [&::-webkit-details-marker]:hidden">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
          <span className="group-open:hidden">{t("identity.inline.edit")}</span>
          <span className="hidden group-open:inline">{t("identity.inline.close")}</span>
        </summary>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <p className="mb-4 text-sm leading-6 text-slate-600">{t("identity.inline.openHint")}</p>
          <IdentityEditor
            core={core}
            currentRoles={normalizeProfileRoles(basics?.roles)}
            returnPath={returnPath}
            inline
            identityGaps={gaps}
            showGaps
            connectActive={false}
            avatarId={basics?.avatar_id ?? null}
            avatarUrl={basics?.avatar_url ?? null}
            showPhoto={showPhoto}
            photoUsage={photoUsage}
          />
        </div>
      </details>
    </section>
  );
}
