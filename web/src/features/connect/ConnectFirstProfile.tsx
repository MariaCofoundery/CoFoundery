"use client";

import { useState, type ReactNode } from "react";

type Copy = {
  stepOf: string; back: string; next: string;
  titleRole: string; leadRole: string; nameLabel: string; headlineLabel: string; headlineHint: string; rolesLabel: string; rolesHint: string; mustHint: string;
  titleOpen: string; leadOpen: string; noteLabel: string; notePlaceholder: string; skip: string; optional: string;
  titleShow: string; previewTitle: string; previewEmpty: string; previewLater: string; showQuestion: string; publishHint: string;
  missing: string; missingName: string; missingHeadline: string; missingRole: string;
};

type Props = {
  initial: { name: string; headline: string; roles: string[]; open: string[]; contactNote: string };
  roles: { value: string; label: string }[];
  openFormats: { value: string; label: string }[];
  noteMin: number; noteMax: number;
  visibilityNode: ReactNode; moreNode: ReactNode; draftNode: ReactNode; publishNode: ReactNode;
  copy: Copy;
};

const FIELD = "mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100";
const CHIP = "flex min-h-11 cursor-pointer items-center rounded-full border border-slate-300 bg-white px-4 text-[15px] has-[:checked]:border-violet-700 has-[:checked]:bg-violet-700 has-[:checked]:font-semibold has-[:checked]:text-white";

/**
 * Das Connect-Profil beim ersten Anlegen (Entwurf 16.11.2026). Am Handy drei kurze Schritte, am Rechner EINE Seite mit Live-Vorschau.
 * Pflicht sind nur Name, eine Zeile und eine Rolle; alles Weitere ist freiwillig und steht unter "Weitere Einstellungen".
 *
 * DAS FORMULAR BLEIBT EINS: Alle Felder stehen die ganze Zeit im Dokument (nicht gezeigte Schritte sind nur ausgeblendet), Speichern und
 * Veroeffentlichen laufen ueber `saveConnectProfileAction`; die Pruefung des Servers bleibt massgeblich. Die Sperre am Knopf ist Hilfe, kein Schutz.
 */
export function ConnectFirstProfile({ initial, roles, openFormats, noteMin, noteMax, visibilityNode, moreNode, draftNode, publishNode, copy }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [chosenRoles, setChosenRoles] = useState<string[]>(initial.roles);
  const [chosenOpen, setChosenOpen] = useState<string[]>(initial.open);
  const total = 3;
  const toggle = (list: string[], set: (v: string[]) => void, value: string) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const missing = [name.trim().length < 2 ? copy.missingName : null, headline.trim().length < 3 ? copy.missingHeadline : null, chosenRoles.length === 0 ? copy.missingRole : null].filter((x): x is string => Boolean(x));
  const show = (i: number) => (step === i ? "" : "hidden lg:block");
  const initialLetter = (name.trim()[0] ?? "?").toUpperCase();

  const preview = (
    <aside aria-label={copy.previewTitle} className="grid gap-3 self-start lg:sticky lg:top-6">
      <p className="text-xs font-bold uppercase tracking-[.08em] text-violet-800">{copy.previewTitle}</p>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(76,29,149,.10)]">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100 text-2xl font-bold text-violet-800">{initialLetter}</span>
          <div className="min-w-0">
            <p className="break-words text-xl font-bold text-slate-950">{name.trim() || copy.previewEmpty}</p>
            <p className="break-words text-[15px] leading-6 text-slate-600">{headline.trim() || copy.previewEmpty}</p>
          </div>
        </div>
        {chosenRoles.length + chosenOpen.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {chosenRoles.map((value) => <li key={value} className="rounded-full bg-violet-50 px-3 py-1 text-[13px] font-semibold text-violet-900">{roles.find((r) => r.value === value)?.label}</li>)}
            {chosenOpen.map((value) => <li key={value} className="rounded-full bg-slate-100 px-3 py-1 text-[13px] text-slate-800">{openFormats.find((r) => r.value === value)?.label}</li>)}
          </ul>
        ) : null}
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{copy.previewLater}</p>
      </section>
    </aside>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-9">
      <div className="grid gap-5">
        <div className="grid gap-2 lg:hidden">
          <span className="text-[13px] font-bold text-slate-600">{copy.stepOf.replace("{current}", String(step + 1)).replace("{total}", String(total))}</span>
          <div className="h-[5px] overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-[width] duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
        </div>

        <section className={`${show(0)} rounded-3xl border border-slate-200 bg-white p-5 sm:p-6`} aria-labelledby="first-role">
          <h2 id="first-role" className="text-2xl font-semibold leading-tight text-[#0b1f3a] sm:text-3xl">{copy.titleRole}</h2>
          <p className="mt-1.5 text-base leading-7 text-slate-700">{copy.leadRole}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block text-[15px] font-semibold">{copy.nameLabel}
              <input name="identity_display_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={FIELD} />
            </label>
            <label className="block text-[15px] font-semibold">{copy.headlineLabel}
              <input name="identity_headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160} className={FIELD} />
              <span className="mt-1 block text-[13px] font-normal text-slate-600">{copy.headlineHint}</span>
            </label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-[15px] font-semibold">{copy.rolesLabel} <span className="font-normal text-slate-600">{copy.rolesHint}</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.map((role) => (
                <label key={role.value} className={CHIP}>
                  <input type="checkbox" name="network_roles" value={role.value} checked={chosenRoles.includes(role.value)} onChange={() => toggle(chosenRoles, setChosenRoles, role.value)} className="sr-only" />
                  {role.label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-sm text-slate-600">{copy.mustHint}</p>
        </section>

        <section className={`${show(1)} rounded-3xl border border-slate-200 bg-white p-5 sm:p-6`} aria-labelledby="first-open">
          <h2 id="first-open" className="text-xl font-semibold text-[#0b1f3a]">{copy.titleOpen} <span className="text-base font-normal text-slate-600">{copy.optional}</span></h2>
          <p className="mt-1 text-[15px] leading-6 text-slate-700">{copy.leadOpen}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {openFormats.map((format) => (
              <label key={format.value} className={CHIP}>
                <input type="checkbox" name="open_to_formats" value={format.value} checked={chosenOpen.includes(format.value)} onChange={() => toggle(chosenOpen, setChosenOpen, format.value)} className="sr-only" />
                {format.label}
              </label>
            ))}
          </div>
          <label className="mt-4 block text-[15px] font-semibold">{copy.noteLabel}
            <input name="contact_note" defaultValue={initial.contactNote} minLength={noteMin} maxLength={noteMax} placeholder={copy.notePlaceholder} className={FIELD} />
          </label>
        </section>

        <section className={`${show(2)} grid gap-4`} aria-labelledby="first-show">
          <div className="lg:hidden">{preview}</div>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="first-show" className="text-xl font-semibold text-[#0b1f3a]">{copy.showQuestion}</h2>
            {visibilityNode}
            <details className="rounded-2xl border border-slate-200 p-4">
              <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-semibold text-violet-800">{copy.titleShow}</summary>
              <div className="mt-3 grid gap-4">{moreNode}</div>
            </details>
            {missing.length > 0 ? (
              <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-bold">{copy.missing}</p>
                <ul className="mt-1 list-disc pl-5">{missing.map((line) => <li key={line}>{line}</li>)}</ul>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
              {/* Entwurf speichern steht im Dokument zuerst (die Eingabetaste loest den ersten Knopf aus und soll nie veroeffentlichen), erscheint aber danach. */}
              <div className="order-2">{draftNode}</div>
              <fieldset disabled={missing.length > 0} className="contents"><div className="order-1">{publishNode}</div></fieldset>
            </div>
            <p className="text-[13px] leading-5 text-slate-600">{copy.publishHint}</p>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 lg:hidden">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 disabled:opacity-40">{copy.back}</button>
          {step < total - 1 ? (
            <div className="flex items-center gap-2">
              {step === 1 ? <button type="button" onClick={() => setStep(2)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700">{copy.skip}</button> : null}
              <button type="button" onClick={() => setStep(step + 1)} className="brand-cta inline-flex min-h-12 items-center rounded-2xl px-7 text-base font-semibold">{copy.next}</button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="hidden lg:block">{preview}</div>
    </div>
  );
}
