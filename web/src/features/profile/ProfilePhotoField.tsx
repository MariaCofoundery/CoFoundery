"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { AVATAR_LIBRARY } from "@/features/profile/avatarLibrary";
import { toAvatarDataUrl } from "@/features/profile/avatarImage";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import {
  removeProfilePhotoAction,
  saveProfilePhotoAction,
} from "@/features/profile/photoActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * „Dein Foto" — unter „Über dich", wo die anderen Basisangaben stehen.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DAS BRAUCHT
 * ---------------------------------------------------------------------------
 *
 * Geändert werden konnte das Foto bisher nur im Einstiegsassistenten. Unter
 * „Über dich" stand die Frage, ob andere Mitglieder es sehen dürfen — ohne
 * Bild daneben und ohne Weg, es zu ändern.
 *
 * ---------------------------------------------------------------------------
 * DIESELBE MECHANIK WIE IM EINSTIEG
 * ---------------------------------------------------------------------------
 *
 * Dieselbe Verkleinerung (`avatarImage.ts`, 320 px), dieselbe Bibliothek,
 * dieselbe Vorschau (`ProfileAvatar`) und dieselben Speicherwege
 * (`avatarStorage.ts`). Nichts davon ist hier noch einmal gebaut — es ist
 * herausgelöst und wird von beiden Stellen benutzt.
 *
 * Kein Zuschneiden, keine Filter, keine Gesichtserkennung: Was es im Einstieg
 * nicht gibt, entsteht auch nicht hier.
 *
 * ---------------------------------------------------------------------------
 * DIE VORSCHAU IST DAS, WAS GESPEICHERT WIRD
 * ---------------------------------------------------------------------------
 *
 * Wer eine Datei wählt, sieht sofort das verkleinerte Bild — nicht das
 * Original. Was man sieht, ist, was ankommt.
 */
export function ProfilePhotoField({
  displayName,
  avatarId,
  avatarUrl,
  copy,
}: {
  displayName: string;
  avatarId: string | null;
  avatarUrl: string | null;
  copy: {
    title: string;
    help: string;
    add: string;
    change: string;
    chooseIllustration: string;
    closeIllustrations: string;
    remove: string;
    save: string;
    pending: string;
    preview: string;
  };
}) {
  const dateiRef = useRef<HTMLInputElement | null>(null);
  const [bibliothekOffen, setBibliothekOffen] = useState(false);
  // Was gewählt, aber noch nicht gespeichert ist. Null heißt: es gilt, was
  // schon da ist.
  const [neuesBild, setNeuesBild] = useState<string | null>(null);
  const [neueIllustration, setNeueIllustration] = useState<string | null>(null);

  const hatBild = Boolean(avatarId || avatarUrl || neuesBild || neueIllustration);
  const vorschauId = neueIllustration ?? (neuesBild ? null : avatarId);
  const vorschauUrl = neuesBild ?? (neueIllustration ? null : avatarUrl);
  const etwasGewaehlt = Boolean(neuesBild || neueIllustration);

  async function dateiGewaehlt(event: ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0];
    if (!datei) return;
    try {
      setNeuesBild(await toAvatarDataUrl(datei));
      setNeueIllustration(null);
      setBibliothekOffen(false);
    } finally {
      // Damit dieselbe Datei noch einmal gewählt werden kann.
      event.target.value = "";
    }
  }

  return (
    <div id="foto" className="scroll-mt-24 space-y-4 border-t border-slate-200 pt-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">{copy.title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{copy.help}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* `alt=""`: Der Name steht direkt daneben. Ein Alternativtext wäre
            hier eine zweite Fassung desselben - und im Druck stünde er dort,
            wo das Bild nicht lädt, mitten in der Überschrift. */}
        <ProfileAvatar
          displayName={displayName}
          avatarId={vorschauId}
          imageUrl={vorschauUrl}
          alt=""
          className="h-20 w-20 rounded-2xl object-cover"
          fallbackClassName="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-600"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dateiRef.current?.click()}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-800"
          >
            {hatBild ? copy.change : copy.add}
          </button>
          <button
            type="button"
            onClick={() => setBibliothekOffen((offen) => !offen)}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700"
          >
            {bibliothekOffen ? copy.closeIllustrations : copy.chooseIllustration}
          </button>
        </div>
      </div>

      <input
        ref={dateiRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={dateiGewaehlt}
      />

      {bibliothekOffen ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {AVATAR_LIBRARY.map((illustration) => (
            <button
              key={illustration.id}
              type="button"
              aria-label={illustration.label}
              aria-pressed={vorschauId === illustration.id}
              onClick={() => {
                setNeueIllustration(illustration.id);
                setNeuesBild(null);
                setBibliothekOffen(false);
              }}
              className={`rounded-xl border p-1 transition ${
                vorschauId === illustration.id
                  ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/10"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <ProfileAvatar
                displayName={illustration.label}
                avatarId={illustration.id}
                alt=""
                className="h-full w-full rounded-lg"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Zwei eigene Formulare, nicht das grosse Identitaetsformular: Der
            Kern und das Bild liegen in verschiedenen Tabellen, und ein
            Formular in einem Formular gibt es in HTML nicht. */}
        {etwasGewaehlt ? (
          <form action={saveProfilePhotoAction}>
            <input type="hidden" name="avatar_id" value={neueIllustration ?? ""} />
            <input type="hidden" name="avatar_image" value={neuesBild ?? ""} />
            <SubmitButton
              label={copy.save}
              pendingLabel={copy.pending}
              className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
            />
          </form>
        ) : null}

        {avatarId || avatarUrl ? (
          <form action={removeProfilePhotoAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
            >
              {copy.remove}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
