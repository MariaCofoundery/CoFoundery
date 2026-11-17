"use server";

import { redirect } from "next/navigation";
import { requestPublicNewsletter } from "@/features/newsletter/publicNewsletter";

const HONEYPOT = "website";

/**
 * Die Newsletter-Anmeldung im Blog. Oeffentlich, ohne Konto. Schutz gegen automatische Eintraege: ein verstecktes Feld (Menschen sehen es nicht,
 * Programme fuellen es aus) und die Begrenzung in der Datenbank. Danach geht es zurueck auf die Blogseite mit einem Hinweis in der URL.
 */
export async function subscribePublicNewsletterAction(formData: FormData) {
  const returnTo = String(formData.get("return_to") ?? "/blog");
  // Zurueck nur auf eine Seite des Blogs - nie auf eine fremde Adresse.
  const back = /^\/blog(\/[a-z0-9-]{1,80})?$/.test(returnTo) ? returnTo : "/blog";
  const language = formData.get("language") === "en" ? "en" : "de";
  if (String(formData.get(HONEYPOT) ?? "").trim() !== "") redirect(`${back}?nl=sent#newsletter`); // Programm: so tun, als wuerde es klappen
  const email = String(formData.get("email") ?? "").slice(0, 254);
  const outcome = await requestPublicNewsletter(email, language);
  redirect(`${back}?nl=${outcome}#newsletter`);
}
