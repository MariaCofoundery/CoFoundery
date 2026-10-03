import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ProblemWorkspace } from "./model";
import type { WorkspaceDevelopment as Development } from "./developmentModel";
import { workspaceSession } from "./data";
import { card, button } from "./styles";
export async function WorkspaceDevelopment({
  workspace: w,
}: {
  workspace: ProblemWorkspace;
}) {
  const { client } = await workspaceSession();
  const { data, error } = await client.rpc(
    "get_problem_workspace_development",
    { p_workspace: w.id },
  );
  const t = await getTranslations("problemWorkspace.development"),
    common = await getTranslations("problemWorkspace");
  if (error || !data) return <p role="alert">{common("error")}</p>;
  const d = data as Development;
  return (
    <>
      <section className={card}>
        <h2 className="text-xl font-semibold">{t("publication")}</h2>
        {d.publication ? (
          <>
            <p>
              {t(
                d.publication.status === "active"
                  ? "published"
                  : "publicationInactive",
              )}{" "}
              · {t(d.publication.visibility)}
            </p>
            <Link
              href={d.publication.href}
              className="inline-block min-h-11 py-3 underline"
            >
              {t("viewProblem")}
            </Link>
          </>
        ) : (
          <p>
            {t(d.has_publication ? "publicationRestricted" : "notPublished")}
          </p>
        )}
        {w.role === "owner" && w.status === "active" && (
          <Link href={`/connect/workspaces/${w.id}/publish`} className={button}>
            {t(d.has_publication ? "editPublication" : "publish")}
          </Link>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t("opportunities")}</h2>
        <p>{t("opportunityHelp")}</p>
        {w.role === "owner" && w.status === "active" && (
          <Link
            href={`/connect/workspaces/${w.id}/opportunities/new`}
            className={button}
          >
            {t("newOpportunity")}
          </Link>
        )}
        {!d.opportunities.length && <p>{t("emptyOpportunities")}</p>}
        {d.opportunities.map((o) => (
          <article key={o.id} className={card}>
            <Link
              href={`/connect/workspaces/${w.id}/opportunities/${o.id}`}
              className="break-words text-xl font-semibold underline"
            >
              {o.title}
            </Link>
            <p>{common(o.status)}</p>
            <p className="whitespace-pre-wrap break-words">
              {o.affected_group}
            </p>
            <p className="whitespace-pre-wrap break-words">
              {o.opportunity_statement}
            </p>
            {o.venture ? (
              <Link
                href={`/teams/${o.venture.id}`}
                className="block break-words underline"
              >
                {t("linkedWith", {
                  name: o.venture.name ?? t("unnamedVenture"),
                })}
              </Link>
            ) : o.has_venture ? (
              <p>{t("linkedRestricted")}</p>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
