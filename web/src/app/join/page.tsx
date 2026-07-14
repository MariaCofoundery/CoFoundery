import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import JoinClient from "./JoinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const t = await getTranslations("invite.join");

  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-600">{t("fallback")}</div>}>
      <JoinClient />
    </Suspense>
  );
}
