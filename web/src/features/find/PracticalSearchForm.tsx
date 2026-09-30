import {
  DISCOVERY_REMOTE_MODE_OPTIONS,
  DISCOVERY_ROLE_OPTIONS,
} from "@/features/discovery/discoveryConfig";
import type {
  DiscoveryMustHaves,
  DiscoveryRemoteMode,
} from "@/features/discovery/discoveryTypes";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

export type PracticalSearchCopy = {
  role: string;
  roleLabel: (role: string) => string;
  expertise: string;
  expertisePlaceholder: string;
  expertiseHelp: string;
  location: string;
  locationPlaceholder: string;
  locationHelp: string;
  minimumAvailability: string;
  remote: string;
  remoteLabel: (mode: string) => string;
  apply: string;
  applying: string;
  reset: string;
};

/**
 * „Was muss praktisch passen?"
 *
 * ---------------------------------------------------------------------------
 * AUS DER ERGEBNISLISTE HERAUS UND IN DIE EIGENE SUCHE
 * ---------------------------------------------------------------------------
 *
 * Diese Felder standen bis zum 30.09.2026 auf der Ergebnisseite, eingeklappt
 * in einem Aufklapper über den Treffern. Dort mischten sich drei Ebenen: das
 * öffentliche Profil, die privaten Suchkriterien und die Ergebnisse — die
 * FIND-Spec nennt genau das in Abschnitt 3 als Grund für den Umbau.
 *
 * Jetzt stehen sie dort, wo alles Private steht: in „Deine Suche", als erste
 * der drei Ebenen. Die Ergebnisseite zeigt nur noch, wonach gerade gefiltert
 * wird, und verlinkt hierher.
 *
 * ---------------------------------------------------------------------------
 * ES IST EIN FORMULAR UND KEIN ZUSTAND IM BROWSER
 * ---------------------------------------------------------------------------
 *
 * Absichtlich weiter ein Server-Formular mit derselben Aktion wie vorher: Wer
 * die Kriterien ändert, ändert etwas Gespeichertes und nicht eine Ansicht.
 */
export function PracticalSearchForm({
  mustHaves,
  action,
  resetAction,
  copy,
  skills,
}: {
  mustHaves: DiscoveryMustHaves;
  action: (formData: FormData) => void | Promise<void>;
  resetAction: () => void | Promise<void>;
  copy: PracticalSearchCopy;
  /**
   * Die zweite Ebene — „Was soll die Person mitbringen?"
   *
   * IM SELBEN FORMULAR UND NICHT IN EINEM ZWEITEN. Die Serveraktion schreibt
   * alle praktischen Kriterien zusammen; zwei Formulare würden einander beim
   * Speichern leeren — wer die Rahmenbedingungen speichert, löschte damit die
   * Fähigkeiten. Getrennt sind sie durch die Überschriften, nicht durch das
   * Formular.
   */
  skills?: { title: string; intro: string; node: React.ReactNode };
}) {
  return (
    <form action={action} className="grid gap-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">{copy.role}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVERY_ROLE_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              name="requiredRolesAny"
              value={option.value}
              label={copy.roleLabel(option.value)}
              checked={mustHaves.requiredRolesAny.includes(option.value)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="text-sm font-semibold text-slate-900">{copy.expertise}</span>
          <input
            name="requiredExpertiseAny"
            defaultValue={mustHaves.requiredExpertiseAny.join(", ")}
            className={FIELD_CLASS}
            placeholder={copy.expertisePlaceholder}
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {copy.expertiseHelp}
          </span>
        </label>
        <label>
          <span className="text-sm font-semibold text-slate-900">{copy.location}</span>
          <input
            name="desiredLocationRegion"
            defaultValue={mustHaves.desiredLocationRegion ?? ""}
            className={FIELD_CLASS}
            placeholder={copy.locationPlaceholder}
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {copy.locationHelp}
          </span>
        </label>
        <label>
          <span className="text-sm font-semibold text-slate-900">
            {copy.minimumAvailability}
          </span>
          <input
            name="minimumAvailabilityHoursPerWeek"
            type="number"
            min={1}
            max={100}
            defaultValue={mustHaves.minimumAvailabilityHoursPerWeek ?? ""}
            className={FIELD_CLASS}
            placeholder="20"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">{copy.remote}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DISCOVERY_REMOTE_MODE_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              name="acceptedRemoteModes"
              value={option.value}
              label={copy.remoteLabel(option.value)}
              checked={mustHaves.acceptedRemoteModes.includes(
                option.value as DiscoveryRemoteMode,
              )}
            />
          ))}
        </div>
      </div>

      {skills && (
        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-xl font-semibold text-slate-900">{skills.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{skills.intro}</p>
          <div className="mt-4">{skills.node}</div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton
          label={copy.apply}
          pendingLabel={copy.applying}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
        />
        <button
          formAction={resetAction}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm text-slate-700"
        >
          {copy.reset}
        </button>
      </div>
    </form>
  );
}

function Checkbox({
  name,
  value,
  label,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-2 focus:ring-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}
