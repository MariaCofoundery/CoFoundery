"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ACCENTS, AUDIENCES, BUTTON_STYLES, FONTS, HEADER_MODES, HEADING_CASES, LANGUAGES, LOOKS, LIMITS,
  type Block, type BlockType, type EntryItem, type IssueData,
} from "@/features/newsletter/newsletterModel";
import { renderNewsletterHtml } from "@/features/newsletter/newsletterRender";
import {
  saveNewsletterIssueAction, scheduleNewsletterAction, sendNewsletterNowAction, sendNewsletterTestAction,
  unscheduleNewsletterAction, uploadNewsletterImageAction,
} from "@/features/newsletter/newsletterAdminActions";

type Candidate = { kind: "listing" | "problem"; id: string; title: string };
type Props = {
  issueId: string; initial: IssueData; status: "draft" | "scheduled" | "sending" | "sent"; scheduledLocal: string;
  candidates: Candidate[]; recipients: { members: { de: number; en: number }; list: { de: number; en: number } }; appOrigin: string; supabaseUrl: string;
};

const BOX = "rounded-2xl border border-[#d9dcec] bg-white p-4";
const LABEL = "text-xs font-bold uppercase tracking-[.08em] text-[#6d28d9]";
const FIELD = "mt-1 w-full rounded-xl border border-[#c9ccdf] bg-white px-3 py-2 text-[15px]";
const BTN = "min-h-11 rounded-xl border border-[#c9ccdf] bg-white px-4 text-sm font-semibold text-slate-900 disabled:opacity-50";
const BTN_PRIMARY = "min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white disabled:opacity-50";
const newId = () => `b${Math.random().toString(36).slice(2, 9)}`;

export function NewsletterEditor({ issueId, initial, status, scheduledLocal, candidates, recipients: recipientsByLanguage, appOrigin, supabaseUrl }: Props) {
  const t = useTranslations("admin.newsletter");
  const [issue, setIssue] = useState<IssueData>(initial);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [when, setWhen] = useState(scheduledLocal);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [confirmSend, setConfirmSend] = useState(false);
  const [pending, start] = useTransition();
  const active = useRef<HTMLTextAreaElement | null>(null);
  const locked = status !== "draft";
  // Wer die Ausgabe bekommt: Mitglieder, die Nur-Newsletter-Liste oder beide - jeweils in der Sprache der Ausgabe.
  const recipients = (issue.audience !== "public" ? recipientsByLanguage.members[issue.language] : 0) + (issue.audience !== "members" ? recipientsByLanguage.list[issue.language] : 0);

  const html = useMemo(() => renderNewsletterHtml(issue, {
    appOrigin, imageUrl: (path) => `${supabaseUrl}/storage/v1/object/public/newsletter/${encodeURIComponent(path)}`,
    unsubscribeUrl: "#", privacyUrl: "#", imprintUrl: "#",
  }), [issue, appOrigin, supabaseUrl]);

  const set = <K extends keyof IssueData>(key: K, value: IssueData[K]) => setIssue((current) => ({ ...current, [key]: value }));
  const setBlock = (id: string, patch: Partial<Block>) => setIssue((current) => ({ ...current, blocks: current.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) }));
  const move = (index: number, delta: number) => setIssue((current) => {
    const next = [...current.blocks]; const to = index + delta;
    if (to < 0 || to >= next.length) return current;
    [next[index], next[to]] = [next[to], next[index]];
    return { ...current, blocks: next };
  });
  const remove = (id: string) => setIssue((current) => ({ ...current, blocks: current.blocks.filter((b) => b.id !== id) }));
  const add = (type: BlockType) => {
    if (issue.blocks.length >= LIMITS.blocks) return;
    const id = newId();
    const block: Block = type === "text" ? { id, type, text: "" } : type === "entries" ? { id, type, title: t("blocks.entriesDefault"), items: [] } : type === "button" ? { id, type, label: "", href: "/connect" } : type === "quote" ? { id, type, text: "", by: "" } : type === "image" ? { id, type, path: "", alt: "" } : { id, type: "divider" };
    set("blocks", [...issue.blocks, block]);
  };

  // Formatierleiste: schreibt die Auszeichnung um die Auswahl im gerade bearbeiteten Textfeld.
  const wrap = (before: string, after: string, upper = false) => {
    const el = active.current; if (!el) return;
    const id = el.dataset.blockId; if (!id) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const chosen = value.slice(a, b);
    const inner = upper ? chosen.toUpperCase() : chosen || t("toolbar.placeholder");
    const next = value.slice(0, a) + before + inner + after + value.slice(b);
    setBlock(id, { text: next } as Partial<Block>);
  };
  const linePrefix = (prefix: string) => {
    const el = active.current; if (!el) return;
    const id = el.dataset.blockId; if (!id) return;
    const { selectionStart: a, value } = el;
    const start = value.lastIndexOf("\n", a - 1) + 1;
    setBlock(id, { text: value.slice(0, start) + prefix + value.slice(start) } as Partial<Block>);
  };

  const say = (tone: "ok" | "error", key: string, values?: Record<string, string | number>) => setNote({ tone, text: t(`messages.${key}`, values) });
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okKey: string) => start(async () => {
    const result = await fn();
    if (result.ok) { say("ok", result.message?.startsWith("sent:") ? "sentBatch" : okKey, result.message?.startsWith("sent:") ? { count: Number(result.message.slice(5)) } : undefined); if (result.message?.startsWith("sent:") || okKey === "scheduled" || okKey === "unscheduled") window.location.reload(); }
    else say("error", `error_${result.error ?? "save"}`);
  });

  const upload = (file: File | undefined, apply: (path: string) => void) => {
    if (!file) return;
    start(async () => {
      const data = new FormData(); data.set("file", file);
      const result = await uploadNewsletterImageAction(data);
      if (result.ok && result.path) { apply(result.path); say("ok", "uploaded"); } else say("error", `error_${result.ok ? "upload" : result.error}`);
    });
  };

  const textArea = (block: Extract<Block, { type: "text" }>) => (
    <textarea data-block-id={block.id} value={block.text} rows={7} maxLength={LIMITS.text} disabled={locked} onFocus={(e) => { active.current = e.currentTarget; }} onChange={(e) => setBlock(block.id, { text: e.target.value })} className={`${FIELD} font-[inherit] leading-6`} aria-label={t("blocks.text")} />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {note ? <p role="status" className={`rounded-2xl p-3 text-sm ${note.tone === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{note.text}</p> : null}
        {locked ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(`locked.${status}`)}</p> : null}

        <section className={BOX}>
          <h2 className={LABEL}>{t("basics.title")}</h2>
          <label className="mt-3 block text-sm font-semibold">{t("basics.subject")}<input className={FIELD} value={issue.subject} maxLength={LIMITS.subject} disabled={locked} onChange={(e) => set("subject", e.target.value)} /></label>
          <label className="mt-3 block text-sm font-semibold">{t("basics.preheader")}<input className={FIELD} value={issue.preheader} maxLength={LIMITS.preheader} disabled={locked} onChange={(e) => set("preheader", e.target.value)} /></label>
          <div className="mt-3 text-sm font-semibold" role="group" aria-label={t("basics.language")}>
            {t("basics.language")}
            <div className="mt-1 flex flex-wrap gap-2">
              {LANGUAGES.map((code) => <button key={code} type="button" disabled={locked} onClick={() => set("language", code)} aria-pressed={issue.language === code} className={`${BTN} ${issue.language === code ? "border-[#5b3df5] bg-[#efeafd]" : ""}`}>{t(`basics.languages.${code}`)}</button>)}
            </div>
            <p className="mt-1 text-xs font-normal text-slate-600">{t("basics.languageHint")}</p>
          </div>
          <div className="mt-3 text-sm font-semibold" role="group" aria-label={t("basics.audience")}>
            {t("basics.audience")}
            <div className="mt-1 flex flex-wrap gap-2">
              {AUDIENCES.map((code) => <button key={code} type="button" disabled={locked} onClick={() => set("audience", code)} aria-pressed={issue.audience === code} className={`${BTN} ${issue.audience === code ? "border-[#5b3df5] bg-[#efeafd]" : ""}`}>{t(`basics.audiences.${code}`)}</button>)}
            </div>
            <p className="mt-1 text-xs font-normal text-slate-600">{t("basics.audienceHint")}</p>
          </div>
          <label className="mt-3 block text-sm font-semibold">{t("basics.internal")}<input className={FIELD} value={issue.title} maxLength={120} disabled={locked} onChange={(e) => set("title", e.target.value)} /></label>
        </section>

        <section className={BOX} aria-label={t("look.title")}>
          <h2 className={LABEL}>{t("look.title")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {LOOKS.map((look) => <button key={look} type="button" disabled={locked} onClick={() => set("look", look)} aria-pressed={issue.look === look} className={`min-h-16 rounded-xl border-2 px-2 text-sm font-semibold ${issue.look === look ? "border-[#5b3df5]" : "border-[#d9dcec]"} ${look === "night" ? "bg-[#17173a] text-white" : look === "plain" ? "bg-[#faf9f5]" : "bg-white"}`}>{t(`look.${look}`)}</button>)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={t("look.accent")}>
            <span className="text-sm font-semibold">{t("look.accent")}</span>
            {ACCENTS.map((color) => <button key={color} type="button" disabled={locked} aria-label={color} aria-pressed={issue.accent === color} onClick={() => set("accent", color)} style={{ background: color }} className={`h-9 w-9 rounded-full ${issue.accent === color ? "outline outline-[3px] outline-offset-2 outline-slate-900" : "border border-slate-300"}`} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("look.header")}>
            {HEADER_MODES.map((mode) => <button key={mode} type="button" disabled={locked} onClick={() => set("headerMode", mode)} aria-pressed={issue.headerMode === mode} className={`${BTN} ${issue.headerMode === mode ? "border-[#5b3df5] bg-[#efeafd]" : ""}`}>{t(`look.headerModes.${mode}`)}</button>)}
          </div>
          {issue.headerMode === "image" ? (
            <div className="mt-3">
              <label className="block text-sm font-semibold">{t("look.upload")}<input type="file" accept="image/jpeg,image/png" disabled={locked || pending} onChange={(e) => upload(e.target.files?.[0], (path) => set("headerImagePath", path))} className="mt-1 block w-full text-sm" /></label>
              <label className="mt-2 block text-sm font-semibold">{t("look.alt")}<input className={FIELD} value={issue.headerAlt} maxLength={200} disabled={locked} onChange={(e) => set("headerAlt", e.target.value)} /></label>
              <p className="mt-1 text-xs text-slate-600">{t("look.uploadHint")}</p>
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <label className="font-semibold">{t("look.font")}<select className={FIELD} value={issue.font} disabled={locked} onChange={(e) => set("font", e.target.value as IssueData["font"])}>{FONTS.map((f) => <option key={f} value={f}>{t(`look.fonts.${f}`)}</option>)}</select></label>
            <label className="font-semibold">{t("look.button")}<select className={FIELD} value={issue.buttonStyle} disabled={locked} onChange={(e) => set("buttonStyle", e.target.value as IssueData["buttonStyle"])}>{BUTTON_STYLES.map((f) => <option key={f} value={f}>{t(`look.buttons.${f}`)}</option>)}</select></label>
            <label className="font-semibold">{t("look.headings")}<select className={FIELD} value={issue.headingCase} disabled={locked} onChange={(e) => set("headingCase", e.target.value as IssueData["headingCase"])}>{HEADING_CASES.map((f) => <option key={f} value={f}>{t(`look.headingCases.${f}`)}</option>)}</select></label>
          </div>
        </section>

        <section className={BOX} aria-label={t("blocks.title")}>
          <h2 className={LABEL}>{t("blocks.title")}</h2>
          <div className="mt-3 flex flex-wrap gap-1.5 rounded-xl border border-[#d9dcec] bg-[#faf9fe] p-2" role="toolbar" aria-label={t("toolbar.title")}>
            <button type="button" className={BTN} disabled={locked} onClick={() => wrap("**", "**")}><strong>{t("toolbar.bold")}</strong></button>
            <button type="button" className={BTN} disabled={locked} onClick={() => wrap("*", "*")}><em>{t("toolbar.italic")}</em></button>
            <button type="button" className={BTN} disabled={locked} onClick={() => wrap("", "", true)}>Aa</button>
            <button type="button" className={BTN} disabled={locked} onClick={() => linePrefix("# ")}>{t("toolbar.h1")}</button>
            <button type="button" className={BTN} disabled={locked} onClick={() => linePrefix("## ")}>{t("toolbar.h2")}</button>
            <button type="button" className={BTN} disabled={locked} onClick={() => linePrefix("- ")}>{t("toolbar.list")}</button>
            <button type="button" className={BTN} disabled={locked} onClick={() => wrap("[", "](https://)")}>{t("toolbar.link")}</button>
          </div>
          <p className="mt-1 text-xs text-slate-600">{t("toolbar.hint")}</p>
          <div className="mt-3 space-y-3">
            {issue.blocks.map((block, index) => (
              <div key={block.id} className="rounded-xl border border-[#d9dcec] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs font-bold uppercase tracking-[.08em] text-[#6d28d9]">{t(`blocks.${block.type}`)}</span>
                  <button type="button" className={BTN} disabled={locked || index === 0} onClick={() => move(index, -1)} aria-label={t("blocks.up")}>↑</button>
                  <button type="button" className={BTN} disabled={locked || index === issue.blocks.length - 1} onClick={() => move(index, 1)} aria-label={t("blocks.down")}>↓</button>
                  <button type="button" className={BTN} disabled={locked} onClick={() => remove(block.id)}>{t("blocks.remove")}</button>
                </div>
                {block.type === "text" ? textArea(block) : null}
                {block.type === "quote" ? (<><textarea className={FIELD} rows={2} maxLength={400} disabled={locked} value={block.text} onChange={(e) => setBlock(block.id, { text: e.target.value })} aria-label={t("blocks.quote")} /><input className={FIELD} maxLength={80} disabled={locked} value={block.by} placeholder={t("blocks.quoteBy")} onChange={(e) => setBlock(block.id, { by: e.target.value })} /><p className="mt-1 text-xs text-slate-600">{t("blocks.quoteHint")}</p></>) : null}
                {block.type === "button" ? (<div className="mt-1 grid gap-2 sm:grid-cols-2"><input className={FIELD} maxLength={LIMITS.label} disabled={locked} value={block.label} placeholder={t("blocks.buttonLabel")} onChange={(e) => setBlock(block.id, { label: e.target.value })} /><input className={FIELD} maxLength={300} disabled={locked} value={block.href} placeholder="/connect" onChange={(e) => setBlock(block.id, { href: e.target.value })} /></div>) : null}
                {block.type === "image" ? (<div className="mt-1"><input type="file" accept="image/jpeg,image/png" disabled={locked || pending} onChange={(e) => upload(e.target.files?.[0], (path) => setBlock(block.id, { path }))} className="block w-full text-sm" /><input className={FIELD} maxLength={200} disabled={locked} value={block.alt} placeholder={t("look.alt")} onChange={(e) => setBlock(block.id, { alt: e.target.value })} /></div>) : null}
                {block.type === "entries" ? (
                  <div className="mt-1">
                    <input className={FIELD} maxLength={LIMITS.label} disabled={locked} value={block.title} onChange={(e) => setBlock(block.id, { title: e.target.value })} aria-label={t("blocks.entriesTitle")} />
                    <ul className="mt-2 space-y-2">
                      {block.items.map((item, i) => (
                        <li key={item.id} className="flex items-center gap-2">
                          <input className={FIELD + " mt-0"} maxLength={LIMITS.itemTitle} disabled={locked} value={item.title} onChange={(e) => setBlock(block.id, { items: block.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} aria-label={t("blocks.itemTitle")} />
                          <button type="button" className={BTN} disabled={locked} onClick={() => setBlock(block.id, { items: block.items.filter((_, j) => j !== i) })}>{t("blocks.remove")}</button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs font-semibold text-slate-700">{t("blocks.candidates")}</p>
                    {candidates.length === 0 ? <p className="text-xs text-slate-600">{t("blocks.noCandidates")}</p> : (
                      <ul className="mt-1 space-y-1">
                        {candidates.filter((c) => !block.items.some((x) => x.id === c.id)).map((c) => (
                          <li key={c.id}><button type="button" disabled={locked || block.items.length >= LIMITS.items} onClick={() => setBlock(block.id, { items: [...block.items, { kind: c.kind, id: c.id, title: c.title } as EntryItem] })} className="text-left text-sm text-violet-800 underline">+ {c.title}</button></li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1 text-xs text-slate-600">{t("blocks.entriesHint")}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["text", "entries", "button", "quote", "image", "divider"] as const).map((type) => <button key={type} type="button" className={BTN} disabled={locked} onClick={() => add(type)}>+ {t(`blocks.${type}`)}</button>)}
          </div>
        </section>

        <section className={BOX}>
          <h2 className={LABEL}>{t("send.title")}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={BTN} disabled={locked || pending} onClick={() => run(() => saveNewsletterIssueAction(issueId, issue), "saved")}>{t("send.save")}</button>
            <button type="button" className={BTN} disabled={pending} onClick={() => run(() => sendNewsletterTestAction(issue), "testSent")}>{t("send.test")}</button>
          </div>
          <div className="mt-4 rounded-xl bg-[#f7f6fd] p-3 text-sm leading-6">
            <p>{t("send.recipients", { count: recipients })}</p>
            {status === "draft" ? (
              <>
                <label className="mt-2 block font-semibold">{t("send.when")}<input type="datetime-local" className={FIELD} value={when} onChange={(e) => setWhen(e.target.value)} /></label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={BTN_PRIMARY} disabled={pending || !when} onClick={() => run(() => scheduleNewsletterAction(issueId, issue, when), "scheduled")}>{t("send.schedule")}</button>
                  {confirmSend ? (
                    <>
                      <span className="self-center text-sm font-semibold">{t("send.sure", { count: recipients })}</span>
                      <button type="button" className={BTN_PRIMARY} disabled={pending} onClick={() => run(() => sendNewsletterNowAction(issueId, issue), "sentBatch")}>{t("send.sureYes")}</button>
                      <button type="button" className={BTN} onClick={() => setConfirmSend(false)}>{t("send.sureNo")}</button>
                    </>
                  ) : <button type="button" className={BTN} disabled={pending} onClick={() => setConfirmSend(true)}>{t("send.now")}</button>}
                </div>
              </>
            ) : status === "scheduled" ? (
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={BTN} disabled={pending} onClick={() => run(() => unscheduleNewsletterAction(issueId), "unscheduled")}>{t("send.unschedule")}</button></div>
            ) : status === "sending" ? (
              <div className="mt-2"><button type="button" className={BTN_PRIMARY} disabled={pending} onClick={() => run(() => sendNewsletterNowAction(issueId, issue), "sentBatch")}>{t("send.nextBatch")}</button></div>
            ) : null}
            <p className="mt-2 text-xs text-slate-600">{t("send.limitHint")}</p>
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-2 flex items-center gap-2" role="group" aria-label={t("preview.title")}>
          <span className={LABEL}>{t("preview.title")}</span>
          {(["phone", "desktop"] as const).map((d) => <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={`${BTN} ${device === d ? "border-[#5b3df5] bg-[#efeafd]" : ""}`}>{t(`preview.${d}`)}</button>)}
        </div>
        <div className="overflow-hidden rounded-[28px] border border-[#d9dcec] bg-[#0e0e22] p-3">
          <iframe title={t("preview.title")} sandbox="" srcDoc={html} className="mx-auto block h-[720px] rounded-2xl bg-white" style={{ width: device === "phone" ? 360 : "100%", maxWidth: "100%" }} />
        </div>
        <p className="mt-2 text-xs text-slate-600">{t("preview.hint")}</p>
      </div>
    </div>
  );
}
