import { getTranslations } from "next-intl/server";
import {
  approvePersonAccessAction,
  declinePersonAccessAction,
  revokePersonAccessAction,
} from "@/features/advisor/personAccessActions";
import type { PersonAccessGrant } from "@/features/advisor/personAccessData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Wer sieht mich" - offene Anfragen und geltende Zugänge.
 *
 * OHNE DIESE SEITE GIBT ES KEINE EINWILLIGUNG, nur eine Unterschrift: Wer
 * nicht sehen kann, wer Zugang hat, seit wann und wofür, hat nicht zugestimmt,
 * sondern einmal geklickt.
 *
 * WIDERRUFEN STEHT NEBEN JEDEM ZUGANG und nicht in einer Einstellung zwei
 * Ebenen tiefer. Ein Widerruf, den man suchen muss, ist einer, den man nicht
 * ausübt.
 *
 * JE UMFANG EINE ZEILE - auch hier. Wer nur die Richtung wieder verbergen
 * will, nimmt eine Zeile zurück und nicht den ganzen Zugang. Das sieht nach
 * mehr Zeilen aus und ist der Unterschied zwischen "alles oder nichts" und
 * einer Entscheidung.
 */
export async function PersonAccessSection({ grants }: { grants: PersonAccessGrant[] }) {
  const t = await getTranslations("account.personAccess");
  if (grants.length === 0) return null;

  const requested = grants.filter((grant) => grant.status === "requested");
  const active = grants.filter((grant) => grant.status === "active");

  return (
    <section
      id="person-access"
      className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      {requested.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">{t("requestedTitle")}</h3>
          <ul className="mt-3 space-y-3">
            {requested.map((grant) => (
              <li key={grant.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-sm font-medium text-slate-950">{t(`scopes.${grant.scope}`)}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{t(`scopeHints.${grant.scope}`)}</p>
                {grant.requestNote ? (
                  <blockquote className="mt-3 border-l-2 border-amber-300 pl-3 text-sm italic leading-6 text-slate-700">
                    „{grant.requestNote}“
                  </blockquote>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={approvePersonAccessAction}>
                    <input type="hidden" name="grantId" value={grant.id} />
                    <SubmitButton
                      label={t("approve")}
                      pendingLabel={t("pending")}
                      className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    />
                  </form>
                  <form action={declinePersonAccessAction}>
                    <input type="hidden" name="grantId" value={grant.id} />
                    <SubmitButton
                      label={t("decline")}
                      pendingLabel={t("pending")}
                      className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {active.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">{t("activeTitle")}</h3>
          <ul className="mt-3 space-y-3">
            {active.map((grant) => (
              <li
                key={grant.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-950">
                    {t(`scopes.${grant.scope}`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {t(`scopeHints.${grant.scope}`)}
                  </span>
                </span>
                <form action={revokePersonAccessAction}>
                  <input type="hidden" name="grantId" value={grant.id} />
                  <SubmitButton
                    label={t("revoke")}
                    pendingLabel={t("pending")}
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  />
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* WAS NIE DABEI IST, steht dabei. Sonst müsste man es glauben. */}
      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
        {t("neverShared")}
      </p>
    </section>
  );
}
