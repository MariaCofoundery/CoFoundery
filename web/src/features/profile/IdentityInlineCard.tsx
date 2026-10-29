import { getTranslations } from "next-intl/server";
import { IdentityEditor } from "@/features/profile/IdentityEditor";
import { getIdentityGaps, type IdentityReturnPath } from "@/features/profile/identityReadiness";
import type { PersonCore } from "@/features/profile/personCoreData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { getPhotoUsage } from "@/features/profile/photoUsageData";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { normalizeProfileRoles } from "@/features/profile/profileRoles";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Nur bekannte Schluessel an t() geben (ein erfundener Parameter wuerde als Pfad auf der Seite landen).
const ERROR_KEYS = ["save", "published_incomplete", "roles", "linkedin", "photo_reuse", "photo_upload", "photo_save", "photo_empty", "photo_too_large"];

/**
 * "Aus deinem Profil" auf FIND und Connect: dieselbe Identitaet wie in `/profile`,
 * dort bearbeitbar, wo sie angezeigt wird. Eine kurze Zusammenfassung, ein Klick
 * klappt das Formular auf; Speichern bleibt auf der Seite.
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
  const summary = (c: PersonCore | null) => [c?.headline, c?.location_region].filter(Boolean).join(" · ");

  return (
    <section id="identity" className="mt-6 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="identity-inline-title">
      <h2 id="identity-inline-title" className="text-lg font-semibold text-slate-950">{t("identity.inline.title")}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t("identity.inline.text")}</p>
      {saved ? <p role="status" className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{t(`success.${saved}`)}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(`errors.${error}`)}</p> : null}
      <p className="mt-3 text-base font-semibold text-slate-950">{core?.display_name || t("identity.inline.empty")}</p>
      {summary(core) ? <p className="text-sm text-slate-600">{summary(core)}</p> : null}
      <details className="group mt-3" open={Boolean(error)}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-violet-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 [&::-webkit-details-marker]:hidden">
          {t("identity.inline.edit")}
        </summary>
        <div className="mt-2">
          <IdentityEditor
            core={core}
            currentRoles={normalizeProfileRoles(basics?.roles)}
            returnPath={returnPath}
            inline
            identityGaps={getIdentityGaps(core)}
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
