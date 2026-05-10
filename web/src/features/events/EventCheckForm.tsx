import {
  EVENT_ANSWER_SCALE,
  EVENT_CORE_QUESTIONS,
  EVENT_FORCED_QUESTIONS,
  EVENT_QUESTIONS,
} from "@/features/events/eventQuestions";
import type { EventAnswer, EventQuestion, EventRecord } from "@/features/events/eventTypes";

type EventCheckFormProps = {
  event: EventRecord;
  participantName: string;
  existingAnswers: EventAnswer[];
  errorMessage: string | null;
  action: (formData: FormData) => Promise<void>;
};

function answerValueForQuestion(existingAnswers: EventAnswer[], questionKey: string) {
  return existingAnswers.find((answer) => answer.questionKey === questionKey)?.answerValue ?? null;
}

function QuestionCard({
  question,
  index,
  defaultValue,
}: {
  question: EventQuestion;
  index: number;
  defaultValue: number | null;
}) {
  const helperText =
    question.kind === "forced"
      ? question.helperText?.includes("Gespraechsbedarf")
        ? "Das zeigt oft spaeteren Gespraechsbedarf."
        : "Grosse Unterschiede solltet ihr bewusst besprechen."
      : null;

  return (
    <article className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)] sm:px-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Frage {index + 1}</p>
      <h2 className="mt-2 text-[15px] font-semibold leading-6 text-slate-950 sm:text-base sm:leading-7">
        {question.prompt}
      </h2>
      {helperText ? (
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{helperText}</p>
      ) : null}

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-4 text-xs leading-5 text-slate-500">
          <span className="max-w-[45%]">{question.leftLabel}</span>
          <span className="max-w-[45%] text-right">{question.rightLabel}</span>
        </div>

        <div className="mt-3.5 grid grid-cols-5 gap-2">
          {EVENT_ANSWER_SCALE.map((value) => {
            const inputId = `${question.key}-${value}`;
            return (
              <label
                key={value}
                htmlFor={inputId}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center transition hover:border-slate-300 hover:bg-slate-50"
              >
                <input
                  id={inputId}
                  name={question.key}
                  type="radio"
                  value={value}
                  defaultChecked={defaultValue === value}
                  className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                />
              </label>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function EventCheckForm({
  event,
  participantName,
  existingAnswers,
  errorMessage,
  action,
}: EventCheckFormProps) {
  const answeredCount = EVENT_QUESTIONS.filter(
    (question) => answerValueForQuestion(existingAnswers, question.key) != null
  ).length;
  const progressPercent =
    EVENT_QUESTIONS.length > 0 ? Math.round((answeredCount / EVENT_QUESTIONS.length) * 100) : 0;
  const progressCopy =
    answeredCount === 0
      ? "Dauert nur wenige Minuten."
      : answeredCount >= EVENT_QUESTIONS.length - 3
        ? "Fast geschafft."
        : "Ein kurzer Check fuer bessere Gespraeche.";

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event Check</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          {participantName}, beantworte kurz die 13 Event-Fragen. Danach geht es direkt zu deinem Event-Profil.
        </p>
        <div className="mt-4 max-w-xl">
          <div className="flex items-center justify-between gap-4 text-xs leading-6 text-slate-500">
            <span>{progressCopy}</span>
            <span>
              {answeredCount} / {EVENT_QUESTIONS.length}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <form action={action} className="mt-6 space-y-7">
        <section className="space-y-3.5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Grunddynamik</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">So positionierst du dich im Gruendungskontext.</p>
          </div>
          <div className="space-y-3.5">
            {EVENT_CORE_QUESTIONS.map((question, index) => (
              <QuestionCard
                key={question.key}
                question={question}
                index={index}
                defaultValue={answerValueForQuestion(existingAnswers, question.key)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3.5 rounded-[24px] border border-slate-200 bg-slate-50/55 p-4 sm:p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Spannende Unterschiede</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Hier zeigen sich oft die spannendsten Unterschiede und frueher Gespraechsbedarf.
            </p>
          </div>
          <div className="space-y-3.5">
            {EVENT_FORCED_QUESTIONS.map((question, index) => (
              <QuestionCard
                key={question.key}
                question={question}
                index={EVENT_CORE_QUESTIONS.length + index}
                defaultValue={answerValueForQuestion(existingAnswers, question.key)}
              />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-6 text-slate-500">
            Deine bisherigen Antworten bleiben erhalten und koennen hier jederzeit ergaenzt werden.
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Event-Profil erstellen
          </button>
        </div>
      </form>
    </section>
  );
}
