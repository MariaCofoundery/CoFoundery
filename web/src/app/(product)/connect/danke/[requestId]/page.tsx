import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectContactRequests } from "@/features/connect/connectData";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";
import { sendThanksAction } from "@/features/connect/thanks/thanksActions";
import { listMyThanks } from "@/features/connect/thanks/thanksData";
import { HELP_TYPES, THANKS_BODY_MAX, THANKS_OUTCOMES } from "@/features/connect/thanks/thanksModel";

/** Danke sagen: zwei Fragen und ein Satz, alles freiwillig bis auf "Wobei?". Das Herz entsteht erst durch dieses Danke. */
export default async function ThanksPage({ params, searchParams }: { params: Promise<{ requestId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { requestId } = await params;
  const query = await searchParams;
  const { client, user } = await requireConnectMember(`/connect/danke/${requestId}`);
  const t = await getTranslations("connect");
  const [requests, thanks] = await Promise.all([getConnectContactRequests(client, user.id), listMyThanks(client)]);
  const request = requests.find((row) => row.id === requestId && row.status === "accepted");
  if (!request) notFound();
  if (thanks.some((row) => row.requestId === requestId && row.direction === "sent")) redirect("/connect/contacts");
  const name = request.sender_user_id === user.id ? request.recipient_display_name_snapshot : request.sender_display_name_snapshot;

  const chip = "flex min-h-11 cursor-pointer items-center rounded-full border border-slate-300 bg-white px-4 text-[15px] has-[:checked]:border-violet-700 has-[:checked]:bg-violet-700 has-[:checked]:font-semibold has-[:checked]:text-white";
  return (
    <main className="mx-auto max-w-xl px-5 py-10" data-connect-thanks-form>
      <Link href="/connect/contacts" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("contact.title")}</Link>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#0b1f3a]">{t("thanks.title", { name })}</h1>
      <p className="mt-2 text-base leading-7 text-slate-700">{t("thanks.lead")}</p>
      {query.error ? <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t("thanks.invalid")}</p> : null}
      <form action={sendThanksAction} className="mt-6 space-y-6">
        <input type="hidden" name="request_id" value={requestId} />
        <fieldset>
          <legend className="text-[15px] font-semibold">{t("thanks.whatFor")} <span className="font-normal text-slate-600">{t("thanks.severalOk")}</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {HELP_TYPES.map((type) => <label key={type} className={chip}><input type="checkbox" name="help_type" value={type} className="sr-only" />{t(`thanks.types.${type}`)}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[15px] font-semibold">{t("thanks.whatBecame")} <span className="font-normal text-slate-600">{t("thanks.optional")}</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {THANKS_OUTCOMES.map((outcome) => <label key={outcome} className={chip}><input type="radio" name="outcome" value={outcome} className="sr-only" />{t(`thanks.outcomeChoice.${outcome}`)}</label>)}
          </div>
        </fieldset>
        <div>
          <label htmlFor="thanks-body" className="text-[15px] font-semibold">{t("thanks.words", { name })} <span className="font-normal text-slate-600">{t("thanks.optional")}</span></label>
          <textarea id="thanks-body" name="body" rows={3} maxLength={THANKS_BODY_MAX} placeholder={t("thanks.placeholder")} className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white p-3 text-base leading-6" />
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input type="checkbox" name="show" className="mt-1 h-5 w-5" />
          <span className="text-[15px] leading-6"><strong>{t("thanks.showTitle", { name })}</strong><br /><span className="text-sm text-slate-600">{t("thanks.showNote")}</span></span>
        </label>
        <div className="flex flex-col gap-2">
          <ConnectSubmitButton label={t("thanks.send")} pendingLabel="…" className="min-h-[54px] rounded-2xl bg-[linear-gradient(90deg,#5b3df5,#0a88c2)] px-5 text-lg font-bold text-white" />
          <Link href="/connect/contacts" className="inline-flex min-h-11 items-center justify-center text-[15px] text-slate-600">{t("thanks.notNow")}</Link>
        </div>
      </form>
    </main>
  );
}
