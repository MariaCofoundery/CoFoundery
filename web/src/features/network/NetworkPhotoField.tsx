"use client";

import { ChangeEvent, useState } from "react";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";

type Choice = "keep" | "existing" | "upload" | "none";

export function NetworkPhotoField({
  displayName,
  currentAvatarId,
  currentPhotoUrl,
  existingAvatarId,
  initialVisibility,
  copy,
}: {
  displayName: string;
  currentAvatarId?: string | null;
  currentPhotoUrl?: string | null;
  existingAvatarId?: string | null;
  initialVisibility: "platform_only" | "public_allowed";
  copy: Record<string, string>;
}) {
  const hasCurrent = Boolean(currentAvatarId || currentPhotoUrl);
  const hasExisting = Boolean(existingAvatarId);
  const [choice, setChoice] = useState<Choice>(hasCurrent ? "keep" : "none");
  const [uploaded, setUploaded] = useState("");
  const preview = choice === "existing"
    ? { avatarId: existingAvatarId, imageUrl: null }
    : choice === "upload"
      ? { avatarId: null, imageUrl: uploaded }
      : choice === "none"
        ? { avatarId: null, imageUrl: null }
        : { avatarId: currentAvatarId, imageUrl: currentPhotoUrl };

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setUploaded(dataUrl);
    setChoice("upload");
  }

  return <fieldset className="rounded-2xl border border-slate-200 p-5">
    <legend className="px-1 text-sm font-semibold text-slate-900">{copy.title}</legend>
    <p className="mt-1 text-sm leading-6 text-slate-600">{copy.helper}</p>
    <div className="mt-4 flex items-center gap-4">
      <ProfileAvatar displayName={displayName || copy.fallbackName} avatarId={preview.avatarId} imageUrl={preview.imageUrl} className="h-16 w-16 rounded-full object-cover" fallbackClassName="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700" />
      <div className="grid flex-1 gap-2 text-sm">
        {hasCurrent ? <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={choice === "keep"} onChange={() => setChoice("keep")} />{copy.keep}</label> : null}
        {hasExisting ? <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={choice === "existing"} onChange={() => setChoice("existing")} />{copy.existing}</label> : null}
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="photo_choice_ui" checked={choice === "none"} onChange={() => setChoice("none")} />{copy.none}</label>
      </div>
    </div>
    <label className="mt-4 block text-sm font-medium text-slate-800">{copy.upload}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 p-2 text-sm" />
    </label>
    <input type="hidden" name="photo_choice" value={choice} />
    <input type="hidden" name="photo_image_data" value={choice === "upload" ? uploaded : ""} />

    <div className="mt-5 border-t border-slate-100 pt-5">
      <p className="text-sm font-semibold text-slate-900">{copy.visibilityTitle}</p>
      <label className="mt-3 flex min-h-11 items-start gap-3 text-sm"><input type="radio" name="photo_visibility" value="platform_only" defaultChecked={initialVisibility !== "public_allowed"} className="mt-1" /><span><span className="font-medium">{copy.platformOnly}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{copy.platformOnlyHint}</span></span></label>
      <label className="mt-2 flex min-h-11 items-start gap-3 text-sm"><input type="radio" name="photo_visibility" value="public_allowed" defaultChecked={initialVisibility === "public_allowed"} className="mt-1" /><span><span className="font-medium">{copy.publicAllowed}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{copy.publicAllowedHint}</span></span></label>
    </div>
  </fieldset>;
}

async function resizeImage(file: File) {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("network_photo_type_invalid");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const value = new window.Image();
      value.onload = () => resolve(value);
      value.onerror = () => reject(new Error("network_photo_load_failed"));
      value.src = url;
    });
    const max = 640;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("network_photo_canvas_unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(url);
  }
}
