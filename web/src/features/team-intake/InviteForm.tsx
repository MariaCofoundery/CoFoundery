"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  createIntakeAction,
  resendIntakeAction,
  type InviteResult,
} from "@/features/team-intake/actions";
export type IntakeOptions = {
  user_id: string;
  orgs: { id: string; name: string; members: { id: string; name: string }[] }[];
  teams: { id: string; name: string }[];
};
const input =
  "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3";
function Delivery({ result }: { result: InviteResult }) {
  const t = useTranslations("intake");
  return (
    <div aria-live="polite">
      {result.error && (
        <p role="alert" className="my-3 text-red-800">
          {t("error")}
        </p>
      )}
      {result.deliveries?.map((d) => (
        <div key={d.email} className="my-3 rounded-xl border p-4 break-words">
          <p>
            {d.email}: {t(d.sent ? "sent" : "failed")}
          </p>
          <a href={d.url} className="mt-2 block break-all underline">
            {t("inviteLink")}: {d.url}
          </a>
        </div>
      ))}
      {result.roundId && (
        <Link
          href={`/team-intake/${result.roundId}`}
          className="inline-block py-3 underline"
        >
          {t("openRound")}
        </Link>
      )}
    </div>
  );
}
export function IntakeInviteForm({ options }: { options: IntakeOptions }) {
  const t = useTranslations("intake");
  const [state, action, pending] = useActionState(createIntakeAction, {});
  const [org, setOrg] = useState("");
  if (state.roundId)
    return (
      <section>
        <h2 className="text-xl font-semibold">{t("created")}</h2>
        <Delivery result={state} />
      </section>
    );
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        {t("mode")}
        <select name="mode" className={input}>
          <option value="selection">{t("selection")}</option>
          <option value="development">{t("development")}</option>
        </select>
      </label>
      <label className="block">
        {t("holder")}
        <select
          name="org"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          className={input}
        >
          <option value="">{t("personal")}</option>
          {options.orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      {org && (
        <fieldset key={org} className="rounded-xl border p-4">
          <legend>{t("reviewers")}</legend>
          <p className="text-sm text-slate-600">{t("reviewerHelp")}</p>
          {options.orgs
            .find((o) => o.id === org)
            ?.members.map((m) => (
              <label key={m.id} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  name="reviewer"
                  value={m.id}
                  disabled={m.id === options.user_id}
                  defaultChecked={m.id === options.user_id}
                />
                {m.name}
              </label>
            ))}
        </fieldset>
      )}
      <label className="block">
        {t("team")}
        <select name="team" className={input}>
          <option value="">{t("newTeam")}</option>
          {options.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-slate-600">{t("existingHelp")}</p>
      <label className="block">
        {t("teamName")}
        <input name="name" required maxLength={120} className={input} />
      </label>
      <label className="block">
        {t("emails")}
        <textarea
          name="emails"
          rows={3}
          required
          maxLength={1030}
          className={input}
        />
      </label>
      <button
        disabled={pending}
        className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 text-white disabled:opacity-50"
      >
        {t("create")}
      </button>
      <Delivery result={state} />
    </form>
  );
}
export function IntakeResend({
  roundId,
  participantId,
}: {
  roundId: string;
  participantId: string;
}) {
  const t = useTranslations("intake");
  const [state, action, pending] = useActionState(
    resendIntakeAction.bind(null, roundId, participantId),
    {},
  );
  return (
    <form action={action}>
      <button
        disabled={pending}
        className="min-h-11 py-2 text-sm underline disabled:opacity-50"
      >
        {t("resend")}
      </button>
      <Delivery result={state} />
    </form>
  );
}
