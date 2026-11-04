import { getTranslations } from "next-intl/server";
import { setProgramEventRsvpAction } from "@/features/advisor/teamProgramActions";
import type { MyEventRsvp } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const CHIP = "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold";
const chip = (on: boolean) =>
  `${CHIP} ${on ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`;

/**
 * Zusage zu einer Veranstaltung, auf der Programmseite des Teams (Wunsch von Maria, 04.11.2026):
 * je Person "ich komme / ich kann nicht", und bequem fuer alle, die noch nicht selbst geantwortet
 * haben. Die Regeln stehen in der Datenbank (`set_program_event_rsvp`, 20270307120000): nur vor
 * Beginn, und eine eigene Antwort wird nie fuer jemanden ueberschrieben.
 *
 * Nur fuer kommende Veranstaltungen - danach gilt die Anwesenheit, die die Bezugsperson eintraegt.
 */
export async function ProgramEventRsvp({ programId, eventId, rows }: { programId: string; eventId: string; rows: MyEventRsvp[] }) {
  const t = await getTranslations("advisor.teamProgram");
  const me = rows.find((row) => row.isMe);
  if (!me) return null;
  const others = rows.filter((row) => !row.isMe);
  // Der Knopf fuers ganze Team hat nur etwas zu tun, wenn jemand noch nicht selbst geantwortet hat.
  const wholeTeamHelps = others.length > 0 && rows.some((row) => !(row.response && row.bySelf));

  const hidden = (
    <>
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="eventId" value={eventId} />
    </>
  );

  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <form action={setProgramEventRsvpAction} className="flex flex-wrap items-center gap-2">
        {hidden}
        <span className="mr-1 text-sm font-semibold text-slate-900">{t("rsvpQuestion")}</span>
        {(["yes", "no"] as const).map((response) => (
          <button
            key={response}
            type="submit"
            name="response"
            // Noch einmal tippen nimmt die eigene Antwort zurueck.
            value={me.response === response && me.bySelf ? "" : response}
            aria-pressed={me.response === response}
            className={chip(me.response === response)}
          >
            {t(`rsvp_${response}`)}
          </button>
        ))}
      </form>
      {me.response && !me.bySelf ? <p className="mt-1 text-xs text-slate-600">{t("rsvpSetForYou")}</p> : null}

      {others.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
          {rows.map((row) => (
            <li key={row.userId}>
              <span className="font-medium text-slate-900">{row.isMe ? t("rsvpYou") : row.name ?? t("unnamedPerson")}</span>
              {": "}
              <span className={row.response ? "" : "text-slate-500"}>{t(`rsvpState_${row.response ?? "open"}`)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {wholeTeamHelps ? (
        <form action={setProgramEventRsvpAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          {hidden}
          <input type="hidden" name="whole" value="1" />
          <span className="text-xs text-slate-600">{t("rsvpWholeLabel")}</span>
          <SubmitButton fieldName="response" intent="yes" label={t("rsvpWholeYes")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" />
          <SubmitButton fieldName="response" intent="no" label={t("rsvpWholeNo")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" />
        </form>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-slate-500">{t("rsvpNote")}</p>
    </div>
  );
}
