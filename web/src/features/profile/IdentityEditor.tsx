import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConnectSubmitButton as SubmitButton } from "@/features/connect/ConnectSubmitButton";
import { ANALYZED_AREA_IDS } from "@/features/capability/narrativeAnalysis";
import { CvImportField } from "@/features/profile/CvImportField";
import { CV_INDUSTRY_KEYS } from "@/features/profile/cvIndustries";
import { IDENTITY_THRESHOLDS, type IdentityGap, type IdentityReturnPath } from "@/features/profile/identityReadiness";
import { LinkedInField } from "@/features/profile/LinkedInField";
import { isLinkedInVisibility } from "@/features/profile/linkedInVisibility";
import { saveIdentityAction } from "@/features/profile/personCoreActions";
import type { PersonCore } from "@/features/profile/personCoreData";
import { PhotoUsagePanel } from "@/features/profile/PhotoUsagePanel";
import type { PhotoUsage } from "@/features/profile/photoUsageData";
import { ProfilePhotoField } from "@/features/profile/ProfilePhotoField";
import { PROFILE_ROLE_OPTIONS, type ProfileRole } from "@/features/profile/profileRoles";

const REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;
const field =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";
const primary = "min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold";
const secondary = "inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold";

/**
 * Die Identitaet - Foto, Name, Headline, Bio, Ort, Remote, Expertise, Branchen,
 * LinkedIn, Rollen - EINMAL geschrieben, ueberall dort bearbeitbar, wo sie
 * angezeigt wird (Profil, FIND, Connect).
 *
 * `inline`: Das Formular steht auf der Seite, von der man kommt (`returnPath`);
 * Speichern fuehrt dorthin zurueck, ohne Umweg ueber `/profile`.
 */
export async function IdentityEditor({
  core,
  currentRoles,
  returnPath,
  inline = false,
  identityGaps,
  showGaps,
  connectActive,
  avatarId,
  avatarUrl,
  showPhoto = true,
  photoUsage = null,
}: {
  core: PersonCore | null;
  currentRoles: ProfileRole[];
  returnPath: IdentityReturnPath | null;
  inline?: boolean;
  identityGaps: IdentityGap[];
  showGaps: boolean;
  connectActive: boolean;
  avatarId: string | null | undefined;
  avatarUrl: string | null | undefined;
  showPhoto?: boolean;
  photoUsage?: PhotoUsage | null;
}) {
  const t = await getTranslations("capability");
  return (
    <>
        {showPhoto ? (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <ProfilePhotoField
            displayName={core?.display_name?.trim() || ""}
            avatarId={avatarId ?? null}
            avatarUrl={avatarUrl ?? null}
            copy={{
              title: t("identity.photo.title"),
              help: t("identity.photo.help"),
              add: t("identity.photo.add"),
              change: t("identity.photo.change"),
              chooseIllustration: t("identity.photo.chooseIllustration"),
              closeIllustrations: t("identity.photo.closeIllustrations"),
              remove: t("identity.photo.remove"),
              save: t("identity.photo.save"),
              pending: t("pending.save"),
              preview: t("identity.photo.preview"),
            }}
          />
        {photoUsage ? (
            <PhotoUsagePanel
              usage={photoUsage}
              displayName={core?.display_name?.trim() || ""}
              avatarId={avatarId ?? null}
              avatarUrl={avatarUrl ?? null}
              returnPath={inline ? returnPath : null}
            />
          ) : null}
        </section>
      ) : null}
        <form action={saveIdentityAction} className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          {/* Reist mit, damit das Speichern zurueckfuehrt, wo es hergekommen
              ist - siehe parseIdentityReturnPath fuer die Allowlist. */}
          {returnPath ? <input type="hidden" name="next" value={returnPath} /> : null}
          {inline ? <input type="hidden" name="inline" value="1" /> : null}
          <div>
            <h2 className="text-xl font-semibold">{t("identity.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("identity.text")}</p>
          </div>
          {/* Was zum Veroeffentlichen noch fehlt, steht dort, wo man es
              aendert. Vorher stand es nur dort, wo es abgewiesen wurde -
              man speicherte erfolgreich und scheiterte eine Seite spaeter,
              ohne zu erfahren, an welcher Angabe. */}
          {identityGaps.length > 0 && showGaps ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-900">{t("identity.publishTitle")}</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {identityGaps.map((gap) => (
                  <li key={gap}>
                    · {t(`identity.gaps.${gap}`, { min: IDENTITY_THRESHOLDS[gap] })}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-5 text-amber-900/80">{t("identity.publishNote")}</p>
            </div>
          ) : null}
          {connectActive ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("identity.publishedNote")}</p>
          ) : null}
          {/* Das Bild selbst wird im Schritt "Bild" gewaehlt; hier steht die
              Frage, wer es sehen darf. Sie gehoert zur Identitaet, nicht in
              einen eigenen Abschnitt - es ist dieselbe Entscheidung wie Name
              und Headline, nur fuer das Gesicht. */}
          {/* DREI KLEINE GRUPPEN STATT EINES LANGEN FORMULARS.

              Elf Felder untereinander sind ein Antrag. Die Gruppen beantworten
              je eine Frage - wer du bist, wo und wie du arbeitest, woran -,
              und man kann eine davon ausfuellen und aufhoeren.

              `fieldset`/`legend` und nicht `div`/`h3`: Dieselbe Gliederung,
              die man sieht, hoert auch, wer das Formular vorgelesen bekommt. */}
          <fieldset className="space-y-5 border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
              {t("aboutYou.groups.who")}
            </legend>

          

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
          </fieldset>

          <fieldset className="space-y-5 border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
              {t("aboutYou.groups.where")}
            </legend>
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
          </fieldset>

          <fieldset className="space-y-5 border-t border-slate-200 pt-5">
            <legend className="text-sm font-semibold text-slate-900">
              {t("aboutYou.groups.what")}
            </legend>
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

          {/* Direkt unter den beiden Feldern, die es fuellt - und eingeklappt,
              weil es eine Abkuerzung ist und kein Schritt. Wer die Felder
              lieber selbst ausfuellt, soll nicht daran vorbei muessen.

              Die Beschriftungen werden hier aufgeloest, weil CvImportField
              eine Client-Komponente ist: Eine Uebersetzungsfunktion laesst sich
              nicht ueber die Grenze reichen. */}
          <CvImportField
            expertiseLabels={Object.fromEntries(
              ANALYZED_AREA_IDS.map((areaId) => [areaId, t(`areaLabels.${areaId}`)])
            )}
            industryLabels={Object.fromEntries(
              CV_INDUSTRY_KEYS.map((key) => [key, t(`industryLabels.${key}`)])
            )}
            copy={{
              title: t("identity.cv.title"),
              betaBadge: t("identity.cv.betaBadge"),
              betaNote: t("identity.cv.betaNote"),
              text: t("identity.cv.text"),
              privacyNote: t("identity.cv.privacyNote"),
              textareaLabel: t("identity.cv.textareaLabel"),
              placeholder: t("identity.cv.placeholder"),
              fileLabel: t("identity.cv.fileLabel"),
              analyze: t("identity.cv.analyze"),
              tooShort: t("identity.cv.tooShort"),
              nothingFound: t("identity.cv.nothingFound"),
              nothingFoundHint: t("identity.cv.nothingFoundHint"),
              expertiseTitle: t("identity.cv.expertiseTitle"),
              industriesTitle: t("identity.cv.industriesTitle"),
              because: t("identity.cv.because"),
              apply: t("identity.cv.apply"),
              applied: t("identity.cv.applied"),
              clear: t("identity.cv.clear"),
              chosenCount: t("identity.cv.chosenCount"),
              fileUnsupported: t("identity.cv.fileUnsupported"),
            }}
          />
          </fieldset>

          {/* Das LinkedIn-Profil steht hier und nicht in einem eigenen
              Bereich: Es ist dieselbe Art Angabe wie Name und Headline - eine
              Eigenschaft des Menschen, nicht eines Produktbereichs. Deshalb
              wird sie einmal eingetragen und gilt ueberall.

              Die Texte werden hier aufgeloest, weil LinkedInField eine
              Client-Komponente ist: Eine Uebersetzungsfunktion laesst sich
              nicht als Prop ueber die Grenze reichen - das hat in dieser
              Codebasis schon zweimal die Produktion lahmgelegt. */}
          <LinkedInField
            initialUrl={core?.linkedin_url ?? ""}
            initialVisibility={
              isLinkedInVisibility(core?.linkedin_visibility) ? core.linkedin_visibility : "private"
            }
            copy={{
              title: t("identity.linkedin.title"),
              urlLabel: t("identity.linkedin.urlLabel"),
              urlPlaceholder: t("identity.linkedin.urlPlaceholder"),
              urlHint: t("identity.linkedin.urlHint"),
              urlInvalid: t("identity.linkedin.urlInvalid"),
              visibilityTitle: t("identity.linkedin.visibilityTitle"),
              options: {
                private: {
                  label: t("identity.linkedin.options.private.label"),
                  hint: t("identity.linkedin.options.private.hint"),
                },
                contacts: {
                  label: t("identity.linkedin.options.contacts.label"),
                  hint: t("identity.linkedin.options.contacts.hint"),
                },
              },
            }}
          />
          {/* Rollen sind eine Navigationsangabe, keine Berechtigung: Wer
              "Advisor" anhakt, sieht das Advisor-Dashboard - was darauf steht,
              entscheidet weiterhin RLS ueber advisor_user_id. Deshalb darf das
              hier aenderbar sein.

              Nur sichtbar fuer Menschen, die schon eine dieser Rollen haben.
              Einem Connect-Konto hier "Founder" anzubieten waere eine
              Selbstfreischaltung ins Founder-Produkt und damit eine
              Produktentscheidung, nicht ein Formularfeld. */}
          {currentRoles.length > 0 ? (
            <fieldset id="roles" className="scroll-mt-24">
              <legend className="text-sm font-medium">{t("identity.rolesLegend")}</legend>
              <p className={hint}>{t("identity.rolesHint")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PROFILE_ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={role}
                      defaultChecked={currentRoles.includes(role)}
                    />
                    {t(`identity.roles.${role}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("identity.submit")} pendingLabel={t("pending.save")} className={primary} />
            {/* Der Weg zurueck, wenn Connect oder Discovery hierher geschickt
                hat. Ohne ihn war die Identitaetsseite eine Sackgasse. */}
            {returnPath ? (
              <Link href={returnPath} className={secondary}>
                {t(`identity.backTo.${returnPath === "/connect/profile" ? "connect" : "discovery"}`)}
              </Link>
            ) : null}
          </div>
        </form>
    </>
  );
}
