import "server-only";
import { PRODUCT_NAME } from "@/features/brand";

export function problemWorkspaceInviteMessage(url: string, locale: string) {
  return locale === "en"
    ? {
        subject: `Private workspace invitation – ${PRODUCT_NAME}`,
        text: `You have been invited to a private problem workspace. Sign in with the invited, verified email address to accept. Access is limited to this workspace.\n\n${url}`,
      }
    : {
        subject: `Einladung zum privaten Arbeitsraum – ${PRODUCT_NAME}`,
        text: `Du wurdest zu einem privaten Problem-Arbeitsraum eingeladen. Melde dich mit der eingeladenen, bestätigten E-Mail-Adresse an, um anzunehmen. Der Zugang gilt nur für diesen Arbeitsraum.\n\n${url}`,
      };
}
/** Same bounded Resend REST/env pattern as sendFeedbackNotification. No answers. */
export async function sendProblemWorkspaceInviteEmail(
  email: string,
  url: string,
  locale: string,
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME} <${from}>`,
        to: [email],
        reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
        ...problemWorkspaceInviteMessage(url, locale),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
