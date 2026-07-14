import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import JoinClient from "./JoinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const t = await getTranslations("invite.join");

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-5 pt-8 md:px-8">
        <div className="flex justify-end">
          <PublicLanguageSwitcher />
        </div>
      </div>
      <Suspense fallback={<div className="p-8 text-sm text-slate-600">{t("fallback")}</div>}>
        <JoinClient />
      </Suspense>
    </>
  );
}
