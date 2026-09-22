import type { PersonCore } from "@/features/profile/personCoreData";

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
 * LEERE FELDER ERSCHEINEN NICHT. Ein "keine Angabe" in einem Profil, das
 * jemand ausdruckt und weitergibt, liest sich wie ein Mangel - obwohl die
 * Person die Angabe vielleicht bewusst nicht gemacht hat.
 */
export function FounderProfileBase({
  core,
  copy,
}: {
  core: PersonCore | null;
  copy: {
    title: string;
    region: string;
    remoteMode: (mode: string) => string;
    expertise: string;
    industries: string;
    linkedin: string;
    empty: string;
    completeHref: string;
    completeCta: string;
  };
}) {
  const region = [core?.location_region, core?.remote_mode ? copy.remoteMode(core.remote_mode) : null]
    .filter(Boolean)
    .join(" · ");
  const expertise = core?.expertise?.filter((entry) => entry.trim().length > 0) ?? [];
  const industries = core?.industries?.filter((entry) => entry.trim().length > 0) ?? [];
  const hasAnything = Boolean(core?.bio?.trim()) || region.length > 0 || expertise.length > 0 || industries.length > 0;

  return (
    <section className="page-section mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>

      {hasAnything ? (
        <>
          {core?.bio?.trim() ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{core.bio}</p>
          ) : null}

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {region ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.region}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-800">{region}</dd>
              </div>
            ) : null}
            {core?.linkedin_url ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.linkedin}</dt>
                {/* Ausgeschrieben und nicht als Link-Text: Ein gedrucktes
                    Profil muss die Adresse lesbar enthalten. */}
                <dd className="mt-1 break-all text-sm leading-6 text-slate-800">{core.linkedin_url}</dd>
              </div>
            ) : null}
            {expertise.length > 0 ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.expertise}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-800">{expertise.join(" · ")}</dd>
              </div>
            ) : null}
            {industries.length > 0 ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.industries}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-800">{industries.join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-7 text-slate-600">{copy.empty}</p>
          <a
            href={copy.completeHref}
            className="no-print mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {copy.completeCta}
          </a>
        </div>
      )}
    </section>
  );
}
