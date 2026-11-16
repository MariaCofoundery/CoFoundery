import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectPerson } from "@/features/connect/connectPeopleData";
import { sendDirectThanksAction } from "@/features/connect/thanks/thanksActions";
import { ThanksForm } from "@/features/connect/thanks/ThanksForm";
import { DIRECT_VIA, type DirectVia } from "@/features/connect/thanks/thanksModel";
import { knownKey } from "@/i18n/knownKey";

/** Danke sagen ohne Gespraech: von einem Profil, Gesuch, Problem oder Unternehmen aus. Man wird dadurch nicht verbunden. */
export default async function DirectThanksPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { userId } = await params;
  const query = await searchParams;
  const { client, user } = await requireConnectMember(`/connect/danke/an/${userId}`);
  if (userId === user.id) redirect("/connect");
  const t = await getTranslations("connect");
  const person = await getConnectPerson(client, userId);
  if (!person) notFound();
  const via: DirectVia = (DIRECT_VIA as readonly string[]).includes(query.via ?? "") ? (query.via as DirectVia) : "person";
  const viaId = via === "person" ? "" : (query.id ?? "");
  const name = person.display_name;
  const back = `/connect/people/${userId}`;
  return (
    <main className="mx-auto max-w-xl px-5 py-10" data-connect-thanks-form data-connect-thanks-direct>
      <Link href={back} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {name}</Link>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#0b1f3a]">{t("thanks.directTitle", { name })}</h1>
      <p className="mt-2 text-base leading-7 text-slate-700">{t("thanks.directLead")}</p>
      <ThanksForm
        action={sendDirectThanksAction}
        hidden={[{ name: "helper_user_id", value: userId }, { name: "via", value: via }, { name: "via_id", value: viaId }]}
        name={name} t={t} backHref={back}
        errorKey={knownKey(query.error, ["invalid", "recent", "limit", "failed"] as const)}
        note={t("thanks.directNote", { name })}
      />
    </main>
  );
}
