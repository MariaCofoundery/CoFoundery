import { getTranslations } from "next-intl/server";
import type { ProgramPerson } from "@/features/advisor/orgPeopleData";

const contactHref = (contact: string) => (/^https:\/\//.test(contact) ? contact : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? `mailto:${contact}` : null);

/**
 * "Wer ist wer" fuer die Startups (06.11.2026): die Menschen der Organisation, die ihre Karte fuer die Startups im
 * Programm freigegeben haben - mit dem Kontakt, den sie selbst angegeben haben. Nichts weiter.
 */
export async function ProgramPeople({ people }: { people: ProgramPerson[] }) {
  const t = await getTranslations("advisor.people");
  if (people.length === 0) return null;
  const orgs = [...new Map(people.map((person) => [person.orgId, person.orgName])).entries()];
  return (
    <section aria-labelledby="program-people-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="program-people-title" className="font-brand text-[24px] font-semibold text-slate-950">{t("startupTitle")}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">{t("startupText")}</p>
      {orgs.map(([orgId, orgName]) => (
        <div key={orgId} className="mt-4">
          {orgs.length > 1 ? <h3 className="text-sm font-bold text-slate-900">{orgName}</h3> : null}
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {people.filter((person) => person.orgId === orgId).map((person) => {
              const name = person.displayName || t("unnamed");
              const href = person.contact ? contactHref(person.contact) : null;
              return (
                <li key={`${person.programId}-${person.userId}`} className="flex gap-3 rounded-2xl border border-slate-200 p-4">
                  <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-[16px] font-bold text-violet-900">{name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="text-[15.5px] font-semibold text-slate-950">{name}</p>
                    <p className="text-[13px] text-slate-600">{[person.role === "owner" ? t("roleOwner") : t("roleAdvisor"), person.teamRole].filter(Boolean).join(" · ")}</p>
                    {person.headline ? <p className="mt-1 text-[14px] font-medium text-slate-900">{person.headline}</p> : null}
                    {person.about ? <p className="mt-1 whitespace-pre-line text-[14px] leading-6 text-slate-700">{person.about}</p> : null}
                    {person.contact ? (
                      <p className="mt-2 text-[14px]">
                        {href ? <a href={href} rel="noopener noreferrer" className="font-semibold text-violet-800 underline underline-offset-4">{person.contact}</a> : <span className="font-semibold text-slate-900">{person.contact}</span>}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
