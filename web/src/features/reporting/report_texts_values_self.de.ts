import { type ValuesArchetypeId } from "@/features/reporting/types";

export const SELF_VALUES_ARCHETYPE_INTERPRETATION: Record<
  ValuesArchetypeId,
  {
    lead: string;
    decisionPattern: string;
    uncertaintyPattern: string;
    operatingLeverage: string;
    tensionField: string;
    counterweightLabel: string;
  }
> = {
  impact_idealist: {
    lead:
      "Wenn Entscheidungen Druck bekommen, priorisierst du eher, ob ein Schritt für dich noch vertretbar ist und wofür du später stehen willst.",
    decisionPattern:
      "Du gibst einen Schritt eher nicht frei, nur weil er kurzfristig hilft. Vertrauen, Wirkung und die Linie nach innen und außen zählen für dich sichtbar mit.",
    uncertaintyPattern:
      "Unter Unsicherheit suchst du eher eine Lösung, die auch unter Druck noch sauber begründbar bleibt, statt einen Zielkonflikt nur über Tempo aufzulösen.",
    operatingLeverage:
      "Im Alltag kannst du damit rote Linien früh sichtbar machen und Entscheidungen daran messen, welche Nebenfolgen ihr bewusst in Kauf nehmt.",
    tensionField:
      "Kritisch wird es, wenn wirtschaftlicher Druck steigt und von dir erwartet wird, Grenzfälle schnell als normalen Kompromiss zu behandeln.",
    counterweightLabel: "vertretbare Wirkung und klare Leitplanken",
  },
  verantwortungs_stratege: {
    lead:
      "Wenn Entscheidungen mehrere Gruppen betreffen, priorisierst du eher Tragfähigkeit und Zumutbarkeit statt eines schnellen, eindeutigen Durchgriffs.",
    decisionPattern:
      "Du liest Entscheidungen oft darüber, wer den Preis trägt, wie belastbar die Lösung ist und ob sich Härte fair verteilen lässt.",
    uncertaintyPattern:
      "Unter Unsicherheit suchst du eher eine Lösung, die wirtschaftlich trägt, ohne Nebenfolgen still zu verschieben oder Betroffene einfach mitzuziehen.",
    operatingLeverage:
      "Im Alltag kannst du damit aus vagen Wertfragen konkrete Entscheidungsregeln für Team, Kundschaft, Qualität und Zumutbarkeit machen.",
    tensionField:
      "Kritisch wird es, wenn Tempo verlangt wird, während du noch mehrere Folgewirkungen gleichzeitig sauber halten willst.",
    counterweightLabel: "Folgen, Tragfähigkeit und Zumutbarkeit",
  },
  business_pragmatiker: {
    lead:
      "Wenn es darauf ankommt, priorisierst du eher Handlungsfähigkeit, Hebel und wirtschaftliche Wirkung statt langer Grundsatzklärungen.",
    decisionPattern:
      "Du gibst Entscheidungen eher frei, wenn die Richtung trägt, das Zeitfenster offen ist und klar wird, dass der Schritt euch wirklich voranbringt.",
    uncertaintyPattern:
      "Unter Unsicherheit bewegst du dich eher mit einer tragfähigen Richtung nach vorn, statt erst jeden Zielkonflikt vollständig aufzulösen.",
    operatingLeverage:
      "Im Alltag kannst du damit Tempo herstellen, Prioritäten zuspitzen und vage Diskussionen wieder auf Ergebnis, Umsetzbarkeit und Runway zurückführen.",
    tensionField:
      "Kritisch wird es, wenn Nebenfolgen für Vertrauen, Team oder Reputation zu lange als nachgelagertes Problem behandelt werden.",
    counterweightLabel: "Tempo, Hebel und wirtschaftliche Wirkung",
  },
};

export const SELF_VALUES_PAIRING_HINTS: Record<
  `${ValuesArchetypeId}|${ValuesArchetypeId}`,
  string
> = {
  "impact_idealist|impact_idealist":
    "Deine Antworten setzen darin einen ziemlich klaren Schwerpunkt. Unter Druck wirst du Entscheidungen wahrscheinlich eher an Vertretbarkeit und langfristiger Stimmigkeit messen als an bloßer Entlastung.",
  "impact_idealist|verantwortungs_stratege":
    "Zusätzlich hältst du Folgen und Zumutbarkeit stark mit im Blick. Dadurch wirkst du in Zielkonflikten oft nicht absolut, aber auch nicht beliebig.",
  "impact_idealist|business_pragmatiker":
    "Zusätzlich läuft bei dir auch die Frage mit, was im Alltag trägt und wirtschaftlich wirklich funktioniert. Genau das macht Entscheidungen für dich oft anspruchsvoll, aber nicht eindimensional.",
  "verantwortungs_stratege|impact_idealist":
    "Zusätzlich spielen für dich Leitplanken und Vertretbarkeit sichtbar mit. Dadurch liest du Entscheidungen nicht nur über Tragfähigkeit, sondern auch darüber, ob ihr später noch dafür stehen wollt.",
  "verantwortungs_stratege|verantwortungs_stratege":
    "Deine Antworten zeigen hier einen relativ stabilen Schwerpunkt. In schwierigen Lagen wirst du Entscheidungen eher daran prüfen, ob sie mehrere Folgen gleichzeitig tragen können.",
  "verantwortungs_stratege|business_pragmatiker":
    "Zusätzlich läuft bei dir auch die Frage mit, was im Alltag trägt und wirtschaftlich schnell Wirkung zeigt. Das kann hilfreich sein, macht aber die Reihenfolge unter Druck nicht immer sofort eindeutig.",
  "business_pragmatiker|impact_idealist":
    "Zusätzlich hältst du sichtbar mit im Blick, was sich in Grenzfällen noch vertreten lässt. Dadurch bist du nicht nur auf Tempo ausgerichtet, aber du wirst Zielkonflikte meist trotzdem nicht lange offenhalten wollen.",
  "business_pragmatiker|verantwortungs_stratege":
    "Zusätzlich liest du Entscheidungen auch über Folgen, Zumutbarkeit und Tragfähigkeit. Dadurch kippst du nicht automatisch in reine Härte, priorisierst unter Druck aber meist trotzdem eher Handlungsfähigkeit.",
  "business_pragmatiker|business_pragmatiker":
    "Deine Antworten setzen darin einen ziemlich klaren Schwerpunkt. Wenn Druck steigt, wirst du Entscheidungen wahrscheinlich eher danach sortieren, was Wirkung erzeugt und das Unternehmen beweglich hält.",
};
