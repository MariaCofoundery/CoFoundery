"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SETUP_COOKIE, formatSetupSession, neighbourSteps, parseSetupSession, setupStepUrl, type SetupSession } from "@/features/advisor/setup/setupModel";

const readCookie = () => {
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${SETUP_COOKIE}=`));
  return match ? parseSetupSession(match.slice(SETUP_COOKIE.length + 1)) : null;
};
const clearCookie = () => {
  document.cookie = `${SETUP_COOKIE}=; path=/; max-age=0; samesite=lax`;
};

/** Auf der Seite "Los geht's": merkt sich den Schritt, an dem man gerade ist. */
export function SetupSessionWriter({ session }: { session: SetupSession }) {
  useEffect(() => {
    document.cookie = `${SETUP_COOKIE}=${formatSetupSession(session)}; path=/; samesite=lax`;
  }, [session]);
  return null;
}

/** Beenden oder Fertig: der Cookie geht, die Leiste auch. */
export function SetupSessionEnd({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={clearCookie} className={className}>
      {children}
    </Link>
  );
}

/**
 * Die Leiste unten, solange die Einrichtung laeuft: "Schritt 3 von 8: Euer Team" mit Zurueck und Weiter. Sie steht auf
 * jeder Seite des Arbeitsbereichs ausser "Los geht's" selbst und uebersteht Formulare, die die Adresse wechseln.
 */
export function SetupBar() {
  const t = useTranslations("advisor.setup");
  const pathname = usePathname();
  const [session, setSession] = useState<SetupSession | null>(null);
  useEffect(() => {
    setSession(readCookie());
  }, [pathname]);
  if (!session || pathname.startsWith("/advisor/los-gehts")) return null;
  const { prev, next, index, total } = neighbourSteps(session);
  return (
    <div role="region" aria-label={t("bar.label")} className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-violet-200 bg-violet-50/95 px-4 py-2.5 backdrop-blur print:hidden min-[700px]:bottom-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 text-[14px] text-violet-950">
          <span className="font-semibold">{t("bar.step", { step: index + 1, total })}</span> · {t(`steps.${session.step}.title`)}
        </p>
        {prev ? <Link href={setupStepUrl(session.orgId, prev)} className="inline-flex min-h-10 items-center rounded-xl px-3 text-[13.5px] font-semibold text-violet-900 hover:bg-violet-100">← {t("bar.back")}</Link> : null}
        <Link href={`/advisor/los-gehts?${new URLSearchParams({ org: session.orgId, schritt: session.step }).toString()}`} className="inline-flex min-h-10 items-center rounded-xl px-3 text-[13.5px] font-semibold text-violet-900 hover:bg-violet-100">{t("bar.overview")}</Link>
        {next ? (
          <Link href={setupStepUrl(session.orgId, next)} className="inline-flex min-h-10 items-center rounded-xl bg-[#6D49E0] px-4 text-[14px] font-semibold text-white hover:bg-[#5B36D6]">{t("bar.next")} →</Link>
        ) : (
          <SetupSessionEnd href="/advisor/dashboard" className="inline-flex min-h-10 items-center rounded-xl bg-[#6D49E0] px-4 text-[14px] font-semibold text-white hover:bg-[#5B36D6]">{t("bar.finish")}</SetupSessionEnd>
        )}
        <button type="button" onClick={() => { clearCookie(); setSession(null); }} aria-label={t("bar.end")} title={t("bar.end")} className="grid h-10 w-10 place-items-center rounded-xl text-violet-900 hover:bg-violet-100">×</button>
      </div>
    </div>
  );
}
