import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Wer aus "Los geht's" an eine Stelle springt, findet hier den Weg zurueck (Parameter losgehts=1). */
export async function SetupReturnBanner({ orgId }: { orgId: string }) {
  const t = await getTranslations("advisor.setup.back");
  return (
    <p role="note" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[14px] text-violet-950">
      {t("text")}
      <Link href={`/advisor/los-gehts?org=${encodeURIComponent(orgId)}`} className="font-semibold text-violet-800 underline underline-offset-4">← {t("link")}</Link>
    </p>
  );
}
