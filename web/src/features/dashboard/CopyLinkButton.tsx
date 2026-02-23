"use client";

import { useState } from "react";

type Props = {
  url: string;
  label?: string;
  className?: string;
};

function toAbsoluteUrl(url: string) {
  if (typeof window === "undefined") return url;
  return url.startsWith("/") ? `${window.location.origin}${url}` : url;
}

export function CopyLinkButton({
  url,
  label = "Link kopieren",
  className = "inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700",
}: Props) {
  const [notice, setNotice] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toAbsoluteUrl(url));
      setNotice("Link kopiert.");
    } catch {
      setNotice("Kopieren nicht möglich.");
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button type="button" onClick={() => void handleCopy()} className={className}>
        {label}
      </button>
      {notice ? <span className="mt-1 text-[11px] text-slate-500">{notice}</span> : null}
    </div>
  );
}
