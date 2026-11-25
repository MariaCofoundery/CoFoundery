"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { DictatedTextarea } from "@/features/dictation/DictatedTextarea";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/features/interviews/interviewDrafts";
import { addIntroNoteAction, saveSceneAction, skipSceneAction } from "@/features/strengths/strengthsDiscoverActions";
import { appendNoteToText, DISCOVER_MIN_LENGTH, INTRO_NOTE_MAX_LENGTH, STORY_MAX_LENGTH, STEP_KEYS } from "@/features/strengths/strengthsDiscoverGuide";
import { IntroNotesStrip } from "@/features/strengths/IntroNotesStrip";
import { SceneVignette } from "@/features/strengths/SceneVignette";
import { isSceneId } from "@/features/strengths/strengthsDiscoverGuide";
import { SubmitButton } from "@/features/ui/SubmitButton";
import "@/features/align/align.css";

/**
 * Eine Szene, ein Textfeld (Fassung vom 25.11.2026). Die drei früheren Schritte (Was war los? Was hast du getan?
 * Was kam heraus?) stehen nur noch als Stütze neben dem Feld; geschrieben wird ein zusammenhängender Text.
 *
 * Der Browser sichert jede Änderung zusätzlich (wie in den anderen Gesprächen), falls das Fenster zugeht.
 */
export function SceneForm({
  sessionId,
  turnId,
  sceneId,
  index,
  total,
  savedText,
  canSkip,
  introNotes,
}: {
  sessionId: string;
  turnId: string;
  sceneId: string;
  index: number;
  total: number;
  savedText: string;
  canSkip: boolean;
  /** Die Stichworte aus dem Intro: stehen bei jeder Szene dabei. */
  introNotes: string[];
}) {
  const t = useTranslations("strengths");
  const key = draftKey(sessionId, turnId);
  const [initial, setInitial] = useState(savedText);
  const [revision, setRevision] = useState(0);
  const [value, setValue] = useState(savedText);
  const [addingNote, startAddNote] = useTransition();
  const refocus = useRef(false);
  const loaded = useRef(false);

  // Einen Browserstand wiederherstellen, falls das Fenster vorher zuging. Erst nach dem Aufbau, damit
  // Server und Browser dasselbe zuerst zeichnen.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const raw = readDraft(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { story?: unknown };
      if (typeof draft.story === "string" && draft.story.length > 0) {
        setInitial(draft.story);
        setValue(draft.story);
        setRevision((current) => current + 1);
      }
    } catch {
      clearDraft(key);
    }
  }, [key]);

  function onValue(text: string) {
    setValue(text);
    writeDraft(key, JSON.stringify({ story: text }));
  }

  // Ein Stichwort aus dem Intro ins Textfeld übernehmen; das Feld wird neu aufgebaut und bekommt danach den Fokus zurück.
  function takeNote(note: string) {
    const next = appendNoteToText(value, note, STORY_MAX_LENGTH);
    setValue(next);
    setInitial(next);
    writeDraft(key, JSON.stringify({ story: next }));
    refocus.current = true;
    setRevision((current) => current + 1);
  }

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const field = document.getElementById("scene-story");
    if (field instanceof HTMLTextAreaElement) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }, [revision]);

  const ready = value.trim().length >= DISCOVER_MIN_LENGTH;

  return (
    <form action={saveSceneAction} onSubmit={() => clearDraftSoon(key)} className="flex flex-col gap-8 xl:flex-row">
      <input type="hidden" name="turnId" value={turnId} />

      <aside className="relative flex flex-none flex-col gap-5 overflow-hidden rounded-3xl bg-[#5b36d4] p-7 text-white xl:w-[340px]">
        <div className="relative flex items-center gap-3.5">
          {isSceneId(sceneId) ? <SceneVignette id={sceneId} selected /> : null}
          <div className="flex flex-col">
            <span className="font-semibold">{t("discover.scene.counter", { index, total })}</span>
            <span className="text-[13px] text-[#dcd3fb]">{t("discover.scene.minutes")}</span>
          </div>
        </div>
        <p className="font-brand relative text-[28px] leading-[1.2]">{t(`interview.questions.${sceneId}.scene`)}</p>
        <IntroNotesStrip
          notes={introNotes}
          tone="onPurple"
          onPick={takeNote}
          onAdd={(note) => startAddNote(async () => { await addIntroNoteAction(note); })}
          adding={addingNote}
          maxLength={INTRO_NOTE_MAX_LENGTH}
          copy={{
            title: t("discover.pick.yourNotes"),
            hint: t("discover.scene.notesHint"),
            take: (note) => t("discover.scene.notesTake", { note }),
            addLabel: t("discover.scene.notesAddLabel"),
            addPlaceholder: t("discover.scene.notesAddPlaceholder"),
            add: t("discover.scene.notesAdd"),
          }}
        />
        <p className="relative mt-auto border-t border-white/20 pt-4 text-[13px] text-[#dcd3fb]">{t("discover.scene.private")}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <h2 className="font-brand text-[clamp(28px,3vw,40px)] font-normal leading-[1.15] tracking-[-0.01em] text-[#14152b]">
          {t(`interview.questions.${sceneId}.title`)}
        </h2>

        <section key={revision} className="flex flex-col gap-3.5 rounded-[22px] border border-[#e6e4f2] bg-white p-6 shadow-[0_18px_40px_-26px_rgba(46,30,120,0.35)]">
          <label htmlFor="scene-story" className="text-xl font-semibold">{t("discover.scene.story.label")}</label>
          <DictatedTextarea
            id="scene-story"
            name="story"
            defaultValue={initial}
            rows={9}
            maxLength={STORY_MAX_LENGTH}
            placeholder={t("discover.scene.story.placeholder")}
            className="w-full rounded-2xl border border-[#d5d3e6] bg-[#fbfaff] p-4 text-[17px] leading-relaxed text-[#14152b] focus:border-[#6d49e0] focus:outline focus:outline-[3px] focus:outline-[#c9bbf7]"
            onValueChange={onValue}
          />
          <div className="rounded-2xl bg-[#f4f1fe] px-[18px] py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5b36d4]">{t("discover.scene.story.guideTitle")}</p>
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 text-[15px] text-[#2b2d47]">
              {STEP_KEYS.map((part) => (
                <li key={part}>{t(`discover.scene.story.${part}`)}</li>
              ))}
            </ul>
          </div>
          <span className="text-sm text-[#4a4d68]">{t("discover.scene.lengthHint")}</span>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          {canSkip ? (
            <SubmitButton
              formAction={skipSceneAction}
              label={t("discover.scene.skip")}
              pendingLabel={t("discover.scene.skipPending")}
              className="min-h-11 text-sm text-[#4a4d68] underline-offset-4 hover:underline"
            />
          ) : null}
          <Link href="/me/profile" className="inline-flex min-h-11 items-center text-sm text-[#4a4d68] underline-offset-4 hover:underline">
            {t("discover.pick.pauseLink")}
          </Link>
          <div className="ml-auto">
            {ready ? (
              <SubmitButton
                label={t("discover.scene.save")}
                pendingLabel={t("discover.scene.savePending")}
                className="inline-flex min-h-12 items-center rounded-[14px] bg-[#14152b] px-6 font-semibold text-white"
              />
            ) : (
              <span className="inline-flex min-h-12 items-center rounded-[14px] bg-[#e6e4f2] px-6 font-semibold text-[#6b6d86]">
                {t("discover.scene.save")}
              </span>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

/** Der Browserstand wird erst nach dem Absenden geleert - schlägt das Speichern fehl, bleibt der Text erhalten. */
function clearDraftSoon(key: string) {
  setTimeout(() => clearDraft(key), 4000);
}
