import { getTranslations } from "next-intl/server";
import { FirstVisitTip } from "@/features/ui/FirstVisitTip";

const STEP_COUNT: Record<"teamraum" | "program" | "events", number> = { teamraum: 3, program: 2, events: 1 };

/** Die Tipps beim ersten Besuch je Bereich - Texte aus advisor.setup.tips. */
export async function AreaTips({ area }: { area: keyof typeof STEP_COUNT }) {
  const t = await getTranslations("advisor.setup.tips");
  const steps = Array.from({ length: STEP_COUNT[area] }, (_, index) => ({ title: t(`${area}.${index}.title`), text: t(`${area}.${index}.text`) }));
  return <FirstVisitTip id={area} steps={steps} labels={{ counter: t.raw("counter") as string, next: t("next"), done: t("done"), dismiss: t("dismiss") }} />;
}
