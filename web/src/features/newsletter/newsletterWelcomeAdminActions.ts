"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { newsletterToken } from "@/features/newsletter/newsletterToken";
import { sendNewsletterWelcomeEmail } from "@/lib/email/sendNewsletterWelcomeEmail";
import { getPublicAppOrigin, toPublicAppUrl } from "@/lib/publicAppOrigin";
import { getRequestUser } from "@/lib/supabase/server";

/** Die Willkommensmail als Testmail an die eigene Adresse, in der gewaehlten Sprache. Geht an niemanden sonst und merkt sich nichts. */
export async function sendWelcomeTestAction(formData: FormData) {
  await requirePlatformAdmin();
  const { data: { user } } = await getRequestUser();
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!user?.email || !secret) redirect("/admin/newsletter?welcome=error");
  const locale = String(formData.get("locale")) === "en" ? "en" : "de";
  const origin = getPublicAppOrigin();
  const result = await sendNewsletterWelcomeEmail({
    recipientEmail: user.email,
    locale,
    photoUrl: toPublicAppUrl("/brand/maria.jpg"),
    miaUrl: toPublicAppUrl("/brand/mia.png"),
    ctaUrl: toPublicAppUrl("/me/profile"),
    unsubscribeUrl: `${origin}/abmelden/newsletter?u=${encodeURIComponent(user.id)}&t=${newsletterToken(user.id, "unsubscribe", secret)}`,
    privacyUrl: toPublicAppUrl("/datenschutz"),
    imprintUrl: toPublicAppUrl("/impressum"),
  });
  redirect(`/admin/newsletter?welcome=${result.ok ? "sent" : "error"}`);
}
