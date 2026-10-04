import {
  AREAS,
  memberInitials,
  PRODUCT_ITEMS,
  rawChoice,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import { workstyleResponseOptions } from "@/features/instruments/workstyle/registry";

/** One lane per original item. Marker rows are separated by member, not jittered randomly.
 * Position denotes the chosen response category only. No aggregation, norm or match distance. */
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
      <ul className="mb-6 flex flex-wrap gap-4" aria-label="Personenlegende">
        {people.map((p, n) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className={`ws-token ws-token-${n % 4}`} aria-hidden="true">
              {memberInitials(p.name)}
            </span>
            <span>{p.name}</span>
          </li>
        ))}
      </ul>
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
                    <div
                      className="relative mt-3"
                      style={{ height: Math.max(38, people.length * 30) }}
                      aria-hidden="true"
                    >
                      <div className="absolute inset-x-3 top-1/2 border-t border-slate-300" />
                      {options.map((o, n) => (
                        <span
                          key={o.value}
                          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-slate-500 bg-white"
                          style={{
                            left: `calc(${(n / (options.length - 1)) * 100}% + ${12 - (n / (options.length - 1)) * 32}px)`,
                          }}
                        />
                      ))}
                      {present.map((p, n) =>
                        p.choice ? (
                          <span
                            key={p.id}
                            className={`ws-token ws-token-${n % 4} absolute`}
                            style={{
                              left: `calc(${(p.choice.position / (options.length - 1)) * 100}% + ${2 - (p.choice.position / (options.length - 1)) * 32}px)`,
                              top: n * 30,
                            }}
                          >
                            {memberInitials(p.name)}
                          </span>
                        ) : null,
                      )}
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
