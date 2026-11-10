import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getTeamValues } from "@/features/values/valuesData";
import { ValuesPeek } from "@/features/values/ValuesPeek";
import { groupByUser, sharedGroups, valueName, type ValueKey } from "@/features/values/valuesModel";

/**
 * Im Founder Setup, Thema "Vision und Ziele" (Entwurf 10.11.2026): ein Hinweis auf die geteilten Werte und ein schneller Blick
 * darauf. Es wird nichts uebernommen oder vorausgefuellt - eine Vereinbarung entsteht nur durch Revision und Bestaetigung aller.
 * Ohne geteilte Werte erscheint die Karte nicht.
 */
export async function SetupValuesCard({ client, teamId }: { client: SupabaseClient; teamId: string }) {
  const { rows, sharing } = await getTeamValues(client, teamId);
  if (rows.length === 0) return null;
  const t = await getTranslations("teams.values.setupCard");
  const tv = await getTranslations("profile.values");
  const catalog = (key: ValueKey) => tv(`names.${key}`);
  const shared = sharedGroups(rows, catalog);
  const people = [...groupByUser(rows).entries()].map(([userId, list]) => ({
    name: sharing.find((entry) => entry.userId === userId)?.name || t("someone"),
    values: list.map((row) => ({ place: row.slot, name: valueName(row, catalog), meaning: row.meaning })),
  }));
  return (
    <section aria-labelledby="setup-values-title" className="rounded-3xl border border-[#e4e2f0] bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6">
      <h2 id="setup-values-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      {shared.length > 0 ? (
        <p className="mt-2 text-[14.5px] leading-6 text-slate-800">{t("shared", { names: shared.map((group) => group.name).join(", ") })}</p>
      ) : (
        <p className="mt-2 text-[14.5px] leading-6 text-slate-800">{people.length >= 2 ? t("noneShared") : t("onlyOne")}</p>
      )}
      <p className="mt-1 text-[13px] leading-5 text-slate-600">{t("note")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ValuesPeek people={people} label={t("peek")} title={t("peekTitle")} close={t("close")} place={t.raw("place") as string} />
        <Link href={`/teams/${teamId}/werte`} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("all")}</Link>
      </div>
    </section>
  );
}
