/**
 * CONNECT – C1 topic-required (Spec §11). Exakte Portierung von matching_models_v03.score_c1.
 *
 *   topic    = Mittel je Suchthema: 1,0 Angebotsthema · 0,7 nur Profil-Expertise · 0 sonst (keine Themen -> 0)
 *   text     = IDF-gewichteter Anteil der Gesuchs-Token im Angebot (Titel + Beschreibung + Themen)
 *   industry = 1, wenn eine normalisierte Branche gleich ist; sonst 0 (auch wenn eine Seite keine hat)
 *   category = 1, wenn gleich
 *   score    = 0,55·topic + 0,20·text + 0,15·industry + 0,10·category
 *   topic = 0 und text < 0,10  ->  score = min(score, 0,10)
 *
 * Gerichtet, ohne Gegenseitigkeit.
 */
import type { IdfIndex } from "@/lib/matching/v01/idf";
import { normalizeTerms, sameTerm, textTokens } from "@/lib/matching/v01/normalization";
import type { ConnectListingInput, ConnectOfferInput } from "@/lib/matching/v01/types";
import { CONNECT_CONSTANTS } from "@/lib/matching/v01/version";

const W = CONNECT_CONSTANTS.weights;

export type C1Components = Readonly<{
  topic: number;
  text: number;
  industry: number;
  category: number;
  cappedNoTopic: boolean;
  score: number;
  offerTokens: readonly string[];
}>;

export function c1Relevance(seek: ConnectListingInput, offer: ConnectOfferInput, idf: IdfIndex): C1Components {
  const ts = normalizeTerms(seek.topics, "topic");
  const to = normalizeTerms(offer.listing.topics, "topic");
  const te = normalizeTerms(offer.owner.expertise, "topic");
  let topicSum = 0;
  for (const t of ts) {
    if (to.some((o) => sameTerm(t, o))) topicSum += 1;
    else if (te.some((e) => sameTerm(t, e))) topicSum += CONNECT_CONSTANTS.expertiseOnlyTopicValue;
  }
  const topic = ts.length > 0 ? topicSum / ts.length : 0;

  const needTokens = textTokens(seek.title, seek.summary, seek.topics);
  const offerTokens = textTokens(offer.listing.title, offer.listing.summary, offer.listing.topics);
  const text = idf.overlap(needTokens, offerTokens) ?? 0;

  const is = normalizeTerms(seek.industries, "industry");
  const io = normalizeTerms(offer.listing.industries, "industry");
  const industry = is.length === 0 || io.length === 0 ? 0 : is.some((x) => io.some((y) => sameTerm(x, y))) ? 1 : 0;
  const category = seek.category === offer.listing.category ? 1 : 0;

  let score = 0 + W.topic * topic + W.text * text + W.industry * industry + W.category * category;
  const cappedNoTopic = topic === 0 && text < CONNECT_CONSTANTS.noTopicTextMin;
  if (cappedNoTopic) score = Math.min(score, CONNECT_CONSTANTS.noTopicCap);
  return { topic, text, industry, category, cappedNoTopic, score, offerTokens };
}
