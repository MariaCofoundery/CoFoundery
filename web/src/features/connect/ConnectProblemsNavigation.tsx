"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Die Unterleiste des Bereichs "Probleme" (seit 05.11.2026, Wunsch von Maria): Problembrett, die
 * eigenen Probleme und die Arbeitsraeume. Arbeitsraeume gehoeren zu Problemfragen - man startet sie
 * aus einem eigenen Problem und veroeffentlicht aus ihnen eine Problemfassung -, standen aber bis
 * dahin unter "Mein Connect" neben Profil und Benachrichtigungen.
 *
 * Gleiche Gestalt wie `ConnectMyNavigation`. Steht auf den Listen, nicht auf einem einzelnen
 * Problem oder Formular - dort fuehrt der Rueckweg der Seite.
 */
export function ConnectProblemsNavigation() {
  const path = usePathname();
  const t = useTranslations("connect");
  const links = [
    ["/connect/problems", t("problemsArea.board")],
    ["/connect/problems/mine", t("problemsArea.mine")],
    ["/connect/workspaces", t("problemsArea.workspaces")],
  ] as const;
  const shown = path === "/connect/problems" || path === "/connect/problems/mine" || path === "/connect/workspaces" || path.startsWith("/connect/workspaces/");
  if (!shown) return null;
  const current = (href: string) => (href === "/connect/workspaces" ? path === href || path.startsWith(`${href}/`) : path === href);
  return (
    <nav aria-label={t("problemsArea.label")} className="mx-auto flex max-w-5xl flex-wrap gap-2 px-5 pt-5">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current(href) ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-2xl border px-4 text-sm ${current(href) ? "brand-here font-semibold" : "bg-white text-slate-600"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
