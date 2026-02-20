type Props = {
  questions: string[];
  enabled: boolean;
};

export function ConversationGuide({ questions, enabled }: Props) {
  if (!enabled || questions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-10">
      <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Gesprächsleitfaden</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Nutzt die stärksten Unterschiedsdimensionen als strukturierte Reflexion für euer Gründer-Alignment.
      </p>
      <ul className="mt-8 space-y-4">
        {questions.map((question, idx) => (
          <li key={`${idx}-${question}`} className="rounded-xl border border-slate-200/80 px-5 py-4 text-sm text-slate-700">
            {question}
          </li>
        ))}
      </ul>
    </section>
  );
}
