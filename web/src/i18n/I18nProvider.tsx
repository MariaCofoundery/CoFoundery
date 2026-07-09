"use client";

import { NextIntlClientProvider, type IntlError } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { AppLocale } from "@/i18n/config";

export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: AppLocale;
  messages: AbstractIntlMessages;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Europe/Berlin"
      onError={(error: IntlError) => {
        if (error.code === "MISSING_MESSAGE") return;
        console.error(error);
      }}
      getMessageFallback={({ namespace, key }) => [namespace, key].filter(Boolean).join(".")}
    >
      {children}
    </NextIntlClientProvider>
  );
}
