import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectProfile } from "@/features/connect/connectData";
import { saveConnectProfileAction } from "@/features/connect/connectActions";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { CONNECT_CONTACT_NOTE_MAX, CONNECT_CONTACT_NOTE_MIN, CONNECT_OPEN_TO_FORMATS, CONNECT_REACH_MAX, CONNECT_REACH_MIN, CONNECT_ROLES } from "@/features/connect/connectTypes";
import { IdentityInlineCard } from "@/features/profile/IdentityInlineCard";
import { ConnectCardFlow } from "@/features/connect/ConnectCardFlow";
import { getIdentityGaps } from "@/features/profile/identityReadiness";
import { getPersonCore } from "@/features/profile/personCoreData";
import { ConnectVisibilityField } from "@/features/connect/ConnectVisibilityField";
import { ResourceProposalSection } from "@/features/ai/ResourceProposalSection";
import { getOwnPersonResources } from "@/features/ai/personResources";

const hint = "mt-1 block text-xs leading-5 text-slate-500";
const field =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

// Nur bekannte Schluessel an t() geben. Ein erfundener Query-Parameter wuerde
// sonst als roher Schluesselpfad auf der Seite landen - next-intl wirft bei
// einem fehlenden Schluessel nicht, es loggt und rendert den Pfad selbst.
// Muessen mit messages/*/connect.json uebereinstimmen; ein Test vergleicht
// beide.
const SAVED_KEYS = ["draft", "published"];
const ERROR_KEYS = [
  "identity_incomplete",
  "roles_missing",
  "incomplete",
  "public_confirmation",
  "photo_reuse",
  "photo_upload",
  "save",
];

export default async function ConnectProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("connect"); const { client, user } = await requireConnectMember("/connect/profile");
  const [profile, params, resources, core, tCap] = await Promise.all([getOwnConnectProfile(client, user.id), searchParams, getOwnPersonResources(client), getPersonCore(client, user.id).catch(() => null), getTranslations("capability")]);
  // Name, Headline und Text ueber dich kommen aus dem Kernprofil, nicht aus diesem Formular.
  const identityGaps = getIdentityGaps(core);
  const continuation = params.next?.startsWith("/connect") && !params.next.includes("\\") && !params.next.startsWith("//") ? params.next : "";
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const errorKey = ERROR_KEYS.includes(params.error ?? "") ? params.error : null;
  return <main className="mx-auto max-w-4xl px-5 py-10">
    <Link href="/connect/my" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("mine.back")}</Link>
    <header className="brand-panel mt-3 rounded-[24px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-white">{t("eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{t("profile.title")}</h1>
        </div>
        {/* Der Zustand, der gilt - als Marke an der Kopfzeile. */}
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${profile?.status === "active" ? "bg-emerald-100 text-emerald-900" : "bg-white/90 text-slate-800"}`}>
          <span aria-hidden className={`h-2 w-2 rounded-full ${profile?.status === "active" ? "bg-emerald-600" : "bg-slate-400"}`} />
          {t(`profile.flow.status.${profile?.status === "active" ? "active" : "draft"}`)}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white">{t("profile.text")}</p>
    </header>
    {params.returned === "1" ? <p role="status" className="my-4 rounded-xl bg-slate-50 p-4">{t("lifecycle.returnHint")}</p> : null}
    {saved ? <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.profile.${saved}`)}</p> : null}
    {errorKey ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${errorKey}`)}</p> : null}
    {/* Die Identitaet (Name, Headline, Bio, Ort, ...) steht einmal im Profil und ist hier direkt bearbeitbar -
        ausserhalb dieses Formulars, weil Formulare sich nicht verschachteln lassen. */}
    <IdentityInlineCard client={client} userId={user.id} returnPath="/connect/profile" params={params} />
    <form action={saveConnectProfileAction} noValidate className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      {continuation ? <input type="hidden" name="next" value={continuation} /> : null}
      <ConnectCardFlow
        initialStep={saved || errorKey ? 3 : 0}
        identityGaps={identityGaps}
        cards={[
          { id: "role", node: (
            <div className="grid gap-4">
      <h2 className="text-xl font-semibold text-slate-950">{t("profile.flow.rolesQ")}</h2>
      <fieldset className="mt-3">
        <legend className="sr-only">{t("profile.roles")}</legend>
        <p className={hint}>{t("profile.rolesHint")}</p>
        <div className="mt-3 grid gap-2.5">
          {CONNECT_ROLES.map((role) => (
            <label key={role} className="group relative flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500">
              <span className="text-[0.95rem] font-semibold text-slate-950">{t(`roles.${role}`)}</span>
              <input type="checkbox" name="network_roles" value={role} defaultChecked={profile?.network_roles.includes(role)} className="peer sr-only" />
              <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-slate-300 text-transparent transition peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:text-white">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-sm font-semibold">{t("ventures.profileLink")}</h2>
        <p className={hint}>{t("ventures.profileLinkHint")}</p>
        <Link
          href="/connect/ventures/mine"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
        >
          {t("ventures.title")} →
        </Link>
      </section>

            </div>
          ) },
          { id: "reach", node: (
            <div className="grid gap-4">
      <label className="block text-sm font-medium">
        <span className="block text-xl font-semibold text-slate-950">{t("profile.flow.reachQ")}</span>
        <textarea
          name="network_reach"
          rows={3}
          minLength={CONNECT_REACH_MIN}
          maxLength={CONNECT_REACH_MAX}
          defaultValue={profile?.network_reach ?? ""}
          className={field}
          placeholder={t("profile.reachPlaceholder")}
        />
        <span className={hint}>{t("profile.reachHint")}</span>
        {/* Abgesetzt, weil es keine Bitte um Stil ist, sondern um die Rechte
            Dritter: Wer hier Namen nennt, traegt Angaben ueber Menschen ein,
            die davon nichts wissen. */}
        <span className="mt-2 block rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {t("profile.reachNoNames")}
        </span>
      </label>

            </div>
          ) },
          { id: "open", node: (
            <div className="grid gap-5">
      <fieldset>
        <legend className="text-xl font-semibold text-slate-950">{t("profile.flow.openQ")}</legend>
        <p className={hint}>{t("profile.openToHint")}</p>
        <div className="mt-3 grid gap-2.5">
          {CONNECT_OPEN_TO_FORMATS.map((format) => (
            <label
              key={format}
              className="relative flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-300 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500"
            >
              <input
                type="checkbox"
                name="open_to_formats"
                value={format}
                defaultChecked={profile?.open_to_formats?.includes(format)}
                className="peer sr-only"
              />
              <span>{t(`profile.openTo.${format}`)}</span>
              <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-slate-300 text-transparent transition peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:text-white"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium">
        {t("profile.contactNoteTitle")}
        <input
          name="contact_note"
          minLength={CONNECT_CONTACT_NOTE_MIN}
          maxLength={CONNECT_CONTACT_NOTE_MAX}
          defaultValue={profile?.contact_note ?? ""}
          className={field}
          placeholder={t("profile.contactNotePlaceholder")}
        />
        <span className={hint}>{t("profile.contactNoteHint")}</span>
      </label>

            </div>
          ) },
        ]}
        showNode={(
          <div className="grid gap-4">
      <ConnectVisibilityField initial={profile?.visibility} copy={{
        title: t("visibility.profileTitle"), membersOnly: t("visibility.membersOnly"), public: t("visibility.public"),
        publicHint: t("visibility.profilePublicHint"), confirm: t("visibility.profileConfirm"),
        previewTitle: t("visibility.publicFields"), previewItems: t("visibility.profileFields"),
      }} />
      {profile?.visibility === "public" && profile.status === "active" ? <Link href={`/connect/p/${profile.public_slug}`} className="inline-flex min-h-11 items-center font-semibold text-violet-800 hover:underline">{t("visibility.openPublicPage")}</Link> : null}
      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium">{t("profile.suggestableTitle")}</legend>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="suggestable"
            value="yes"
            defaultChecked={profile?.suggestable ?? true}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-medium text-slate-900">{t("profile.suggestableLabel")}</span>
            <span className="mt-1 block leading-6 text-slate-600">{t("profile.suggestableHint")}</span>
          </span>
        </label>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("profile.suggestableOffHint")}</p>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium">{t("profile.highlightableTitle")}</legend>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="highlightable"
            value="yes"
            defaultChecked={profile?.highlight_prompt_answered_at ? profile.highlightable : true}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-medium text-slate-900">{t("profile.highlightableLabel")}</span>
            <span className="mt-1 block leading-6 text-slate-600">{t("profile.highlightableHint")}</span>
          </span>
        </label>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("profile.highlightableOffHint")}</p>
      </fieldset>

      <p className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        {t("profile.membersOnlyNote")}
      </p>

      <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("profile.consent")} <Link href="/datenschutz" className="font-semibold underline underline-offset-2">{t("profile.privacyLink")}</Link></p>
          </div>
        )}
        draftNode={profile?.status !== "active" ? <ConnectSubmitButton intent="draft" label={t("actions.saveDraft")} pendingLabel={t("pending.save")} className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold" /> : null}
        publishNode={<ConnectSubmitButton intent="publish" label={t(profile?.status === "active" ? "actions.save" : "profile.publish")} pendingLabel={t("pending.publish")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold" />}
        copy={{
          back: t("profile.flow.back"),
          next: t("profile.flow.next"),
          stepOf: t("profile.flow.stepOf", { current: "{current}", total: "{total}" }),
          cardTitles: { role: t("profile.flow.titles.role"), reach: t("profile.flow.titles.reach"), open: t("profile.flow.titles.open"), show: t("profile.flow.titles.show") },
          showTitle: t("profile.flow.showTitle"),
          missingTitle: t("profile.flow.missingTitle"),
          missingNote: t("profile.flow.missingNote"),
          allSet: t("profile.flow.allSet"),
          fix: t("profile.flow.fix"),
          identityFix: t("profile.flow.identityFix"),
          roleMissing: t("profile.flow.roleMissing"),
          identityLabels: {
            displayName: tCap("identity.gaps.displayName", { min: 2 }),
            headline: tCap("identity.gaps.headline", { min: 3 }),
            bio: tCap("identity.gaps.bio", { min: 20 }),
          },
        }}
      />
    </form>

    {/* Die Zugaenge stehen NEBEN dem Formular und nicht darin: Sie sind keine
        Angabe, die man abschickt, sondern eine Entscheidung je Vorschlag. */}
    <ResourceProposalSection proposals={resources} />
  </main>;
}
