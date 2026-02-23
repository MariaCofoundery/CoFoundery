import { upsertProfileBasicsAction } from "@/features/profile/actions";

type ProfileBasicsValues = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
};

type Props = {
  mode: "onboarding" | "edit";
  initialValues: ProfileBasicsValues;
  submitLabel: string;
  onSuccessRedirectTo?: string;
  variant?: "default" | "accent";
};

const SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance"] as const;
const INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;

function normalizePath(path: string | undefined, fallback: string) {
  const normalized = (path ?? "").trim();
  if (!normalized.startsWith("/")) {
    return fallback;
  }
  return normalized;
}

export function ProfileBasicsForm({
  mode,
  initialValues,
  submitLabel,
  onSuccessRedirectTo,
  variant = "default",
}: Props) {
  const successRedirect = normalizePath(onSuccessRedirectTo, "/dashboard");
  const errorRedirect = successRedirect;
  const cardClass =
    variant === "accent"
      ? "rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-violet-50/70 p-6"
      : "rounded-2xl border border-slate-200/80 bg-white/95 p-6";

  return (
    <section className={cardClass}>
      {mode === "onboarding" ? (
        <div className="mb-4 border-b border-cyan-200 pb-3">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Profil-Basics</h2>
          <p className="mt-1 text-xs text-slate-600">Du kannst das später im Dashboard ändern.</p>
        </div>
      ) : null}

      <form action={upsertProfileBasicsAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="onSuccessRedirectTo" value={successRedirect} />
        <input type="hidden" name="onErrorRedirectTo" value={errorRedirect} />

        <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
          Anzeigename
          <input
            name="displayName"
            required
            defaultValue={initialValues.display_name ?? ""}
            placeholder="Dein Name"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Fokus-Skill
          <select
            name="focusSkill"
            required
            defaultValue={initialValues.focus_skill ?? ""}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            {SKILLS.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Intention
          <select
            name="intention"
            required
            defaultValue={initialValues.intention ?? ""}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            {INTENTIONS.map((intention) => (
              <option key={intention} value={intention}>
                {intention}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
