import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { radarRoot } from "@/features/problem-radar/model";
export const metadata: Metadata = {
  title: "Problem Radar",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default async function RadarLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePlatformAdmin();
  const t = await getTranslations("radar");
  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl font-sans text-slate-900 px-4 py-8 [overflow-wrap:anywhere] sm:px-6">
      <nav
        aria-label={t("title")}
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm underline"
      >
        <Link className="inline-flex min-h-11 items-center" href="/account">
          {t("account")}
        </Link>
        <Link className="inline-flex min-h-11 items-center" href={radarRoot}>
          {t("signals")}
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href={`${radarRoot}/sources`}
        >
          {t("sources")}
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href={`${radarRoot}/hypotheses`}
        >
          {t("hypotheses.title")}
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href={`${radarRoot}/imports`}
        >
          {t("hypotheses.imports")}
        </Link>
      </nav>
      <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
      <p className="my-3 text-sm leading-6 text-slate-600">{t("scope")}</p>
      {children}
    </main>
  );
}
