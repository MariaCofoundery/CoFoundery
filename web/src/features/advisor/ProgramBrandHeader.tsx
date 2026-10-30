import type { accentStyles } from "@/features/advisor/programAccent";

/**
 * Kopf einer Programmseite im Aussehen der Organisation: Verlauf aus ihren zwei Farben,
 * Logo (oder Anfangsbuchstabe), Name. Die oeffentliche Seite und die Code-Seite zeigen dasselbe.
 */
export function ProgramBrandHeader({
  orgName,
  slug,
  hasLogo,
  look,
  eyebrow,
}: {
  orgName: string;
  slug: string | null;
  hasLogo: boolean;
  look: ReturnType<typeof accentStyles>;
  eyebrow: string;
}) {
  return (
    <div className="relative overflow-hidden px-6 pb-8 pt-8 text-center sm:px-10" style={{ background: look.background, color: look.text }}>
      <div className="relative z-10 flex flex-col items-center">
        {hasLogo && slug ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/program-logo/${slug}`} alt="" className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lg" />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-2xl bg-current/10 text-3xl font-extrabold ring-1 ring-current/25">
            {orgName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] opacity-75">{eyebrow}</p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{orgName}</h1>
      </div>
    </div>
  );
}
