import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CapabilityAreaPicker } from "@/features/capability/CapabilityAreaPicker";
import type { CapabilityArea, CapabilityFamily } from "@/features/capability/capabilityTypes";
import { saveDiscoverySearchAction } from "@/features/discovery/savedSearchActions";
import type { FounderSearchPreferences } from "@/features/discovery/discoveryTypes";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Merken, was gerade gesucht wird - und melden, wenn jemand Neues dazu passt.
 *
 * Die Kriterien stehen schon oben im Formular; hier wird nichts davon
 * wiederholt, sondern nur aufgezaehlt, was mitgenommen wird. Wer nichts
 * eingegrenzt hat, bekommt hier auch nichts zum Speichern: eine Meldung ueber
 * jedes neue Profil waere keine Suche, sondern ein Abonnement.
 *
 * Die Faehigkeiten sind der einzige Teil, der hier neu eingegeben wird. Sie
 * kommen in den Suchpraeferenzen nicht vor, sind aber genau das, wonach man
 * ausdruecklich sucht, wenn man jemanden zum Programmieren braucht.
 */
export async function DiscoverySavedSearchForm({
  preferences,
  families,
  areas,
  className,
  fieldClassName,
  buttonClassName,
}: {
  preferences: FounderSearchPreferences;
  families: CapabilityFamily[];
  areas: CapabilityArea[];
  className: string;
  fieldClassName: string;
  buttonClassName: string;
}) {
  const t = await getTranslations("discovery");

  const mustHaves = preferences.mustHaves;
  const carried = [
    mustHaves.requiredRolesAny.length
      ? `${t("v2.search.role")}: ${mustHaves.requiredRolesAny.map((role) => t(`roles.${role}`)).join(", ")}`
      : null,
    mustHaves.requiredExpertiseAny.length
      ? `${t("v2.search.expertise")}: ${mustHaves.requiredExpertiseAny.join(", ")}`
      : null,
    mustHaves.requiredIndustriesAny.length
      ? `${t("v2.watch.industries")}: ${mustHaves.requiredIndustriesAny.join(", ")}`
      : null,
    mustHaves.desiredLocationRegion
      ? `${t("v2.search.location")}: ${mustHaves.desiredLocationRegion}`
      : null,
    // Nur eine einzelne Arbeitsweise grenzt ein - so speichert es die Aktion,
    // und so steht es hier.
    mustHaves.acceptedRemoteModes.length === 1
      ? `${t("v2.search.remote")}: ${t(`remoteModes.${mustHaves.acceptedRemoteModes[0]}`)}`
      : null,
  ].filter((line): line is string => line !== null);

  const alignmentActive =
    preferences.discoveryV2AlignmentEnabled && preferences.discoveryV2AlignmentDimensions.length > 0;


  return (
    <section className={className}>
      <p className="text-sm font-semibold text-slate-900">{t("v2.watch.title")}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t("v2.watch.text")}</p>

      <form action={saveDiscoverySearchAction} className="mt-4 grid gap-4">
        {carried.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("v2.watch.carriedTitle")}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {carried.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("v2.watch.noCriteria")}
          </p>
        )}

        <CapabilityAreaPicker
          families={families}
          areas={areas}
          title={t("v2.watch.capabilitiesTitle")}
          text={t("v2.watch.capabilitiesText")}
        />

        {alignmentActive ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {t("v2.watch.alignmentNote")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <input
            name="label"
            required
            minLength={2}
            maxLength={80}
            className={`${fieldClassName} sm:max-w-sm`}
            placeholder={t("v2.watch.labelPlaceholder")}
            aria-label={t("v2.watch.labelPlaceholder")}
          />
          <SubmitButton
            label={t("v2.watch.save")}
            pendingLabel={t("v2.watch.saving")}
            className={buttonClassName}
          />
        </div>
      </form>

      <Link
        href="/discovery/searches"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
      >
        {t("v2.watch.open")}
      </Link>
    </section>
  );
}
