import { getTranslations } from "next-intl/server";
import { AdminFeedbackPanel } from "@/features/admin/AdminFeedbackPanel";
import { parseFeedbackTab } from "@/features/admin/feedbackTab";
import { AdminOverview } from "@/features/admin/AdminOverview";
import { AdminReminderCard } from "@/features/moderation/AdminReminderCard";
import { requirePlatformAdmin } from "@/features/moderation/access";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Das Admin-Dashboard: was zu tun ist, was hereingekommen ist, wie es laeuft.
 * Fuer alle anderen gibt es die Seite nicht (404). Keine Scores, keine
 * Rangliste; Namen stehen nur beim Feedback.
 */
export default async function AdminHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const client = await requirePlatformAdmin();
  const [t, params] = await Promise.all([getTranslations("admin"), searchParams]);
  const tab = parseFeedbackTab(typeof params.tab === "string" ? params.tab : undefined);
  const selectedId = uuid(params.id) ? params.id : null;
  const page = typeof params.page === "string" && /^\d{1,3}$/.test(params.page) ? Number(params.page) : 0;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col gap-6 px-6 pb-16 pt-9">
      <header>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-slate-950">{t("title")}</h1>
        <p className="mt-1.5 max-w-2xl text-base leading-7 text-[#5f5e7a]">{t("intro")}</p>
      </header>
      <AdminReminderCard />
      <AdminFeedbackPanel client={client} tab={tab} selectedId={selectedId} page={page} />
      <AdminOverview client={client} />
    </main>
  );
}
