import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectVentures, ventureLogoUrl } from "@/features/connect/connectVentureData";
import {
  deleteConnectVentureAction,
  setConnectVentureStatusAction,
} from "@/features/connect/connectVentureActions";
import { ConnectVentureForm } from "@/features/connect/ConnectVentureForm";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { VENTURE_MAX } from "@/features/connect/connectTypes";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { knownKey } from "@/i18n/knownKey";

const card = "rounded-3xl border border-slate-200 bg-white p-6";
const SAVED_KEYS = ["venture", "venture_deleted"];

/**
 * Was jemand aufgebaut hat.
 *
 * Eine eigene Seite statt eines weiteren Abschnitts im Profilformular: Fuenf
 * Eintraege mit je fuenf Feldern haetten das Formular auf das Dreifache
 * gebracht, und man haette sie alle auf einmal speichern muessen. Hier ist
 * jeder Eintrag fuer sich.
 */
export default async function ConnectVenturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember("/connect/ventures/mine");
  const ventures = await getConnectVentures(client, user.id);

  const errorKey = knownKey(params.error, CONNECT_ERROR_KEYS);
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const editing = ventures.find((venture) => venture.id === params.edit) ?? null;
  const atLimit = ventures.length >= VENTURE_MAX;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href="/connect/profile"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600"
      >
        ← {t("ventures.back")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("ventures.title")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("ventures.text")}</p>
      <p className="mt-3 text-sm text-slate-500">
        {t("ventures.count", { count: ventures.length, max: VENTURE_MAX })}
      </p>

      {saved ? (
        <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          {t(saved === "venture_deleted" ? "ventures.deleted" : "ventures.saved")}
        </p>
      ) : null}
      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      {ventures.length ? (
        <div className="mt-6 space-y-4">
          {ventures.map((venture) => (
            <article key={venture.id} className={card}>
              <div className="flex flex-wrap items-start gap-4">
                {ventureLogoUrl(venture) ? (
                  // Ein Logo aus dem eigenen Speicher mit signierter Adresse.
                  // next/image braeuchte dafuer eine konfigurierte Domain und
                  // wuerde die Signatur ueber den Optimierer schicken.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ventureLogoUrl(venture) as string}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 object-contain"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold">{venture.name}</h2>
                  {venture.role_label ? (
                    <p className="mt-1 text-sm text-slate-500">{venture.role_label}</p>
                  ) : null}
                </div>
              </div>

              {venture.status === "hidden" ? (
                <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">
                  {t("ventures.hiddenNote")}
                </p>
              ) : null}

              <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
                {venture.what_it_does}
              </p>

              {/* Die Zielgruppe steht abgesetzt, nicht im Fliesstext: Wer sie
                  ueberfliegen kann, kann jemanden weiterempfehlen. */}
              <div className="mt-4 rounded-2xl border-l-[3px] border-violet-400 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                  {t("ventures.audienceHeading")}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{venture.audience}</p>
              </div>

              {venture.motivation ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                    {t("ventures.motivationHeading")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{venture.motivation}</p>
                </div>
              ) : null}

              {venture.website ? (
                <a
                  href={venture.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={t("ventures.openLinkHint")}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline"
                >
                  {t("ventures.openLink")}
                </a>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <Link
                  href={`/connect/ventures/mine?edit=${venture.id}`}
                  className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-semibold leading-[2.75rem]"
                >
                  {t("actions.edit")}
                </Link>
                <form action={setConnectVentureStatusAction}>
                  <input type="hidden" name="venture_id" value={venture.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={venture.status === "hidden" ? "active" : "hidden"}
                  />
                  <SubmitButton
                    label={t(venture.status === "hidden" ? "ventures.show" : "ventures.hide")}
                    pendingLabel={t("pending.save")}
                    className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-semibold"
                  />
                </form>
                <form action={deleteConnectVentureAction}>
                  <input type="hidden" name="venture_id" value={venture.id} />
                  <ConfirmSubmitButton
                    label={t("ventures.delete")}
                    question={t("ventures.deleteQuestion")}
                    confirmLabel={t("ventures.deleteConfirm")}
                    cancelLabel={t("ventures.deleteCancel")}
                    pendingLabel={t("pending.save")}
                    className="text-xs font-semibold text-slate-500 underline underline-offset-2"
                    confirmClassName="min-h-11 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-900"
                  />
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-semibold">{t("ventures.empty")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("ventures.emptyText")}</p>
        </section>
      )}

      {editing || !atLimit ? (
        <ConnectVentureForm venture={editing} className={`${card} mt-6`} />
      ) : (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {t("ventures.limitReached")}
        </p>
      )}
    </main>
  );
}
