import { getTranslations } from "next-intl/server";
import { AdminModerationLink } from "@/features/moderation/AdminModerationLink";
import { requirePlatformAdmin } from "@/features/moderation/access";

export const metadata = { robots: { index: false, follow: false } };

/** Einstieg in die Verwaltung. Fuer alle anderen gibt es die Seite nicht (404). */
export default async function AdminHomePage() {
  await requirePlatformAdmin();
  const t = await getTranslations("moderation");
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-[-0.01em] text-slate-950">{t("administration")}</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">{t("administrationIntro")}</p>
      <AdminModerationLink />
    </main>
  );
}
