"use client";

import { useState } from "react";
import {
  LINKEDIN_VISIBILITIES,
  parseLinkedInUrl,
  type LinkedInVisibility,
} from "@/features/profile/linkedInVisibility";

type Copy = {
  title: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlHint: string;
  urlInvalid: string;
  visibilityTitle: string;
  options: Record<LinkedInVisibility, { label: string; hint: string }>;
  publicWarning: string;
  publicConfirm: string;
};

/**
 * Die Adresse und die Frage, wer sie sieht - in einem Block.
 *
 * Beides zu trennen waere die haeufigste Art, so etwas falsch zu bauen: Man
 * traegt einen Link ein und erfaehrt an anderer Stelle, dass er laengst jemand
 * anderem angezeigt wird. Hier steht die Entscheidung direkt darunter, und zu
 * jeder Stufe steht, was sie bedeutet - nicht nur, wie sie heisst.
 *
 * Die Stufen werden erst gezeigt, wenn ueberhaupt eine Adresse dasteht. Wer das
 * Feld leer laesst, soll nicht ueber ein Publikum nachdenken muessen, das es
 * nicht gibt.
 *
 * Fuer "oeffentlich" gibt es eine zusaetzliche Bestaetigung, aber nur beim
 * Wechsel dorthin. Wer sie einmal gegeben hat, wird beim naechsten Speichern
 * nicht erneut gefragt - sonst wird aus einer Entscheidung eine Huerde.
 */
export function LinkedInField({
  initialUrl,
  initialVisibility,
  copy,
}: {
  initialUrl: string;
  initialVisibility: LinkedInVisibility;
  copy: Copy;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [invalid, setInvalid] = useState(false);
  const [visibility, setVisibility] = useState<LinkedInVisibility>(initialVisibility);
  const firstPublicTransition = initialVisibility !== "public" && visibility === "public";

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-5">
      <legend className="px-1 text-sm font-semibold text-slate-900">{copy.title}</legend>

      {/* BEWUSST type="text" UND NICHT type="url".
          Mit type="url" weigert sich der Browser, das Formular abzuschicken,
          solange kein Schema davorsteht - "linkedin.com/in/name" ist fuer ihn
          keine URL. Die Meldung heisst dann "Bitte eine URL eingeben", und die
          serverseitige Pruefung, die das "https://" laengst ergaenzt haette,
          kommt nie zum Zug. Genau die Adresse, die jede Person aus der
          Adresszeile kopiert, war damit die einzige, die nicht ging. */}
      <label className="mt-2 block">
        <span className="block text-sm font-medium text-slate-700">{copy.urlLabel}</span>
        <input
          type="text"
          name="linkedin_url"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          maxLength={300}
          value={url}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setUrl(event.target.value);
            setInvalid(false);
          }}
          // Beim Verlassen wird sichtbar vervollstaendigt: Aus
          // "linkedin.com/in/name" wird "https://linkedin.com/in/name", und
          // wer sich vertippt hat, erfaehrt es hier - nicht erst nach dem
          // Speichern auf einer neu geladenen Seite.
          onBlur={() => {
            const trimmed = url.trim();
            if (trimmed.length === 0) {
              setInvalid(false);
              return;
            }
            const parsed = parseLinkedInUrl(trimmed);
            if (parsed.ok && parsed.url) {
              setUrl(parsed.url);
              setInvalid(false);
            } else {
              setInvalid(true);
            }
          }}
          placeholder={copy.urlPlaceholder}
          className={`mt-1 min-h-11 w-full rounded-xl border px-3 text-sm ${
            invalid ? "border-amber-500 bg-amber-50/40" : "border-slate-300"
          }`}
        />
        {invalid ? (
          <span role="alert" className="mt-1 block text-xs leading-5 text-amber-900">
            {copy.urlInvalid}
          </span>
        ) : (
          <span className="mt-1 block text-xs leading-5 text-slate-500">{copy.urlHint}</span>
        )}
      </label>

      {url.trim().length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-900">{copy.visibilityTitle}</p>
          <div className="mt-2 grid gap-2">
            {LINKEDIN_VISIBILITIES.map((value) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
              >
                <input
                  type="radio"
                  name="linkedin_visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {copy.options[value].label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {copy.options[value].hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {visibility === "public" ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p>{copy.publicWarning}</p>
              {firstPublicTransition ? (
                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="confirm_public_linkedin"
                    value="yes"
                    required
                    className="mt-1 h-4 w-4"
                  />
                  <span>{copy.publicConfirm}</span>
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="linkedin_visibility" value={visibility} />
      )}
    </fieldset>
  );
}
