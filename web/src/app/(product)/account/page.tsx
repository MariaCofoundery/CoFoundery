import { ConnectParticipationSection } from "@/features/connect/ConnectParticipationSection";
import { AdminModerationLink } from "@/features/moderation/AdminModerationLink";
import { getOwnOutlivableContent } from "@/features/connect/connectProblemData";
import { PersonAccessSection } from "@/features/advisor/PersonAccessSection";
import { getPersonAccessRequesters } from "@/features/advisor/personAccessData";
import { TeamReviewSection } from "@/features/advisor/TeamReviewSection";
import { getMyTeamReviewRequests } from "@/features/advisor/teamReviewData";
import { redirect } from "next/navigation";
import { AppIcon, type IconName } from "@/features/ui/Icons";
import { getTranslations } from "next-intl/server";
import { canAccessAccountSettings } from "@/features/account/accountAccess";
import { AccountAccessSection } from "@/features/account/AccountAccessSection";
import { isAccountStatus } from "@/features/account/accountStatus";
import {
  AccountDataSection,
  AccountPreferencesSection,
} from "@/features/account/AccountPreferencesSection";
import {
  isNotificationEmailOptIn,
  isNotificationKind,
  type NotificationEmailOptIn,
  type NotificationKind,
} from "@/features/account/notificationKinds";
import { AiAvailabilitySection } from "@/features/ai/AiAvailabilitySection";
import { getAiAvailability, getOwnPendingAiJobCount } from "@/features/ai/aiAvailability";
import { ResearchConsentSettings } from "@/features/research/ResearchConsentSettings";
import { getResearchConsentState } from "@/features/research/consent";
import { normalizeLocale, type AppLocale } from "@/i18n/config";
import { ACCOUNT_CARD, ACCOUNT_SECONDARY, AccountHead } from "@/features/account/accountUi";
import { DeleteAccountSection } from "@/features/account/DeleteAccountSection";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; connectError?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();

  if (!user) redirect("/login?next=/account");

  const phoneT = await getTranslations("profile.welcomeLetter.phone");
  const [
    params,
    roleViews,
    membershipResult,
    t,
    personAccessRequesters,
    teamReviewRequests,
    preferences,
    optedOutRows,
    emailOptInRows,
    researchConsentState,
    pendingInvitations,
    aiAvailable,
    pendingAiJobs,
  ] = await Promise.all([
    searchParams,
    getDashboardRoleViews(user.id).catch(() => ({ hasFounder: false, hasAdvisor: false, roles: [] })),
    supabase.rpc("has_network_account"),
    getTranslations("dashboard"),
    getPersonAccessRequesters(supabase),
    getMyTeamReviewRequests(supabase),
    Promise.resolve(
      supabase.from("person_core").select("locale").eq("user_id", user.id).maybeSingle()
    )
      .then(({ data }) => data)
      .catch(() => null),
    Promise.resolve(supabase.from("notification_opt_outs").select("kind").eq("user_id", user.id))
      .then(({ data }) => data ?? [])
      .catch((): { kind: string }[] => []),
    // Und die Zustimmungen. Eigene Tabelle, weil hier die ABWESENHEIT einer
    // Zeile "nein" heisst - oben heisst sie "ja".
    Promise.resolve(supabase.from("notification_opt_ins").select("kind").eq("user_id", user.id))
      .then(({ data }) => data ?? [])
      .catch((): { kind: string }[] => []),
    getResearchConsentState(supabase, user.id).catch(() => "unknown" as const),
    // Offene Einladungen an die AKTUELLE Adresse. Die Policy auf participants
    // ordnet ueber die Mailadresse im Token zu - nach einem Wechsel greift sie
    // nicht mehr. Die Zeilen sind durch genau diese Policy sichtbar, es
    // braucht also keinen privilegierten Zugriff.
    Promise.resolve(
      supabase
        .from("participants")
        .select("id", { count: "exact", head: true })
        .is("user_id", null)
        // Ausdruecklich, obwohl die Policy dasselbe tut: Eine Abfrage, deren
        // Ergebnis sich erst aus der Zeilensicherheit ergibt, liest sich beim
        // naechsten Mal wie ein Fehler.
        .eq("invited_email", (user.email ?? "").trim().toLowerCase())
    )
      .then(({ count }) => count ?? 0)
      .catch(() => 0),
    getAiAvailability(supabase).catch(() => false),
    getOwnPendingAiJobCount(supabase).catch(() => 0),
  ]);
  // Nur bekannte Schluessel an t() geben - ein manipulierter Parameter wuerde
  // sonst als roher Schluesselpfad auf der Seite landen.
  const status = isAccountStatus(params.status) ? params.status : null;
  const hasConnectAccount = membershipResult.data === true;
  const accountLocale: AppLocale | null = preferences?.locale ? normalizeLocale(preferences.locale) : null;
  const optedOut = (optedOutRows as { kind: string }[])
    .map((row) => row.kind)
    .filter(isNotificationKind) as NotificationKind[];
  const emailOptIns = (emailOptInRows as { kind: string }[])
    .map((row) => row.kind)
    .filter(isNotificationEmailOptIn) as NotificationEmailOptIn[];
  // Was eine Loeschung ueberdauern koennte. Ohne Connect-Konto gibt es das
  // nicht, dann wird auch nicht danach gefragt.
  const outlivable = hasConnectAccount
    ? await getOwnOutlivableContent(supabase, user.id).catch(() => null)
    : null;

  if (!canAccessAccountSettings({ ...roleViews, hasConnect: hasConnectAccount })) redirect("/start");

  const navItems: { id: string; label: string; icon: IconName; danger?: boolean }[] = [
    { id: "anmeldung", label: t("account.access.title"), icon: "person" },
    { id: "sprache", label: t("account.locale.title"), icon: "globe" },
    { id: "post", label: t("account.notifications.title"), icon: "bell" },
    ...(hasConnectAccount ? [{ id: "connect", label: t("account.nav.connect"), icon: "link" as const }] : []),
    { id: "daten", label: t("account.data.title"), icon: "download" },
    { id: "handy", label: phoneT("navLabel"), icon: "phone" },
    { id: "loeschen", label: t("account.nav.delete"), icon: "warn", danger: true },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]">
        {t("account.eyebrow")}
      </p>
      <h1 className="mt-1.5 text-[34px] font-semibold leading-[1.2] tracking-tight text-[#0b1f3a]">{t("utilities.account")}</h1>
      <p className="mt-1.5 max-w-xl text-base leading-7 text-[#5f5e7a]">{t("account.sharedText")}</p>

      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Die Navigation springt zu den Abschnitten - sie ist eine Liste von Ankern, keine Statusanzeige. */}
        <nav aria-label={t("utilities.account")} className="sticky top-5 hidden flex-col gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 text-[15px] font-semibold transition-colors hover:bg-[#f5f2fe] ${item.danger ? "text-[#a3195b]" : "text-[#33325e]"}`}
            >
              <AppIcon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 [&>section:first-child]:mt-0">
          <AccountAccessSection
            email={user.email ?? null}
            pendingInvitations={pendingInvitations}
            status={status}
          />
          <AccountPreferencesSection
            locale={accountLocale}
            optedOut={optedOut}
            emailOptIns={emailOptIns}
            showSuggestionTest={hasConnectAccount}
            status={status}
          />

          <ConnectParticipationSection error={params.connectError === "1"} />
          <AccountDataSection>
            <ResearchConsentSettings initialState={researchConsentState} />
            {/* Wo gerechnet wird, gehoert zu "deine Daten" - nicht in eine
                technische Ecke. */}
            <AiAvailabilitySection available={aiAvailable} pendingJobs={pendingAiJobs} />
          </AccountDataSection>

          {/* WER DICH BEGLEITET, neu am 23.09.2026. Ohne diese Stelle gibt es
              keine Einwilligung, nur eine Unterschrift: Wer nicht sehen kann, wer
              Zugang hat und wofuer, hat nicht zugestimmt, sondern einmal
              geklickt. */}
          <PersonAccessSection requesters={personAccessRequesters} />

          {/* EINE ANDERE FRAGE ALS DIE NACH DEM EIGENEN PROFIL, deshalb ein
              eigener Abschnitt: Hier entsteht eine Aussage ueber das Verhaeltnis
              zwischen Menschen, die es vorher nicht gab. */}
          <TeamReviewSection requests={teamReviewRequests} />

          <section id="handy" className={`${ACCOUNT_CARD} mt-5 flex flex-wrap items-center gap-4`}>
            <div className="min-w-0 flex-[1_1_300px]">
              <AccountHead icon="phone" tone="violet" title={phoneT("title")} text={phoneT("text")} />
            </div>
            <a href="/made2found-aufs-handy.pdf" target="_blank" rel="noopener" className={ACCOUNT_SECONDARY}>
              {phoneT("link")}
            </a>
          </section>

          <section id="loeschen" className={`${ACCOUNT_CARD} mt-5 !border-[#f3c9dd] !bg-[#fffafc]`}>
            <DeleteAccountSection
              outlivable={
                outlivable ?? {
                  problems: 0,
                  approaches: 0,
                  problemsPreferKeeping: false,
                  approachesPreferKeeping: false,
                }
              }
            />
          </section>
          <AdminModerationLink />
        </div>
      </div>
    </main>
  );
}
