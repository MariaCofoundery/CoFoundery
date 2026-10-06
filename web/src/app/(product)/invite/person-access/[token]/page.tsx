import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Eine Einladung zum Personenzugang ansehen - und erst auf Klick annehmen.
 *
 * ANSEHEN IST NICHT ANNEHMEN (Phase 12C.0b). Bis dahin rief diese Seite beim
 * Laden claim_advisor_person_invite auf: Ein Klick auf den Mail-Link, eine
 * Link-Vorschau oder ein Prefetch erzeugte die Anfragen und verbrauchte die
 * Einladung. Jetzt liest der Seitenaufruf nur (get_advisor_person_invite_preview);
 * eingeloest wird ausschliesslich ueber das Formular unten.
 *
 * Auch die Annahme erzeugt nur Anfragen, keine Zugaenge - die Zustimmung faellt
 * danach im Konto, Bereich fuer Bereich.
 *
 * DER TOKEN WIRD NIE GESPEICHERT, nur sein Hash verglichen. Er gilt nur fuer die
 * eingeladene, bestaetigte Adresse; das prueft die Datenbank.
 */
type Preview =
  | { state: "open"; advisor_name: string | null; org_name: string | null; scopes: string[]; note: string | null }
  | { state: "claimed" | "expired" | "revoked" | "self" | "unverified" | "unavailable" };

const SUCCESS = "/account?notice=invite_claimed#person-access";

export default async function ClaimPersonAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;
  const path = `/invite/person-access/${token}`;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const client = await createClient();
  const { data } = await client.rpc("get_advisor_person_invite_preview", { p_token_hash: tokenHash });
  const preview = (data ?? { state: "unavailable" }) as Preview;
  if (preview.state === "claimed") redirect(SUCCESS);

  async function claimAction() {
    "use server";
    const actionClient = await createClient();
    const { error } = await actionClient.rpc("claim_advisor_person_invite", { p_token_hash: tokenHash });
    if (!error) redirect(SUCCESS);
    // Doppelt abgeschickt: Die erste Einloesung hat schon gegriffen.
    const { data: after } = await actionClient.rpc("get_advisor_person_invite_preview", { p_token_hash: tokenHash });
    if ((after as Preview | null)?.state === "claimed") redirect(SUCCESS);
    redirect(`${path}?error=1`);
  }

  const t = await getTranslations("account.personAccess");
  if (preview.state !== "open") {
    const reason =
      preview.state === "expired" || preview.state === "revoked" || preview.state === "unverified" || preview.state === "self"
        ? t(`invitePage.${preview.state}`)
        : t("claimFailedText");
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-12">
        <h1 className="text-2xl font-semibold text-slate-950">{t("claimFailedTitle")}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{reason}</p>
        <a
          href="/account#person-access"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {t("claimFailedCta")}
        </a>
      </main>
    );
  }

  const name = preview.advisor_name ?? t("invitePage.requesterFallback");
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <section aria-labelledby="person-access-invite-title" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 id="person-access-invite-title" className="text-2xl font-semibold text-slate-950">{t("invitePage.title")}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {preview.org_name ? t("invitePage.introOrg", { name, org: preview.org_name }) : t("invitePage.intro", { name })}
        </p>
        <h2 className="mt-5 text-sm font-semibold text-slate-900">{t("invitePage.scopesTitle")}</h2>
        <ul className="mt-2 grid gap-2">
          {preview.scopes.map((scope) => (
            <li key={scope} className="rounded-xl border border-slate-200 px-4 py-3">
              <span className="block text-sm font-medium text-slate-900">{t.has(`scopes.${scope}`) ? t(`scopes.${scope}`) : scope}</span>
              {t.has(`scopeHints.${scope}`) ? <span className="mt-1 block text-xs leading-5 text-slate-500">{t(`scopeHints.${scope}`)}</span> : null}
            </li>
          ))}
        </ul>
        {preview.note ? (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            <span className="font-medium text-slate-800">{t("invitePage.noteLabel")}:</span> {preview.note}
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-slate-600">{t("invitePage.whatHappens")}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("neverShared")}</p>
        {errorParam ? <p role="alert" className="mt-4 text-sm text-red-700">{t("invitePage.error")}</p> : null}
        {/* Ein Knopf, ein Formular: eingeloest wird nur auf diesen Klick. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form action={claimAction}>
            <button className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
              {t("invitePage.accept")}
            </button>
          </form>
          <a href="/account#person-access" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
            {t("invitePage.notNow")}
          </a>
        </div>
      </section>
    </main>
  );
}
