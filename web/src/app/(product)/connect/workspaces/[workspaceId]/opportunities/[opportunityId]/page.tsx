import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { readWorkspace } from "@/features/connect/workspaces/data";
import type {
  WorkspaceDevelopment,
  VentureChoices,
} from "@/features/connect/workspaces/developmentModel";
import { OpportunityForm } from "@/features/connect/workspaces/OpportunityForm";
import {
  archiveOpportunityAction,
  linkOpportunityVentureAction,
} from "@/features/connect/workspaces/developmentActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { card, field, button } from "@/features/connect/workspaces/styles";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; opportunityId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspaceId, opportunityId } = await params;
  const { client, workspace: w } = await readWorkspace(workspaceId);
  const { data, error } = await client.rpc(
    "get_problem_workspace_development",
    { p_workspace: w.id },
  );
  const o = (data as WorkspaceDevelopment | null)?.opportunities.find(
    (o) => o.id === opportunityId,
  );
  if (error || !o) notFound();
  const editable =
    w.role === "owner" && w.status === "active" && o.status === "active";
  const choices =
    editable && !o.has_venture
      ? await client.rpc("list_problem_opportunity_ventures", {
          p_workspace: w.id,
        })
      : null;
  const v = choices?.data as VentureChoices | null;
  const t = await getTranslations("problemWorkspace.development"),
    common = await getTranslations("problemWorkspace");
  const query = await searchParams;
  return (
    <>
      <Link
        href={`/connect/workspaces/${w.id}`}
        className="min-h-11 py-3 underline"
      >
        {t("backWorkspace")}
      </Link>
      <h1 className="break-words text-3xl font-semibold">{o.title}</h1>
      <p>
        {common(o.status)} · {common("private")}
      </p>
      {query.error && <p role="alert">{common("error")}</p>}
      {query.saved && <p role="status">{common("saved")}</p>}
      <section className={card}>
        <h2 className="font-semibold">{t("affectedGroup")}</h2>
        <p className="whitespace-pre-wrap break-words">{o.affected_group}</p>
        <h2 className="font-semibold">{t("statement")}</h2>
        <p className="whitespace-pre-wrap break-words">
          {o.opportunity_statement}
        </p>
        <h2 className="font-semibold">{t("value")}</h2>
        <p className="whitespace-pre-wrap break-words">{o.possible_value}</p>
      </section>
      {!!o.entry_ids.length && (
        <section className={card}>
          <h2 className="font-semibold">{t("references")}</h2>
          <p>{t("referencesHelp")}</p>
          {w.entries
            .filter((e) => o.entry_ids.includes(e.id))
            .map((e) => (
              <blockquote
                key={e.id}
                className="whitespace-pre-wrap break-words border-l-2 pl-3"
              >
                <p>{e.content}</p>
                <footer className="text-sm">
                  {common(`types.${e.type}`)} · {e.author_name}
                </footer>
              </blockquote>
            ))}
        </section>
      )}
      {editable && (
        <details className={card}>
          <summary className="cursor-pointer py-3">{common("edit")}</summary>
          <OpportunityForm
            workspaceId={w.id}
            entries={w.entries}
            opportunity={o}
          />
        </details>
      )}
      {o.venture ? (
        <Link href={`/teams/${o.venture.id}`} className="break-words underline">
          {t("linkedWith", { name: o.venture.name ?? t("unnamedVenture") })}
        </Link>
      ) : o.has_venture ? (
        <p>{t("linkedRestricted")}</p>
      ) : null}
      {v && (
        <section className={card}>
          <h2 className="text-xl font-semibold">{t("developVenture")}</h2>
          <p>{t("ventureHelp")}</p>
          {v.can_create ? (
            <details>
              <summary className="cursor-pointer py-3 font-semibold">
                {t("newVenture")}
              </summary>
              <form
                action={linkOpportunityVentureAction.bind(
                  null,
                  w.id,
                  o.id,
                  "new",
                )}
                className="space-y-4"
              >
                <label className="block">
                  {t("ventureName")}
                  <input
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={o.title.slice(0, 120)}
                    className={field}
                  />
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="confirm"
                    required
                    className="mt-1"
                  />
                  {t("confirmNewVenture")}
                </label>
                <SubmitButton
                  label={t("createVenture")}
                  pendingLabel={t("saving")}
                  className={button}
                />
              </form>
            </details>
          ) : (
            <p>{t("founderRequired")}</p>
          )}
          {!!v.ventures.length && (
            <details>
              <summary className="cursor-pointer py-3 font-semibold">
                {t("existingVenture")}
              </summary>
              <form
                action={linkOpportunityVentureAction.bind(
                  null,
                  w.id,
                  o.id,
                  "existing",
                )}
                className="space-y-4"
              >
                <label className="block">
                  {t("chooseVenture")}
                  <select
                    name="venture"
                    required
                    defaultValue=""
                    className={field}
                  >
                    <option value="" disabled>
                      {t("chooseVenture")}
                    </option>
                    {v.ventures.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name ?? t("unnamedVenture")} ·{" "}
                        {team.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="confirm"
                    required
                    className="mt-1"
                  />
                  {t("confirmLink")}
                </label>
                <SubmitButton
                  label={t("linkVenture")}
                  pendingLabel={t("saving")}
                  className={button}
                />
              </form>
            </details>
          )}
        </section>
      )}
      {editable && (
        <details className={card}>
          <summary className="cursor-pointer py-3">
            {t("archiveOpportunity")}
          </summary>
          <form
            action={archiveOpportunityAction.bind(null, w.id, o.id)}
            className="space-y-4"
          >
            <label className="flex items-start gap-3">
              <input type="checkbox" name="confirm" required className="mt-1" />
              {t("archiveHelp")}
            </label>
            <SubmitButton
              label={t("archiveOpportunity")}
              pendingLabel={t("saving")}
              className={button}
            />
          </form>
        </details>
      )}
    </>
  );
}
