import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canAccessAccountSettings } from "@/features/account/accountAccess";
import { ConnectNotificationSetting } from "@/features/connect/ConnectNotificationSetting";
import { DeleteAccountSection } from "@/features/account/DeleteAccountSection";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const [roleViews, membershipResult, t, connectT, notificationsResult] = await Promise.all([
    getDashboardRoleViews(user.id).catch(() => ({ hasFounder: false, hasAdvisor: false, roles: [] })),
    supabase.rpc("has_network_account"),
    getTranslations("dashboard"),
    getTranslations("connect"),
    supabase.rpc("get_network_email_notifications"),
  ]);
  const hasConnectAccount = membershipResult.data === true;
  const notificationsEnabled = notificationsResult.data !== false;

  if (!canAccessAccountSettings({ ...roleViews, hasConnect: hasConnectAccount })) redirect("/start");

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t("account.eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("utilities.account")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t("account.sharedText")}</p>
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
        <DeleteAccountSection />
      </section>
    </main>
  );
}
