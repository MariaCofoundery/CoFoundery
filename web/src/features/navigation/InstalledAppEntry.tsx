"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * In der App auf dem Startbildschirm ist die Marketingseite nicht das Ziel.
 *
 * GEMELDET AM 20.09.2026: "Wenn ich wieder reingehe, komme ich immer erstmal
 * auf die Startseite. Ich kann zwar dann, wenn ich auf Starten druecke, bin
 * ich sofort auch eingeloggt. Aber irgendwie wuerde ich, wenn ich das
 * aufrufe, eigentlich sofort gerne in meinem Dashboard landen."
 *
 * `start_url` im Manifest beantwortet das - aber ERST FUER EINE NEUE
 * INSTALLATION. iOS merkt sich beim Hinzufuegen die Adresse, die dann gerade
 * offen war; ein spaeter hinzugefuegtes Manifest aendert an einem Symbol, das
 * schon auf dem Startbildschirm liegt, nichts. Diese Weiche hier gilt
 * unabhaengig davon, wie das Symbol entstanden ist.
 *
 * SIE GILT NUR IN DER INSTALLIERTEN APP.
 *   Im Browser bleibt die Startseite die Startseite - fuer alle, die die Seite
 *   zum ersten Mal sehen, und fuer jede geteilte Adresse. Angemeldete Menschen
 *   aus dem Browser wegzuleiten waere eine andere, groessere Entscheidung: Sie
 *   koennten die Seite dann nicht mehr ansehen, auch wenn sie es wollen.
 *
 * /start und nicht /dashboard: Die Seite leitet je nach Zugaengen weiter -
 * Dashboard, Connect oder Profil - und zeigt Nichtangemeldeten die Anmeldung.
 */
export function InstalledAppEntry() {
  const router = useRouter();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    // replace und nicht push: Sonst liegt die Marketingseite im Verlauf, und
    // "zurueck" fuehrt in der App aus dem eigenen Bereich heraus.
    router.replace("/start");
  }, [router]);

  return null;
}
