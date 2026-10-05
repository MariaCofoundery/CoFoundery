import {
  AREAS,
  PRODUCT_ITEMS,
  rawChoice,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import { workstyleResponseOptions } from "@/features/instruments/workstyle/registry";

/** One lane per original item. Seit Phase 11.7B je Person eine eigene Zeile mit
 * Namen (keine Kuerzel als alleinige Kennzeichnung). Position denotes the chosen
 * response category only. No aggregation, norm or match distance. */
export function WorkstyleSignature({
  people,
  compact = false,
}: {
  people: { id: string; name: string; profile: ProductProfile }[];
  compact?: boolean;
}) {
  return (
    <figure
      className="ws-signature"
      aria-label={
        people.length === 1
          ? "Deine Antworten im Detail"
          : "Eure Antworten im Detail"
      }
    >
      <figcaption className="mb-5">
        <h3 className="text-xl font-semibold">
          {people.length === 1
            ? "Deine Antworten im Detail"
            : "Eure Antworten im Detail"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Jede Linie steht für eine konkrete Situation. Die Marker zeigen die
          gewählten Antworten. Ihre Position ist keine Bewertung.
        </p>
      </figcaption>
      <div className="grid gap-7">
        {AREAS.map((area) => (
          <section key={area.key} className="ws-area">
            <h4 className="mb-3 text-base font-semibold">
              {people.length === 1 ? area.title : area.team}
            </h4>
            {PRODUCT_ITEMS.filter((i) => i.area_key === area.key).map(
              (item) => {
                const options = workstyleResponseOptions(item);
                const present = people.map((p) => ({
                  ...p,
                  choice: rawChoice(p.profile, item.item_key),
                }));
                return (
                  <div
                    key={item.item_key}
                    className="ws-lane border-t border-slate-200 py-4"
                  >
                    <p className="text-sm leading-6">{item.prompt}</p>
                    {item.alternatives?.length ? (
                      <div className="my-3 grid gap-2 text-sm">
                        {item.alternatives.map((a) => (
                          <p key={a.option_id}>
                            <b>{a.option_id}</b> · {a.label}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-1.5" aria-hidden="true">
                      {present.map((p) => (
                        <div key={p.id} className={people.length > 1 ? "grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-center gap-3" : ""}>
                          {people.length > 1 ? <span className="truncate text-xs font-medium text-slate-700">{p.name}</span> : null}
                          <div className="relative mx-2 h-5">
                            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-300" />
                            {options.map((o, n) => (
                              <span
                                key={o.value}
                                className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300"
                                style={{ left: `${(n / (options.length - 1)) * 100}%` }}
                              />
                            ))}
                            {p.choice ? (
                              <span
                                className="ws-glance-point absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600 ring-4 ring-violet-100"
                                style={{ left: `${(p.choice.position / (options.length - 1)) * 100}%` }}
                              />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className="flex justify-between gap-5 text-xs text-slate-600"
                      aria-hidden="true"
                    >
                      <span>{options[0].label}</span>
                      <span className="text-right">
                        {options.at(-1)!.label}
                      </span>
                    </div>
                    <ul
                      className={`mt-2 text-sm ${compact ? "leading-5" : "leading-6"}`}
                    >
                      {present.map((p) => (
                        <li key={p.id}>
                          <span className="font-medium">{p.name}:</span>{" "}
                          {p.choice?.label ?? "Keine Einschätzung sichtbar"}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              },
            )}
          </section>
        ))}
      </div>
    </figure>
  );
}
