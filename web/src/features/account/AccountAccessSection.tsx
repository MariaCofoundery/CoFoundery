import { getTranslations } from "next-intl/server";
import { requestEmailChangeAction, signOutEverywhereAction } from "@/features/account/accountActions";
import {
  accountStatusSection,
  isAccountStatusFailure,
  type AccountStatus,
} from "@/features/account/accountStatus";
import { SubmitButton } from "@/features/ui/SubmitButton";

const CARD = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const PRIMARY = "inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white";
const SECONDARY =
  "inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50";

/**
 * Der Zugang zum Konto.
 *
 * Bis 18.09.2026 stand im Konto nur ein Benachrichtigungsschalter und die
 * Loeschung. Die eigene Mailadresse stand NIRGENDS im Produkt - man konnte
 * nicht einmal nachsehen, mit welcher man angemeldet ist. Bei einer Anmeldung,
 * die ausschliesslich ueber Magic Links laeuft, ist das die Angabe, an der
 * alles haengt.
 */
export async function AccountAccessSection({
  email,
  pendingInvitations,
  status,
}: {
  email: string | null;
  /**
   * Offene Einladungen an die AKTUELLE Adresse.
   *
   * Einladungen werden ueber die Mailadresse im Token zugeordnet
   * (`invited_email = lower(auth.jwt()->>'email')` in den Policies auf
   * `participants`). Nach einem Wechsel greift diese Zuordnung nicht mehr -
   * deshalb steht die Zahl hier, bevor jemand wechselt, und nicht als
   * Ueberraschung danach.
   */
  pendingInvitations: number;
  status: AccountStatus | null;
}) {
  const t = await getTranslations("dashboard");
  // Nur die eigenen Meldungen: Eine gespeicherte Sprache gehoert nicht hierher.
  const own = status && accountStatusSection(status) === "access" ? status : null;
  const message = own ? t(`account.access.status.${own}`) : null;
  const isError = own !== null && isAccountStatusFailure(own);

  return (
    <section id="anmeldung" className={`${CARD} mt-8`}>
      <h2 className="text-xl font-semibold text-slate-950">{t("account.access.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("account.access.text")}</p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {t("account.access.currentLabel")}
        </p>
        <p className="mt-1 break-all text-base font-medium text-slate-900">
          {email ?? t("account.access.unknownEmail")}
        </p>
      </div>

      {message ? (
        <p
          role="status"
          className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
            isError ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {message}
        </p>
      ) : null}

      {/* Eingeklappt: Die meisten Menschen kommen hierher, um nachzusehen,
          welche Adresse es ist - nicht um sie zu wechseln. */}
      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-800">
          {t("account.access.changeCta")}
        </summary>

        <form action={requestEmailChangeAction} className="mt-3 grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-slate-800">
            {t("account.access.newEmailLabel")}
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder={t("account.access.newEmailPlaceholder")}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {t("account.access.doubleConfirmHint")}
          </p>

          {pendingInvitations > 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {t("account.access.pendingInvitations", { count: pendingInvitations })}
            </p>
          ) : null}

          <SubmitButton
            label={t("account.access.submit")}
            pendingLabel={t("account.access.submitPending")}
            className={PRIMARY}
          />
        </form>
      </details>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-base font-semibold text-slate-950">{t("account.access.signOutTitle")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("account.access.signOutText")}</p>
        <form action={signOutEverywhereAction} className="mt-3">
          <SubmitButton
            label={t("account.access.signOutCta")}
            pendingLabel={t("account.access.signOutPending")}
            className={SECONDARY}
          />
        </form>
      </div>
    </section>
  );
}
