"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConnectProblemForm } from "@/features/connect/ConnectProblemForm";
import { SubmitButton } from "@/features/ui/SubmitButton";
import {
  publicationFields,
  type PublicationFields,
  type PublicationPreview,
} from "./developmentModel";
import { publishWorkspaceAction } from "./developmentActions";
import { card, button } from "./styles";
export function PublicationForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: PublicationPreview;
}) {
  const t = useTranslations("problemWorkspace.development"),
    c = useTranslations("connect");
  const [preview, setPreview] = useState<PublicationFields | null>(null);
  const [draft, setDraft] = useState<PublicationFields | null>(null);
  return (
    <>
      {!preview && (
        <div>
          <ConnectProblemForm
            problem={
              draft
                ? { ...draft, id: initial.problem?.id ?? "", status: "active" }
                : (initial.problem ?? undefined)
            }
            canPublish={initial.can_publish}
            t={c}
            previewLabel={t("preview")}
            action={(form) => {
              const next = publicationFields(form);
              setDraft(next);
              setPreview(next);
            }}
          />
        </div>
      )}
      {preview && (
        <section className={card} aria-label={t("preview")}>
          <h2 className="text-2xl font-semibold">{t("preview")}</h2>
          <p>{t("publicAuthor")}</p>
          <h3 className="break-words text-xl font-semibold">{preview.title}</h3>
          <p className="whitespace-pre-wrap break-words">
            {preview.description}
          </p>
          <dl className="space-y-3 break-words">
            <div>
              <dt>{c("problems.form.intent")}</dt>
              <dd>{c(`problems.intents.${preview.author_intent}`)}</dd>
            </div>
            <div>
              <dt>{c("filters.scope")}</dt>
              <dd>{c(`scopes.${preview.geographic_scope}`)}</dd>
            </div>
            {(["locations", "topics", "industries"] as const).map((key) => (
              <div key={key}>
                <dt>
                  {c(
                    key === "locations"
                      ? "problems.form.locations"
                      : `form.${key}`,
                  )}
                </dt>
                <dd>{preview[key].join(", ") || "—"}</dd>
              </div>
            ))}
            <div>
              <dt>{c("problems.visibilityTitle")}</dt>
              <dd>{t(preview.visibility)}</dd>
            </div>
            <div>
              <dt>{c("problems.outlivesLabel")}</dt>
              <dd>{t(preview.outlives_account ? "yes" : "no")}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="min-h-11 underline"
          >
            {t("backEdit")}
          </button>
          {initial.can_publish ? (
            <form
              action={publishWorkspaceAction.bind(
                null,
                workspaceId,
                initial.problem?.id ?? null,
              )}
              className="space-y-4"
            >
              <input
                type="hidden"
                name="publication"
                value={JSON.stringify(preview)}
              />
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="confirm"
                  required
                  className="mt-1"
                />
                {t("confirmPublish")}
              </label>
              <SubmitButton
                label={t(initial.problem ? "updatePublication" : "publish")}
                pendingLabel={t("saving")}
                className={button}
              />
            </form>
          ) : (
            <p role="status">{t("profileRequired")}</p>
          )}
        </section>
      )}
    </>
  );
}
