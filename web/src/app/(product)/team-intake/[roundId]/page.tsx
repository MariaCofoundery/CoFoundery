import { SharedIntakeReport } from "@/features/team-intake/Report";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { readIntake } from "@/features/team-intake/data";
import {
  confirmIntakeAction,
  submitIntakeAction,
  revokeIntakeAction,
  copyIntakeHistoryAction,
} from "@/features/team-intake/actions";
import { IntakeResend } from "@/features/team-intake/InviteForm";
import {
  IntakeEditor,
  OwnPreview,
  button,
} from "@/features/team-intake/Answers";
import {
  type IntakeOwn,
  type IntakeReport,
  type IntakeRound,
} from "@/features/team-intake/model";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roundId: string }>;
  searchParams: Promise<{ preview?: string; error?: string; saved?: string }>;
}) {
  const { roundId } = await params;
  const { client, user, round } = await readIntake(roundId);
  const query = await searchParams;
  const t = await getTranslations("intake");
  const me = round.participants.find((p) => p.user_id === user.id);
  const name = (id: string) =>
    round.participants.find((p) => p.user_id === id)?.name ?? t("missing");
  let own: IntakeOwn = {
    shared: {},
    pairs: [],
    private_requested: false,
    private_note: "",
  };
  let ownError = false;
  if (me && round.status === "draft") {
    const result = await client.rpc("get_team_intake_own_answers", {
      p_round: roundId,
    });
    ownError = Boolean(result.error);
    if (result.data) own = result.data as IntakeOwn;
  }
  let report: IntakeReport | null = null;
  let notesError = false;
  let notes: { author_user_id: string; requested: boolean; note: string }[] =
    [];
  if (round.status === "published") {
    const result = await client.rpc("get_team_intake_report", {
      p_round: roundId,
    });
    if (!result.error) report = result.data as IntakeReport;
    if (round.is_reviewer && report) {
      const result = await client.rpc("get_team_intake_private_notes", {
        p_round: roundId,
      });
      notesError = Boolean(result.error);
      if (!result.error) notes = result.data ?? [];
    }
  }
  let previous: IntakeRound[] = [];
  if (
    me &&
    !me.submitted &&
    round.status === "draft" &&
    round.mode === "development"
  ) {
    const { data } = await client.rpc("list_team_intakes");
    previous = ((data ?? []) as IntakeRound[]).filter(
      (r) =>
        r.status === "published" &&
        r.team_id === round.team_id &&
        r.created_at < round.created_at,
    );
  }
  return (
    <>
      <Link href="/team-intake" className="inline-block py-2 underline">
        {t("back")}
      </Link>
      <header>
        <h1 className="break-words text-3xl font-semibold">{round.name}</h1>
        <p className="mt-2">
          {t(round.mode)} · {t(round.status)}
        </p>
        <p className="mt-2">
          {t("progress", {
            done: round.participants.filter((p) => p.submitted).length,
            total: round.participants.length,
          })}
        </p>
      </header>
      {(query.error || ownError) && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">
          {t("error")}
        </p>
      )}
      {query.saved && <p role="status">{t("saved")}</p>}
      <section className="rounded-2xl border p-4">
        <h2 className="text-xl font-semibold">{t("roster")}</h2>
        <ul className="my-3 space-y-3">
          {round.participants.map((p) => (
            <li key={p.id} className="break-words">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm">{p.email}</p>
              <p className="text-sm text-slate-600">
                {t(p.claimed ? "claimed" : "notClaimed")} ·{" "}
                {t(p.confirmed ? "confirmed" : "notConfirmed")} ·{" "}
                {t(p.submitted ? "submitted" : "notSubmitted")}
              </p>
              {round.is_creator &&
                round.status === "inviting" &&
                !p.claimed && (
                  <IntakeResend roundId={roundId} participantId={p.id} />
                )}
            </li>
          ))}
        </ul>
        <h3 className="font-semibold">{t("recipients")}</h3>
        <p className="break-words">
          {round.org_name ? `${round.org_name}: ` : ""}
          {round.reviewers.map((r) => r.name).join(", ")}
        </p>
        <p className="mt-3 text-sm leading-6">{t("scope")}</p>
        <p className="mt-2 text-sm leading-6">{t("freeze")}</p>
      </section>
      {round.status === "revoked" ? (
        <p>{t("withdrawn")}</p>
      ) : (
        <>
          {round.status === "inviting" && (
            <section>
              <p>{t("confirmHelp")}</p>
              {me &&
                !me.confirmed &&
                round.participants.every((p) => p.claimed) && (
                  <form
                    action={confirmIntakeAction.bind(null, roundId)}
                    className="mt-4 space-y-4"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        required
                        type="checkbox"
                        name="confirm"
                        className="mt-1"
                      />
                      {t("confirmCheck")}
                    </label>
                    <button className={button}>{t("confirm")}</button>
                  </form>
                )}
            </section>
          )}
          {round.status === "draft" &&
            (round.is_reviewer ? (
              <p>{t("advisorWaiting")}</p>
            ) : me && !ownError ? (
              me.submitted ? (
                <>
                  <p>{t("waiting")}</p>
                  <OwnPreview own={own} round={round} userId={user.id} />
                </>
              ) : query.preview ? (
                <>
                  <h2 className="text-2xl font-semibold">
                    {t("previewTitle")}
                  </h2>
                  <p>{t("previewHelp")}</p>
                  <OwnPreview own={own} round={round} userId={user.id} />
                  <Link
                    href={`/team-intake/${roundId}`}
                    className="inline-block py-3 underline"
                  >
                    {t("edit")}
                  </Link>
                  <form
                    action={submitIntakeAction.bind(null, roundId)}
                    className="space-y-4"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        required
                        type="checkbox"
                        name="release"
                        className="mt-1"
                      />
                      {t("release")}
                    </label>
                    <button className={button}>{t("submit")}</button>
                  </form>
                </>
              ) : (
                <>
                  {previous.length > 0 && (
                    <form
                      action={copyIntakeHistoryAction.bind(null, roundId)}
                      className="space-y-3 rounded-xl border p-4"
                    >
                      <h2 className="font-semibold">{t("copyTitle")}</h2>
                      <p className="text-sm">{t("copyHelp")}</p>
                      <label className="block">
                        {t("source")}
                        <select
                          name="source"
                          className="block min-h-11 w-full border p-2"
                        >
                          {previous.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} · {r.published_at?.slice(0, 10)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className={button}>{t("copy")}</button>
                    </form>
                  )}
                  <IntakeEditor round={round} own={own} userId={user.id} />
                </>
              )
            ) : null)}
          {round.status === "published" &&
            (report ? (
              <>
                <SharedIntakeReport round={round} report={report} />
                {round.is_reviewer && (
                  <section className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <h3 className="text-xl font-semibold">
                      {t("privateTitle")}
                    </h3>
                    <p className="text-sm">{t("privateHelp")}</p>
                    {notesError ? <p role="alert">{t("error")}</p> : notes.length ? (
                      notes.map((n) => (
                        <article key={n.author_user_id}>
                          <h4 className="font-semibold">
                            {name(n.author_user_id)}
                          </h4>
                          {n.requested && <p>{t("privateRequest")}</p>}
                          <p className="whitespace-pre-wrap break-words">
                            {n.note}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p>{t("privateNone")}</p>
                    )}
                  </section>
                )}
              </>
            ) : (
              <p role="alert">{t("error")}</p>
            ))}
          <details className="border-t pt-5">
            <summary className="cursor-pointer py-3">{t("withdraw")}</summary>
            <p>{t("withdrawHelp")}</p>
            <form
              action={revokeIntakeAction.bind(null, roundId)}
              className="mt-4 space-y-4"
            >
              <label className="flex items-start gap-3">
                <input
                  required
                  type="checkbox"
                  name="withdraw"
                  className="mt-1"
                />
                {t("withdrawCheck")}
              </label>
              <button className={button}>{t("withdraw")}</button>
            </form>
          </details>
        </>
      )}
    </>
  );
}
