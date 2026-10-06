"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Phase 12C.1C: Ein unerwarteter Fehler beim Rendern. Keine technischen
 * Details auf der Seite - die stehen im Serverprotokoll (digest).
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.access.error");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <section
        role="alert"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("body")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {t("home")}
          </Link>
        </div>
      </section>
    </main>
  );
}
