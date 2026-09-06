"use client";

import { useState } from "react";
import type { ConnectVisibility } from "./connectTypes";

type Copy = {
  title: string; membersOnly: string; public: string; publicHint: string;
  confirm: string; previewTitle: string; previewItems: string;
};

export function ConnectVisibilityField({ initial = "members_only", copy }: { initial?: ConnectVisibility; copy: Copy }) {
  const [visibility, setVisibility] = useState<ConnectVisibility>(initial);
  const firstPublicTransition = initial !== "public" && visibility === "public";
  return <fieldset className="rounded-2xl border border-slate-200 p-5">
    <legend className="px-1 text-sm font-semibold">{copy.title}</legend>
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      {(["members_only", "public"] as const).map((value) => <label key={value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
        <input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} className="mt-1" />
        <span><span className="block text-sm font-semibold">{value === "public" ? copy.public : copy.membersOnly}</span>{value === "public" ? <span className="mt-1 block text-xs leading-5 text-slate-600">{copy.publicHint}</span> : null}</span>
      </label>)}
    </div>
    {visibility === "public" ? <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">{copy.previewTitle}</p><p className="mt-1 leading-6">{copy.previewItems}</p>{firstPublicTransition ? <label className="mt-3 flex cursor-pointer items-start gap-3"><input type="checkbox" name="confirm_public_visibility" value="yes" required className="mt-1" /><span>{copy.confirm}</span></label> : null}</div> : null}
  </fieldset>;
}
