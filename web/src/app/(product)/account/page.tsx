import { getOwnOutlivableContent } from "@/features/connect/connectProblemData";
import { redirect } from "next/navigation";
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
import { DeleteAccountSection } from "@/features/account/DeleteAccountSection";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();

  if (!user) redirect("/login?next=/account");

  const [
    params,
    roleViews,
    membershipResult,
    t,
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
    getResearchConsentState(supabase, user.id).catch(() => "undecided" as const),
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

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t("account.eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("utilities.account")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t("account.sharedText")}</p>

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

      <AccountDataSection>
        <ResearchConsentSettings initialState={researchConsentState} />
        {/* Wo gerechnet wird, gehoert zu "deine Daten" - nicht in eine
            technische Ecke. */}
        <AiAvailabilitySection available={aiAvailable} pendingJobs={pendingAiJobs} />
      </AccountDataSection>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
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
    </main>
  );
}
