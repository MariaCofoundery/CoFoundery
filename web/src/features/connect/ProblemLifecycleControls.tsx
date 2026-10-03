import { getTranslations } from "next-intl/server";
import { updateConnectProblemStatusAction } from "./connectProblemActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
export async function ProblemLifecycleControls({
  problem,
}: {
  problem: {
    id: string;
    status: string;
    title: string;
    description: string;
    visibility: string;
    moderation_blocked?: boolean;
  };
}) {
  const t = await getTranslations("connect.lifecycle");
  const actions =
    problem.status === "active"
      ? ["withdrawn", "resolved", "delete"]
      : problem.moderation_blocked
        ? ["delete"]
        : ["active", "delete"];
  return (
    <div className="mt-4 space-y-3">
      {problem.moderation_blocked && (
        <p className="text-sm">{t("restrictedProblem")}</p>
      )}
      {actions.map((action) => (
        <details key={action} className="rounded-xl border p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            {t(`problem.${action}`)}
          </summary>
          <form action={updateConnectProblemStatusAction} className="space-y-4">
            <input type="hidden" name="problem_id" value={problem.id} />
            <input type="hidden" name="status" value={action} />
            <input type="hidden" name="expected" value={problem.status} />
            {action === "active" && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                <h3 className="font-semibold">{problem.title}</h3>
                <p className="whitespace-pre-wrap break-words">
                  {problem.description}
                </p>
                <p>
                  {t(problem.visibility === "public" ? "public" : "members")}
                </p>
              </div>
            )}
            <p className="text-sm leading-6">
              {t(`problemConsequences.${action}`)}
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input name="confirm" type="checkbox" required className="mt-1" />
              {t("confirmConsequences")}
            </label>
            <SubmitButton
              label={t(`problem.${action}`)}
              pendingLabel={t("saving")}
              className="min-h-11 rounded-xl border px-4 py-2"
            />
          </form>
        </details>
      ))}
    </div>
  );
}
