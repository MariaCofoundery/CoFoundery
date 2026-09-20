"use server";

import { getTranslations } from "next-intl/server";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { isKnownPushEndpoint } from "@/features/notifications/pushSupport";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Anmelden und Abmelden eines Geraets.
 *
 * Beides laeuft ueber eine enge Funktion in der Datenbank
 * (`register_push_subscription`), nicht ueber die Tabelle: Ein Endpunkt gehoert
 * zu einem BROWSER. Meldet sich auf demselben Geraet eine andere Person an,
 * muss er wechseln - sonst bekaeme die vorherige Person die Mitteilungen der
 * neuen. Das ist in der Migration ausfuehrlich begruendet.
 */

export type PushRegistrationResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "unsupported_service" | "failed" };

export async function registerPushSubscriptionAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<PushRegistrationResult> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Der Endpunkt ist eine Adresse, die unser Server spaeter aufruft. Er kommt
  // vom Browser und wird deshalb hier geprueft und nicht nur gespeichert.
  if (!isKnownPushEndpoint(input.endpoint)) return { ok: false, reason: "unsupported_service" };
  if (!input.p256dh?.trim() || !input.auth?.trim()) return { ok: false, reason: "failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
    p_user_agent: input.userAgent?.slice(0, 300) ?? null,
  });

  return error ? { ok: false, reason: "failed" } : { ok: true };
}

export async function unregisterPushSubscriptionAction(
  endpoint: string
): Promise<PushRegistrationResult> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unregister_push_subscription", { p_endpoint: endpoint });

  // Ob eine Zeile da war, ist gleichgueltig: Das Ziel ist "dieses Geraet
  // bekommt keine Mitteilungen mehr", und das gilt danach in jedem Fall.
  return error ? { ok: false, reason: "failed" } : { ok: true };
}

/**
 * Eine Mitteilung zur Probe an die eigenen Geraete.
 *
 * WARUM DAS MEHR IST ALS EINE BEQUEMLICHKEIT:
 *   Ob Mitteilungen ankommen, kann man sonst nur herausfinden, indem jemand
 *   anderes einem schreibt. Und wenn dann nichts kommt, ist unklar, woran es
 *   lag - an der Erlaubnis, an den Schluesseln, am Telefon. Ein Knopf, der
 *   genau einen Weg prueft, ersetzt dieses Raten.
 *
 * Empfaenger ist ausschliesslich das aufrufende Konto - das ist auch der
 * Grund, warum hier kein Anspruch genommen wird: Es gibt keinen Anlass, den
 * jemand doppelt bekommen koennte, und niemand kann damit jemand anderen
 * anschreiben.
 */
export async function sendTestPushAction(): Promise<{ ok: boolean; sent: number }> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return { ok: false, sent: 0 };

  // Die Sprache der Anfrage ist hier richtig: Empfaengerin und Ausloesende
  // sind dieselbe Person. Bei jeder anderen Benachrichtigung waere das der
  // Fehler, den `notificationRecipient.ts` ausfuehrlich beschreibt.
  const t = await getTranslations("dashboard");

  const { sent } = await deliverPushToUser(user.id, {
    title: t("account.push.testTitle"),
    body: t("account.push.testBody"),
    url: "/account#post",
    tag: "test",
  });

  return { ok: sent > 0, sent };
}
