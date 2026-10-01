import { RESOURCE_KINDS, RESOURCE_LABEL_MAX, type ResourceKind } from "@/features/ai/resourceExtraction";
import type { PersonResource } from "@/features/ai/personResources";
import {
  addResourceAction,
  deleteResourceAction,
  updateResourceAction,
} from "@/features/profile/resourceActions";
import { ResourceKindFields } from "@/features/profile/ResourceKindFields";
import { ConfirmSubmitButton } from "@/features/ui/ConfirmSubmitButton";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * „Deine Ressourcen" — was jemand selbst festhält.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DAS VORHER NICHT GAB
 * ---------------------------------------------------------------------------
 *
 * Netzwerk, Zugänge und Angebote entstanden bisher ausschließlich als
 * Vorschläge aus den eigenen Connect-Texten. Wer dort nichts veröffentlicht
 * hatte, konnte in diesem Bereich nichts tun — er stand da und war leer, und
 * der einzige Weg hinaus führte nach Connect.
 *
 * Das war keine Entscheidung, sondern eine Lücke: Die Tabelle konnte eigene
 * Einträge von Anfang an (`origin` default 'self', `status` default
 * 'confirmed'), es fehlte nur das Formular.
 *
 * ---------------------------------------------------------------------------
 * ZWEI LISTEN, DIE NICHT DASSELBE SIND
 * ---------------------------------------------------------------------------
 *
 * Hier stehen die bestätigten Einträge - eigene und übernommene Vorschläge.
 * Die offenen Vorschläge stehen darunter in ihrem eigenen Abschnitt, mit
 * ihrem Beleg und zwei Knöpfen.
 *
 * Ein selbst eingetragener Satz erscheint NIE unter „Vorschläge für dich". Er
 * ist keiner: Es gibt niemanden, der ihn vorgeschlagen hätte.
 *
 * ---------------------------------------------------------------------------
 * EIN BESTÄTIGTER MODELLVORSCHLAG TRÄGT KEIN „BEARBEITEN"
 * ---------------------------------------------------------------------------
 *
 * Er hat ein Zitat aus dem eigenen Text, und das Zitat stützt genau diesen
 * Satz. Schriebe man den Satz um, stünde daneben ein Beleg für etwas anderes.
 * Entfernen lässt sich der Beleg nicht (`person_resources_evidence_required`),
 * und die Herkunft stillschweigend auf „selbst eingetragen" zu drehen wäre
 * eine Behauptung über die Entstehung.
 *
 * Löschen geht. Wer den Satz anders haben will, verwirft ihn und schreibt
 * seinen eigenen - und dann ist es ehrlich ein eigener.
 *
 * ---------------------------------------------------------------------------
 * NATIVE `details` STATT ZUSTAND IM BROWSER
 * ---------------------------------------------------------------------------
 *
 * Das Hinzufügen und jedes Bearbeiten ist ein aufklappbares `details` -
 * dieselbe Mechanik wie auf „Das bist du". Damit gibt es hier keine
 * Client-Komponente, es funktioniert ohne JavaScript, und zwei offene
 * Formulare nebeneinander sind kein Zustandsproblem, sondern zwei offene
 * Kästen.
 */

const feld =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const primaer =
  "min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold";

export type OwnResourcesCopy = {
  title: string;
  text: string;
  kindLabel: (kind: ResourceKind) => string;
  /** Beispiele sind Hilfe, keine Pflicht - sie stehen als Platzhalter. */
  example: (kind: ResourceKind) => string;
  addSummary: string;
  kindField: string;
  labelField: string;
  labelHint: string;
  save: string;
  pending: string;
  edit: string;
  remove: string;
  removeQuestion: string;
  removeConfirm: string;
  removeCancel: string;
  fromProposal: string;
  empty: string;
};

export function OwnResourcesSection({
  resources,
  copy,
}: {
  /** Nur bestätigte - offene Vorschläge haben ihren eigenen Abschnitt. */
  resources: PersonResource[];
  copy: OwnResourcesCopy;
}) {
  return (
    <section id="deine-ressourcen" className="mt-8 scroll-mt-20">
      <h2 className="text-xl font-semibold text-slate-950">{copy.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.text}</p>

      {resources.length > 0 ? (
        <ul className="mt-5 grid gap-3">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                {copy.kindLabel(resource.kind)}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-900">{resource.label}</p>

              {/* Woher er kommt - und zwar nur dort, wo es etwas zu sagen gibt.
                  „Von dir eingetragen" an jedem eigenen Satz wäre eine Fußnote
                  ohne Auskunft. */}
              {resource.origin === "model" ? (
                <p className="mt-1 text-xs leading-5 text-slate-500">{copy.fromProposal}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {resource.origin === "self" ? (
                  <details className="w-full">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 [&::-webkit-details-marker]:hidden">
                      {copy.edit}
                    </summary>
                    <form
                      action={updateResourceAction}
                      className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <input type="hidden" name="resource_id" value={resource.id} />
                      <Felder copy={copy} kind={resource.kind} label={resource.label} />
                      <div className="mt-4">
                        <SubmitButton
                          label={copy.save}
                          pendingLabel={copy.pending}
                          className={primaer}
                        />
                      </div>
                    </form>
                  </details>
                ) : null}

                {/* Rueckfrage vor dem Entfernen - derselbe Knopf wie beim
                    Loeschen eines erzaehlten Belegs. */}
                <form action={deleteResourceAction}>
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <ConfirmSubmitButton
                    label={copy.remove}
                    question={copy.removeQuestion}
                    confirmLabel={copy.removeConfirm}
                    cancelLabel={copy.removeCancel}
                    pendingLabel={copy.pending}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                    confirmClassName="min-h-11 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-900"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
          {copy.empty}
        </p>
      )}

      {/* OFFEN, SOLANGE NICHTS DASTEHT. Wer hier zum ersten Mal ist, soll
          nicht erst einen Kasten aufklappen müssen, um überhaupt etwas tun zu
          können. Wer schon welche hat, sieht zuerst seine Liste. */}
      <details
        open={resources.length === 0}
        className="group mt-5 rounded-2xl border border-slate-200 bg-white"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-90">
            ▸
          </span>
          {copy.addSummary}
        </summary>
        <form action={addResourceAction} className="border-t border-slate-200 p-4">
          <Felder copy={copy} kind={null} label="" />
          <div className="mt-4">
            <SubmitButton label={copy.save} pendingLabel={copy.pending} className={primaer} />
          </div>
        </form>
      </details>
    </section>
  );
}

/**
 * Art und Beschreibung — dieselben zwei Felder beim Anlegen und beim Ändern.
 *
 * ZWEI FELDER UND NICHT MEHR. Keine Kategorien neben den drei Arten, keine
 * Rangfolge, kein Zeitraum: Was man hier einträgt, ist ein Satz und eine
 * Schublade.
 *
 * Das Beispiel steht als Platzhalter und nicht als Vorbelegung - ein
 * vorausgefülltes Feld, das man löschen muss, ist eine Behauptung über die
 * Person.
 */
function Felder({
  copy,
  kind,
  label,
}: {
  copy: OwnResourcesCopy;
  kind: ResourceKind | null;
  label: string;
}) {
  return (
    <ResourceKindFields
      kinds={RESOURCE_KINDS.map((eintrag) => ({
        kind: eintrag,
        label: copy.kindLabel(eintrag),
        example: copy.example(eintrag),
      }))}
      initialKind={kind ?? RESOURCE_KINDS[0]}
      label={label}
      labelMax={RESOURCE_LABEL_MAX}
      fieldClassName={feld}
      copy={{ kindField: copy.kindField, labelField: copy.labelField, labelHint: copy.labelHint }}
    />
  );
}
