import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ALIGNMENT_REGISTRY_V2 } from "@/features/instruments/v2/alignmentRegistryV2";

/**
 * Die Wege zwischen den Seiten.
 *
 * GEFUNDEN AM 28.09.2026 BEIM DURCHKLICKEN: Es gab keinen einzigen Link
 * zwischen Fragebogen, Report und Suchvorgaben - und auch keinen zurück. Wer
 * eine dieser Seiten aufrief, kam nur über die Adresszeile wieder weg.
 *
 * Das ist die Sorte Lücke, die beim Bauen unsichtbar bleibt: Wer eine Seite
 * schreibt, ruft sie direkt auf und merkt nie, dass sie keine Umgebung hat.
 */

const LINKS = [
  { href: "/debug/alignment-v2/base", key: "navBase" },
  { href: "/debug/alignment-v2/base?step=2", key: "navCommitments" },
  { href: "/debug/alignment-v2/values", key: "navValues" },
  { href: "/debug/alignment-v2/report", key: "navReport" },
  { href: "/debug/alignment-v2/discovery", key: "navDiscovery" },
] as const;

export async function AlignmentNav({ current }: { current: string }) {
  const t = await getTranslations("alignment");

  return (
    <nav className="mb-6 border-b border-slate-200 pb-4">
      <Link href="/dashboard" className="text-sm text-slate-600 underline">
        {t("shell.backToDashboard")}
      </Link>
      <ul className="mt-3 flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={link.href === current ? "page" : undefined}
              className={[
                "rounded-full border px-3 py-1.5 text-sm",
                link.href === current
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:border-slate-500",
              ].join(" ")}
            >
              {t(`shell.${link.key}`)}
            </Link>
          </li>
        ))}
      </ul>
      {/* WARUM DIE FRAGEN DEUTSCH BLEIBEN - stand bisher nur im Code. Wer die
          Oberfläche auf Englisch stellt und dann deutsche Fragen liest, hält
          das sonst für einen Fehler. */}
      <p className="mt-3 text-xs text-slate-500">{t("sourceLanguage")}</p>
      <p className="mt-1 text-xs text-slate-400">
        {t("report.instrument", {
          instrument: `${ALIGNMENT_REGISTRY_V2.instrumentId} (${ALIGNMENT_REGISTRY_V2.registryVersion}, ${ALIGNMENT_REGISTRY_V2.status})`,
        })}
      </p>
    </nav>
  );
}
