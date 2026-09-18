import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  saveAccountLocaleAction,
  saveNotificationSettingsAction,
} from "@/features/account/accountPreferenceActions";
import {
  NOTIFICATION_AREAS,
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "@/features/account/notificationKinds";
import {
  accountStatusSection,
  isAccountStatusFailure,
  type AccountStatus,
} from "@/features/account/accountStatus";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { SubmitButton } from "@/features/ui/SubmitButton";

const CARD = "mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const PRIMARY = "inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white";
const SECONDARY =
  "inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50";
const PILL =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-700 transition has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-violet-100";

/**
 * Sprache und Post.
 *
 * Beides stand bis 18.09.2026 nicht im Konto: Die Sprache lag nur im Cookie,
 * und von sieben Mailarten liess sich genau eine Gruppe abschalten - unter
 * einer Ueberschrift, die mehr versprach, als sie hielt.
 */
export async function AccountPreferencesSection({
  locale,
  optedOut,
  status,
}: {
  /** Null heisst "nicht entschieden" - dann entscheidet der Browser. */
  locale: AppLocale | null;
  optedOut: NotificationKind[];
  status: AccountStatus | null;
}) {
  const t = await getTranslations("dashboard");
  const isOff = new Set(optedOut);
  const section = status ? accountStatusSection(status) : null;

  const note = (owner: "locale" | "notifications") =>
    section === owner && status ? (
      <p
        role="status"
        className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
          isAccountStatusFailure(status) ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
        }`}
      >
        {t(`account.status.${status}`)}
      </p>
    ) : null;

  return (
    <>
      <section id="sprache" className={CARD}>
        <h2 className="text-xl font-semibold text-slate-950">{t("account.locale.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("account.locale.text")}</p>
        {note("locale")}

        <form action={saveAccountLocaleAction} className="mt-4">
          <fieldset>
            <legend className="sr-only">{t("account.locale.title")}</legend>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LOCALES.map((value) => (
                <label key={value} className={PILL}>
                  <input
                    type="radio"
                    name="locale"
                    value={value}
                    defaultChecked={locale === value}
                    className="sr-only"
                  />
                  {t(`account.locale.options.${value}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {locale === null ? (
            <p className="mt-3 text-xs leading-5 text-slate-500">{t("account.locale.undecided")}</p>
          ) : null}
          <div className="mt-4">
            <SubmitButton
              label={t("account.locale.submit")}
              pendingLabel={t("account.locale.submitPending")}
              className={PRIMARY}
            />
          </div>
        </form>
      </section>

      <section id="post" className={CARD}>
        <h2 className="text-xl font-semibold text-slate-950">{t("account.notifications.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("account.notifications.text")}</p>
        {note("notifications")}

        <form action={saveNotificationSettingsAction} className="mt-5">
          {/* Nach Bereichen gruppiert: Man sucht eine Einstellung dort, wo man
              die Sache erlebt hat - nicht in einer Liste von sieben Zeilen. */}
          {NOTIFICATION_AREAS.map((area) => {
            const kinds = NOTIFICATION_KINDS.filter((entry) => entry.area === area);
            if (kinds.length === 0) return null;
            return (
              <fieldset key={area} className="mt-5 first:mt-0">
                <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t(`account.notifications.areas.${area}`)}
                </legend>
                <div className="mt-2 grid gap-2">
                  {kinds.map(({ kind }) => (
                    <label
                      key={kind}
                      className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 transition has-[:checked]:border-violet-200 has-[:checked]:bg-violet-50/40"
                    >
                      <input
                        type="checkbox"
                        name="notification"
                        value={kind}
                        defaultChecked={!isOff.has(kind)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">
                          {t(`account.notifications.kinds.${kind}.title`)}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {t(`account.notifications.kinds.${kind}.text`)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          {/* Eine Einladung IST die Nachricht. Sie taucht deshalb nicht als
              Schalter auf - aber es steht da, statt dass jemand sie sucht. */}
          <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {t("account.notifications.alwaysSent")}
          </p>

          <div className="mt-4">
            <SubmitButton
              label={t("account.notifications.submit")}
              pendingLabel={t("account.notifications.submitPending")}
              className={PRIMARY}
            />
          </div>
        </form>
      </section>
    </>
  );
}

/**
 * Der Datenexport.
 *
 * Ein Link, keine Schaltflaeche mit Aktion: Der Browser bekommt eine Antwort
 * mit Content-Disposition und speichert sie als Datei. `download` sagt ihm,
 * dass er nicht wegnavigieren soll.
 */
export async function AccountDataSection({ children }: { children?: React.ReactNode }) {
  const t = await getTranslations("dashboard");

  return (
    <section id="daten" className={CARD}>
      <h2 className="text-xl font-semibold text-slate-950">{t("account.data.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("account.data.text")}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t("account.data.scope")}</p>
      <Link href="/api/account/export" download className={`${SECONDARY} mt-4`}>
        {t("account.data.download")}
      </Link>
      {children ? <div className="mt-6 border-t border-slate-200 pt-6">{children}</div> : null}
    </section>
  );
}
