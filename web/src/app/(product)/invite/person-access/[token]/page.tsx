import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Eine Einladung annehmen.
 *
 * DER LINK ÖFFNET NUR DIE ANFRAGE. Er erzeugt Anfragen im Konto, keine
 * Zugänge - die Zustimmung fällt dort, Bereich für Bereich. Deshalb landet man
 * hier auch nicht auf einer Seite mit einem großen "Einverstanden"-Knopf,
 * sondern direkt bei der Stelle, an der ohnehin alles steht, was man dazu
 * wissen muss.
 *
 * DER TOKEN WIRD NIE GESPEICHERT, nur sein Hash verglichen - er steht in genau
 * einer Mail und in dieser Adresszeile.
 *
 * UND ER GILT NUR FÜR DIE EINGELADENE ADRESSE. Ein Token ist ein
 * Inhaberpapier; wer den Link weiterleitet, gibt ihn weiter. Dass die
 * angemeldete Person dieselbe Adresse haben muss, prüft die Datenbank.
 */
export default async function ClaimPersonAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/person-access/${token}`)}`);
  }

  const client = await createClient();
  const { error } = await client.rpc("claim_advisor_person_invite", {
    p_token_hash: createHash("sha256").update(token).digest("hex"),
  });

  if (!error) redirect("/account?notice=invite_claimed#person-access");

  const t = await getTranslations("account.personAccess");
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-semibold text-slate-950">{t("claimFailedTitle")}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">{t("claimFailedText")}</p>
      <a
        href="/account#person-access"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
      >
        {t("claimFailedCta")}
      </a>
    </main>
  );
}
