import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { IconTile } from "@/features/ui/Icons";

export async function FounderLibraryHomebaseCard({ teamId }: { teamId: string }) {
  const t = await getTranslations("founderLibrary.homebase");

  // Eine Kachel unter „Vereinbaren und üben": zum Nachschlagen, nie eine Aufgabe.
  return (
    <section className="card-lift flex h-full flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="founder-library-homebase-title">
      <div className="flex items-center justify-between gap-2">
        <IconTile name="book" tone="teal" />
      </div>
      <h3 id="founder-library-homebase-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("title")}</h3>
      <p className="text-sm leading-[1.55] text-[#5f5e7a]">{t("description")}</p>
      <div className="mt-auto pt-1">
        <Link href={`/teams/${encodeURIComponent(teamId)}/founder-library`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4]">
          {t("action")}
        </Link>
      </div>
    </section>
  );
}
