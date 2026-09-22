import { getTranslations } from "next-intl/server";
import {
  addDirectionStatementAction,
  editDirectionStatementAction,
  removeDirectionStatementAction,
} from "@/features/direction/directionStatementActions";
import {
  DIRECTION_FACETS,
  STATEMENT_MAX_LENGTH,
  STATEMENT_MIN_LENGTH,
} from "@/features/direction/directionInterviewGuide";
import {
  groupStatementsByFacet,
  type DirectionStatement,
} from "@/features/direction/directionStatementData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Meine Richtung" - was aus dem Gespräch bleibt.
 *
 * SCHRITT S3. Hier schreibt der MENSCH, nicht das Modell: Vorschläge gibt es
 * noch nicht, und die Seite sagt das auch. Der Bestätigungsweg steht damit
 * zuerst - wer ihn nachträglich um einen fertigen Vorschlagsstrom herumbaut,
 * bekommt einen Bestätigungsknopf statt einer Entscheidung.
 *
 * NACH FACETTEN GRUPPIERT, aber nur die, in denen etwas steht. Eine leere
 * Rubrik "Menschen, um die es mir geht" liest sich wie ein Mangel - obwohl
 * darüber vielleicht einfach nichts zu sagen ist.
 *
 * KEINE ZAHL, KEINE STÄRKE, KEINE REIHENFOLGE NACH WICHTIGKEIT. Die
 * Herkunft steht dabei, weil sie später zählt: Wer liest, was über ihn
 * dasteht, soll erkennen können, wessen Formulierung das ist.
 */
export async function DirectionStatements({ statements }: { statements: DirectionStatement[] }) {
  const t = await getTranslations("direction.statements");
  const groups = groupStatementsByFacet(statements, DIRECTION_FACETS);

  return (
    <section id="direction-statements" className="mt-8 scroll-mt-24">
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("text")}</p>

      {groups.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-600">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((group) => (
            <div key={group.facet}>
              <h3 className="text-sm font-semibold uppercase tracking-[.12em] text-violet-800">
                {t(`facets.${group.facet}`)}
              </h3>
              <ul className="mt-3 space-y-3">
                {group.statements.map((statement) => (
                  <li
                    key={statement.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    {/* Ändern heisst: derselbe Satz, neu geschrieben. Ein
                        eigener Bearbeiten-Modus wäre ein Zustand mehr für
                        eine Zeile Text. */}
                    <form action={editDirectionStatementAction} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="statementId" value={statement.id} />
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">{t("statementLabel")}</span>
                        <input
                          type="text"
                          name="statement"
                          defaultValue={statement.statement}
                          minLength={STATEMENT_MIN_LENGTH}
                          maxLength={STATEMENT_MAX_LENGTH}
                          required
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        />
                      </label>
                      <SubmitButton
                        label={t("edit")}
                        pendingLabel={t("editPending")}
                        className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                      />
                    </form>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        {t("originLabel")}: {t(`origins.${statement.origin}`)}
                      </span>
                      <form action={removeDirectionStatementAction}>
                        <input type="hidden" name="statementId" value={statement.id} />
                        <SubmitButton
                          label={t("remove")}
                          pendingLabel={t("removePending")}
                          className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                        />
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form
        action={addDirectionStatementAction}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h3 className="text-sm font-semibold text-slate-900">{t("addTitle")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
              {t("facetLabel")}
            </span>
            <select
              name="facet"
              required
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {DIRECTION_FACETS.map((facet) => (
                <option key={facet} value={facet}>
                  {t(`facets.${facet}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
              {t("statementLabel")}
            </span>
            <input
              type="text"
              name="statement"
              required
              minLength={STATEMENT_MIN_LENGTH}
              maxLength={STATEMENT_MAX_LENGTH}
              placeholder={t("statementPlaceholder")}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
          </label>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t("statementHint", { max: STATEMENT_MAX_LENGTH })}
        </p>
        <SubmitButton
          label={t("add")}
          pendingLabel={t("addPending")}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white"
        />
      </form>

      {/* Was es noch nicht gibt, steht da - statt eines leeren Blocks, der
          aussieht, als wäre etwas kaputt. */}
      <p className="mt-4 text-xs leading-5 text-slate-500">{t("pendingProposals")}</p>
    </section>
  );
}
