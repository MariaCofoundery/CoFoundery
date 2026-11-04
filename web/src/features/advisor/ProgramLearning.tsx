import { getTranslations } from "next-intl/server";
import {
  deleteLearningLessonAction,
  deleteLearningModuleAction,
  saveLearningLessonAction,
  saveLearningModuleAction,
  setModuleAudienceAction,
} from "@/features/advisor/teamProgramActions";
import type { LearningLesson, LearningModule, ModuleShare } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const SAVE = "inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white";
const DELETE = "inline-flex min-h-11 items-center px-2 text-sm font-medium text-rose-700 underline-offset-4 hover:underline";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** Nur die Adresse des Ziels, nicht den ganzen Pfad: so sieht man vor dem Klick, wohin der Link fuehrt. */
const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function LessonLine({ lesson, t }: { lesson: LearningLesson; t: T }) {
  return (
    <div className="min-w-0">
      <a href={lesson.url} target="_blank" rel="noopener noreferrer" className="break-words text-base font-semibold text-violet-800 underline-offset-4 hover:underline">
        {lesson.title}
      </a>
      <p className="break-all text-xs text-slate-500">
        {t("learningOpens", { host: hostOf(lesson.url) })}
        {lesson.minutes ? ` · ${t("learningMinutes", { count: lesson.minutes })}` : ""}
        {lesson.speaker ? ` · ${lesson.speaker}` : ""}
      </p>
      {lesson.note ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700"><UserText text={lesson.note} /></p> : null}
    </div>
  );
}

function ModuleFields({ module, t }: { module?: LearningModule; t: T }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("learningModuleTitle")}</span>
        <input name="title" required maxLength={120} defaultValue={module?.title ?? ""} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("learningDescription")}</span>
        <input name="description" maxLength={500} defaultValue={module?.description ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("learningPosition")}</span>
        <input name="position" type="number" min={0} max={9999} defaultValue={module?.position ?? 100} className={FIELD} />
      </label>
    </div>
  );
}

function LessonFields({ lesson, t }: { lesson?: LearningLesson; t: T }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("learningLessonTitle")}</span>
        <input name="title" required maxLength={160} defaultValue={lesson?.title ?? ""} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("materialsUrl")}</span>
        <input name="url" type="url" required maxLength={500} placeholder="https://" defaultValue={lesson?.url ?? ""} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("materialsNote")}</span>
        <input name="note" maxLength={500} defaultValue={lesson?.note ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("learningMinutesField")}</span>
        <input name="minutes" type="number" min={1} max={600} defaultValue={lesson?.minutes ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("learningPosition")}</span>
        <input name="position" type="number" min={0} max={9999} defaultValue={lesson?.position ?? 100} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("learningSpeaker")}</span>
        <input name="speaker" maxLength={120} defaultValue={lesson?.speaker ?? ""} className={FIELD} />
        <span className="mt-1 block text-xs leading-5 text-slate-600">{t("learningSpeakerNote")}</span>
      </label>
    </div>
  );
}

/**
 * Lernbereich der Organisation: Module mit Lektionen, jede Lektion ein Link (Video, Folien, Canva, ...).
 * Anlegen, aendern und loeschen darf nur der Inhaber; veroeffentlichte Module sehen die Teams im Programm.
 * Es wird nichts hochgeladen, nichts eingebettet und nichts darueber festgehalten, wer was oeffnet.
 */
export async function OrgProgramLearning({
  orgId,
  isOwner,
  modules,
  shares = [],
  teams = [],
  people = [],
}: {
  orgId: string;
  isOwner: boolean;
  modules: LearningModule[];
  shares?: ModuleShare[];
  /** Programm-Teams, die gewaehlt werden koennen. */
  teams?: { programId: string; name: string }[];
  /** Begleitete Personen mit freigegebenem Namen. */
  people?: { userId: string; name: string }[];
}) {
  const t = await getTranslations("advisor.teamProgram");
  const audienceOf = (module: LearningModule) => {
    const own = shares.filter((share) => share.moduleId === module.moduleId);
    return { programs: own.filter((share) => share.programId).length, persons: own.filter((share) => share.subjectUserId).length };
  };
  return (
    <section aria-labelledby="learning-title" className="grid gap-3">
      <div>
        <h2 id="learning-title" className="text-xl font-semibold text-slate-950">{t("learningTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("learningText")}</p>
        <p className="mt-2 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("learningNote")}</p>
      </div>
      {modules.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">{t("learningEmpty")}</p> : null}
      <ul className="grid gap-4">
        {modules.map((module) => (
          <li key={module.moduleId} className="advisor-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-950">{module.title}</h3>
              {(() => {
                const audience = audienceOf(module);
                const open = module.published || audience.programs > 0 || audience.persons > 0;
                return (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                    {module.published
                      ? t("learningLiveAll")
                      : open
                        ? [audience.programs > 0 ? t("learningLiveTeams", { count: audience.programs }) : null, audience.persons > 0 ? t("learningLivePeople", { count: audience.persons }) : null].filter(Boolean).join(" · ")
                        : t("learningDraft")}
                  </span>
                );
              })()}
            </div>
            {module.description ? <p className="mt-1 text-sm leading-6 text-slate-700">{module.description}</p> : null}
            {module.lessons.length === 0 ? <p className="mt-3 text-sm text-slate-600">{t("learningNoLessons")}</p> : null}
            <ul className="mt-3 divide-y divide-slate-100">
              {module.lessons.map((lesson) => (
                <li key={lesson.lessonId} className="py-3">
                  <LessonLine lesson={lesson} t={t} />
                  {isOwner ? (
                    <details className="mt-1">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("materialsEdit")}</summary>
                      <form action={saveLearningLessonAction} className="mt-2 grid gap-3">
                        <input type="hidden" name="orgId" value={orgId} />
                        <input type="hidden" name="moduleId" value={module.moduleId} />
                        <input type="hidden" name="lessonId" value={lesson.lessonId} />
                        <LessonFields lesson={lesson} t={t} />
                        <SubmitButton label={t("materialsSave")} pendingLabel="…" className={SAVE} />
                      </form>
                      <form action={deleteLearningLessonAction} className="mt-1">
                        <input type="hidden" name="orgId" value={orgId} />
                        <input type="hidden" name="lessonId" value={lesson.lessonId} />
                        <SubmitButton label={t("learningDeleteLesson")} pendingLabel="…" className={DELETE} />
                      </form>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
            {isOwner ? (
              <div className="mt-2 grid gap-1 border-t border-slate-100 pt-2">
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("learningNewLesson")}</summary>
                  <form action={saveLearningLessonAction} className="mt-2 grid gap-3">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="moduleId" value={module.moduleId} />
                    <LessonFields t={t} />
                    <SubmitButton label={t("materialsSave")} pendingLabel="…" className={SAVE} />
                  </form>
                </details>
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("learningAudience")}</summary>
                  <form action={setModuleAudienceAction} className="mt-2 grid gap-3">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="moduleId" value={module.moduleId} />
                    <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-900">
                      <input name="allPrograms" type="checkbox" defaultChecked={module.published} className="size-5" />
                      <span>{t("learningAudienceAll")}</span>
                    </label>
                    {teams.length > 0 ? (
                      <fieldset className="grid gap-1">
                        <legend className={LABEL}>{t("learningAudienceTeams")}</legend>
                        {teams.map((team) => (
                          <label key={team.programId} className="flex min-h-11 items-center gap-3 text-sm text-slate-900">
                            <input name="programId" type="checkbox" value={team.programId} defaultChecked={shares.some((share) => share.moduleId === module.moduleId && share.programId === team.programId)} className="size-5" />
                            <span>{team.name}</span>
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                    {people.length > 0 ? (
                      <fieldset className="grid gap-1">
                        <legend className={LABEL}>{t("learningAudiencePeople")}</legend>
                        {people.map((person) => (
                          <label key={person.userId} className="flex min-h-11 items-center gap-3 text-sm text-slate-900">
                            <input name="personId" type="checkbox" value={person.userId} defaultChecked={shares.some((share) => share.moduleId === module.moduleId && share.subjectUserId === person.userId)} className="size-5" />
                            <span>{person.name}</span>
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                    <p className="text-xs leading-5 text-slate-600">{t("learningAudienceNote")}</p>
                    <SubmitButton label={t("materialsSave")} pendingLabel="…" className={SAVE} />
                  </form>
                </details>
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("learningEditModule")}</summary>
                  <form action={saveLearningModuleAction} className="mt-2 grid gap-3">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="moduleId" value={module.moduleId} />
                    <ModuleFields module={module} t={t} />
                    <SubmitButton label={t("materialsSave")} pendingLabel="…" className={SAVE} />
                  </form>
                  <form action={deleteLearningModuleAction} className="mt-1">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="moduleId" value={module.moduleId} />
                    <SubmitButton label={t("learningDeleteModule")} pendingLabel="…" className={DELETE} />
                  </form>
                </details>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {isOwner ? (
        <details open={modules.length === 0} className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("learningNewModule")}</summary>
          <form action={saveLearningModuleAction} className="mt-3 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <ModuleFields t={t} />
            <SubmitButton label={t("materialsSave")} pendingLabel="…" className={SAVE} />
          </form>
        </details>
      ) : null}
    </section>
  );
}

/** Die Sicht des Teams: veroeffentlichte Module der Organisation, nur lesen und oeffnen. */
export async function TeamProgramLearning({ modules }: { modules: (LearningModule & { orgName: string })[] }) {
  const t = await getTranslations("advisor.teamProgram");
  if (modules.length === 0) return null;
  return (
    <section aria-labelledby="my-learning-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
      <h2 id="my-learning-title" className="text-lg font-semibold text-slate-950">{t("myLearningTitle")}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-600">{t("myLearningText")}</p>
      <div className="mt-3 grid gap-5">
        {modules.map((module) => (
          <div key={module.moduleId}>
            <h3 className="text-base font-semibold text-slate-950">{module.title}</h3>
            <p className="text-xs text-slate-500">{module.orgName}</p>
            {module.description ? <p className="mt-1 text-sm leading-6 text-slate-700">{module.description}</p> : null}
            <ul className="mt-2 divide-y divide-slate-100">
              {module.lessons.map((lesson) => (
                <li key={lesson.lessonId} className="py-3"><LessonLine lesson={lesson} t={t} /></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
