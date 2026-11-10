import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOwnValues } from "@/features/values/valuesData";
import { saveValuesAction, setValuesConnectShowAction, setValuesTeamShareAction } from "@/features/values/valuesActions";
import { ValuesEditor } from "@/features/values/ValuesEditor";
import { VALUE_KEYS, type ValueKey } from "@/features/values/valuesModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Meine Werte (Entwurf 10.11.2026): was mir wichtig ist, in meiner Reihenfolge und mit meinen Worten - und wer das sehen darf.
 * Standard: niemand. Jeder Weg ist einzeln; ein Teambeitritt oder ein Connect-Profil gibt nichts frei.
 */
export default async function ValuesPage({ searchParams }: { searchParams?: Promise<{ gespeichert?: string; fehler?: string }> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/me/profile/werte");
  const client = await createClient();
  const t = await getTranslations("profile.values");
  const own = await getOwnValues(client);
  const { data: memberships } = await client.from("founder_team_members").select("team_id").eq("user_id", user.id).limit(20);
  const teamIds = ((memberships ?? []) as { team_id: string }[]).map((row) => row.team_id);
  const { data: teams } = teamIds.length ? await client.from("founder_teams").select("id, name").in("id", teamIds) : { data: [] };
  const teamRows = (teams ?? []) as { id: string; name: string | null }[];
  const names = Object.fromEntries(VALUE_KEYS.map((key) => [key, t(`names.${key}`)])) as Record<ValueKey, string>;
  const hasValues = own.values.length > 0;

  const copy = {
    count: t.raw("count") as string, hint: t.raw("hint") as string, custom: t("custom"), customPlaceholder: t("customPlaceholder"), customAdd: t("customAdd"), yourOrder: t("yourOrder"), orderHint: t("orderHint"),
    meaning: t("meaning"), up: t("up"), down: t("down"), remove: t("remove"), violated: t("violated"), violatedPlaceholder: t("violatedPlaceholder"), save: t("save"), saveNote: t("saveNote"), names,
  };
  const switchClass = "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-slate-400 p-[3px] transition peer-checked:bg-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2 after:block after:h-7 after:w-7 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-6";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/me/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("back")}</Link>
      <h1 className="font-brand mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-700">{t("intro")}</p>
      {query.fehler === "1" ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("error")}</p> : query.gespeichert === "1" ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : null}

      <div className="mt-6">
        <ValuesEditor initial={own.values} violated={own.violatedNote ?? ""} copy={copy} action={saveValuesAction} />
      </div>

      <section id="teilen" aria-labelledby="values-share" className="mt-10 grid gap-3">
        <h2 id="values-share" className="font-brand text-2xl font-semibold text-slate-950">{t("shareTitle")}</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-700">{t("shareIntro")}</p>
        {!hasValues ? <p role="note" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("shareNeedsValues")}</p> : null}
        {teamRows.map((team) => {
          const shared = own.sharedTeamIds.includes(team.id);
          return (
            <form key={team.id} action={setValuesTeamShareAction} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <input type="hidden" name="teamId" value={team.id} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-slate-950">{t("shareTeam", { team: team.name ?? t("unnamedTeam") })}</span>
                <span className="mt-1 block text-[13.5px] leading-6 text-slate-700">{shared ? t("shareTeamOn") : t("shareTeamOff")}</span>
                <span className="mt-1 block text-xs text-slate-600">{t("shareTeamHint")}</span>
              </span>
              <label className="flex items-center gap-3">
                <input type="checkbox" name="share" value="yes" defaultChecked={shared} disabled={!hasValues} role="switch" className="peer sr-only" />
                <span aria-hidden="true" className={switchClass} />
                <span className="sr-only">{t("shareTeam", { team: team.name ?? t("unnamedTeam") })}</span>
              </label>
              <SubmitButton label={t("apply")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800" />
            </form>
          );
        })}
        <form action={setValuesConnectShowAction} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-slate-950">{t("shareConnect")}</span>
            <span className="mt-1 block text-[13.5px] leading-6 text-slate-700">{own.connectShow ? t("shareConnectOn") : t("shareConnectOff")}</span>
            <span className="mt-1 block text-xs text-slate-600">{t("shareConnectHint")}</span>
          </span>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="show" value="yes" defaultChecked={own.connectShow} disabled={!hasValues} role="switch" className="peer sr-only" />
            <span aria-hidden="true" className={switchClass} />
            <span className="sr-only">{t("shareConnect")}</span>
          </label>
          <SubmitButton label={t("apply")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800" />
        </form>
        <p className="text-[13px] leading-5 text-slate-600">{t("shareNever")}</p>
      </section>
    </main>
  );
}
