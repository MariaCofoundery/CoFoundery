import { getFormatter, getTranslations } from "next-intl/server";
import { dismissAccountDeletionNoticeAction } from "@/features/account/accountDeletionNoticeActions";
import type { AccountDeletionNotice } from "@/features/account/accountDeletionNotices";

/**
 * Der Hinweis, dass jemand gegangen ist.
 *
 * ER NENNT NIEMANDEN. Die zurueckbleibende Person weiss, mit wem sie verbunden
 * war; was ihr fehlte, ist die Auskunft, DASS jemand gegangen ist - und was
 * das mit den gemeinsamen Sachen gemacht hat. Ein Name waere ein Datensatz
 * ueber einen Menschen, der genau darum gebeten hat, keiner mehr zu sein.
 *
 * Deshalb steht in jedem Text auch die FOLGE und nicht nur das Ereignis: Wer
 * liest, dass jemand sein Konto geloescht hat, fragt als naechstes, wo der
 * gemeinsame Report geblieben ist.
 *
 * Kein Rot, kein Warndreieck. Jemand hat sein Konto geloescht - das ist keine
 * Stoerung, sondern eine Entscheidung, die man respektiert.
 */
export async function AccountDeletionNoticeList({
  notices,
}: {
  notices: AccountDeletionNotice[];
}) {
  if (notices.length === 0) return null;

  const t = await getTranslations("dashboard.account.deletionNotices");
  const format = await getFormatter();

  return (
    <div className="grid gap-3">
      {notices.map((notice) => (
        <section
          key={notice.id}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
          aria-label={t("label")}
        >
          <p className="text-sm font-semibold text-slate-900">{t(`${notice.context}.title`)}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{t(`${notice.context}.text`)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-xs text-slate-500">
              {t("on", {
                date: format.dateTime(new Date(notice.createdAt), {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
              })}
            </p>
            <form action={dismissAccountDeletionNoticeAction.bind(null, notice.id)}>
              <button
                type="submit"
                className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
              >
                {t("dismiss")}
              </button>
            </form>
          </div>
        </section>
      ))}
    </div>
  );
}
