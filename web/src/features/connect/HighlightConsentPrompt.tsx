import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { answerHighlightPromptAction } from "@/features/connect/highlightConsentActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die einmalige Frage, ob das eigene Profil oder Projekt als Highlight in
 * Connect erscheinen darf.
 *
 * Angehakt vorgewaehlt - Marias Entscheidung am 23.10.2026 -, aber nur, wenn
 * die Frage wirklich gestellt wurde. Wer sie noch nicht beantwortet hat, ist
 * NICHT aufgenommen (`highlightable` bleibt aus), bis er abschickt. So kippt
 * kein bestehendes Profil unbemerkt in die Auswahl.
 *
 * Ohne Skript gebaut: ein Formular in einer festen Flaeche. Wer abschickt,
 * sieht sie nie wieder; der Haken laesst sich im Connect-Profil aendern.
 */
export async function HighlightConsentPrompt({ client, userId }: { client: SupabaseClient; userId: string }) {
  const { data } = await client
    .from("network_profiles")
    .select("highlight_prompt_answered_at")
    .eq("user_id", userId)
    .maybeSingle();
  // Kein Profil oder schon beantwortet (oder Lesefehler): nicht fragen.
  if (!data || data.highlight_prompt_answered_at) return null;

  const t = await getTranslations("connect.highlightPrompt");
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm md:items-center" role="presentation">
      <form
        action={answerHighlightPromptAction}
        role="dialog"
        aria-modal="true"
        aria-labelledby="highlight-prompt-title"
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p>
        <h2 id="highlight-prompt-title" className="mt-3 text-2xl font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-4 text-sm leading-6 text-slate-600">{t("body")}</p>
        <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm">
          <input type="checkbox" name="highlightable" value="yes" defaultChecked className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span className="font-medium text-slate-900">{t("label")}</span>
        </label>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("hint")}</p>
        <SubmitButton
          label={t("save")}
          pendingLabel={t("saving")}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:opacity-60"
        />
      </form>
    </div>
  );
}
