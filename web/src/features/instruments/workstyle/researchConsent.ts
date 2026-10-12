import consentV3 from "../../../../docs/founder-workstyle-research-consent-v3.json";
import consentV3En from "../../../../docs/founder-workstyle-research-consent-v3.en.json";
import type { AppLocale } from "@/i18n/config";

/**
 * The versioned consent documents are the only source for the displayed v3
 * research consent. The English file is a declared translation of the German
 * one and carries the same consent_version, so the stored version does not
 * depend on the display language.
 */
export function researchConsentDocument(locale: AppLocale) {
  return locale === "en" ? consentV3En : consentV3;
}
