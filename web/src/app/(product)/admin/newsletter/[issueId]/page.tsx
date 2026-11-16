import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { NewsletterEditor } from "@/features/newsletter/NewsletterEditor";
import { issueFromRow } from "@/features/newsletter/newsletterModel";
import { isoToBerlinLocal } from "@/lib/berlinTime";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewsletterIssuePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(issueId)) notFound();
  const client = await requirePlatformAdmin();
  const t = await getTranslations("admin.newsletter");
  const [{ data }, candidates, stats] = await Promise.all([
    client.rpc("admin_get_newsletter_issue", { p_id: issueId }),
    client.rpc("admin_newsletter_candidates", { p_days: 21 }),
    client.rpc("admin_newsletter_stats"),
  ]);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) notFound();
  const recipients = Number(((stats.data ?? []) as { confirmed: number }[])[0]?.confirmed ?? 0);
  const scheduled = typeof row.scheduled_for === "string" ? isoToBerlinLocal(row.scheduled_for) : "";
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/admin/newsletter" className="text-sm text-slate-600 underline">{"← "}{t("title")}</Link>
      <h1 className="mt-4 mb-5 text-2xl font-semibold text-slate-950">{(row.title as string) || (row.subject as string) || t("untitled")}</h1>
      {typeof row.notes === "string" && row.notes.trim() ? (
        <section className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4" aria-labelledby="notes-title">
          <h2 id="notes-title" className="text-sm font-bold text-violet-950">{t("notesTitle")}</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-violet-950">{row.notes}</p>
        </section>
      ) : null}
      <NewsletterEditor
        issueId={issueId}
        initial={issueFromRow(row)}
        status={row.status as "draft" | "scheduled" | "sending" | "sent"}
        scheduledLocal={scheduled}
        candidates={((candidates.data ?? []) as { kind: "listing" | "problem"; id: string; title: string }[]).map((c) => ({ kind: c.kind, id: c.id, title: c.title }))}
        recipients={recipients}
        appOrigin={getPublicAppOrigin()}
        supabaseUrl={(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}
      />
    </main>
  );
}
