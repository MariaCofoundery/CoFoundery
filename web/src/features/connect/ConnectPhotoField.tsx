"use client";

import { ChangeEvent, useState } from "react";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ImageCropDialog } from "@/features/ui/ImageCropDialog";

type Choice = "keep" | "existing" | "upload" | "none";

export function ConnectPhotoField({
  displayName,
  currentAvatarId,
  currentPhotoUrl,
  existingAvatarId,
  existingImageUrl,
  copy,
}: {
  displayName: string;
  currentAvatarId?: string | null;
  currentPhotoUrl?: string | null;
  existingAvatarId?: string | null;
  /** Das eigene Basisfoto (`avatars/…`). Die Vorschau sieht nur die Person selbst. */
  existingImageUrl?: string | null;
  copy: Record<string, string>;
}) {
  const hasCurrent = Boolean(currentAvatarId || currentPhotoUrl);
  const hasExisting = Boolean(existingAvatarId || existingImageUrl);
  const [choice, setChoice] = useState<Choice>(hasCurrent ? "keep" : "none");
  const [uploaded, setUploaded] = useState("");
  // "Ein anderes Bild nur fuer Connect": Die Dateiauswahl erscheint erst, wenn man das waehlt - sonst sieht dieser Block aus wie ein zweites Foto-Formular.
  const [pickingUpload, setPickingUpload] = useState(false);
  const preview = choice === "existing"
    ? { avatarId: existingAvatarId, imageUrl: existingAvatarId ? null : existingImageUrl }
    : choice === "upload"
      ? { avatarId: null, imageUrl: uploaded }
      : choice === "none"
        ? { avatarId: null, imageUrl: null }
        : { avatarId: currentAvatarId, imageUrl: currentPhotoUrl };

  // Erst der Ausschnitt (seit 04.11.2026), dann wie bisher: 640 px, JPEG.
  const [cropFile, setCropFile] = useState<File | null>(null);
  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.match(/^image\/(jpeg|png|webp)$/)) return;
    setCropFile(file);
  }

  // Zugeklappt sagt der Block nur kurz, was gilt (Rueckmeldung von Maria 16.11.2026: "immer noch zu viel"); die Auswahl steht dahinter.
  const state = pickingUpload || choice === "upload" ? copy.stateUpload : choice === "existing" ? copy.stateExisting : choice === "keep" ? copy.stateKeep : hasExisting ? `${copy.stateNone} ${copy.stateNoneOffer}` : copy.stateNone;
  return <fieldset className="rounded-2xl border border-slate-200 p-4">
    <legend className="px-1 text-sm font-semibold text-slate-900">{copy.title}</legend>
    <div className="flex items-center gap-3">
      <ProfileAvatar displayName={displayName || copy.fallbackName} avatarId={preview.avatarId} imageUrl={preview.imageUrl} className="h-12 w-12 shrink-0 rounded-full object-cover" fallbackClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700" />
      <p className="min-w-0 flex-1 text-sm leading-6 text-slate-700">{state}</p>
    </div>
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">{copy.change}</summary>
      <div className="grid gap-1 pt-1 text-sm">
        {hasExisting ? <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={choice === "existing" && !pickingUpload} onChange={() => { setPickingUpload(false); setChoice("existing"); }} />{copy.existing}</label> : null}
        {hasCurrent ? <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={choice === "keep" && !pickingUpload} onChange={() => { setPickingUpload(false); setChoice("keep"); }} />{copy.keep}</label> : null}
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={choice === "none" && !pickingUpload} onChange={() => { setPickingUpload(false); setChoice("none"); }} />{copy.none}</label>
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={pickingUpload || choice === "upload"} onChange={() => setPickingUpload(true)} />{copy.upload}</label>
        {pickingUpload || choice === "upload" ? (
          <label className="block pl-7 text-sm font-medium text-slate-800">{copy.choose}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 p-2 text-sm" />
          </label>
        ) : null}
      </div>
    </details>
    {cropFile ? (
      <ImageCropDialog
        file={cropFile}
        shape="photo"
        output={{ size: 640, type: "image/jpeg", quality: 0.84 }}
        onCancel={() => setCropFile(null)}
        onConfirm={(dataUrl) => {
          setUploaded(dataUrl);
          setChoice("upload");
          setPickingUpload(false);
          setCropFile(null);
        }}
      />
    ) : null}
    <input type="hidden" name="photo_choice" value={choice} />
    <input type="hidden" name="photo_image_data" value={choice === "upload" ? uploaded : ""} />

  </fieldset>;
}
