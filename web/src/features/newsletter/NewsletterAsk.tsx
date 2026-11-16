import { requestNewsletterAction, stopMyNewsletterAction } from "@/features/newsletter/newsletterActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

type T = (key: string, values?: Record<string, string | number>) => string;
export type NewsletterState = "none" | "pending" | "confirmed" | "unsubscribed";

/**
 * Die Frage nach dem Newsletter: ein Knopf, nie vorangekreuzt. Vier Zustaende, jeder sagt, was als Naechstes passiert.
 * "none" und "unsubscribed" sehen gleich aus - wer sich abgemeldet hat, wird nicht anders (oder haeufiger) gefragt.
 */
export function NewsletterAsk({ state, source, returnTo, t, tone = "card" }: { state: NewsletterState; source: "welcome" | "settings" | "dashboard"; returnTo: string; t: (key: string, values?: Record<string, string | number>) => string; tone?: "card" | "plain" }) {
  const shell = tone === "card" ? "rounded-[22px] border border-[#cfc6f6] bg-[linear-gradient(120deg,#f4f0ff,#eaf6fb)] p-5" : "";
  const hidden = (<><input type="hidden" name="source" value={source} /><input type="hidden" name="return_to" value={returnTo} /></>);
  return (
    <section data-newsletter-ask data-state={state} aria-labelledby={`newsletter-${source}`} className={shell}>
      <h2 id={`newsletter-${source}`} className="text-lg font-semibold text-[#0b1f3a]">{t("newsletter.title")}</h2>
      {state === "confirmed" ? (
        <>
          <p className="mt-1 text-[15px] leading-6 text-[#33325e]">{t("newsletter.confirmedText")}</p>
          <form action={stopMyNewsletterAction} className="mt-3">{hidden}<SubmitButton label={t("newsletter.stop")} pendingLabel="…" className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold" /></form>
        </>
      ) : state === "pending" ? (
        <>
          <p className="mt-1 text-[15px] leading-6 text-[#33325e]">{t("newsletter.pendingText")}</p>
          <form action={requestNewsletterAction} className="mt-3">{hidden}<SubmitButton label={t("newsletter.resend")} pendingLabel="…" className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold" /></form>
        </>
      ) : (
        <>
          <p className="mt-1 text-[15px] leading-6 text-[#33325e]">{t("newsletter.text")}</p>
          <form action={requestNewsletterAction} className="mt-3">{hidden}<SubmitButton label={t("newsletter.yes")} pendingLabel="…" className="min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-[15px] font-semibold text-white" /></form>
          <p className="mt-2 text-[13px] leading-5 text-[#5f5e7a]">{t("newsletter.note")}</p>
        </>
      )}
    </section>
  );
}
