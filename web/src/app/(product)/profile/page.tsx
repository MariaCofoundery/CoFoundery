import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
// Bewusste Wiederverwendung statt Kopie: die Komponente ist generisch, nur ihr
// Name traegt noch das Feature, in dem sie entstanden ist.
import { ConnectSubmitButton as SubmitButton } from "@/features/connect/ConnectSubmitButton";
import {
  deleteCapabilityEvidenceAction,
  saveCapabilityAreasAction,
  saveCapabilityDisclosureAction,
  saveCapabilityEvidenceAction,
  saveCapabilityOwnershipAction,
} from "@/features/capability/capabilityActions";
import { getCapabilityVocabulary, getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import {
  APPLICATION_LEVELS,
  CAPABILITY_DISCLOSURE_LEVELS,
  NARRATIVE_MIN_LENGTH,
  OWNERSHIP_WISHES,
  groupEntriesByFamily,
  isSnapshotStep,
} from "@/features/capability/capabilityTypes";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";
import { getPersonCore } from "@/features/profile/personCoreData";
import { saveIdentityAction } from "@/features/profile/personCoreActions";
import { createClient } from "@/lib/supabase/server";

const field =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";
const primary =
  "min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold";
const secondary = "inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold";

// Muessen mit den Schluesseln in messages/*/capability.json uebereinstimmen.
const SAVED_KEYS = ["snapshot", "evidence_removed", "identity", "disclosure"];
const ERROR_KEYS = ["narrative", "area", "save", "published_incomplete"];
const REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [t, params, vocabulary, entries, core, disclosure, connectProfile, isConnectMember, hasDiscovery] = await Promise.all([
    getTranslations("capability"),
    searchParams,
    getCapabilityVocabulary(supabase),
    getOwnCapabilityEntries(supabase, user.id),
    getPersonCore(supabase, user.id),
    Promise.resolve(supabase.from("person_core").select("capability_disclosure").eq("user_id", user.id).maybeSingle())
      .then(({ data }) => (data?.capability_disclosure as string | undefined) ?? "private")
      .catch(() => "private"),
    // Nur fuer den Hinweis, dass Aenderungen sofort oeffentlich wirken.
    Promise.resolve(supabase.from("network_profiles").select("status").eq("user_id", user.id).maybeSingle())
      .then(({ data }) => data)
      .catch(() => null),
    Promise.resolve(supabase.rpc("is_network_member")).then(({ data }) => data === true).catch(() => false),
    hasFounderDiscoveryAccess(user.id, supabase).catch(() => false),
  ]);

  const step = isSnapshotStep(params.step) ? params.step : null;
  // Nur bekannte Schluessel an t() geben. next-intl wirft bei einem fehlenden
  // Schluessel, ein manipulierter Query-Parameter wuerde die Seite sonst mit
  // einem 500 beenden statt sie nur ohne Hinweis zu rendern.
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const errorKey = ERROR_KEYS.includes(params.error ?? "") ? params.error : null;
  const { families, areas } = vocabulary;
  const areasByFamily = families.map((family) => ({
    family,
    areas: areas.filter((area) => area.family_id === family.family_id),
  }));
  const selectedAreaIds = new Set(entries.map((entry) => entry.area_id));
  const grouped = groupEntriesByFamily(entries, areas, families);
  const areaLabel = (areaId: string) => t(`areaLabels.${areaId}`);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("text")}</p>

      {saved ? (
        <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.${saved}`)}</p>
      ) : null}
      {errorKey ? (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${errorKey}`)}</p>
      ) : null}

      {step ? (
        <ol className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          {(["evidence", "areas", "ownership"] as const).map((name, index) => (
            <li
              key={name}
              className={`rounded-full px-3 py-1 ${step === name ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            >
              {index + 1}. {t(`steps.${name}`)}
            </li>
          ))}
        </ol>
      ) : null}

      {/* Schritt 1: die erzaehlte Sache. Sie ist der Beleg, aus dem die
          Einstufung abgeleitet wird - nicht eine freie Selbstbewertung. */}
      {step === "evidence" ? (
        <form action={saveCapabilityEvidenceAction} className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("evidence.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("evidence.text")}</p>
          </div>
          <label className="block text-sm font-medium">
            {t("evidence.narrativeLabel")}
            <textarea
              required
              name="narrative"
              rows={5}
              minLength={NARRATIVE_MIN_LENGTH}
              maxLength={2000}
              placeholder={t("evidence.narrativePlaceholder")}
              className={field}
            />
            <span className={hint}>{t("evidence.narrativeHint", { min: NARRATIVE_MIN_LENGTH })}</span>
          </label>
          <label className="block text-sm font-medium">
            {t("evidence.areaLabel")}
            <select required name="area_id" defaultValue="" className={field}>
              <option value="" disabled>
                {t("evidence.areaPlaceholder")}
              </option>
              {areasByFamily.map(({ family, areas: familyAreas }) => (
                <optgroup key={family.family_id} label={t(`families.${family.family_id}`)}>
                  {familyAreas.map((area) => (
                    <option key={area.area_id} value={area.area_id}>
                      {areaLabel(area.area_id)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className={hint}>{t("evidence.areaHint")}</span>
          </label>
          <fieldset>
            <legend className="text-sm font-medium">{t("evidence.levelLabel")}</legend>
            <div className="mt-3 grid gap-2">
              {APPLICATION_LEVELS.map((level) => (
                <label key={level} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm">
                  <input type="radio" name="application_level" value={level} />
                  {t(`levels.${level}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton label={t("evidence.submit")} pendingLabel={t("pending.save")} className={primary} />
            <Link href="/profile?step=areas" className="text-sm font-semibold text-slate-600 hover:underline">
              {t("evidence.skip")}
            </Link>
          </div>
        </form>
      ) : null}

      {/* Schritt 2: Familien aufklappen, darunter die Bereiche. Natives
          details/summary - das progressive Aufklappen braucht kein JavaScript. */}
      {step === "areas" ? (
        <form action={saveCapabilityAreasAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("areas.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("areas.text")}</p>
          </div>
          <div className="space-y-3">
            {areasByFamily.map(({ family, areas: familyAreas }) => {
              const selectedInFamily = familyAreas.filter((area) => selectedAreaIds.has(area.area_id)).length;
              return (
                <details
                  key={family.family_id}
                  open={selectedInFamily > 0}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                    {t(`families.${family.family_id}`)}
                    {selectedInFamily > 0 ? <span className="ml-2 text-violet-700">({selectedInFamily})</span> : null}
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {familyAreas.map((area) => (
                      <label
                        key={area.area_id}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="area_id"
                          value={area.area_id}
                          defaultChecked={selectedAreaIds.has(area.area_id)}
                        />
                        {areaLabel(area.area_id)}
                      </label>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("areas.submit")} pendingLabel={t("pending.save")} className={primary} />
            <Link href="/profile?step=evidence" className={secondary}>
              {t("areas.back")}
            </Link>
          </div>
        </form>
      ) : null}

      {/* Schritt 3: Ownership. Bewusst als Verneinung gefragt - das ist die
          Frage, die sonst niemand stellt, und sie klaert spaeter viel. */}
      {step === "ownership" ? (
        <form action={saveCapabilityOwnershipAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("ownership.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("ownership.text")}</p>
          </div>
          {entries.length ? (
            <div className="space-y-3">
              {grouped.map(({ familyId, entries: familyEntries }) => (
                <section key={familyId}>
                  <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                    {t(`families.${familyId}`)}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {familyEntries.map((entry) => (
                      <label key={entry.id} className="block rounded-xl border border-slate-200 p-3 text-sm">
                        <span className="font-medium">{areaLabel(entry.area_id)}</span>
                        <select
                          name={`ownership_${entry.area_id}`}
                          defaultValue={entry.ownership_wish ?? ""}
                          className={field}
                        >
                          <option value="">{t("ownershipWishes.unset")}</option>
                          {OWNERSHIP_WISHES.map((wish) => (
                            <option key={wish} value={wish}>
                              {t(`ownershipWishes.${wish}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">{t("ownership.noEntries")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("ownership.submit")} pendingLabel={t("pending.save")} className={primary} />
            <Link href="/profile?step=areas" className={secondary}>
              {t("ownership.back")}
            </Link>
          </div>
        </form>
      ) : null}

      {/* Ergebnis. Es entsteht direkt nach dem ersten Schritt, damit der Nutzen
          nicht davon abhaengt, dass jemand alles ausfuellt. */}
      {/* Identitaet. Der eine Ort, an dem sie bearbeitet wird - der Trigger aus
          20260907180000 verteilt sie in Basis-, Discovery- und Connect-Profil. */}
      {step === null ? (
        <form action={saveIdentityAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("identity.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("identity.text")}</p>
          </div>
          {connectProfile?.status === "active" ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("identity.publishedNote")}</p>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("identity.name")}
              <input name="display_name" maxLength={80} defaultValue={core?.display_name ?? ""} className={field} />
            </label>
            <label className="text-sm font-medium">
              {t("identity.headline")}
              <input name="headline" maxLength={160} defaultValue={core?.headline ?? ""} className={field} />
              <span className={hint}>{t("identity.headlineHint")}</span>
            </label>
          </div>
          <label className="block text-sm font-medium">
            {t("identity.bio")}
            <textarea name="bio" rows={4} maxLength={1200} defaultValue={core?.bio ?? ""} className={field} />
            <span className={hint}>{t("identity.bioHint")}</span>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("identity.region")}
              <input name="location_region" maxLength={120} defaultValue={core?.location_region ?? ""} className={field} />
              <span className={hint}>{t("identity.regionHint")}</span>
            </label>
            <label className="text-sm font-medium">
              {t("identity.remote")}
              <select name="remote_mode" defaultValue={core?.remote_mode ?? ""} className={field}>
                <option value="">{t("identity.remoteUnset")}</option>
                {REMOTE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`remoteModes.${mode}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("identity.expertise")}
              <input name="expertise" defaultValue={(core?.expertise ?? []).join(", ")} className={field} />
              <span className={hint}>{t("identity.expertiseHint", { max: 8 })}</span>
            </label>
            <label className="text-sm font-medium">
              {t("identity.industries")}
              <input name="industries" defaultValue={(core?.industries ?? []).join(", ")} className={field} />
              <span className={hint}>{t("identity.industriesHint", { max: 5 })}</span>
            </label>
          </div>
          <SubmitButton label={t("identity.submit")} pendingLabel={t("pending.save")} className={primary} />
        </form>
      ) : null}

      {step === null ? (
        <section className="mt-8">
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-sm leading-6 text-slate-600">{t("summary.empty")}</p>
              <Link href="/profile?step=evidence" className={`${primary} mt-5 inline-flex items-center`}>
                {t("summary.start")}
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ familyId, entries: familyEntries }) => (
                <article key={familyId} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="text-lg font-semibold">{t(`families.${familyId}`)}</h2>
                  <ul className="mt-4 space-y-4">
                    {familyEntries.map((entry) => (
                      <li key={entry.id}>
                        <p className="font-medium">{areaLabel(entry.area_id)}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {t("levels.label")}: {entry.application_level ? t(`levels.${entry.application_level}`) : t("levels.unset")}
                          {" · "}
                          {t("ownershipWishes.label")}:{" "}
                          {entry.ownership_wish ? t(`ownershipWishes.${entry.ownership_wish}`) : t("ownershipWishes.unset")}
                        </p>
                        {entry.evidence.length ? (
                          <ul className="mt-3 space-y-2">
                            {entry.evidence.map((evidence) => (
                              <li key={evidence.id} className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                <p className="whitespace-pre-wrap">{evidence.narrative}</p>
                                <form action={deleteCapabilityEvidenceAction} className="mt-2">
                                  <input type="hidden" name="evidence_id" value={evidence.id} />
                                  <SubmitButton
                                    label={t("summary.removeEvidence")}
                                    pendingLabel={t("pending.save")}
                                    className="text-xs font-semibold text-slate-500 underline underline-offset-2"
                                  />
                                </form>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {t("summary.incompleteNote")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/profile?step=evidence" className={`${primary} inline-flex items-center`}>
                  {t("summary.edit")}
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* Die Freigabe. Eigener Abschnitt, weil es eine eigene Entscheidung ist:
          was ich eingetragen habe und wie weit ich es weitergebe sind zwei
          Fragen. Erscheint nur, wenn es ueberhaupt etwas freizugeben gibt. */}
      {step === null && entries.length > 0 ? (
        <form action={saveCapabilityDisclosureAction} className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold">{t("disclosure.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("disclosure.text")}</p>
          </div>
          <div className="grid gap-3">
            {CAPABILITY_DISCLOSURE_LEVELS.map((level) => (
              <label key={level} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="radio"
                  name="capability_disclosure"
                  value={level}
                  defaultChecked={disclosure === level}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold">{t(`disclosure.${level}`)}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{t(`disclosure.${level}Hint`)}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("disclosure.note")}</p>
          <SubmitButton label={t("disclosure.submit")} pendingLabel={t("pending.save")} className={primary} />
        </form>
      ) : null}

      {/* Rueckverweise in die Kontexte. Hier stehen Inhalte, dort wird
          entschieden, was davon wo gezeigt wird. */}
      {step === null && (isConnectMember || hasDiscovery) ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-sm font-semibold">{t("contexts.title")}</h2>
          <p className={hint}>{t("contexts.text")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {hasDiscovery ? (
              <Link href="/discovery/profile" className={secondary}>
                {t("contexts.discovery")}
              </Link>
            ) : null}
            {isConnectMember ? (
              <Link href="/connect/profile" className={secondary}>
                {t("contexts.connect")}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
