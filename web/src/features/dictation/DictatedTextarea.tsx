"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import {
  DictationBadge,
  DictationButton,
  DictationMessage,
  useDictationCopy,
} from "./DictationControls";
import { useDictation } from "./useDictation";

/**
 * Ein Textfeld mit Diktat, das sich in ein normales Formular einfuegt.
 *
 * Es haelt seinen Wert selbst, traegt aber `name` - damit bleibt es fuer eine
 * Server Action ein gewoehnliches Feld. Das ist der Grund fuer diese
 * Komponente: Server-gerenderte Formulare koennen keinen Hook aufrufen, und
 * deswegen musste bisher jede Seite ihr eigenes Diktat mitbringen.
 *
 * Wer nur tippt, merkt nichts von der Zustandsverwaltung. `required`,
 * `minLength` und `maxLength` gehen an das echte textarea, also greift die
 * Browser-Validierung wie vorher.
 */
export function DictatedTextarea({
  id,
  name,
  defaultValue = "",
  rows = 5,
  required = false,
  minLength,
  maxLength,
  placeholder,
  className,
  onValueChange,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  /**
   * Meldet jede Aenderung nach oben - getippt wie diktiert. Bewusst nur eine
   * Meldung und kein `value`-Prop: Der Wert bleibt hier, und eine Seite, die
   * mit dem Text noch etwas vorhat (etwa ihn auswerten), spiegelt ihn mit,
   * statt ihn zu besitzen. So gibt es keine zwei Wahrheiten.
   */
  onValueChange?: (value: string) => void;
}) {
  const locale = useLocale();
  const copy = useDictationCopy();
  const [value, setValue] = useState(defaultValue);

  function update(next: string) {
    setValue(next);
    onValueChange?.(next);
  }

  const dictation = useDictation({ value, onChange: update, locale, copy });

  return (
    <>
      <div className="relative">
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(event) => update(event.target.value)}
          rows={rows}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          // pr-14 haelt den Text vom Mikrofonknopf frei.
          className={`${className ?? ""} pr-14`}
        />
        <DictationButton dictation={dictation} />
        <DictationBadge dictation={dictation} />
      </div>
      <DictationMessage dictation={dictation} />
    </>
  );
}
