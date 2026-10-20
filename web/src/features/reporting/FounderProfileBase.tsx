import type { PersonCore } from "@/features/profile/personCoreData";
import { ClampedBio } from "@/features/reporting/ClampedBio";

/**
 * Wer die Person ist - der erste Abschnitt des Founderprofils.
 *
 * ES IST EINE ANSICHT, KEIN SPEICHER. Alles hier kommt aus `person_core`.
 * Eine eigene Profiltabelle waere eine Kopie, und Kopien laufen genau dann
 * auseinander, wenn jemand eine Angabe zurueckzieht: Wer seine Sichtbarkeit
 * aendert, aber in einer zweiten Tabelle steht die Angabe noch, hat nicht
 * widerrufen, sondern nur den einen Ort geaendert, den er kannte.
 * (`web/docs/founder-profile-and-advisor-access-brief.md`, Abschnitt 2.)
 *
 * ZWEI GESTALTEN, EIN INHALT. Als Karte (`tone="card"`) stand er bis
 * 21.10.2026 als erster Abschnitt. Jetzt steht er im Kopf von „Das bist du"
 * (`tone="onBrand"` auf der Marken-Flaeche, `tone="plain"` im Druckkopf):
 * Name, Headline und Ueber-dich sind eine Aussage, keine zwei Abschnitte.
 *
 * LEERE FELDER ERSCHEINEN NICHT. Ein "keine Angabe" in einem Profil, das
 * jemand ausdruckt und weitergibt, liest sich wie ein Mangel - obwohl die
 * Person die Angabe vielleicht bewusst nicht gemacht hat.
 */
export function FounderProfileBase({
  core,
  copy,
  tone = "card",
}: {
  core: PersonCore | null;
  copy: {
  /**
   * Die Ueberschrift darf fehlen: Im Gesamtbild traegt sie die Saeule
   * (`ProfilePillar`), und zweimal dasselbe uebereinander liest sich wie ein
   * Fehler. `null` heisst "steht schon darueber", nicht "hat keinen Namen".
   */
    title?: string | null;
    region: string;
    remoteMode: (mode: string) => string;
    expertise: string;
    industries: string;
    linkedin: string;
    empty: string;
    completeHref: string;
    completeCta: string;
    /** Nur im Kopf (`onBrand`): Knopf, der den am Telefon gekürzten Text öffnet. */
    moreLabel?: string;
    lessLabel?: string;
  };
  tone?: "card" | "onBrand" | "plain";
}) {
  const region = [core?.location_region, core?.remote_mode ? copy.remoteMode(core.remote_mode) : null]
    .filter(Boolean)
    .join(" · ");
  const expertise = core?.expertise?.filter((entry) => entry.trim().length > 0) ?? [];
  const industries = core?.industries?.filter((entry) => entry.trim().length > 0) ?? [];
  const hasAnything = Boolean(core?.bio?.trim()) || region.length > 0 || expertise.length > 0 || industries.length > 0;

  // Im Kopf ohne Karte. Die Marken-Flaeche druckt von selbst schwarz auf weiss
  // (globals.css), der Druckkopf traegt eigene Farben.
  const onBrand = tone === "onBrand";
  const plain = tone === "plain";
  const frame = tone === "card"
    ? "page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0"
    : "page-section";
  const bioClass = onBrand ? "text-white" : "text-slate-700";
  const labelClass = onBrand ? "text-white/85" : "text-slate-500";
  const valueClass = onBrand ? "text-white" : "text-slate-800";

  if (tone !== "card" && !hasAnything) {
    // Im Kopf kein Leertext - nur ein stiller Weg, und nicht im Ausdruck.
    if (!copy.completeCta) return null;
    return (
      <a
        href={copy.completeHref}
        className={`no-print mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 ${onBrand ? "text-white" : "text-slate-700"}`}
      >
        {copy.completeCta}
      </a>
    );
  }

  return (
    <section className={`${frame}${tone === "card" ? "" : plain ? " mt-3" : " mt-5"}`}>
      {copy.title ? (
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      ) : null}
      {hasAnything ? (
        <>
          {core?.bio?.trim() ? (
            onBrand && copy.moreLabel && copy.lessLabel ? (
              <div className="mt-3 max-w-3xl">
                <ClampedBio text={core.bio} className={`text-sm leading-7 ${bioClass}`} moreLabel={copy.moreLabel} lessLabel={copy.lessLabel} />
              </div>
            ) : (
              <p className={`mt-3 max-w-3xl text-sm leading-7 ${bioClass}`}>{core.bio}</p>
            )
          ) : null}

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {region ? (
              <div>
                <dt className={`text-xs font-semibold uppercase tracking-[0.12em] ${labelClass}`}>{copy.region}</dt>
                <dd className={`mt-1 text-sm leading-6 ${valueClass}`}>{region}</dd>
              </div>
            ) : null}
            {core?.linkedin_url ? (
              <div>
                <dt className={`text-xs font-semibold uppercase tracking-[0.12em] ${labelClass}`}>{copy.linkedin}</dt>
                {/* Ausgeschrieben und nicht als Link-Text: Ein gedrucktes
                    Profil muss die Adresse lesbar enthalten. */}
                <dd className={`mt-1 break-all text-sm leading-6 ${valueClass}`}>{core.linkedin_url}</dd>
              </div>
            ) : null}
            {expertise.length > 0 ? (
              <div>
                <dt className={`text-xs font-semibold uppercase tracking-[0.12em] ${labelClass}`}>{copy.expertise}</dt>
                <dd className={`mt-1 text-sm leading-6 ${valueClass}`}>{expertise.join(" · ")}</dd>
              </div>
            ) : null}
            {industries.length > 0 ? (
              <div>
                <dt className={`text-xs font-semibold uppercase tracking-[0.12em] ${labelClass}`}>{copy.industries}</dt>
                <dd className={`mt-1 text-sm leading-6 ${valueClass}`}>{industries.join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-7 text-slate-600">{copy.empty}</p>
          <a
            href={copy.completeHref}
            className="no-print mt-3 inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            {copy.completeCta}
          </a>
        </div>
      )}
    </section>
  );
}
