import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  saveAccountLocaleAction,
  saveNotificationSettingsAction,
} from "@/features/account/accountPreferenceActions";
import {
  NOTIFICATION_AREAS,
  NOTIFICATION_KINDS,
  emailOptInForKind,
  type NotificationEmailOptIn,
  type NotificationKind,
} from "@/features/account/notificationKinds";
import {
  accountStatusSection,
  isAccountStatusFailure,
  type AccountStatus,
} from "@/features/account/accountStatus";
import { SuggestionNotificationTest } from "@/features/connect/SuggestionNotificationTest";
import { PushNotificationSection } from "@/features/notifications/PushNotificationSection";
import { IconTile, type IconName, type IconTone } from "@/features/ui/Icons";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { ACCOUNT_CARD as CARD0, ACCOUNT_PILL as PILL, ACCOUNT_PRIMARY as PRIMARY, ACCOUNT_SECONDARY as SECONDARY, AccountHead, SwitchTrack } from "@/features/account/accountUi";
import { SubmitButton } from "@/features/ui/SubmitButton";






const CARD = `${CARD0} mt-5`;

/** Symbol und Farbe je Bereich - die Farbe sagt, WORUM es geht, nie wie wichtig. */
const AREA_ICON: Record<string, { icon: IconName; tone: IconTone }> = {
  align: { icon: "spark", tone: "violet" },
  find: { icon: "search", tone: "teal" },
  connect: { icon: "link", tone: "blue" },
};

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
  emailOptIns,
  showSuggestionTest,
  status,
}: {
  /** Null heisst "nicht entschieden" - dann entscheidet der Browser. */
  locale: AppLocale | null;
  optedOut: NotificationKind[];
  /** Zugestimmte Mailwege. Abwesenheit heisst hier nein, nicht ja. */
  emailOptIns: NotificationEmailOptIn[];
  /**
   * Ob der Probelauf fuer Vorschlaege angeboten wird. Ohne Connect-Zugang gibt
   * es keine Vorschlaege - dann waere der Knopf eine Behauptung ueber einen
   * Bereich, den diese Person nicht hat.
   */
  showSuggestionTest: boolean;
  status: AccountStatus | null;
}) {
  const t = await getTranslations("dashboard");
  const isOff = new Set(optedOut);
  const hasConsented = new Set(emailOptIns);
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
        <AccountHead icon="globe" tone="blue" title={t("account.locale.title")} text={t("account.locale.text")} />
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
        <AccountHead icon="bell" tone="amber" title={t("account.notifications.title")} text={t("account.notifications.text")} />
        {note("notifications")}

        <form action={saveNotificationSettingsAction} className="mt-5">
          {/* Nach Bereichen gruppiert: Man sucht eine Einstellung dort, wo man
              die Sache erlebt hat - nicht in einer Liste von sieben Zeilen. */}
          {NOTIFICATION_AREAS.map((area) => {
            const kinds = NOTIFICATION_KINDS.filter((entry) => entry.area === area);
            if (kinds.length === 0) return null;
            return (
              <fieldset key={area} className="mt-5 first:mt-0">
                <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]">
                  {t(`account.notifications.areas.${area}`)}
                </legend>
                <div className="mt-2 grid gap-2">
                  {kinds.map(({ kind }) => {
                    const optIn = emailOptInForKind(kind);
                    return (
                      // EIN KASTEN, ZWEI HAKEN - und deshalb ein <div> um
                      // beide statt eines <label> um alles: Ein zweites
                      // <label> INNERHALB des ersten ist ungueltiges HTML,
                      // und ein Klick darauf wuerde den Elternhaken
                      // mitschalten. Also endet das erste <label> vor dem
                      // zweiten, und der Kasten hebt sich ueber das <div>
                      // trotzdem gemeinsam hervor.
                      <div
                        key={kind}
                        className="rounded-2xl border border-[#e4e2f0] bg-white px-4 py-3 transition has-[:checked]:border-[#d9cff8]"
                      >
                        <label className="flex min-h-11 cursor-pointer items-center gap-3.5">
                          <input
                            type="checkbox"
                            name="notification"
                            value={kind}
                            defaultChecked={!isOff.has(kind)}
                            className="peer sr-only"
                          />
                          <IconTile name={AREA_ICON[area].icon} tone={AREA_ICON[area].tone} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15.5px] font-semibold text-[#0b1f3a]">
                              {t(`account.notifications.kinds.${kind}.title`)}
                            </span>
                            <span className="mt-0.5 block text-[13.5px] leading-5 text-[#5f5e7a]">
                              {t(`account.notifications.kinds.${kind}.text`)}
                            </span>
                          </span>
                          <SwitchTrack />
                        </label>

                        {/* DER MAILWEG ALS ZWEITER, EINGERUECKTER HAKEN - und
                            leer, bis jemand ihn setzt.

                            Warum kein weiterer Schalter in der Liste oben: Es
                            ist keine zweite ART, sondern ein zweiter WEG fuer
                            dieselbe. Nebeneinander gestellt saehe es aus wie
                            zwei Dinge, die man beide abbestellen kann - und
                            dann waere die naheliegende Annahme, dass beide an
                            sind. Das ist hier ausdruecklich nicht so.

                            Er haengt am Haken darueber: Wer die Art ganz
                            abbestellt, bekommt auch keine Mail. Das erzwingt
                            `wants_email_channel` in der Datenbank - nicht
                            diese Oberflaeche. */}
                        {optIn ? (
                          <label className="mt-2 flex cursor-pointer items-center gap-3 pl-[54px]">
                            <input
                              type="checkbox"
                              name="emailOptIn"
                              value={optIn.kind}
                              defaultChecked={hasConsented.has(optIn.kind)}
                              className="peer sr-only"
                            />
                            <SwitchTrack />
                            <span className="block text-[13px] leading-5 text-[#5f5e7a]">
                              {t(`account.notifications.emailOptIns.${optIn.kind}`)}
                            </span>
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {/* Eine Einladung IST die Nachricht. Sie taucht deshalb nicht als
              Schalter auf - aber es steht da, statt dass jemand sie sucht. */}
          <p className="mt-5 rounded-2xl bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#5f5e7a]">
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

        {/* Die Schalter oben sagen, WAS jemand bekommt - fuer Mail und
            Mitteilung gemeinsam. Hier steht nur, WOHIN. Deshalb im selben
            Kasten und nicht in einem eigenen: Zwei Kaesten waeren zwei
            Regelwerke, und genau das ist es nicht.

            Ausserhalb des Formulars: Das Einschalten ist keine Angabe, die man
            abschickt, sondern eine Erlaubnis, die der Browser erteilt. */}
        <PushNotificationSection
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null}
        />

        {/* Der Probelauf steht hier und nicht bei den Mitteilungen darueber:
            Er prueft die MELDUNG auf beiden Wegen mitsamt der Schalter davor,
            nicht den Kanal. */}
        {showSuggestionTest ? <SuggestionNotificationTest /> : null}
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
      <AccountHead icon="download" tone="teal" title={t("account.data.title")} text={t("account.data.text")} />
      <p className="mt-2 text-sm leading-6 text-[#5f5e7a]">{t("account.data.scope")}</p>
      <Link href="/api/account/export" download className={`${SECONDARY} mt-4`}>
        {t("account.data.download")}
      </Link>
      {children ? <div className="mt-6 border-t border-[#e4e2f0] pt-6">{children}</div> : null}
    </section>
  );
}
