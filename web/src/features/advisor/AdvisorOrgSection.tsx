import { getTranslations } from "next-intl/server";
import { createAdvisorOrgAction, updateAdvisorOrgProfileAction } from "@/features/advisor/orgActions";
import { OrgMembersPanel } from "@/features/advisor/OrgMembersPanel";
import type { AdvisorOrg, OrgInviteSuggestion, OrgMember, OrgOpenInvite } from "@/features/advisor/orgData";
import type { OrgActionErrorCode } from "@/features/advisor/orgErrors";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die Organisation - anlegen, Menschen aufnehmen, sehen wen man begleitet.
 *
 * DER GESAMMELTE BEREICH steht hier unten: die Menschen, die zugestimmt
 * haben, und daneben, was bei ihnen noch offen ist. Getrennt, weil eine Liste,
 * die Angefragte und Begleitete vermischt, dazu einlädt, eine Anfrage für eine
 * Zusage zu halten.
 *
 * ES STEHEN KEINE NAMEN DARIN. Ein Advisor sieht, WEN er begleitet, sobald er
 * die Person öffnet - die Liste selbst arbeitet mit dem, was jede Zeile
 * ohnehin trägt. Namen hier zu zeigen hieße, sie für Menschen zu laden, die
 * vielleicht nur "Wer du bist" freigegeben haben.
 */
export async function AdvisorOrgSection({
  orgs,
  members,
  openInvites = [],
  suggestions = [],
  error = null,
  saved = false,
  part = "all",
}: {
  orgs: AdvisorOrg[];
  members: OrgMember[];
  /** Eingeladen, aber noch nicht beigetreten: damit man sieht, dass die Einladung angekommen ist oder noch aussteht. */
  openInvites?: OrgOpenInvite[];
  /** Vorschlaege fuer Einladungen (Advisor schlaegt vor, Admin/Koordination entscheiden). */
  suggestions?: OrgInviteSuggestion[];
  /** Phase 12C.1C: Rueckmeldung einer Org-Aktion (`?orgError=`). */
  error?: OrgActionErrorCode | null;
  /** Gespeichert (`?saved=1`) - vorher sagte die Seite nach dem Speichern nichts. */
  saved?: boolean;
  /** Die Organisationsseite zeigt Mitglieder und Profil getrennt; ohne Angabe steht alles zusammen. */
  part?: "all" | "members" | "profile";
}) {
  const t = await getTranslations("advisor.org");
  const org = orgs[0] ?? null;
  const showHeader = part === "all";
  const showProfile = part === "all" || part === "profile";
  const showMembers = part === "all" || part === "members";

  return (
    <section id="advisor-org" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      {showHeader ? (
        <>
          <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
          {t(`errors.${error}`)}
        </p>
      ) : saved ? (
        <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          {t("saved")}
        </p>
      ) : null}

      {org === null ? (
        <form action={createAdvisorOrgAction} className="mt-5">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
              {t("nameLabel")}
            </span>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={120}
              className="mt-1 min-h-11 w-full max-w-md rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>
          <SubmitButton
            label={t("create")}
            pendingLabel={t("pending")}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          />
        </form>
      ) : (
        <>
          {showHeader ? <p className="mt-4 break-words text-sm font-medium text-slate-900">{org.name}</p> : null}
          {org.status === "suspended" ? (
            <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {t("suspended")}
            </p>
          ) : null}

          {/* --------------------------------------------------------------
              Das Profil der Organisation.

              ES STEHT HIER NICHT ZUR ZIERDE. Genau diese Angaben liest eine
              Person, die um die Freigabe ihres Profils gebeten wird - vorher
              sah sie dort nicht einmal einen Namen. Der Hinweis darüber sagt
              das, damit niemand das Feld für Innendekoration hält.

              NUR DIE FÜHRUNG. Ein Advisor arbeitet im Namen der Organisation,
              er bestimmt aber nicht, was sie über sich sagt. Die Regel steht
              in der Datenbank; hier wird das Formular nur nicht gezeigt.
              -------------------------------------------------------------- */}
          {showProfile && org.rights.profile && org.status === "active" ? (
            <details open={part === "profile"} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-slate-800">
                {t("profileTitle")}
              </summary>
              <form action={updateAdvisorOrgProfileAction} className="grid gap-3 px-4 pb-4">
                <input type="hidden" name="orgId" value={org.id} />
                <p className="text-xs leading-5 text-slate-600">{t("profileText")}</p>

                <label className="block">
                  <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                    {t("nameLabel")}
                  </span>
                  <input
                    name="name"
                    defaultValue={org.name}
                    maxLength={120}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                    {t("profileDescriptionLabel")}
                  </span>
                  <textarea
                    name="description"
                    defaultValue={org.description ?? ""}
                    rows={3}
                    maxLength={1200}
                    placeholder={t("profileDescriptionPlaceholder")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                      {t("profileWebsiteLabel")}
                    </span>
                    <input
                      name="websiteUrl"
                      type="url"
                      defaultValue={org.websiteUrl ?? ""}
                      maxLength={300}
                      placeholder="https://"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                      {t("profileRegionLabel")}
                    </span>
                    <input
                      name="locationRegion"
                      defaultValue={org.locationRegion ?? ""}
                      maxLength={120}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                    {t("profileFocusLabel")}
                  </span>
                  <input
                    name="focus"
                    defaultValue={org.focus.join(", ")}
                    placeholder={t("profileFocusPlaceholder")}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <SubmitButton
                  label={t("profileSave")}
                  pendingLabel={t("pending")}
                  className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                />
              </form>
            </details>
          ) : showProfile && part === "profile" ? (
            // Leseansicht fuer Mitglieder, die nicht fuehren - vorher war der Reiter fuer sie leer.
            <dl className="advisor-card mt-4 grid gap-3 p-5 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
              {[
                [t("profileDescriptionLabel"), org.description],
                [t("profileWebsiteLabel"), org.websiteUrl],
                [t("profileRegionLabel"), org.locationRegion],
                [t("profileFocusLabel"), org.focus.join(", ")],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="font-semibold text-slate-700">{label}</dt>
                  <dd className="break-words text-slate-800">{value || "–"}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {showMembers ? <OrgMembersPanel org={org} members={members} openInvites={openInvites} suggestions={suggestions} /> : null}
        </>
      )}
    </section>
  );
}
