import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  createAdvisorOrgAction,
  updateAdvisorOrgProfileAction,
  inviteOrgAdvisorAction,
  setOrgMembershipAction,
  leaveOrgAction,
} from "@/features/advisor/orgActions";
import type { AccompaniedPersonNamed, AdvisorOrg, OrgMember } from "@/features/advisor/orgData";
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
  accompanied,
}: {
  orgs: AdvisorOrg[];
  members: OrgMember[];
  accompanied: AccompaniedPersonNamed[];
}) {
  const t = await getTranslations("advisor.org");
  const org = orgs[0] ?? null;

  return (
    <section id="advisor-org" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

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
          <p className="mt-4 text-sm font-medium text-slate-900">{org.name}</p>

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
          {org.role === "owner" ? (
            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60">
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
          ) : null}

          {org.role === "owner" ? (
            <form action={inviteOrgAdvisorAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="orgId" value={org.id} />
              <label className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("inviteLabel")}
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>
              <SubmitButton
                label={t("invite")}
                pendingLabel={t("pending")}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              />
            </form>
          ) : null}

          <ul className="mt-5 space-y-2">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <span className="text-slate-800">
                  {t(`roles.${member.role}`)}
                  {member.status === "revoked" ? ` · ${t("revoked")}` : ""}
                </span>
                {org.role === "owner" && member.status === "active" ? (
                  <form action={setOrgMembershipAction}>
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="userId" value={member.userId} />
                    <input type="hidden" name="status" value="revoked" />
                    <SubmitButton
                      label={t("removeMember")}
                      pendingLabel={t("pending")}
                      className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                    />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Phase 12C.1B: selbst gehen. Die letzte Inhaberin bekommt statt des
              Knopfs den Hinweis - die Datenbank wuerde es ohnehin ablehnen. */}
          {org.role === null ? null : org.role === "owner" &&
          members.filter((member) => member.role === "owner" && member.status === "active").length <= 1 ? (
            <p className="mt-4 text-xs leading-6 text-slate-500">{t("leaveLastOwner")}</p>
          ) : (
            <form action={leaveOrgAction} className="mt-4">
              <input type="hidden" name="orgId" value={org.id} />
              <SubmitButton
                label={t("leave")}
                pendingLabel={t("pending")}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              />
            </form>
          )}

          {/* WAS EINE MITGLIEDSCHAFT BEDEUTET - dort, wo sie vergeben wird. */}
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
            {t("membershipMeaning")}
          </p>
        </>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">{t("peopleTitle")}</h3>
          {/* Zwei Menschen sind das Minimum fuer eine Aufstellung - darunter
              waere der Link ein Weg auf eine Seite, die nichts zeigen kann. */}
          {accompanied.filter((person) => person.scopes.includes("capability")).length >= 2 ? (
            <Link
              href="/advisor/group"
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
            >
              {t("groupLink")}
            </Link>
          ) : null}
        </div>
        {accompanied.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("peopleEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accompanied.map((person) => (
              <li
                key={person.subjectUserId}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                {/* Der Weg zur Ansicht steht nur da, wenn ueberhaupt etwas
                    freigegeben ist - ein Link auf eine Seite, die nichts
                    zeigen darf, ist kein Weg. */}
                {/* DER NAME STEHT VORN, seit 26.09.2026. Vorher stand hier
                    "3 Bereiche freigegeben" - eine Liste namenloser Zeilen.
                    Der Name ist selbst eine Freigabe: Wer nur seine
                    Faehigkeiten freigegeben hat, bleibt namenlos, und das
                    steht dann da statt einer Kennung. */}
                {person.scopes.length > 0 ? (
                  <Link
                    href={`/advisor/person/${person.subjectUserId}`}
                    className="font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    {person.name ?? t("personUnnamed")}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">
                    {person.name ?? t("personUnnamed")}
                  </span>
                )}
                <span className="ml-2 text-slate-500">
                  {t("personScopes", { count: person.scopes.length })}
                </span>
                {person.pendingScopes.length > 0 ? (
                  <span className="ml-2 text-slate-500">
                    {t("personPending", { count: person.pendingScopes.length })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
