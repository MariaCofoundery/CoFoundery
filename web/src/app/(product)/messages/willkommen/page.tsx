import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSignedInForMessages } from "@/features/connect/conversationAccess";
import { WelcomeLetter } from "@/features/profile/WelcomeLetter";

/**
 * Marias Begruessung, nachlesbar im Postfach.
 *
 * Der Brief erscheint beim ersten Einstieg genau einmal. Wer ihn schon gesehen
 * hat - oder vorher gar keinen bekam -, findet ihn hier wieder, auch den Link
 * zur Kurzanleitung fuers Handy.
 *
 * KEINE GESPRAECHSZEILE: Ein Gespraech haengt in der Datenbank an einer
 * Kontaktanfrage zwischen zwei Konten. Das hier ist ein fester Text fuer alle,
 * ohne Antwortfeld, ohne Ungelesen-Zaehler und ohne Mitteilung oder Mail.
 */
export default async function WelcomeMessagePage() {
  const t = await getTranslations("connect.messages.welcome");
  await requireSignedInForMessages("/messages/willkommen");

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <Link href="/messages" className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-950">
        {t("back")}
      </Link>
      <WelcomeLetter />
    </main>
  );
}
