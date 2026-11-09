/**
 * Aus dem Kontakt einer Person wird ein Link - aber nur fuer eine schlichte Adresse. Ein `?` oder `&` in einer Adresse
 * (`a@b.de?bcc=...&body=...`) haette dem Startup beim Klick einen Entwurf mit fremdem Empfaenger oder Text untergeschoben.
 */
export const SIMPLE_EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const contactHref = (contact: string): string | null =>
  /^https:\/\/[^\s]+$/.test(contact) ? contact : SIMPLE_EMAIL.test(contact) ? `mailto:${contact}` : null;
