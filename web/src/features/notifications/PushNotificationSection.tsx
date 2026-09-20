"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  registerPushSubscriptionAction,
  sendTestPushAction,
  unregisterPushSubscriptionAction,
} from "@/features/notifications/pushActions";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  detectAppleMobile,
  resolvePushAvailability,
  type PushAvailability,
} from "@/features/notifications/pushSupport";

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60";

/**
 * Mitteilungen auf diesem Geraet einschalten.
 *
 * DREI DINGE, DIE HIER NICHT VERWECHSELT WERDEN DUERFEN:
 *
 *   1. WAS jemand bekommt, steht einen Kasten hoeher bei den Benachrichtigungen
 *      und gilt fuer Mail und Mitteilung gemeinsam. Hier geht es nur um WOHIN.
 *
 *   2. Die Erlaubnis gehoert dem BROWSER, nicht dem Konto. Das Telefon
 *      einzurichten richtet den Rechner nicht ein - das steht auch so da,
 *      damit niemand es fuer einen Fehler haelt.
 *
 *   3. Die Frage nach der Erlaubnis MUSS aus einer Handlung heraus kommen.
 *      Ungefragt beim Laden zu fragen ist der Grund, warum viele Menschen
 *      Mitteilungen grundsaetzlich ablehnen - und Safari verweigert es
 *      ausserdem ohne Geste.
 */
export function PushNotificationSection({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const t = useTranslations("dashboard");
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [error, setError] = useState<"denied" | "unsupported_service" | "failed" | null>(null);
  const [testState, setTestState] = useState<"sent" | "nothing" | null>(null);
  const [pending, startTransition] = useTransition();

  const readState = useCallback(async () => {
    const resolved = resolvePushAvailability({
      hasVapidKey: Boolean(vapidPublicKey),
      hasServiceWorker: "serviceWorker" in navigator,
      hasPushManager: "PushManager" in window,
      hasNotification: "Notification" in window,
      isAppleMobile: detectAppleMobile(navigator.userAgent, navigator.maxTouchPoints),
      // Zwei Wege zur selben Frage: Der Standard ist die Medienabfrage, die
      // aeltere Apple-Eigenschaft beantwortet sie auf iOS zuverlaessiger.
      isStandalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    });
    setAvailability(resolved);
    if (resolved !== "supported") return;

    // Bereits eingeschaltet? Die Antwort steht beim Service Worker, nicht bei
    // uns - ein Konto kann auf einem Geraet angemeldet sein, das seine
    // Erlaubnis inzwischen entzogen hat.
    // Ohne Argument fragt getRegistration fuer die aktuelle Seite. Der
    // Geltungsbereich des Workers ist "/", diese Seite liegt darin - mit
    // dem Pfad der Datei als Argument waere es eine andere Frage.
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    setIsOn(Boolean(subscription) && Notification.permission === "granted");
  }, [vapidPublicKey]);

  useEffect(() => {
    // Erst nach dem Einblenden: Auf dem Server gibt es kein navigator, und die
    // Antwort haengt am Geraet - sie darf deshalb nicht vorgerendert werden.
    void readState();
  }, [readState]);

  const enable = async () => {
    setError(null);
    setTestState(null);

    // Die Erlaubnisfrage steht VOR der Transition und direkt in der Geste:
    // Safari erlaubt sie nur unmittelbar nach einem Antippen, und was danach
    // kommt, darf sie nicht in eine spaetere Aufgabe verschieben.
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      setError("failed");
      return;
    }
    if (permission !== "granted") {
      setError("denied");
      return;
    }

    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            // Ohne das weigern sich die Browser: Jede Zustellung muss zu einer
            // sichtbaren Mitteilung fuehren, stilles Zustellen ist nicht
            // erlaubt - und waere hier auch nicht gewollt.
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(vapidPublicKey ?? ""),
          }));

        const p256dh = bytesToBase64Url(subscription.getKey("p256dh"));
        const auth = bytesToBase64Url(subscription.getKey("auth"));
        if (!p256dh || !auth) {
          setError("failed");
          return;
        }

        const result = await registerPushSubscriptionAction({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          userAgent: navigator.userAgent,
        });

        if (!result.ok) {
          // Wenn wir die Adresse nicht speichern konnten, darf die Anmeldung
          // beim Browser nicht bestehen bleiben: Sonst stuende hier "aus",
          // waehrend das Geraet angemeldet ist, und ein zweiter Versuch
          // bekaeme ueber getSubscription dieselbe Anmeldung zurueck.
          await subscription.unsubscribe().catch(() => {});
          setError(result.reason === "unsupported_service" ? "unsupported_service" : "failed");
          return;
        }

        setIsOn(true);
      } catch {
        setError("failed");
      }
    });
  };

  const sendTest = () => {
    setError(null);
    setTestState(null);
    startTransition(async () => {
      const result = await sendTestPushAction();
      // "Zugestellt" heisst nicht "angezeigt": Der Push-Dienst hat es
      // angenommen, das Geraet kann es trotzdem verwerfen. Deshalb steht dort
      // "unterwegs" und nicht "angekommen".
      setTestState(result.sent > 0 ? "sent" : "nothing");
    });
  };

  const disable = () => {
    setError(null);
    setTestState(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await unregisterPushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe().catch(() => {});
        }
        setIsOn(false);
      } catch {
        setError("failed");
      }
    });
  };

  // Vor der Pruefung im Browser nichts behaupten. Ein Knopf, der beim Laden
  // erscheint und dann verschwindet, sieht wie ein Fehler aus.
  if (availability === null) return null;

  return (
    <section className="mt-5 border-t border-slate-200 pt-5" aria-labelledby="push-title">
      <h3 id="push-title" className="text-sm font-semibold text-slate-950">
        {t("account.push.title")}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("account.push.text")}</p>

      {availability === "supported" ? (
        <>
          <p className="mt-3 text-sm text-slate-700">
            {t("account.push.statusLabel")}{" "}
            <strong>{isOn ? t("account.push.on") : t("account.push.off")}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={isOn ? disable : () => void enable()}
              className={BUTTON}
            >
              {pending
                ? t("account.push.pending")
                : isOn
                  ? t("account.push.disable")
                  : t("account.push.enable")}
            </button>
            {/* Der Probelauf. Ohne ihn erfaehrt man erst beim naechsten Mal,
                dass jemand geschrieben hat, ob das hier funktioniert - und im
                Fehlerfall nicht, woran es lag. */}
            {isOn ? (
              <button type="button" disabled={pending} onClick={sendTest} className={BUTTON}>
                {t("account.push.test")}
              </button>
            ) : null}
          </div>
          {testState ? (
            <p role="status" className="mt-3 text-sm leading-6 text-slate-700">
              {t(`account.push.${testState === "sent" ? "testSent" : "testNothing"}`)}
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-slate-500">{t("account.push.perDevice")}</p>
        </>
      ) : null}

      {availability === "needs_home_screen" ? (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          {t("account.push.homeScreen")}
        </p>
      ) : null}

      {availability === "unsupported" ? (
        <p className="mt-3 text-sm leading-6 text-slate-500">{t("account.push.unsupported")}</p>
      ) : null}

      {availability === "not_configured" ? (
        <p className="mt-3 text-sm leading-6 text-slate-500">{t("account.push.notConfigured")}</p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm leading-6 text-red-700">
          {t(`account.push.errors.${error}`)}
        </p>
      ) : null}
    </section>
  );
}
