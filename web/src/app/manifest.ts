import type { MetadataRoute } from "next";

/**
 * Das Web-App-Manifest - die Datei, die aus der Seite auf dem Telefon etwas
 * macht, das sich wie eine App anfuehrt.
 *
 * GEMELDET AM 20.09.2026, nachdem die Seite auf einem iPhone auf den
 * Startbildschirm gelegt wurde: als Symbol nur ein graues C, und beim Antippen
 * landet man auf der Marketing-Startseite statt im eigenen Bereich.
 *
 * Zwei Zeilen hier beantworten das:
 *
 * - `start_url` ist `/start` und NICHT `/dashboard`. `/start` leitet
 *   angemeldete Menschen ueber `resolvePostAuthRedirectPath` dorthin, wo ihr
 *   Bereich liegt - das Dashboard, wenn es eins gibt, sonst Connect oder das
 *   Profil. Ein festes `/dashboard` waere fuer jemanden, der nur im Netzwerk
 *   ist, die falsche Tuer. Wer nicht angemeldet ist, sieht die Anmeldung, und
 *   das ist beim Oeffnen einer App der richtige erste Bildschirm.
 * - `icons` zeigt auf die runde Bildmarke des Logos. Das Logo selbst ist ein
 *   SVG mit zwei eingebetteten Rastern von je 6144x4096 Pixeln und 2,7 MB -
 *   als App-Symbol unbrauchbar. Die Symbole in `public/icons` sind daraus
 *   ausgeschnitten und verkleinert.
 *
 * `display: "standalone"` ist ausserdem die VORAUSSETZUNG fuer Mitteilungen
 * auf dem iPhone: Web Push gibt es dort seit iOS 16.4 nur fuer Seiten, die auf
 * dem Startbildschirm liegen und eigenstaendig starten - nicht im Safari-Tab.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Die Kennung festschreiben, damit ein spaeteres Aendern von `start_url`
    // die App auf dem Geraet nicht zu einer anderen macht.
    id: "/",
    name: "CoFoundery Align",
    // Unter dem Symbol ist nach etwa zwoelf Zeichen Schluss.
    short_name: "CoFoundery",
    description:
      "CoFoundery Align verbindet Mitgründer:innen nach Werten, Vision und Arbeitsstil.",
    start_url: "/start",
    scope: "/",
    display: "standalone",
    // Kein `orientation`: Ein Report mit Gegenueberstellung liest sich quer
    // besser, und eine Festlegung auf Hochformat nimmt diese Wahl weg.
    lang: "de",
    dir: "ltr",
    // Der Grund, auf dem der Startbildschirm der App aufblitzt, bevor etwas
    // geladen ist - derselbe Ton wie der Seitenhintergrund, damit es keinen
    // weissen Blitz gibt.
    background_color: "#eef3f9",
    theme_color: "#eef3f9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android schneidet Symbole auf eine eigene Form zu und behaelt dabei nur
      // die inneren 80 Prozent sicher. Deshalb eine zweite Fassung, in der die
      // Marke kleiner steht und der Schnitt nichts abnimmt.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
