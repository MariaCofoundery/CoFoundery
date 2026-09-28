"use client";

import { useState, useTransition } from "react";
import { revokeShareV21, shareV21 } from "@/features/instruments/v21/shareActionsV21";

/**
 * Freigeben - und vorher sehen, was man freigibt.
 *
 * ---------------------------------------------------------------------------
 * DIE VORSCHAU IST DIE SEITE SELBST
 * ---------------------------------------------------------------------------
 *
 * Dieses Formular steht am eigenen Bericht, unter den eigenen Antworten. Wer
 * herunterscrollt, hat gelesen, was er teilt. Ein Dialog, der nur fragt „mit
 * wem?“, würde die Vorschau überspringen - und dann teilt jemand etwas, das er
 * so nicht mehr auf dem Schirm hatte.
 *
 * Ausgeblendet wird pro Frage, und zwar HIER und nicht danach. Es gibt keinen
 * Zustand, in dem schon freigegeben und noch nicht ausgeblendet ist.
 */

export type Recipient = { userId: string; label: string; sharedAt: string | null };

type Props = {
  recipients: Recipient[];
  /** Die Fragen, die freigegeben werden könnten - mit ihrem Text. */
  items: { itemId: string; prompt: string }[];
  hiddenByRecipient: Record<string, string[]>;
};

export function ShareFormV21({ recipients, items, hiddenByRecipient }: Props) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (recipients.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-slate-900">Antworten teilen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sobald du mit jemandem verbunden bist, kannst du deine Antworten hier
          freigeben — und vorher auswählen, was du für dich behalten möchtest.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-base font-semibold text-slate-900">Antworten teilen</h2>
      <p className="mt-1 text-sm text-slate-600">
        Du siehst oben, was du geantwortet hast. Genau das wird geteilt — außer dem,
        was du hier ausblendest.
      </p>

      <div className="mt-4 space-y-2">
        {recipients.map((recipient) => {
          const alreadyHidden = hiddenByRecipient[recipient.userId] ?? [];
          const isOpen = openFor === recipient.userId;

          return (
            <div key={recipient.userId} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{recipient.label}</p>
                  <p className="text-xs text-slate-500">
                    {recipient.sharedAt
                      ? alreadyHidden.length > 0
                        ? `freigegeben, ${alreadyHidden.length} ${
                            alreadyHidden.length === 1 ? "Frage" : "Fragen"
                          } ausgeblendet`
                        : "freigegeben"
                      : "noch nicht freigegeben"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    disabled={pending}
                    onClick={() => {
                      setMessage(null);
                      setHidden(alreadyHidden);
                      setOpenFor(isOpen ? null : recipient.userId);
                    }}
                  >
                    {isOpen ? "abbrechen" : recipient.sharedAt ? "ändern" : "freigeben"}
                  </button>

                  {recipient.sharedAt && (
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-500 underline"
                      disabled={pending}
                      onClick={() => {
                        setMessage(null);
                        start(async () => {
                          const result = await revokeShareV21(recipient.userId);
                          setMessage(
                            result.ok
                              ? "Zurückgezogen. Was schon gelesen wurde, holt das nicht zurück."
                              : "Das hat nicht geklappt.",
                          );
                        });
                      }}
                    >
                      zurückziehen
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-700">
                    Was möchtest du für dich behalten? Alles ohne Haken wird geteilt.
                  </p>
                  <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-2">
                    {items.map((item) => (
                      <label
                        key={item.itemId}
                        className="flex cursor-pointer items-start gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={hidden.includes(item.itemId)}
                          disabled={pending}
                          onChange={(event) =>
                            setHidden((current) =>
                              event.target.checked
                                ? [...current, item.itemId]
                                : current.filter((entry) => entry !== item.itemId),
                            )
                          }
                        />
                        <span>{item.prompt}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await shareV21(recipient.userId, hidden);
                        if (result.ok) {
                          setOpenFor(null);
                          setMessage(
                            hidden.length > 0
                              ? `Freigegeben. ${hidden.length} ${
                                  hidden.length === 1 ? "Frage bleibt" : "Fragen bleiben"
                                } bei dir.`
                              : "Freigegeben.",
                          );
                        } else {
                          setMessage(reasonText(result.reason));
                        }
                      })
                    }
                  >
                    {pending ? "wird freigegeben…" : "jetzt freigeben"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}

      <p className="mt-4 text-xs text-slate-500">
        Eine Freigabe zeigt deine Antworten — nicht, wie lange du für sie gebraucht
        hast. Sie ist außerdem kein Einverständnis zu einer Bewertung oder Auswahl
        durch Dritte.
      </p>
    </section>
  );
}

function reasonText(reason: string): string {
  switch (reason) {
    case "not_submitted":
      return "Du kannst erst teilen, wenn du den Fragebogen abgegeben hast — sonst sähe die andere Person beim nächsten Mal etwas anderes.";
    case "cannot_share_with_self":
      return "Mit dir selbst musst du nicht teilen.";
    case "hide_failed":
      return "Das Ausblenden hat nicht geklappt, deshalb wurde nichts freigegeben.";
    default:
      return "Das hat nicht geklappt.";
  }
}
