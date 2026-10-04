"use server";
import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { intakeSession, readIntake } from "@/features/team-intake/data";
import { parseIntakeForm, validId } from "@/features/team-intake/model";
import { getRequestLocale } from "@/i18n/getLocale";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { sendTeamIntakeInviteEmail } from "@/lib/email/sendTeamIntakeInviteEmail";

export type InviteResult = {
  error?: true;
  roundId?: string;
  deliveries?: { email: string; url: string; sent: boolean }[];
};
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const link = (token: string) =>
  `${getPublicAppOrigin()}/team-intake/invite/${token}`;
export async function createIntakeAction(
  _previous: InviteResult,
  form: FormData,
): Promise<InviteResult> {
  const { client, user } = await intakeSession("/advisor/intake/new");
  const emails = String(form.get("emails") ?? "")
    .split(/[\n,;]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (
    emails.length < 2 ||
    emails.length > 4 ||
    new Set(emails).size !== emails.length
  )
    return { error: true };
  const tokens = emails.map(() => randomBytes(24).toString("hex"));
  const org = String(form.get("org") ?? "") || null;
  const team = String(form.get("team") ?? "") || null;
  const reviewers = form.getAll("reviewer").map(String);
  if (
    (org && !validId(org)) ||
    (team && !validId(team)) ||
    reviewers.some((id) => !validId(id))
  )
    return { error: true };
  const { data, error } = await client.rpc("create_team_intake", {
    p_mode: String(form.get("mode") ?? ""),
    p_name: String(form.get("name") ?? "").trim(),
    p_emails: emails,
    p_hashes: tokens.map(hash),
    p_team: team,
    p_org: org,
    p_reviewers: org ? [...new Set([user.id, ...reviewers])] : null,
  });
  if (error || !data) return { error: true };
  const locale = await getRequestLocale();
  const deliveries = await Promise.all(
    emails.map(async (email, i) => ({
      email,
      url: link(tokens[i]),
      sent: await sendTeamIntakeInviteEmail(email, link(tokens[i]), locale),
    })),
  );
  revalidatePath("/team-intake");
  return { roundId: data as string, deliveries };
}
export async function resendIntakeAction(
  roundId: string,
  participantId: string,
  _previous: InviteResult,
): Promise<InviteResult> {
  const { client } = await intakeSession();
  if (!validId(roundId) || !validId(participantId)) return { error: true };
  const token = randomBytes(24).toString("hex");
  const { data, error } = await client.rpc("rotate_team_intake_invite", {
    p_round: roundId,
    p_participant: participantId,
    p_hash: hash(token),
  });
  if (error || !data) return { error: true };
  const url = link(token);
  const sent = await sendTeamIntakeInviteEmail(
    data as string,
    url,
    await getRequestLocale(),
  );
  return { roundId, deliveries: [{ email: data as string, url, sent }] };
}
function finish(id: string, error: boolean, query = ""): never {
  revalidatePath(`/team-intake/${id}`);
  revalidatePath("/team-intake");
  redirect(`/team-intake/${id}${error ? "?error=1" : query}`);
}
export async function claimIntakeAction(token: string) {
  const { client } = await intakeSession(`/team-intake/invite/${token}`);
  if (!/^[0-9a-f]{48}$/.test(token)) redirect("/team-intake?invalid=1");
  const { data, error } = await client.rpc("claim_team_intake", {
    p_hash: hash(token),
  });
  if (error || !data) redirect("/team-intake?invalid=1");
  redirect(`/team-intake/${data}`);
}
export async function confirmIntakeAction(id: string, form: FormData) {
  const { client } = await readIntake(id);
  if (form.get("confirm") !== "on") finish(id, true);
  const { error } = await client.rpc("confirm_team_intake", { p_round: id });
  finish(id, Boolean(error));
}
export async function saveIntakeAction(id: string, form: FormData) {
  const { client, user, round } = await readIntake(id);
  const targets = round.participants.flatMap((p) =>
    p.user_id && p.user_id !== user.id ? [p.user_id] : [],
  );
  const own = parseIntakeForm(form, round.mode, targets);
  const { error } = await client.rpc("save_team_intake", {
    p_round: id,
    p_shared: own.shared,
    p_pairs: own.pairs,
    p_private_requested: own.private_requested,
    p_private_note: own.private_note,
  });
  finish(
    id,
    Boolean(error),
    form.get("intent") === "preview" ? "?preview=1" : "?saved=1",
  );
}
export async function submitIntakeAction(id: string, form: FormData) {
  const { client } = await readIntake(id);
  const { error } = await client.rpc("submit_team_intake", {
    p_round: id,
    p_release: form.get("release") === "on",
  });
  finish(id, Boolean(error));
}
export async function revokeIntakeAction(id: string, form: FormData) {
  const { client } = await readIntake(id);
  if (form.get("withdraw") !== "on") finish(id, true);
  const { error } = await client.rpc("revoke_team_intake", { p_round: id });
  finish(id, Boolean(error));
}
export async function copyIntakeHistoryAction(id: string, form: FormData) {
  const { client } = await readIntake(id);
  const source = String(form.get("source") ?? "");
  if (!validId(source)) finish(id, true);
  const { error } = await client.rpc("copy_team_intake_history", {
    p_round: id,
    p_source: source,
  });
  finish(id, Boolean(error));
}
