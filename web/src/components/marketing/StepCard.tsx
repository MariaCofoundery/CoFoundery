type StepCardProps = {
  step: string;
  title: string;
  text: string;
};

export function StepCard({ step, title, text }: StepCardProps) {
  return (
    <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-6">
      <p className="font-[var(--font-display)] text-xs tracking-[0.2em] text-[color:var(--accent-dark)]">
        {step}
      </p>
      <h3 className="mt-3 text-xl">{title}</h3>
      <p className="mt-2 leading-7 text-[color:var(--muted)]">{text}</p>
    </article>
  );
}
