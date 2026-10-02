import "server-only";
import { PRODUCT_NAME } from "@/features/brand";

export function teamIntakeInviteMessage(url: string, locale: string) {
  return locale === "en"
    ? {
        subject: `Team Context invitation – ${PRODUCT_NAME}`,
        text: `You have been invited to a Team Context round. Sign in with the invited email address to review the team, purpose and named reviewers. Opening the invitation does not share answers.\n\n${url}`,
      }
    : {
        subject: `Einladung zum Team Context – ${PRODUCT_NAME}`,
        text: `Du wurdest zu einer Team-Context-Runde eingeladen. Melde dich mit der eingeladenen E-Mail-Adresse an, um Team, Zweck und benannte Reviewer zu prüfen. Das Öffnen der Einladung gibt keine Antworten frei.\n\n${url}`,
      };
}
/** Same bounded Resend REST/env pattern as sendFeedbackNotification. No answers. */
export async function sendTeamIntakeInviteEmail(
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
        ...teamIntakeInviteMessage(url, locale),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
