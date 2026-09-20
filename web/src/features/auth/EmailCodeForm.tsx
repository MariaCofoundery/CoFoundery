"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { verifyEmailCodeAction } from "@/features/auth/emailCodeActions";

/**
 * Das Feld fuer den Code aus der Mail.
 *
 * Steht an beiden Anmeldewegen - auf /start und auf /login -, weil der Fall,
 * fuer den es gebaut ist, an beiden auftritt: In einer App vom Startbildschirm
 * fuehrt der Link aus der Mail nach draussen in den Browser und nicht zurueck.
 *
 * Es ist der ZWEITE Weg, nie der erste: Der Link ist bequemer, solange er
 * funktioniert. Deshalb steht das Feld unter der Mailmeldung und nicht
 * darueber.
 */
export function EmailCodeForm({
  defaultEmail,
  nextPath,
}: {
  /** Bekannt, wenn gerade von hier aus gesendet wurde - sonst wird gefragt. */
  defaultEmail: string | null;
  nextPath: string;
}) {
  const t = useTranslations("auth.emailCode");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [token, setToken] = useState("");
  const [error, setError] = useState<"invalid" | "expired" | "failed" | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Nur in der App vom Startbildschirm: Dort ist der Code nicht die
    // Ausweichmoeglichkeit, sondern der einzige Weg hinein - und das gehoert
    // dann auch dahin geschrieben. Im Browser waere derselbe Satz Ballast.
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // Bei Erfolg antwortet die Aktion mit einer Weiterleitung und kommt hier
      // nie an. Was zurueckkommt, ist immer ein Fehler.
      const result = await verifyEmailCodeAction({ email, token, nextPath });
      setError(result?.reason ?? "failed");
    });
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-slate-200 pt-5">
      <p className="text-sm font-medium text-[color:var(--ink)]">{t("title")}</p>
      <p className="text-xs leading-5 text-[color:var(--muted)]">
        {isStandalone ? t("hintInApp") : t("hint")}
      </p>

      {defaultEmail ? (
        <p className="text-xs text-[color:var(--muted)]">{t("forEmail", { email: defaultEmail })}</p>
      ) : (
        <>
          <label htmlFor="code-email" className="text-sm font-medium text-[color:var(--ink)]">
            {t("emailLabel")}
          </label>
          <input
            id="code-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--ink-soft)]"
          />
        </>
      )}

      <label htmlFor="code-token" className="text-sm font-medium text-[color:var(--ink)]">
        {t("codeLabel")}
      </label>
      <input
        id="code-token"
        name="token"
        required
        value={token}
        onChange={(event) => setToken(event.target.value)}
        // one-time-code laesst das Telefon den Code ueber der Tastatur
        // anbieten, statt zwischen Mail und App hin und her zu wechseln.
        autoComplete="one-time-code"
        inputMode="numeric"
        // Ziffern, aber KEIN type="number": Das macht auf dem Rechner Pfeilchen
        // zum Hoch- und Runterzaehlen an ein Feld, in dem es nichts zu zaehlen
        // gibt, und schluckt fuehrende Nullen.
        pattern="[0-9 ]*"
        maxLength={10}
        placeholder="123456"
        className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-lg tracking-[0.3em] outline-none focus:border-[color:var(--ink-soft)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>

      {error ? (
        <p role="alert" className="text-sm leading-6 text-red-700">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </form>
  );
}
