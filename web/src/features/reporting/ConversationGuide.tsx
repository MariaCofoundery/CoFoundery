type Props = {
  questions: string[];
  enabled: boolean;
  mode?: "match" | "self";
  sections?: unknown[];
};

export function ConversationGuide({ questions, enabled, mode = "match", sections }: Props) {
  if (!enabled || questions.length === 0) {
    return null;
  }

  const sectionMap = parsePremiumSections(sections);
  const premiumGuide = sectionMap.get("conversation_guide");
  const premiumPlan = sectionMap.get("work_agreements_30_60_90");

  const checklistQuestions = questions
    .filter((entry) => entry.startsWith("[ ] "))
    .map((entry) => entry.replace(/^\[ \]\s*/, "").trim());
  const plan30 = questions
    .filter((entry) => entry.startsWith("PLAN30|"))
    .map((entry) => entry.replace(/^PLAN30\|/, "").trim());
  const plan60 = questions
    .filter((entry) => entry.startsWith("PLAN60|"))
    .map((entry) => entry.replace(/^PLAN60\|/, "").trim());
  const plan90 = questions
    .filter((entry) => entry.startsWith("PLAN90|"))
    .map((entry) => entry.replace(/^PLAN90\|/, "").trim());
  const fallbackQuestions = questions.filter(
    (entry) =>
      !entry.startsWith("[ ] ") &&
      !entry.startsWith("PLAN30|") &&
      !entry.startsWith("PLAN60|") &&
      !entry.startsWith("PLAN90|")
  );
  const visibleQuestions =
    premiumGuide?.checklist && premiumGuide.checklist.length > 0
      ? premiumGuide.checklist.map((entry) => entry.replace(/^\[ \]\s*/, "").trim())
      : checklistQuestions.length > 0
        ? checklistQuestions
        : fallbackQuestions;
  const planItems =
    premiumPlan?.checklist && premiumPlan.checklist.length > 0 ? premiumPlan.checklist : [
      ...plan30.map((item) => `30|${item}`),
      ...plan60.map((item) => `60|${item}`),
      ...plan90.map((item) => `90|${item}`),
    ];
  const parsedPlan30 = planItems
    .filter((entry) => entry.startsWith("30|"))
    .map((entry) => entry.replace(/^30\|/, "").trim());
  const parsedPlan60 = planItems
    .filter((entry) => entry.startsWith("60|"))
    .map((entry) => entry.replace(/^60\|/, "").trim());
  const parsedPlan90 = planItems
    .filter((entry) => entry.startsWith("90|"))
    .map((entry) => entry.replace(/^90\|/, "").trim());

  const intro =
    mode === "self"
      ? "Nutze diese Leitfragen als strukturierte Reflexion für dein eigenes Gründungsprofil."
      : "Nutzt die Leitfragen als Arbeitsrahmen für ein fokussiertes Alignment-Gespräch über Verantwortung, Erwartungen und Entscheidungen.";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-10">
      <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <GuideIcon />
        {premiumGuide?.title ?? "Gesprächsleitfaden"}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{intro}</p>
      <ul className="mt-8 space-y-4">
        {visibleQuestions.map((question, idx) => (
          <li key={`${idx}-${question}`} className="rounded-xl border border-slate-200/80 px-5 py-4 text-sm text-slate-700">
            {mode === "match" ? (
              <span className="inline-flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm border border-slate-400 text-[10px] text-slate-500">
                  ✓
                </span>
                <span>{question}</span>
              </span>
            ) : (
              question
            )}
          </li>
        ))}
      </ul>

      {mode === "match" && (parsedPlan30.length > 0 || parsedPlan60.length > 0 || parsedPlan90.length > 0) ? (
        <div className="mt-8 rounded-xl border border-slate-200/80 bg-slate-50/40 p-5">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            <PlanIcon />
            {premiumPlan?.title ?? "30/60/90-Tage Arbeitsabsprachen"}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PlanColumn title="30 Tage" items={parsedPlan30} />
            <PlanColumn title="60 Tage" items={parsedPlan60} />
            <PlanColumn title="90 Tage" items={parsedPlan90} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlanColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</p>
          {items.length === 0 ? (
        <p className="mt-2 text-sm leading-7 text-slate-500">Keine spezifischen Maßnahmen hinterlegt.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} className="text-sm leading-7 text-slate-700">
              {`[ ] ${item}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type PremiumSection = {
  id: string;
  title: string;
  checklist?: string[];
};

function parsePremiumSections(sections: unknown[] | undefined) {
  const map = new Map<string, PremiumSection>();
  if (!sections) return map;
  for (const raw of sections) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : null;
    const title = typeof entry.title === "string" ? entry.title : null;
    if (!id || !title) continue;
    map.set(id, {
      id,
      title,
      checklist: Array.isArray(entry.checklist) ? entry.checklist.filter((item): item is string => typeof item === "string") : undefined,
    });
  }
  return map;
}

function GuideIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
      <path d="M4 3h10a2 2 0 012 2v12H6a2 2 0 01-2-2V3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
      <path d="M4 5h12M4 10h12M4 15h8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
