import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { uuid } from "@/features/problem-radar/model";
import type { Hypothesis } from "@/features/problem-radar/hypotheses";
import { HandoffForm } from "@/features/problem-radar/HandoffForm";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const c = await requirePlatformAdmin(),
    { id } = await params,
    t = await getTranslations("radar.hypotheses");
  if (!uuid(id)) notFound();
  const { data, error } = await c.rpc("get_radar_hypothesis", { p_id: id });
  if (error) return <p role="alert">{t("loadError")}</p>;
  if (!data) notFound();
  const h = data as Hypothesis;
  return (
    <>
      <h2 className="my-5 text-xl font-semibold">{t("handoff")}</h2>
      {h.ready && h.can_handoff ? (
        <HandoffForm hypothesis={h} request={randomUUID()} />
      ) : (
        <p>{t("handoffGate")}</p>
      )}
    </>
  );
}
