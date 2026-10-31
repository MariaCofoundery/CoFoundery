import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/features/advisor/EmptyState";
import type { AccompaniedPersonNamed } from "@/features/advisor/orgData";

/**
 * Die Einzelpersonen, die ein Advisor begleitet - mit dem, was jede Person
 * freigegeben hat. Frueher ein Block in der Organisations-Karte; jetzt Teil
 * von „Begleitung". Der Name steht vorn, weil er selbst eine Freigabe ist:
 * Wer nur seine Faehigkeiten freigegeben hat, bleibt namenlos.
 */
export async function AccompaniedPeopleList({ people }: { people: AccompaniedPersonNamed[] }) {
  const t = await getTranslations("advisor.org");
  return people.length === 0 ? (
    <div className="mt-3">
      <EmptyState text={t("peopleEmpty")} actions={[{ href: "/advisor/einladen?art=person", label: t("peopleEmptyInvite"), primary: true }]} />
    </div>
  ) : (
    <ul className="mt-3 grid gap-3">
      {people.map((person) => (
        <li
          key={person.subjectUserId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <div>
            <span className="font-semibold text-slate-900">{person.name ?? t("personUnnamed")}</span>
            <span className="ml-2 text-slate-500">{t("personScopes", { count: person.scopes.length })}</span>
            {person.pendingScopes.length > 0 ? (
              <span className="ml-2 text-slate-500">{t("personPending", { count: person.pendingScopes.length })}</span>
            ) : null}
          </div>
          {/* Der Weg zur Ansicht steht nur da, wenn ueberhaupt etwas freigegeben
              ist - ein Link auf eine Seite, die nichts zeigen darf, ist kein Weg. */}
          {person.scopes.length > 0 ? (
            <Link
              href={`/advisor/person/${person.subjectUserId}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("personOpen")}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
