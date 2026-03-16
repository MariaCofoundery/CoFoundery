"use client";

type ForcedChoiceOption = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

type Props = {
  options: ForcedChoiceOption[];
  statementA?: string | null;
  statementB?: string | null;
  selectedChoiceId?: string;
  selectedValue?: string;
  disabled?: boolean;
  missingChoicesMessage: string;
  onSelect: (choice: ForcedChoiceOption) => void;
};

function isSelected(
  option: ForcedChoiceOption,
  selectedChoiceId?: string,
  selectedValue?: string
) {
  if (selectedChoiceId) {
    return selectedChoiceId === option.id;
  }
  return selectedValue === option.value;
}

export function ForcedChoiceQuestion({
  options,
  statementA,
  statementB,
  selectedChoiceId,
  selectedValue,
  disabled = false,
  missingChoicesMessage,
  onSelect,
}: Props) {
  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {missingChoicesMessage}
      </p>
    );
  }

  if (options.length < 5) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4">
        <p className="text-sm text-amber-900">
          Für Forced-Choice wurden weniger als 5 Antwortstufen geladen. Die Frage wird als einfache Auswahlliste
          angezeigt.
        </p>
        <div className="mt-4 grid gap-3">
          {options.map((option) => {
            const active = isSelected(option, selectedChoiceId, selectedValue);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option)}
                disabled={disabled}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } disabled:opacity-60`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const scaleMeta = [
    { longLabel: "A deutlich" },
    { longLabel: "A eher" },
    { longLabel: "beide gleich" },
    { longLabel: "B eher" },
    { longLabel: "B deutlich" },
  ];

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-5 sm:p-6">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {options.map((option, idx) => {
          const active = isSelected(option, selectedChoiceId, selectedValue);
          const meta = scaleMeta[idx];

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              disabled={disabled}
              aria-pressed={active}
              aria-label={meta.longLabel}
              className={`rounded-lg border px-4 py-3 text-center text-sm transition-all duration-200 ${
                active
                  ? idx < 2
                    ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                    : idx > 2
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                      : "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/70 hover:shadow-[0_8px_22px_rgba(124,58,237,0.08)]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span>{meta.longLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5 border-t border-slate-200/80 pt-5">
        <div className="min-w-0">
          <p className="text-sm leading-7 text-slate-800">{statementA ?? ""}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-sm leading-7 text-slate-800">{statementB ?? ""}</p>
        </div>
      </div>
    </div>
  );
}
