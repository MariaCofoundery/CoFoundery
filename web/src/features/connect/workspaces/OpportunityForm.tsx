import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import type { WorkspaceEntry } from "./model";
import type { Opportunity } from "./developmentModel";
import { saveOpportunityAction } from "./developmentActions";
import { card, button, field } from "./styles";
export async function OpportunityForm({
  workspaceId,
  entries,
  opportunity,
}: {
  workspaceId: string;
  entries: WorkspaceEntry[];
  opportunity?: Opportunity;
}) {
  const t = await getTranslations("problemWorkspace.development"),
    w = await getTranslations("problemWorkspace");
  return (
    <form
      action={saveOpportunityAction.bind(
        null,
        workspaceId,
        opportunity?.id ?? null,
      )}
      className={card}
    >
      <label className="block">
        {t("title")}
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={opportunity?.title}
          className={field}
        />
      </label>
      <label className="block">
        {t("affectedGroup")}
        <textarea
          name="affected_group"
          required
          maxLength={500}
          rows={2}
          defaultValue={opportunity?.affected_group}
          className={field}
        />
      </label>
      <label className="block">
        {t("statement")}
        <textarea
          name="opportunity_statement"
          required
          maxLength={2000}
          rows={4}
          defaultValue={opportunity?.opportunity_statement}
          className={field}
        />
      </label>
      <label className="block">
        {t("value")}
        <textarea
          name="possible_value"
          required
          maxLength={2000}
          rows={4}
          defaultValue={opportunity?.possible_value}
          className={field}
        />
      </label>
      {!!entries.length && (
        <fieldset className="space-y-3">
          <legend className="font-semibold">{t("references")}</legend>
          <p className="text-sm">{t("referencesHelp")}</p>
          {entries.map((e) => (
            <label key={e.id} className="flex items-start gap-3 break-words">
              <input
                type="checkbox"
                name="entries"
                value={e.id}
                defaultChecked={opportunity?.entry_ids.includes(e.id)}
                className="mt-1 shrink-0"
              />
              <span className="min-w-0">
                {w(`types.${e.type}`)} · {e.author_name}:{" "}
                {e.content.slice(0, 180)}
                {e.content.length > 180 ? "…" : ""}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <SubmitButton
        label={t("save")}
        pendingLabel={t("saving")}
        className={button}
      />
    </form>
  );
}
