import { getOwnOutlivableContent } from "@/features/connect/connectProblemData";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canAccessAccountSettings } from "@/features/account/accountAccess";
import {
  AccountAccessSection,
  ACCOUNT_STATUS_KEYS,
  type AccountStatus,
} from "@/features/account/AccountAccessSection";
import { ConnectNotificationSetting } from "@/features/connect/ConnectNotificationSetting";
import { DeleteAccountSection } from "@/features/account/DeleteAccountSection";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const [params, roleViews, membershipResult, t, connectT, notificationsResult, pendingInvitations] = await Promise.all([
    searchParams,
    getDashboardRoleViews(user.id).catch(() => ({ hasFounder: false, hasAdvisor: false, roles: [] })),
    supabase.rpc("has_network_account"),
    getTranslations("dashboard"),
    getTranslations("connect"),
    supabase.rpc("get_network_email_notifications"),
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
  ]);
  // Nur bekannte Schluessel an t() geben - ein manipulierter Parameter wuerde
  // sonst als roher Schluesselpfad auf der Seite landen.
  const status = ACCOUNT_STATUS_KEYS.includes(params.status as AccountStatus)
    ? (params.status as AccountStatus)
    : null;
  const hasConnectAccount = membershipResult.data === true;
  const notificationsEnabled = notificationsResult.data !== false;
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
      {/* Nur bei Connect-Konten: Eine Einstellung fuer etwas, das man nicht
          hat, ist Rauschen. */}
      {hasConnectAccount ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <ConnectNotificationSetting
            enabled={notificationsEnabled}
            copy={{
              title: connectT("notifications.title"),
              text: connectT("notifications.text"),
              state: connectT(notificationsEnabled ? "notifications.stateOn" : "notifications.stateOff"),
              on: connectT("notifications.turnOn"),
              off: connectT("notifications.turnOff"),
              pending: connectT("pending.save"),
            }}
          />
        </section>
      ) : null}
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
