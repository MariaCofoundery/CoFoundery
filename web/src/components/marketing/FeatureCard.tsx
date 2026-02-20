type FeatureCardProps = {
  title: string;
  text: string;
};

export function FeatureCard({ title, text }: FeatureCardProps) {
  return (
    <article className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-6 shadow-[0_16px_30px_rgba(18,29,43,0.08)]">
      <div className="mb-3 h-2 w-16 rounded-full bg-[color:var(--accent)]" />
      <h3 className="font-[var(--font-display)] text-lg">{title}</h3>
      <p className="mt-2 leading-7 text-[color:var(--muted)]">{text}</p>
    </article>
  );
}
