import { type ValuesArchetypeId } from "@/features/reporting/types";

export const SELF_VALUES_ARCHETYPE_INTERPRETATION: Record<
  ValuesArchetypeId,
  {
    founderMeaning: string;
    operatingLeverage: string;
    watchout: string;
  }
> = {
  impact_idealist: {
    founderMeaning:
      "Du setzt Entscheidungen stark über Sinn, Fairness und langfristige Wirkung auf Menschen und Umfeld.",
    operatingLeverage:
      "Nutze das als kulturellen Kompass: Definiere früh, welche Werte in Produkt, Hiring und Partnerschaften nicht verhandelbar sind.",
    watchout:
      "Achte darauf, unter wirtschaftlichem Druck klare Prioritäten zu setzen, damit Werteorientierung nicht in Entscheidungsstau kippt.",
  },
  verantwortungs_stratege: {
    founderMeaning:
      "Du balancierst wirtschaftliche Ziele mit Verantwortung und denkst konsequent in tragfähigen Kompromissen.",
    operatingLeverage:
      "Nutze das als Führungshebel: Übersetze Werte in konkrete Entscheidungsregeln für Tempo, Qualität und Zumutbarkeit.",
    watchout:
      "Achte darauf, nicht zu viele Perspektiven gleichzeitig zu bedienen, wenn schnelle Richtungsentscheide nötig sind.",
  },
  business_pragmatiker: {
    founderMeaning:
      "Du priorisierst Entscheidbarkeit, Umsetzungskraft und wirtschaftliche Wirksamkeit im operativen Alltag.",
    operatingLeverage:
      "Nutze das als Performance-Hebel: Setze klare Ergebniskennzahlen und verknüpfe sie sichtbar mit Team- und Kundenvertrauen.",
    watchout:
      "Achte darauf, Reputation und kulturelle Wirkung aktiv mitzusteuern, damit kurzfristige Effizienz nicht langfristige Bindung kostet.",
  },
};

export const SELF_VALUES_PAIRING_HINTS: Record<
  `${ValuesArchetypeId}|${ValuesArchetypeId}`,
  string
> = {
  "impact_idealist|impact_idealist":
    "Dein Profil ist stark wertezentriert und konsequent in normativen Fragen.",
  "impact_idealist|verantwortungs_stratege":
    "Du kombinierst klare Wertehaltung mit strategischer Abwägung.",
  "impact_idealist|business_pragmatiker":
    "Du verbindest hohen Anspruch an Wirkung mit pragmatischer Ergebnisorientierung.",
  "verantwortungs_stratege|impact_idealist":
    "Du kombinierst strategische Verantwortung mit klarer Wertehaltung.",
  "verantwortungs_stratege|verantwortungs_stratege":
    "Dein Profil zeigt eine stabile Balance aus Verantwortung und Geschäftsrealität.",
  "verantwortungs_stratege|business_pragmatiker":
    "Du verbindest verantwortungsorientierte Führung mit hoher Umsetzungsorientierung.",
  "business_pragmatiker|impact_idealist":
    "Du kombinierst wirtschaftlichen Fokus mit einem klaren Wertekompass.",
  "business_pragmatiker|verantwortungs_stratege":
    "Du verbindest Ergebnisfokus mit strukturiertem Verantwortungsdenken.",
  "business_pragmatiker|business_pragmatiker":
    "Dein Profil ist stark auf wirtschaftliche Schlagkraft und klare Entscheidungslogik ausgerichtet.",
};
