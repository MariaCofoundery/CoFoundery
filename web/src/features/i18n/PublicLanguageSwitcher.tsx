"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";

type Props = {
  className?: string;
};

function writeLocaleCookie(locale: AppLocale) {
  document.cookie = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    "path=/",
    "max-age=31536000",
    "samesite=lax",
  ].join("; ");
}

export function PublicLanguageSwitcher({ className = "" }: Props) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("common");

  function selectLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;

    writeLocaleCookie(nextLocale);
    router.refresh();
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-slate-200 bg-white/88 p-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur ${className}`}
      aria-label={t("language.switchLabel")}
    >
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => selectLocale(item)}
          className={`rounded-full px-2.5 py-1.5 transition ${
            locale === item ? "bg-slate-900 text-white" : "hover:bg-slate-50 hover:text-slate-900"
          }`}
          aria-pressed={locale === item}
        >
          {t(`language.${item}`)}
        </button>
      ))}
    </div>
  );
}
