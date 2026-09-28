import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlignmentNav } from "@/features/instruments/v2/AlignmentNav";
import { DiscoveryTopicsForm } from "@/features/instruments/v2/DiscoveryTopicsForm";
import { getDiscoveryTopics } from "@/features/instruments/v2/discoveryTopics";
import type { TopicChoice } from "@/features/instruments/v2/discoveryTopicActions";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function AlignmentV2DiscoveryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) notFound();

  const t = await getTranslations("alignment");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("discovery_alignment_topics")
    .select("topic_key, wish, rank")
    .eq("user_id", auth.user.id)
    .order("rank");

  const initial: TopicChoice[] = (rows ?? []).map((row) => ({
    topicKey: row.topic_key,
    wish: row.wish === "different" ? "different" : "similar",
    rank: row.rank,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignmentNav current={"/debug/alignment-v2/discovery"} />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        {t("shell.draftNotice")}
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">{t("discovery.title")}</h1>
      <p className="mt-3 text-slate-700">{t("discovery.intro")}</p>

      <div className="mt-10">
        <DiscoveryTopicsForm topics={getDiscoveryTopics()} initial={initial} />
      </div>
    </main>
  );
}
