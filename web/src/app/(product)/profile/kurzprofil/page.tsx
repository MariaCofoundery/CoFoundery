import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getPersonStrengths } from "@/features/capability/strengthData";
import { getOwnConnectProfile } from "@/features/connect/connectData";
import { ConsentSwitch } from "@/features/connect/ConsentSwitch";
import { ShortProfileCard } from "@/features/strengths/ShortProfileCard";
import { saveShortProfileAction } from "@/features/strengths/shortProfileActions";
import { getShortProfile } from "@/features/strengths/shortProfileData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const field =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

/**
 * „Ich in Kürze“: das Kurzprofil aus dem eigenen Stärkenbild.
 *
 * Es ist nur für das Netzwerk von Made2Found gedacht - kein Link nach draußen, kein Bild zum Herunterladen, nichts
 * Öffentliches. Das Teilen ist ein eigener Schalter (Voreinstellung aus), unabhängig von Team-, Advisor- und
 * FIND-Freigaben. Gezeigt wird nur, was die Person hier selbst einträgt oder anhakt.
 */
export default async function ShortProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/profile/kurzprofil");

  const client = await createClient();
  const [t, strengths, profile, network] = await Promise.all([
    getTranslations("strengths.shortProfile"),
    getPersonStrengths(client),
    getShortProfile(client, user.id),
    getOwnConnectProfile(client, user.id).catch(() => null),
  ]);
  const chosen = new Map((profile?.strengths ?? []).map((entry) => [entry.label, entry]));
  const networkActive = network?.status === "active";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <Link href="/me/profile" className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
        ← {t("back")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-700">{t("intro")}</p>

      {query.saved ? <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{t("saved")}</p> : null}
      {query.error ? <p role="alert" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("saveError")}</p> : null}

      {strengths.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-violet-50 p-5 text-[16px] text-slate-800">
          {t("noStrengths")}{" "}
          <Link href="/profile/strengths-interview" className="font-semibold underline underline-offset-4">{t("toStrengths")}</Link>
        </p>
      ) : (
        <form action={saveShortProfileAction} className="mt-8 flex flex-col gap-7">
          <div>
            <label htmlFor="tagline" className="text-[15px] font-semibold">{t("taglineLabel")}</label>
            <input id="tagline" name="tagline" type="text" maxLength={140} defaultValue={profile?.tagline ?? ""} placeholder={t("taglinePlaceholder")} className={field} />
          </div>

          <fieldset className="m-0 border-0 p-0">
            <legend className="text-[15px] font-semibold">{t("strengthsLegend")}</legend>
            <p className="mt-1 text-sm text-slate-600">{t("strengthsHint")}</p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {strengths.map((strength) => {
                const label = strength.label ?? strength.statement;
                const current = chosen.get(label.slice(0, 60));
                return (
                  <li key={strength.id} className="rounded-2xl border border-slate-200 p-4">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[16px] font-semibold">
                      <input type="checkbox" name="strength" value={strength.id} defaultChecked={Boolean(current)} className="size-5" />
                      {label}
                    </label>
                    <label htmlFor={`quote_${strength.id}`} className="mt-2 block text-sm text-slate-600">{t("quoteLabel")}</label>
                    <input id={`quote_${strength.id}`} name={`quote_${strength.id}`} type="text" maxLength={200} defaultValue={current?.quote ?? ""} className={field} />
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="seeks" className="text-[15px] font-semibold">{t("seeksLabel")}</label>
              <input id="seeks" name="seeks" type="text" maxLength={200} defaultValue={profile?.seeks ?? ""} className={field} />
            </div>
            <div>
              <label htmlFor="offers" className="text-[15px] font-semibold">{t("offersLabel")}</label>
              <input id="offers" name="offers" type="text" maxLength={200} defaultValue={profile?.offers ?? ""} className={field} />
            </div>
          </div>

          <ConsentSwitch
            name="shared"
            title={t("shareTitle")}
            effect={t("shareEffect")}
            offEffect={t("shareOff")}
            defaultChecked={profile?.sharedInNetwork ?? false}
          />
          {profile?.sharedInNetwork && !networkActive ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {t("needsNetworkProfile")}{" "}
              <Link href="/connect/profile" className="font-semibold underline underline-offset-4">{t("toNetworkProfile")}</Link>
            </p>
          ) : null}

          <SubmitButton
            label={t("save")}
            pendingLabel={t("savePending")}
            className="inline-flex min-h-12 w-fit items-center rounded-xl bg-slate-950 px-6 font-semibold text-white"
          />
        </form>
      )}

      {profile ? (
        <section className="mt-10 flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{t("previewTitle")}</h2>
          <p className="text-sm text-slate-600">{profile.sharedInNetwork ? t("previewShared") : t("previewPrivate")}</p>
          <ShortProfileCard profile={profile} />
        </section>
      ) : null}
    </main>
  );
}
