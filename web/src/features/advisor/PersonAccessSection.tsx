import { getTranslations } from "next-intl/server";
import {
  approvePersonAccessAction,
  declinePersonAccessAction,
  revokePersonAccessAction,
} from "@/features/advisor/personAccessActions";
import type { AccessRequester } from "@/features/advisor/personAccessData";
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
 * JE UMFANG EINE ENTSCHEIDUNG - auch hier. Wer nur die Richtung wieder
 * verbergen will, nimmt eine Zeile zurück und nicht den ganzen Zugang. Das
 * ist der Unterschied zwischen "alles oder nichts" und einer Entscheidung.
 *
 * ---------------------------------------------------------------------------
 * UMGEBAUT AM 26.09.2026
 * ---------------------------------------------------------------------------
 *
 * Vorher stand hier der Umfang - und sonst nichts. Nicht der Name dessen, der
 * fragt, nicht die Organisation dahinter. Eine Zustimmung, bei der man nicht
 * weiß, WEM man zustimmt, ist keine Zustimmung.
 *
 * EINE KARTE JE PARTEI, nicht je Umfang. Wer nach vier Bereichen gefragt
 * wurde, sah vier zusammenhanglose Karten. Die Entscheidung bleibt je Umfang,
 * die Frage "wer will etwas von mir" wird einmal beantwortet.
 *
 * WER FRAGT UND WER HÄLT, getrennt benannt. Bei einer Organisation bleibt der
 * Zugang dort, auch wenn die Person, die gefragt hat, geht. Wer das nicht
 * weiß, widerruft beim Falschen.
 */
export async function PersonAccessSection({ requesters }: { requesters: AccessRequester[] }) {
  const t = await getTranslations("account.personAccess");
  if (requesters.length === 0) return null;

  return (
    <section
      id="person-access"
      className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      <ul className="mt-5 space-y-4">
        {requesters.map((requester) => {
          const hasOpen = requester.requested.length > 0;
          const org = requester.org;

          return (
            <li
              key={requester.key}
              className={`rounded-2xl border p-4 ${
                hasOpen ? "border-amber-200 bg-amber-50/50" : "border-slate-200"
              }`}
            >
              {/* ----------------------------------------------------------
                  Wer da fragt.
                  ---------------------------------------------------------- */}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-slate-950">
                  {org ? org.name : (requester.askedByName ?? t("unknownRequester"))}
                </p>
                {org && requester.askedByName ? (
                  <p className="text-xs text-slate-600">
                    {t("askedBy", { name: requester.askedByName })}
                  </p>
                ) : null}
              </div>

              {requester.askedByHeadline && !org ? (
                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                  {requester.askedByHeadline}
                </p>
              ) : null}

              {org?.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{org.description}</p>
              ) : null}

              {org ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  {org.locationRegion ? <span>{org.locationRegion}</span> : null}
                  {org.focus.length > 0 ? <span>{org.focus.join(" · ")}</span> : null}
                  {org.websiteUrl ? (
                    // `rel` ist hier nicht Gewohnheit, sondern nötig: Der Text
                    // stammt von der fragenden Seite, und der Link führt aus
                    // dem Produkt heraus.
                    <a
                      href={org.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener nofollow"
                      className="underline underline-offset-2"
                    >
                      {t("website")}
                    </a>
                  ) : null}
                </p>
              ) : null}

              {/* WER HÄLT DEN ZUGANG. Bei einer Organisation bleibt er dort,
                  auch wenn die fragende Person geht - das gehört zur
                  Entscheidung, nicht in eine Fußnote. */}
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {t(`holder.${requester.holder}`)}
              </p>

              {/* ----------------------------------------------------------
                  Was offen ist - je Umfang eine Entscheidung.
                  ---------------------------------------------------------- */}
              {hasOpen ? (
                <div className="mt-4 border-t border-amber-200 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                    {t("requestedTitle")}
                  </h3>
                  <ul className="mt-2 space-y-3">
                    {requester.requested.map((grant) => (
                      <li key={grant.id}>
                        <p className="text-sm font-medium text-slate-950">
                          {t(`scopes.${grant.scope}`)}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-600">
                          {t(`scopeHints.${grant.scope}`)}
                        </p>
                        {grant.requestNote ? (
                          <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 text-sm italic leading-6 text-slate-700">
                            „{grant.requestNote}“
                          </blockquote>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
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

              {/* ----------------------------------------------------------
                  Was schon gilt - jederzeit einzeln zurückzunehmen.
                  ---------------------------------------------------------- */}
              {requester.active.length > 0 ? (
                <div className={`mt-4 ${hasOpen ? "border-t border-amber-200 pt-3" : ""}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t("activeTitle")}
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {requester.active.map((grant) => (
                      <li
                        key={grant.id}
                        className="flex flex-wrap items-center justify-between gap-3"
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
            </li>
          );
        })}
      </ul>

      {/* WAS NIE DABEI IST, steht dabei. Sonst müsste man es glauben. */}
      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
        {t("neverShared")}
      </p>
    </section>
  );
}
