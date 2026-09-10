import Link from "next/link";

/**
 * Der Hinweis, dass zuerst ein Connect-Profil gebraucht wird.
 *
 * Steht dort, wo die Person sonst anfangen wuerde zu schreiben - nicht hinter
 * dem Absenden-Knopf. Der Weg zum Profil traegt den Rueckweg mit, damit man
 * danach dort weitermacht, wo man war.
 */
export function ConnectProfileRequired({
  returnTo,
  copy,
}: {
  returnTo: string;
  copy: { title: string; text: string; cta: string };
}) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{copy.title}</p>
      <p className="mt-2 text-sm leading-6 text-amber-900">{copy.text}</p>
      <Link
        href={`/connect/profile?next=${encodeURIComponent(returnTo)}`}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
      >
        {copy.cta}
      </Link>
    </div>
  );
}
