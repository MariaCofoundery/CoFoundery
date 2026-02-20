type Props = {
  action: (formData: FormData) => Promise<void>;
};

const SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance"] as const;
const INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;

export function OnboardingCard({ action }: Props) {
  return (
    <section className="mb-14 rounded-2xl border border-slate-200/80 bg-white/95 p-10">
      <h2 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Onboarding</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Erzähl uns kurz, worauf du den Fokus legst. Das schärft dein Profil im Dashboard.
      </p>

      <form action={action} className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-700">
          Fokus-Skill
          <select
            name="focusSkill"
            required
            defaultValue=""
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
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
            defaultValue=""
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
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
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Profil speichern
          </button>
        </div>
      </form>
    </section>
  );
}
