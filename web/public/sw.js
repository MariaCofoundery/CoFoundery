/*
 * Der Service Worker.
 *
 * Er hat hier GENAU EINE AUFGABE: Mitteilungen annehmen und anzeigen. Ohne
 * ihn gibt es kein Web Push - der Browser stellt nur an einen Service Worker
 * zu, nicht an eine offene Seite.
 *
 * WAS ER ABSICHTLICH NICHT TUT: zwischenspeichern.
 *   Ein Service Worker, der Seiten speichert, macht die App offline
 *   benutzbar - und liefert ab dann alte Seiten aus, bis jemand versteht,
 *   warum eine Aenderung nicht ankommt. Das ist die haeufigste Ursache fuer
 *   "bei mir sieht es anders aus". Diese Anwendung rendert ihre Seiten auf dem
 *   Server und lebt von aktuellen Daten; ein Zwischenspeicher wuerde hier mehr
 *   kaputt machen als er hilft. Falls Offline einmal ein Ziel wird, ist das
 *   eine eigene Entscheidung mit einer eigenen Strategie zum Ungueltigmachen.
 *
 * Er wird deshalb auch NICHT in der Anwendung registriert, sondern nur dort,
 * wo jemand Mitteilungen einschaltet.
 */

// Eine neue Fassung soll sofort uebernehmen. Ohne das bleibt die alte aktiv,
// bis alle Tabs geschlossen sind - auf einem Telefon also unter Umstaenden
// wochenlang.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  // Die Nutzlast ist verschluesselt angekommen und hier schon entschluesselt.
  // Trotzdem defensiv lesen: Ein Push-Dienst darf auch ohne Inhalt zustellen,
  // und eine Zustellung ohne Anzeige zieht beim Browser eine Verwarnung nach
  // sich - im Zweifel also etwas Allgemeines zeigen statt nichts.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" && payload.title ? payload.title : "Made2Found";
  const body = typeof payload.body === "string" ? payload.body : "";
  // Nur Pfade auf der eigenen Seite. Eine fremde Adresse in der Nutzlast wuerde
  // sonst einen Antippen-Weg nach draussen bauen.
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/start";

  // Zahl am App-Symbol (18.11.2026). Nur wenn der Browser es kann (iPhone: App auf dem Home-Bildschirm)
  // und die Person sie nicht abgeschaltet hat - dann schickt der Server keine Zahl mit.
  const badge = typeof payload.badge === "number" && payload.badge >= 0 ? Math.floor(payload.badge) : null;

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        // Gleiche Marke ersetzt eine noch ungelesene Mitteilung, statt eine
        // zweite daneben zu legen. Beim Buendeln ersetzt die Sammelmeldung die erste
        // des Fensters - dann ohne Ton und ohne erneutes Aufleuchten.
        tag: typeof payload.tag === "string" ? payload.tag : undefined,
        renotify: false,
        silent: payload.quiet === true ? true : undefined,
        data: { url },
      });
      if (badge !== null && self.navigator && typeof self.navigator.setAppBadge === "function") {
        try {
          await self.navigator.setAppBadge(badge);
        } catch {
          // Kein Symbol-Recht oder nicht unterstuetzt: Die Mitteilung steht, das reicht.
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/start", self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Ein bereits offenes Fenster wird benutzt und nicht ein zweites
      // geoeffnet: Sonst sammelt sich bei jeder Mitteilung ein Tab an.
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) {
          await client.navigate(target.href).catch(() => {});
        }
        return;
      }

      await self.clients.openWindow(target.href);
    })()
  );
});
