import { SignatureOverview } from "@/features/reporting/workstyle/SignatureOverview";
import {
  individualAreas,
  validProductProfile,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import { WorkstyleSignature } from "@/features/reporting/workstyle/WorkstyleSignature";
import "@/features/reporting/workstyle/report.css";
export function IndividualWorkstyle({
  profile,
  name = "Du",
  full = true,
}: {
  profile: ProductProfile;
  name?: string;
  full?: boolean;
}) {
  if (!validProductProfile(profile)) return null;
  return (
    <div className="ws-report space-y-7" lang="de">
      <p className="text-sm leading-6 text-slate-600">
        Deine Angaben zu konkreten Arbeitssituationen. Das
        Entwicklungsinstrument ist noch nicht validiert. Die Beschreibung gilt
        für diesen Stand deiner Selbstauskunft.
      </p>
      <SignatureOverview people={[{ id: profile.person_id, name, profile }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        {individualAreas(profile).map((area) => (
          <section
            key={area.key}
            className="ws-text-card rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h3 className="font-semibold">{area.title}</h3>
            <p className="mt-3 text-sm leading-6">{area.observation}</p>
            {area.evidence.length > 0 && (
              <>
                <p className="mt-3 text-sm leading-6">{area.benefit}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {area.context}
                </p>
              </>
            )}
            {area.missing > 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Für {area.missing} Situationen ist keine Einschätzung sichtbar.
              </p>
            )}
          </section>
        ))}
      </div>
      {full ? (
        <WorkstyleSignature
          people={[{ id: profile.person_id, name, profile }]}
        />
      ) : (
        <p className="text-sm text-slate-500">
          Die einzelnen Antwortpositionen stehen in der ausführlichen Fassung.
        </p>
      )}
    </div>
  );
}
