import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectConversation } from "@/features/connect/connectData";
import { sendThanksAction } from "@/features/connect/thanks/thanksActions";
import { ThanksForm } from "@/features/connect/thanks/ThanksForm";
import { listMyThanks } from "@/features/connect/thanks/thanksData";
import { knownKey } from "@/i18n/knownKey";

/** Danke sagen nach einem Gespraech. Das Herz entsteht erst durch dieses Danke. */
export default async function ThanksPage({ params, searchParams }: { params: Promise<{ conversationId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { conversationId } = await params;
  const query = await searchParams;
  const { client } = await requireConnectMember(`/connect/danke/${conversationId}`);
  const t = await getTranslations("connect");
  const [conversation, thanks] = await Promise.all([getConnectConversation(client, conversationId), listMyThanks(client)]);
  if (!conversation || !conversation.counterpart_user_id) notFound();
  if (thanks.some((row) => row.conversationId === conversationId && row.direction === "sent")) redirect("/connect/contacts");
  const name = conversation.counterpart_display_name ?? "";
  return (
    <main className="mx-auto max-w-xl px-5 py-10" data-connect-thanks-form>
      <Link href="/connect/contacts" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("contact.title")}</Link>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#0b1f3a]">{t("thanks.title", { name })}</h1>
      <p className="mt-2 text-base leading-7 text-slate-700">{t("thanks.lead")}</p>
      <ThanksForm action={sendThanksAction} hidden={[{ name: "conversation_id", value: conversationId }]} name={name} t={t} backHref="/connect/contacts" errorKey={knownKey(query.error, ["invalid"] as const)} />
    </main>
  );
}
