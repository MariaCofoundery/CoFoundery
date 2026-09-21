import { getLocale, getTranslations } from "next-intl/server";
import {
  dismissInAppNoticeAction,
  openInAppNoticeAction,
} from "@/features/notifications/inAppNoticeActions";
import type { WaitingNotice } from "@/features/notifications/inAppNoticeData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Du bist dran" - ueber dem Postfach.
 *
 * WARUM HIER: Das Postfach ist der Ort, an dem man nachsieht, ob jemand etwas
 * von einem will. Ein eigener Bereich fuer Hinweise waere ein zweiter solcher
 * Ort - und dann sieht man an zwei Stellen nach oder an keiner. Die Zahl in
 * der Leiste am Postfach zaehlt beides zusammen, damit ein Punkt genuegt.
 *
 * ES STEHT KEIN NAME DARIN. Begruendung in `inAppNoticeData.ts`: In Find sieht
 * man einander als das, was im Discovery-Profil steht, und ein Hinweis darf
 * nicht mehr verraten als die Seite, von der er handelt. Wer es war, steht
 * dort, wohin er fuehrt.
 */
export async function WaitingNotices({ notices }: { notices: WaitingNotice[] }) {
  if (notices.length === 0) return null;
  const [t, locale] = await Promise.all([getTranslations("notices"), getLocale()]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <section className="mt-8 rounded-3xl border border-amber-300 bg-amber-50 px-5 py-5">
      <h2 className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-700">{t("text")}</p>
      <ul className="mt-4 space-y-3">
        {notices.map((notice) => (
          <li
            key={notice.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-950">
                {t(`kinds.${notice.kind}`)}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {t("since", { date: date.format(new Date(notice.createdAt)) })}
              </span>
            </span>
            {/* Zwei Formulare statt eines mit zwei Zielen: Das eine geht
                weg (und leitet weiter), das andere bleibt. */}
            <form action={openInAppNoticeAction}>
              <input type="hidden" name="noticeId" value={notice.id} />
              <SubmitButton
                label={t("open")}
                pendingLabel={t("opening")}
                className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </form>
            <form action={dismissInAppNoticeAction}>
              <input type="hidden" name="noticeId" value={notice.id} />
              <SubmitButton
                label={t("dismiss")}
                pendingLabel={t("dismissing")}
                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
