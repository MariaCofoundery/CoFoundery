import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectProfile } from "@/features/connect/connectData";
import { DoorsSection } from "@/features/connect/doors/DoorsSection";
import { listOwnDoors } from "@/features/connect/doors/doorsData";
import { saveConnectProfileAction } from "@/features/connect/connectActions";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { CONNECT_CONTACT_NOTE_MAX, CONNECT_CONTACT_NOTE_MIN, CONNECT_OPEN_TO_FORMATS, CONNECT_ROLES } from "@/features/connect/connectTypes";
import { IdentityInlineCard } from "@/features/profile/IdentityInlineCard";
import { ConnectCardFlow } from "@/features/connect/ConnectCardFlow";
import { getConnectIdentityGaps } from "@/features/profile/identityReadiness";
import { ConnectFirstProfile } from "@/features/connect/ConnectFirstProfile";
import { getPersonCore } from "@/features/profile/personCoreData";
import { ConsentSwitch } from "@/features/connect/ConsentSwitch";
import { ConnectProfilePreview } from "@/features/connect/ConnectProfilePreview";
import { ConnectVisibilityField } from "@/features/connect/ConnectVisibilityField";
import { ResourceProposalSection } from "@/features/ai/ResourceProposalSection";
import { getOwnPersonResources } from "@/features/ai/personResources";
import { AreaPayoff } from "@/features/onboarding/AreaPayoff";
import { ReminderAskSlot } from "@/features/onboarding/ReminderAskSlot";

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
  const [profile, params, resources, core, tCap, doors] = await Promise.all([getOwnConnectProfile(client, user.id), searchParams, getOwnPersonResources(client), getPersonCore(client, user.id).catch(() => null), getTranslations("capability"), listOwnDoors(client, user.id)]);
  // Name, Headline und Text ueber dich kommen aus dem Kernprofil, nicht aus diesem Formular.
  const identityGaps = getConnectIdentityGaps(core);
  const onePage = Boolean(profile);
  // Wer noch nie sichtbar war, bekommt das kurze erste Anlegen (Entwurf 16.11.2026): erst das Noetige, der Rest spaeter.
  const firstFlow = !profile || profile.status !== "active";
  const sectionDone = {
    role: Boolean(profile?.network_roles?.length),
    reach: doors.length > 0,
    open: Boolean(profile?.open_to_formats?.length),
  };
  const continuation = params.next?.startsWith("/connect") && !params.next.includes("\\") && !params.next.startsWith("//") ? params.next : "";
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const errorKey = ERROR_KEYS.includes(params.error ?? "") ? params.error : null;
  const justPublished = profile?.status === "active" && params.saved === "published" && Boolean(profile.published_at) && Date.now() - new Date(profile.published_at as string).getTime() < 120_000;
  return <main className="mx-auto max-w-6xl px-5 py-10">
    <ReminderAskSlot />
    {/* Der erste Erfolg: sehen, was andere im Netzwerk suchen und anbieten - solange das eigene Profil noch nicht aktiv ist. */}
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
      {firstFlow ? null : <p className="mt-2 max-w-2xl text-sm leading-6 text-white">{t("profile.text")}</p>}
    </header>
    {params.returned === "1" ? <p role="status" className="my-4 rounded-xl bg-slate-50 p-4">{t("lifecycle.returnHint")}</p> : null}
    {saved ? <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.profile.${saved}`)}</p> : null}
    {errorKey ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${errorKey}`)}</p> : null}
    {/* Die Identitaet (Name, Headline, Bio, Ort, ...) steht einmal im Profil und ist hier direkt bearbeitbar -
        ausserhalb dieses Formulars, weil Formulare sich nicht verschachteln lassen. */}
    {justPublished ? (
      <section data-connect-profile-done role="status" className="mt-6 rounded-3xl border-2 border-violet-400 bg-white p-6">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>{t("profile.done.badge")}</p>
        <h2 className="mt-3 text-3xl font-semibold text-[#0b1f3a]">{t("profile.done.title", { name: profile.display_name.split(" ")[0] ?? "" })}</h2>
        <p className="mt-2 max-w-xl text-base leading-7 text-slate-700">{t("profile.done.text")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/connect" className="brand-cta inline-flex min-h-12 items-center rounded-2xl px-6 text-base font-semibold">{t("profile.done.search")}</Link>
          <Link href="/connect/people" className="inline-flex min-h-12 items-center rounded-2xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-900">{t("profile.done.network")}</Link>
        </div>
        <p className="mt-5 text-sm font-semibold text-slate-800">{t("profile.done.later")}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {([["photo", "#identity"], ["reach", "#tueren"], ["venture", "/connect/ventures/mine"]] as const).map(([key, href]) => (
            <li key={key}><Link href={href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900"><span aria-hidden="true" className="text-slate-400">○</span>{t(`profile.done.items.${key}`)}</Link></li>
          ))}
        </ul>
      </section>
    ) : null}
    {firstFlow ? null : <IdentityInlineCard client={client} userId={user.id} returnPath="/connect/profile" params={params} />}
    {/* Wer schon ein Profil hat, sieht alle Abschnitte auf einer Seite, mit Vorschau; der Assistent in Schritten bleibt dem ersten Anlegen. */}
    {firstFlow ? (
      <form action={saveConnectProfileAction} noValidate className="mt-6">
        {continuation ? <input type="hidden" name="next" value={continuation} /> : null}
        <ConnectFirstProfile
          initial={{ name: core?.display_name ?? "", headline: core?.headline ?? "", roles: profile?.network_roles ?? [], open: profile?.open_to_formats ?? [], contactNote: profile?.contact_note ?? "" }}
          roles={CONNECT_ROLES.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
          openFormats={CONNECT_OPEN_TO_FORMATS.map((format) => ({ value: format, label: t(`profile.openTo.${format}`) }))}
          noteMin={CONNECT_CONTACT_NOTE_MIN} noteMax={CONNECT_CONTACT_NOTE_MAX}
          visibilityNode={<ConnectVisibilityField initial={profile?.visibility} copy={{
            title: t("visibility.profileTitle"), membersOnly: t("visibility.membersOnly"), public: t("visibility.public"),
            publicHint: t("visibility.profilePublicHint"), confirm: t("visibility.profileConfirm"),
            previewTitle: t("visibility.publicFields"), previewItems: t("visibility.profileFields"),
          }} />}
          moreNode={<>
            <ConsentSwitch name="suggestable" title={t("profile.suggestableLabel")} effect={t("profile.suggestableHint")} offEffect={t("profile.suggestableOffHint")} defaultChecked={profile?.suggestable ?? true} />
            <ConsentSwitch name="highlightable" title={t("profile.highlightableLabel")} effect={t("profile.highlightableHint")} offEffect={t("profile.highlightableOffHint")} defaultChecked={profile?.highlight_prompt_answered_at ? profile.highlightable : true} />
            <p className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{t("profile.membersOnlyNote")}</p>
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{t("profile.consent")} <Link href="/datenschutz" className="font-semibold underline underline-offset-2">{t("profile.privacyLink")}</Link></p>
          </>}
          draftNode={<ConnectSubmitButton intent="draft" label={t("actions.saveDraft")} pendingLabel={t("pending.save")} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-6 text-base font-semibold" />}
          publishNode={<ConnectSubmitButton intent="publish" label={t("profile.first.publish")} pendingLabel={t("pending.publish")} className="min-h-[52px] rounded-2xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-8 text-lg font-bold text-white" />}
          copy={{
            stepOf: t("profile.flow.stepOf", { current: "{current}", total: "{total}" }), back: t("profile.flow.back"), next: t("profile.flow.next"),
            titleRole: t("profile.first.titleRole"), leadRole: t("profile.first.leadRole"), nameLabel: t("profile.first.nameLabel"), headlineLabel: t("profile.first.headlineLabel"),
            headlineHint: t("profile.first.headlineHint"), rolesLabel: t("profile.first.rolesLabel"), rolesHint: t("profile.first.rolesHint"), mustHint: t("profile.first.mustHint"),
            titleOpen: t("profile.first.titleOpen"), leadOpen: t("profile.first.leadOpen"), noteLabel: t("profile.first.noteLabel"), notePlaceholder: t("profile.contactNotePlaceholder"),
            skip: t("profile.first.skip"), optional: t("profile.first.optional"), titleShow: t("profile.first.more"), previewTitle: t("profile.first.previewTitle"),
            previewEmpty: t("profile.first.previewEmpty"), previewLater: t("profile.first.previewLater"), showQuestion: t("profile.first.showQuestion"), publishHint: t("profile.first.publishHint"),
            missing: t("profile.first.missing"), missingName: t("profile.first.missingName"), missingHeadline: t("profile.first.missingHeadline"), missingRole: t("profile.flow.roleMissing"),
          }}
        />
      </form>
    ) : null}
    {/* Der erste Erfolg: sehen, was andere im Netzwerk suchen und anbieten - solange das eigene Profil noch nicht aktiv ist. Unter dem Formular, damit das Nötige oben steht. */}
    {profile?.status !== "active" ? <AreaPayoff title={t("payoff.title")} text={t("payoff.text")} cta={t("payoff.cta")} href="/connect" /> : null}
    {firstFlow ? null : <div className={onePage ? "mt-6 grid gap-6 lg:grid-cols-[170px_minmax(0,1fr)_300px]" : ""}>
    {onePage ? (
      <nav aria-label={t("profile.sections.label")} className="hidden flex-col gap-1 self-start lg:sticky lg:top-6 lg:flex">
        {([["role", sectionDone.role], ["open", sectionDone.open], ["show", true]] as const).map(([id, done]) => (
          <a key={id} href={`#abschnitt-${id}`} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
            <span aria-hidden="true" className={done ? "text-emerald-700" : "text-amber-700"}>{done ? "✓" : "○"}</span>
            {t(`profile.flow.titles.${id}`)}
          </a>
        ))}
        <a href="#tueren" className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
          <span aria-hidden="true" className={doors.length > 0 ? "text-emerald-700" : "text-slate-500"}>{doors.length > 0 ? "✓" : "○"}</span>
          {t("doors.title")}
        </a>
      </nav>
    ) : null}
    <form action={saveConnectProfileAction} noValidate className={onePage ? "min-w-0 space-y-6" : "mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"}>
      {continuation ? <input type="hidden" name="next" value={continuation} /> : null}
      <ConnectCardFlow
        layout={onePage ? "page" : "steps"}
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
      <ConsentSwitch name="suggestable" title={t("profile.suggestableLabel")} effect={t("profile.suggestableHint")} offEffect={t("profile.suggestableOffHint")} defaultChecked={profile?.suggestable ?? true} />
      <ConsentSwitch name="highlightable" title={t("profile.highlightableLabel")} effect={t("profile.highlightableHint")} offEffect={t("profile.highlightableOffHint")} defaultChecked={profile?.highlight_prompt_answered_at ? profile.highlightable : true} />

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
          cardTitles: { role: t("profile.flow.titles.role"), open: t("profile.flow.titles.open"), show: t("profile.flow.titles.show") },
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
    {onePage && profile ? <ConnectProfilePreview profile={profile} doors={doors} /> : null}
    </div>}

    {/* Tueren (Entwurf 10.11.2026): "Wen kannst du erreichen?" ersetzt das Freitextfeld. Eigene Formulare, deshalb neben dem Profilformular. */}
    {firstFlow ? null : <DoorsSection
      doors={doors}
      doorsOpen={profile?.doors_open !== false}
      hasProfile={Boolean(profile)}
      status={["saved", "limit", "duplicate", "error"].includes(params.tuer ?? "") ? (params.tuer as string) : null}
      editId={/^[0-9a-f-]{36}$/.test(params.tuer_bearbeiten ?? "") ? (params.tuer_bearbeiten as string) : null}
      creating={params.tuer_neu === "1"}
      oldText={profile?.network_reach?.trim() || null}
    />}

    {/* Die Zugaenge stehen NEBEN dem Formular und nicht darin: Sie sind keine
        Angabe, die man abschickt, sondern eine Entscheidung je Vorschlag. */}
    {firstFlow ? null : <ResourceProposalSection proposals={resources} />}
  </main>;
}
