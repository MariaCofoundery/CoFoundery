"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconTile, type IconName, type IconTone } from "@/features/ui/Icons";
import { SwitchTrack } from "@/features/account/accountUi";
import {
  agreeTestProjectAction,
  cancelTestProjectAction,
  saveTestProjectDraftAction,
  submitTestProjectResponseAction,
  withdrawTestProjectAgreementAction,
  type TestProjectActionResult,
} from "@/features/testProject/testProjectActions";
import {
  TEST_PROJECT_LIMITS,
  TEST_PROJECT_OUTCOMES,
  isTestProjectDraftComplete,
  testProjectHref,
  type TestProjectItem,
} from "@/features/testProject/testProjectModel";

const CARD = "rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-[26px]";
const INPUT = "mt-2 min-h-11 w-full rounded-xl border border-[#d8d5ea] bg-white px-3.5 py-2 text-[15px] text-[#0b1f3a] outline-none focus:border-[#6d49e0] focus:ring-4 focus:ring-[#6d49e0]/15";
const LABEL = "text-[13px] font-semibold uppercase tracking-[0.06em] text-[#5f5e7a]";
const BTN = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";
const BTN_SECONDARY = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8d5ea] bg-white px-[18px] text-[15px] font-semibold text-[#0b1f3a] hover:border-[#6d49e0] disabled:cursor-not-allowed disabled:opacity-45";

export type TestProjectTemplateCard = {
  key: string;
  icon: IconName;
  tone: IconTone;
  weeks: number;
  title: string;
  task: string;
  roles: string;
  done: string[];
};

export type TestProjectDraftValues = {
  templateKey: string | null;
  title: string;
  task: string;
  weeks: number;
  roles: string;
  note: string;
  done: TestProjectItem[];
  rights: TestProjectItem[];
  closing: TestProjectItem[];
};

/** Alle Texte kommen als flache Tabelle vom Server; hier steht keine Sprache. */
export type TestProjectLabels = Record<string, string>;

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(task: () => Promise<TestProjectActionResult>, after: (result: Extract<TestProjectActionResult, { ok: true }>) => string | null) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const href = after(result);
      if (href) router.replace(href);
      router.refresh();
    });
  }
  return { run, pending, error };
}

function ErrorLine({ error, labels }: { error: string | null; labels: TestProjectLabels }) {
  if (!error) return null;
  return <p role="alert" className="rounded-xl bg-[#fdecec] px-4 py-3 text-sm text-[#9b1c1c]">{labels[`error.${error}`] ?? labels["error.generic"]}</p>;
}

/** Eine Liste mit Schalter, Text und Entfernen je Punkt; Punkte lassen sich ergaenzen. */
function EditableList({
  items, onChange, labels, placeholder, addLabel,
}: {
  items: TestProjectItem[];
  onChange: (items: TestProjectItem[]) => void;
  labels: TestProjectLabels;
  placeholder?: string;
  addLabel: string;
}) {
  const update = (index: number, patch: Partial<TestProjectItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div>
      <ul className="grid gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2.5">
            <label className="inline-flex flex-none cursor-pointer items-center" title={labels.itemOn}>
              <input type="checkbox" className="peer sr-only" checked={item.on} onChange={(event) => update(index, { on: event.target.checked })} aria-label={`${labels.itemOn}: ${item.t}`} />
              <SwitchTrack />
            </label>
            <input
              type="text"
              value={item.t}
              maxLength={TEST_PROJECT_LIMITS.itemText}
              placeholder={placeholder}
              onChange={(event) => update(index, { t: event.target.value })}
              className={`min-h-11 w-full min-w-0 rounded-xl border border-[#d8d5ea] bg-white px-3.5 py-2 text-[15px] text-[#0b1f3a] outline-none focus:border-[#6d49e0] focus:ring-4 focus:ring-[#6d49e0]/15 ${item.on ? "" : "text-[#5f5e7a] line-through opacity-60"}`}
            />
            <button type="button" aria-label={labels.remove} onClick={() => onChange(items.filter((_, i) => i !== index))} className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-[#5f5e7a] hover:bg-[#f1f0f7]">
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          </li>
        ))}
      </ul>
      {items.length < TEST_PROJECT_LIMITS.items ? (
        <button type="button" onClick={() => onChange([...items, { t: "", on: true }])} className={`${BTN_SECONDARY} mt-3 min-h-9 px-3.5 text-sm`}>{addLabel}</button>
      ) : null}
    </div>
  );
}

export function TestProjectStarter({
  teamId, relationshipId, templates, labels, freeIcon, rights, closing, participants,
}: {
  teamId: string;
  relationshipId: string;
  templates: TestProjectTemplateCard[];
  labels: TestProjectLabels;
  freeIcon: IconName;
  rights: string[];
  closing: string[];
  participants: TestProjectParticipant[];
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);
  const selected = templates.find((template) => template.key === selectedKey) ?? null;
  return (
    <div className="grid gap-5">
      <section className={CARD} aria-labelledby="tp-picker-title">
        <h2 id="tp-picker-title" className="text-xl font-semibold text-[#0b1f3a]">{labels["picker.title"]}</h2>
        <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{labels["picker.help"]}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              aria-pressed={chosen && selectedKey === template.key}
              onClick={() => { setSelectedKey(template.key); setChosen(true); }}
              className={`card-lift flex min-w-0 flex-col items-start gap-2 rounded-[22px] border bg-white p-5 text-left ${chosen && selectedKey === template.key ? "border-[#6d49e0] ring-2 ring-[#6d49e0]" : "border-[#e4e2f0]"}`}
            >
              <IconTile name={template.icon} tone={template.tone} />
              <span className="rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{labels["picker.weeks"].replace("{count}", String(template.weeks))}</span>
              <span className="text-[19px] font-semibold leading-tight text-[#0b1f3a]">{template.title}</span>
              <span className="text-sm leading-6 text-[#5f5e7a]">{template.task}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={chosen && selectedKey === null}
            onClick={() => { setSelectedKey(null); setChosen(true); }}
            className={`card-lift flex min-w-0 flex-col items-start gap-2 rounded-[22px] border bg-white p-5 text-left ${chosen && selectedKey === null ? "border-[#6d49e0] ring-2 ring-[#6d49e0]" : "border-[#e4e2f0]"}`}
          >
            <IconTile name={freeIcon} tone="violet" />
            <span className="rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{labels["picker.free"]}</span>
            <span className="text-[19px] font-semibold leading-tight text-[#0b1f3a]">{labels["picker.freeTitle"]}</span>
            <span className="text-sm leading-6 text-[#5f5e7a]">{labels["picker.freeText"]}</span>
          </button>
        </div>
      </section>
      {chosen ? (
        <TestProjectEditor
          key={selectedKey ?? "free"}
          teamId={teamId}
          relationshipId={relationshipId}
          projectId={null}
          version={null}
          participants={participants}
          ownAgreed={false}
          labels={labels}
          initial={{
            templateKey: selected?.key ?? null,
            title: selected?.title ?? "",
            task: selected?.task ?? "",
            weeks: selected?.weeks ?? 2,
            roles: selected?.roles ?? "",
            note: "",
            done: (selected?.done ?? ["", ""]).map((t) => ({ t, on: true })),
            rights: rights.map((t) => ({ t, on: true })),
            closing: closing.map((t) => ({ t, on: true })),
          }}
        />
      ) : null}
    </div>
  );
}

export type TestProjectParticipant = { userId: string; name: string; agreed: boolean };

export function TestProjectEditor({
  teamId, relationshipId, projectId, version, initial, participants, ownAgreed, labels,
}: {
  teamId: string;
  relationshipId: string;
  projectId: string | null;
  version: number | null;
  initial: TestProjectDraftValues;
  participants: TestProjectParticipant[];
  ownAgreed: boolean;
  labels: TestProjectLabels;
}) {
  const [values, setValues] = useState<TestProjectDraftValues>(initial);
  const [dirty, setDirty] = useState(projectId === null);
  const { run, pending, error } = useRun();
  const set = <K extends keyof TestProjectDraftValues>(key: K, value: TestProjectDraftValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const complete = isTestProjectDraftComplete({ title: values.title, task: values.task, doneItems: values.done });

  const save = () => run(
    () => saveTestProjectDraftAction(teamId, relationshipId, { projectId, ...values }),
    () => {
      // Gespeichert heisst: Es gibt nichts Ungespeichertes mehr, sonst bliebe "Ich stimme zu" gesperrt.
      setDirty(false);
      return testProjectHref(teamId, relationshipId, "saved");
    }
  );

  return (
    <div className="grid gap-5">
      <section className={CARD} aria-labelledby="tp-editor-title">
        <div className="flex items-start gap-3.5">
          <IconTile name="pencil" tone="violet" />
          <div className="min-w-0">
            <h2 id="tp-editor-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{labels["editor.title"]}</h2>
            <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{labels["editor.help"]}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="grid min-w-0 content-start gap-4">
            <label className="text-sm font-medium text-[#33325e]">{labels["editor.name"]}
              <input type="text" className={INPUT} maxLength={TEST_PROJECT_LIMITS.title} value={values.title} placeholder={labels["editor.namePlaceholder"]} onChange={(event) => set("title", event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#33325e]">{labels["editor.task"]}
              <textarea className={`${INPUT} min-h-24`} maxLength={TEST_PROJECT_LIMITS.task} value={values.task} placeholder={labels["editor.taskPlaceholder"]} onChange={(event) => set("task", event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#33325e]">{labels["editor.weeks"]}
              <select className={INPUT} value={values.weeks} onChange={(event) => set("weeks", Number(event.target.value))}>
                {[1, 2, 3, 4].map((weeks) => <option key={weeks} value={weeks}>{weeks === 1 ? labels["editor.weeksOne"] : labels["editor.weeksOption"].replace("{count}", String(weeks))}</option>)}
              </select>
              <span className="mt-1 block text-[13px] font-normal text-[#5f5e7a]">{labels["editor.weeksHelp"]}</span>
            </label>
            <label className="text-sm font-medium text-[#33325e]">{labels["editor.roles"]}
              <textarea className={`${INPUT} min-h-20`} maxLength={TEST_PROJECT_LIMITS.roles} value={values.roles} placeholder={labels["editor.rolesPlaceholder"]} onChange={(event) => set("roles", event.target.value)} />
            </label>
          </div>
          <div className="grid min-w-0 content-start gap-4">
            <div>
              <p className={LABEL}>{labels["editor.done"]}</p>
              <div className="mt-2"><EditableList items={values.done} onChange={(items) => set("done", items)} labels={labels} placeholder={labels["editor.donePlaceholder"]} addLabel={labels["editor.addDone"]} /></div>
              <p className="mt-2 text-[13px] leading-5 text-[#5f5e7a]">{labels["editor.doneHelp"]}</p>
            </div>
            <label className="text-sm font-medium text-[#33325e]">{labels["editor.note"]}
              <textarea className={`${INPUT} min-h-20`} maxLength={TEST_PROJECT_LIMITS.note} value={values.note} placeholder={labels["editor.notePlaceholder"]} onChange={(event) => set("note", event.target.value)} />
            </label>
          </div>
        </div>
        <div className="mt-6 rounded-[18px] bg-[#efeafd] p-5">
          <p className={LABEL}>{labels["editor.rights"]}</p>
          <div className="mt-3"><EditableList items={values.rights} onChange={(items) => set("rights", items)} labels={labels} addLabel={labels["editor.addQuestion"]} /></div>
          <p className="mt-3 text-[13px] leading-5 text-[#5f5e7a]">{labels["editor.rightsHelp"]}</p>
        </div>
        <div className="mt-6">
          <p className={LABEL}>{labels["editor.closing"]}</p>
          <div className="mt-3"><EditableList items={values.closing} onChange={(items) => set("closing", items)} labels={labels} addLabel={labels["editor.addQuestion"]} /></div>
          <p className="mt-3 text-[13px] leading-5 text-[#5f5e7a]">{labels["editor.closingHelp"]}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className={BTN} disabled={pending || !dirty} onClick={save}>{projectId ? labels["editor.save"] : labels["editor.create"]}</button>
        </div>
        <div className="mt-3"><ErrorLine error={error} labels={labels} /></div>
      </section>

      {projectId && version !== null ? (
        <AgreementPanel
          teamId={teamId} relationshipId={relationshipId} projectId={projectId} version={version}
          participants={participants} ownAgreed={ownAgreed} complete={complete} dirty={dirty} labels={labels}
        />
      ) : null}
    </div>
  );
}

function AgreementPanel({
  teamId, relationshipId, projectId, version, participants, ownAgreed, complete, dirty, labels,
}: {
  teamId: string; relationshipId: string; projectId: string; version: number;
  participants: TestProjectParticipant[]; ownAgreed: boolean; complete: boolean; dirty: boolean; labels: TestProjectLabels;
}) {
  const { run, pending, error } = useRun();
  return (
    <section className={`${CARD} border-[#d9cff8] bg-[#f5f2fe]`} aria-labelledby="tp-agree-title">
      <div className="flex items-start gap-3.5">
        <IconTile name="check" tone="green" />
        <div className="min-w-0">
          <h2 id="tp-agree-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{labels["agreement.title"]}</h2>
          <p className="mt-1 text-sm leading-6 text-[#33325e]">{labels["agreement.text"]}</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2.5">
        {participants.map((person) => (
          <li key={person.userId} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${person.agreed ? "bg-[#e3f6ec] text-[#17794a]" : "bg-white text-[#33325e]"}`}>
            {labels[person.agreed ? "agreement.agreed" : "agreement.notYet"].replace("{name}", person.name)}
          </li>
        ))}
      </ul>
      {!complete ? <p className="mt-3 text-sm text-[#5f5e7a]">{labels["agreement.incomplete"]}</p> : null}
      {dirty ? <p className="mt-3 text-sm text-[#5f5e7a]">{labels["agreement.unsaved"]}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {ownAgreed ? (
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => withdrawTestProjectAgreementAction(teamId, relationshipId, projectId), () => testProjectHref(teamId, relationshipId, "withdrawn"))}>{labels["agreement.withdraw"]}</button>
        ) : (
          <button type="button" className={BTN} disabled={pending || !complete || dirty} onClick={() => run(() => agreeTestProjectAction(teamId, relationshipId, projectId, version), (result) => testProjectHref(teamId, relationshipId, result.status === "active" ? "started" : "agreed"))}>{labels["agreement.agree"]}</button>
        )}
        <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => cancelTestProjectAction(teamId, relationshipId, projectId), () => testProjectHref(teamId, relationshipId, "cancelled"))}>{labels["agreement.cancel"]}</button>
      </div>
      <div className="mt-3"><ErrorLine error={error} labels={labels} /></div>
    </section>
  );
}

export function TestProjectCancelButton({
  teamId, relationshipId, projectId, labels,
}: { teamId: string; relationshipId: string; projectId: string; labels: TestProjectLabels }) {
  const { run, pending, error } = useRun();
  return (
    <div>
      <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => cancelTestProjectAction(teamId, relationshipId, projectId), () => testProjectHref(teamId, relationshipId, "cancelled"))}>{labels["active.cancel"]}</button>
      <p className="mt-2 text-[13px] text-[#5f5e7a]">{labels["active.cancelHelp"]}</p>
      <div className="mt-2"><ErrorLine error={error} labels={labels} /></div>
    </div>
  );
}

/** Zwischenstand und Abschluss: eine Antwort je Frage, beim Abschluss dazu der Ausgang. */
export function TestProjectResponseForm({
  teamId, relationshipId, projectId, phase, questions, initialAnswers, initialOutcome, locked, labels,
}: {
  teamId: string;
  relationshipId: string;
  projectId: string;
  phase: "interim" | "closing";
  questions: string[];
  initialAnswers: string[];
  initialOutcome: string | null;
  locked: boolean;
  labels: TestProjectLabels;
}) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map((_, index) => initialAnswers[index] ?? ""));
  const [outcome, setOutcome] = useState<string | null>(initialOutcome);
  const { run, pending, error } = useRun();
  const submitted = initialAnswers.length > 0;
  const ready = answers.some((answer) => answer.trim() !== "") && (phase === "interim" || outcome !== null);
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => submitTestProjectResponseAction(teamId, relationshipId, projectId, phase, questions.map((q, index) => ({ q, a: answers[index] ?? "" })), phase === "closing" ? outcome : null),
          (result) => testProjectHref(teamId, relationshipId, result.status === "closed" ? "closed" : "submitted")
        );
      }}
    >
      {questions.map((question, index) => (
        <label key={index} className="text-sm font-medium text-[#33325e]">{question}
          <textarea className={`${INPUT} min-h-24`} maxLength={TEST_PROJECT_LIMITS.answer} disabled={locked} value={answers[index] ?? ""} placeholder={labels[`${phase}.placeholder`]} onChange={(event) => setAnswers((current) => current.map((value, i) => (i === index ? event.target.value : value)))} />
        </label>
      ))}
      {phase === "closing" ? (
        <fieldset disabled={locked}>
          <legend className={LABEL}>{labels["closing.outcome"]}</legend>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {TEST_PROJECT_OUTCOMES.map((key) => (
              <label key={key} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[15px] ${outcome === key ? "border-[#6d49e0] bg-[#efeafd]" : "border-[#e4e2f0] bg-white"}`}>
                <input type="radio" name="outcome" className="accent-[#6d49e0]" checked={outcome === key} onChange={() => setOutcome(key)} />
                {labels[`closing.outcomes.${key}`]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {!locked ? (
        <div><button type="submit" className={BTN} disabled={pending || !ready}>{labels[`${phase}.${submitted ? "update" : "submit"}`]}</button></div>
      ) : null}
      <ErrorLine error={error} labels={labels} />
    </form>
  );
}

