import Link from "next/link";
import type { EventCompareResult, EventRecord } from "@/features/events/eventTypes";
import { getEventScaleSemanticLabel } from "@/features/events/eventProfile";
import { EventScaleTrack } from "@/features/events/EventScaleTrack";

type EventCompareViewProps = {
  event: EventRecord;
  result: EventCompareResult;
  backToCardHref: string;
};

function compareIntro(result: EventCompareResult) {
  if (result.tensionSignals.length > 0) {
    return "Ihr habt mehrere klare Beruehrungspunkte und ein paar Unterschiede, die als Gespraech spannend werden koennten.";
  }
  return "Ihr bringt schon auf den ersten Blick einige starke Gemeinsamkeiten mit und habt zugleich genug Unterschied fuer ein interessantes Gespraech.";
}

function CompareScaleCard({
  title,
  leftName,
  rightName,
  scoreA,
  scoreB,
  relationLabel,
  scaleKey,
}: {
  title: string;
  leftName: string;
  rightName: string;
  scoreA: number;
  scoreB: number;
  relationLabel: string;
  scaleKey: EventCompareResult["commonGround"][number]["key"];
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">{relationLabel}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-[52px] shrink-0 text-xs font-medium text-slate-800 sm:w-[72px]">{leftName}</div>
            <div className="min-w-0 flex-1">
              <EventScaleTrack score={scoreA} variant="self" />
            </div>
            <div className="w-[96px] shrink-0 text-right text-[11px] leading-4 text-slate-600 sm:w-[136px] sm:text-xs sm:leading-5">
              {getEventScaleSemanticLabel(scaleKey, scoreA)}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <div className="w-[52px] shrink-0 text-xs font-medium text-slate-800 sm:w-[72px]">{rightName}</div>
            <div className="min-w-0 flex-1">
              <EventScaleTrack score={scoreB} variant="other" />
            </div>
            <div className="w-[96px] shrink-0 text-right text-[11px] leading-4 text-slate-600 sm:w-[136px] sm:text-xs sm:leading-5">
              {getEventScaleSemanticLabel(scaleKey, scoreB)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function EventCompareView({ event, result, backToCardHref }: EventCompareViewProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event Compare</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          Du + {result.participantBName}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
          {compareIntro(result)}
        </p>
        <p className="mt-2 text-xs leading-6 text-slate-500">{event.name}</p>
      </div>

      <div className="mt-6 space-y-6">
        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Das verbindet euch schnell</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              In diesen Themen koennte sich das Gespraech schnell vertraut anfuehlen.
            </p>
          </div>
          <div className="space-y-3">
            {result.commonGround.map((entry) => (
              <CompareScaleCard
                key={`common-${entry.key}`}
                title={entry.label}
                leftName="Du"
                rightName={result.participantBName}
                scoreA={entry.scoreA}
                scoreB={entry.scoreB}
                relationLabel={entry.relationLabel}
                scaleKey={entry.key}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Hier denkt ihr unterschiedlich</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Genau hier entstehen oft die interessantesten Gespraeche.
            </p>
          </div>
          <div className="space-y-3">
            {result.differences.map((entry) => (
              <CompareScaleCard
                key={`diff-${entry.key}`}
                title={entry.label}
                leftName="Du"
                rightName={result.participantBName}
                scoreA={entry.scoreA}
                scoreB={entry.scoreB}
                relationLabel={entry.relationLabel}
                scaleKey={entry.key}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Darueber solltet ihr frueh sprechen</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Diese Unterschiede sind kein Urteil, sondern gute Ansaetze fuer ein bewussteres Gespraech.
            </p>
          </div>
          <div className="space-y-3">
            {result.tensionSignals.length > 0 ? (
              result.tensionSignals.map((signal) => (
                <article
                  key={signal.tensionKey}
                  className="rounded-2xl border border-amber-200/70 bg-[linear-gradient(180deg,rgba(254,243,199,0.35),rgba(255,255,255,0.98))] px-4 py-4 shadow-[0_12px_26px_rgba(120,53,15,0.03)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950">{signal.label}</h3>
                    <span className="rounded-full border border-amber-200/65 bg-[linear-gradient(180deg,rgba(255,251,235,0.75),rgba(255,255,255,1))] px-2.5 py-1 text-xs font-medium text-[#8b6e49]">
                      {signal.level === "high" ? "frueh klaeren" : "bewusst besprechen"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{signal.conversationPrompt}</p>
                </article>
              ))
            ) : (
              <article className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-600">
                Aktuell zeigt euer Kurzvergleich keine starken Spannungssignale. Nutzt den Austausch trotzdem, um Erwartungen frueh konkret zu machen.
              </article>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Gespraechsimpulse</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Diese Fragen koennen helfen, das Gespraech schnell auf die wichtigen Unterschiede zu lenken.
            </p>
          </div>
          <div className="space-y-3">
            {result.conversationPrompts.map((prompt, index) => (
              <article
                key={`${index}-${prompt}`}
                className="rounded-2xl border border-[#dde7e4] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              >
                <p className="text-sm leading-7 text-slate-800">{prompt}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-slate-500">
          Der Vergleich ist bewusst kurz gehalten und soll vor allem bessere Gesprache auf dem Event ausloesen.
        </p>
        <Link
          href={backToCardHref}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Zurueck zu meiner Event-Karte
        </Link>
      </div>
    </section>
  );
}
