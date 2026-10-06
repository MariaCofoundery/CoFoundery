import { getTranslations } from "next-intl/server";
import { AccessStatePanel } from "@/features/access/AccessStatePanel";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Phase 12C.1C: Die eine echte 404 - eine Seite, die es nicht gibt, oder die es
 * fuer dieses Konto nie gab. Beides sieht absichtlich gleich aus: Eine
 * Unterscheidung waere eine Auskunft darueber, dass etwas existiert.
 * Verlorene Zugaenge erklaeren die Seiten selbst (TeamUnavailable u. a.).
 */
export default async function NotFound() {
  const t = await getTranslations("common.access.notFound");
  return (
    <AccessStatePanel
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("body")}
      actions={[
        { href: "/", label: t("home") },
        { href: "/connections", label: t("connections") },
      ]}
    />
  );
}
