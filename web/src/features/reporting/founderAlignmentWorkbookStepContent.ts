import {
  type FounderAlignmentWorkbookStepId,
  type WorkbookPilotFieldBlock,
  type WorkbookStructuredOutputType,
} from "@/features/reporting/founderAlignmentWorkbook";

export type WorkbookStructuredOutputField = {
  key: WorkbookStructuredOutputType;
  title: string;
  placeholder: string;
  helperText: string;
  outputType: WorkbookStructuredOutputType;
  highlight?: boolean;
  required?: boolean;
  markerSensitive?: boolean;
  block?: WorkbookPilotFieldBlock;
};

function createStructuredOutputFields(config: {
  principle: { placeholder: string; helperText: string; highlight?: boolean };
  operatingRule: { placeholder: string; helperText: string; highlight?: boolean };
  escalationRule: { placeholder: string; helperText: string; highlight?: boolean };
  boundaryRule: { placeholder: string; helperText: string; highlight?: boolean };
  reviewTrigger: { placeholder: string; helperText: string; highlight?: boolean };
}): WorkbookStructuredOutputField[] {
  return [
    {
      key: "principle",
      title: "Leitprinzip",
      outputType: "principle",
      block: "core_rule",
      markerSensitive: true,
      ...config.principle,
    },
    {
      key: "operatingRule",
      title: "Arbeitsregel",
      outputType: "operatingRule",
      block: "core_rule",
      markerSensitive: true,
      ...config.operatingRule,
    },
    {
      key: "escalationRule",
      title: "Eskalationsregel",
      outputType: "escalationRule",
      block: "escalation_rule",
      markerSensitive: true,
      ...config.escalationRule,
    },
    {
      key: "boundaryRule",
      title: "Grenzregel",
      outputType: "boundaryRule",
      block: "escalation_rule",
      markerSensitive: true,
      ...config.boundaryRule,
    },
    {
      key: "reviewTrigger",
      title: "Review-Trigger",
      outputType: "reviewTrigger",
      block: "trigger",
      markerSensitive: true,
      ...config.reviewTrigger,
    },
  ];
}

export const WORKBOOK_STEP_CONTENT: Record<
  FounderAlignmentWorkbookStepId,
  {
    context: string[];
    everyday: string;
    scenario?: string;
    riskHint?: string;
    outputFields?: WorkbookStructuredOutputField[];
  }
> = {
  vision_direction: {
    context: [
      "Klaert hier, was im Alltag wirklich Vorrang bekommt.",
      "Trigger: Umsatzchance, Produktfokus und Aufbau ziehen gleichzeitig in verschiedene Richtungen.",
    ],
    everyday:
      "Ihr merkt das dort, wo eine gute Anfrage ploetzlich alles andere nach hinten schiebt und niemand klar sagt, was dafuer liegen bleibt.",
    scenario:
      "Ein grosser Kunde fragt ein Sonderpaket an, das kurzfristig viel Umsatz bringen wuerde. Gleichzeitig wuerde es euer Produktteam fuer Wochen vom Kernprodukt abziehen. Eine Person will zusagen, die andere den Fokus halten.",
    riskHint:
      "Wenn das offen bleibt, jagt ihr den lauteren Chancen hinterher und entscheidet Zielkonflikte jedes Mal neu.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Bevor ihr eine Chance verfolgt, prueft ihr sie zuerst gegen euren Kernfokus und gegen ...",
        helperText:
          "Haltet den Grundsatz fest, an dem ihr strategische Chancen zuerst spiegelt.",
      },
      operatingRule: {
        placeholder:
          "Wenn Umsatzchance, Produktfokus und Aufbau gleichzeitig ziehen, dann hat ... Vorrang.",
        helperText:
          "Schreibt die Reihenfolge klar auf, nach der ihr im Zweifel priorisiert.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn ihr dieselbe Chance unterschiedlich lest, dann stoppt ... zuerst und ... entscheiden bis ...",
        helperText:
          "Schreibt auf, wer stoppt, wer entscheidet und in welchem Rahmen ihr eskaliert.",
      },
      boundaryRule: {
        placeholder:
          "Auch wenn eine Chance kurzfristig hilft, verfolgt ihr sie nicht weiter, wenn ...",
        helperText:
          "Nennt konkret, wo ihr trotz Reiz nicht weitergeht.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr prueft Fokus und Priorisierung bewusst neu, wenn ...",
        helperText:
          "Nennt ein sichtbares Signal statt eines vagen Gefuehls.",
      },
    }),
  },
  roles_responsibility: {
    context: [
      "Klaert hier, wer fuehrt und wann die andere Person mit reinmuss.",
    ],
    everyday:
      "Ihr merkt das dort, wo zwei Personen gleichzeitig an demselben Thema ziehen oder beide erwarten, dass die andere Person jetzt fuehrt.",
    scenario:
      "Eine Person fuehrt Vertrieb, die andere Produkt. Ein wichtiger Kunde fordert kurzfristig ein Sonderfeature. Beide gehen davon aus, dass die andere Person jetzt fuehrt.",
    riskHint:
      "Sonst wird doppelt gearbeitet, etwas bleibt liegen oder niemand entscheidet rechtzeitig.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich fuehrt die Person, die fuer ... verantwortlich ist. Mitsicht braucht es immer dann, wenn ...",
        helperText:
          "Formuliert den Grundsatz, nach dem ihr Ownership und Mitsicht trennt.",
      },
      operatingRule: {
        placeholder:
          "Wenn ein Thema in diesen Bereich faellt, dann fuehrt ... und macht ... spaetestens sichtbar.",
        helperText:
          "Schreibt eine konkrete Arbeitsregel statt einer allgemeinen Rollenbeschreibung.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn unklar wird, wer fuehrt oder zwei Personen gleichzeitig ziehen, dann ...",
        helperText:
          "Legt fest, wie ihr Ownership-Konflikte schnell klaert.",
      },
      boundaryRule: {
        placeholder:
          "Allein entscheiden darf die fuehrende Person nur bis ... . Spaetestens ab ... muessen beide rein.",
        helperText:
          "Nennt die Grenze zwischen Autonomie und gemeinsamer Entscheidung.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr schaut auf diese Regel erneut, wenn Aufgaben doppelt laufen, haengen bleiben oder ...",
        helperText:
          "Nennt ein klares Signal, dass eure Ownership-Regel gerade nicht mehr traegt.",
      },
    }),
  },
  decision_rules: {
    context: [
      "Klaert hier, wer entscheidet und was unter Druck gilt.",
    ],
    everyday:
      "Trigger: Eine Entscheidung haengt, weil niemand klar den letzten Schritt macht.",
    scenario:
      "Ihr seid uneinig, ob ein Feature in zwei Wochen live geht oder erst nach zwei offenen Risiken. Eine Person will das Marktfenster nutzen, die andere erst mit mehr Absicherung live gehen.",
    riskHint:
      "Sonst dreht ihr euch zu lange im Kreis oder zieht eine Entscheidung spaeter wieder in Zweifel.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich entscheidet die fuehrende Person allein, solange ...",
        helperText:
          "Formuliert den Grundsatz, nach dem ihr Einzel- und Gemeinsamentscheidungen trennt.",
      },
      operatingRule: {
        placeholder:
          "Wenn die Entscheidung im Verantwortungsbereich liegt, dann entscheidet ... . Wenn Risiko, Budget oder Aussenwirkung groesser werden, dann ...",
        helperText:
          "Schreibt eine klare Regel mit Ausloeser statt eines Grundsatzes.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn ihr bis ... nicht einig seid oder Zeitdruck steigt, dann ...",
        helperText:
          "Schreibt eine echte Deadlock- oder Fristregel auf, nicht nur 'weiter reden'.",
      },
      boundaryRule: {
        placeholder:
          "Spaetestens ab ... entscheidet niemand mehr allein, weil ...",
        helperText:
          "Haltet fest, ab welcher Auswirkung ihr gemeinsam entscheiden muesst.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr prueft diese Entscheidungsregel erneut, wenn Entscheidungen ...",
        helperText:
          "Nennt ein Signal, ab dem die Regel zu viel Reibung oder Rueckholschleifen erzeugt.",
      },
    }),
  },
  commitment_load: {
    context: [
      "Klaert hier, was im Alltag realistisch ist und was passiert, wenn es zu viel wird.",
    ],
    everyday:
      "Trigger: Eine Person reagiert spaeter, sagt seltener zu oder kann nicht mehr alles halten.",
    scenario:
      "In den naechsten sechs Wochen stehen Fundraising, Release und Kundentermine an. Eine Person kann wegen Familie oder Nebenjob deutlich weniger spontan einspringen. Die andere rechnet trotzdem mit vollem Einsatz.",
    riskHint:
      "Sonst wird Ueberlast erst sichtbar, wenn Zusagen wackeln oder Frust da ist.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich sprecht ihr Belastung frueh an, sobald ...",
        helperText:
          "Formuliert den Grundsatz, nach dem Verfuegbarkeit und Belastung sichtbar werden sollen.",
      },
      operatingRule: {
        placeholder:
          "Im Normalmodus gilt bei Verfuegbarkeit, Reaktionszeit und Einsatz ...",
        helperText:
          "Schreibt auf, was ihr im Alltag realistisch voneinander erwartet.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn Zusagen oder Kapazitaet wackeln, dann wird zuerst ... angepasst und ... sofort informiert.",
        helperText:
          "Schreibt auf, was konkret als Erstes neu priorisiert wird.",
      },
      boundaryRule: {
        placeholder:
          "Wenn Verfuegbarkeit oder Belastung diese Grenze erreichen, dann stoppt ... oder geht nicht mehr parallel weiter.",
        helperText:
          "Nennt den Punkt, ab dem ihr nicht einfach so weitermacht.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr merkt frueh, dass Belastung kippt oder neu verhandelt werden muss, wenn ...",
        helperText:
          "Nennt ein sichtbares Signal statt nur ein Gefuehl.",
      },
    }),
  },
  collaboration_conflict: {
    context: [
      "Klaert hier, wann ihr etwas ansprecht, wie ihr es ansprecht und was passiert, wenn es offen bleibt.",
      "Trigger: Kritik bleibt liegen, Gespraeche werden schaerfer oder dieselbe Reibung taucht mehrmals auf.",
    ],
    everyday:
      "Ihr merkt das dort, wo Rueckmeldungen zu spaet kommen, Kritik als Angriff landet oder dieselbe Spannung in mehreren Meetings wieder auftaucht.",
    scenario:
      "Eine Person spricht Probleme sofort und direkt an. Die andere braucht erst Kontext und erlebt den Ton schnell als Angriff. Nach zwei angespannten Meetings wird Kritik nur noch zwischen den Zeilen geaeussert.",
    riskHint:
      "Wenn das offen bleibt, bleiben Konflikte liegen und bremsen eure Zusammenarbeit an immer mehr Stellen.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich sprecht ihr Irritationen an, sobald ...",
        helperText:
          "Legt fest, was fuer euch eine klaerungsbeduerftige Reibung ist.",
      },
      operatingRule: {
        placeholder:
          "Wenn mich etwas stoert, dann spreche ich es ... an und nutze dafuer ...",
        helperText:
          "Haltet Timing, Kanal und Ton klar fest.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn ein Thema im Alltag nicht geloest wird oder wiederkommt, dann ...",
        helperText:
          "Schreibt hinein, wie ihr aus Alltagsreibung in einen klaren Klaerungsrahmen wechselt.",
      },
      boundaryRule: {
        placeholder:
          "Spaetestens wenn ..., bleibt ein Konflikt nicht mehr im Tagesgeschaeft, sondern ...",
        helperText:
          "Nennt die Grenze, ab der ihr nicht mehr nur weiterarbeitet.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr prueft eure Konfliktregel neu, wenn Feedback liegen bleibt, Gespraeche schaerfer werden oder ...",
        helperText:
          "Nennt das Signal, dass eure bisherige Form der Klaerung nicht mehr funktioniert.",
      },
    }),
  },
  ownership_risk: {
    context: [
      "Klaert hier, wer welches Risiko fuehrt, wann es sichtbar wird und ab wann ihr eingreift.",
      "Trigger: Runway, Hiring, Technik oder Kundenzusagen werden kritisch und niemand weiss, wer jetzt fuehrt.",
    ],
    everyday:
      "Ihr merkt das dort, wo ein Risiko laenger offen bleibt, unterschiedlich bewertet wird oder erst spaet auf den Tisch kommt.",
    scenario:
      "Der Runway wird enger, gleichzeitig steht eine groessere Produktwette im Raum. Eine Person will Kosten senken, die andere die Marktchance nutzen. Niemand hat sauber festgelegt, wer bei welchem Risiko fuehrt und ab wann ihr gemeinsam eingreift.",
    riskHint:
      "Wenn das offen bleibt, werden Risiken zu spaet sichtbar und ihr landet erst im Notfall in einer gemeinsamen Entscheidung.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich fuehrt bei Runway, Technik, Hiring oder Kundenzusagen die Person, die ...",
        helperText:
          "Formuliert den Grundsatz, nach dem ihr Risiko-Fuehrung zuordnet.",
      },
      operatingRule: {
        placeholder:
          "Wenn ein Risiko in diesen Bereich faellt, dann beobachtet ... es aktiv und macht ... sichtbar.",
        helperText:
          "Ordnet die wichtigsten Risikotypen klar einer Person zu.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn ein Risiko eine kritische Schwelle erreicht, dann ... und ... entscheiden gemeinsam ueber den naechsten Schritt.",
        helperText:
          "Schreibt die Eingriffsregel fuer den kritischen Fall auf.",
      },
      boundaryRule: {
        placeholder:
          "Spaetestens ab ... geht ihr nicht mehr einfach weiter, sondern stoppt / begrenzt / entscheidet neu.",
        helperText:
          "Nennt die konkrete Schwelle, ab der Risiko nicht mehr nur beobachtet wird.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr prueft diese Risikoregel erneut, wenn ...",
        helperText:
          "Nennt das Signal, an dem ihr frueh merkt, dass euer bisheriger Rahmen nicht mehr reicht.",
      },
    }),
  },
  values_guardrails: {
    context: [
      "Klaert hier, wo ihr im Alltag nein sagt und welche Grenze nicht verhandelbar ist.",
      "Trigger: Geld, Wachstum oder Druck machen einen Schritt attraktiv, der nicht sauber zu euren Prinzipien passt.",
    ],
    everyday:
      "Ihr merkt das dort, wo ein starker Deal, ein schwieriger Partner oder eine knappe Lage ploetzlich Ausnahmen plausibel wirken laesst.",
    scenario:
      "Ein grosser Vertriebspartner bringt euch sofort Reichweite und Umsatz, arbeitet aber mit Methoden, die ihr gegenueber Kund:innen und Team kaum sauber vertreten koennt. Eine Person will die Chance nutzen, die andere die Linie halten.",
    riskHint:
      "Sonst entscheidet ihr in Grenzsituationen jedes Mal neu und verschiebt eure Grenze Schritt fuer Schritt.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich entscheidet ihr gegen Geld oder Wachstum, wenn ...",
        helperText:
          "Haltet die uebergeordnete Leitplanke fest, die nicht verhandelbar werden soll.",
      },
      operatingRule: {
        placeholder:
          "Wenn ein Angebot attraktiv ist, aber nicht sauber passt, dann prueft ihr zuerst ...",
        helperText:
          "Formuliert eure Regel fuer den Normalfall statt nur eine allgemeine Haltung.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn ihr eine Grauzone unterschiedlich beurteilt oder Druck steigt, dann ...",
        helperText:
          "Legt fest, wie ihr in heiklen Faellen stoppt, klaert oder eskaliert.",
      },
      boundaryRule: {
        placeholder:
          "Diese Grenze ueberschreitet ihr nicht, auch wenn sie euch kurzfristig helfen wuerde: ...",
        helperText:
          "Schreibt die rote Linie explizit auf.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr schaut auf diese Leitplanke erneut, wenn ...",
        helperText:
          "Nennt das Signal, dass eine Ausnahmesituation euren bisherigen Rahmen testet.",
      },
    }),
  },
  alignment_90_days: {
    context: [
      "Klaert hier, was in den naechsten 90 Tagen wirklich Vorrang hat.",
      "Trigger: Zu viele Themen wirken sinnvoll und niemand sagt klar, was zuerst zaehlt und was bewusst liegen bleibt.",
    ],
    everyday:
      "Ihr merkt das dort, wo nach zwei Wochen wieder zu viele Themen gleichzeitig laufen und der Fokus unscharf wird.",
    scenario:
      "Nach dem Report habt ihr mehrere gute Themen auf dem Tisch. Zwei Wochen spaeter zieht das Tagesgeschaeft wieder an, neue Ideen kommen dazu und ihr merkt, dass jede Person etwas anderes zuerst ziehen wuerde.",
    riskHint:
      "Sonst verliert ihr Fokus und arbeitet parallel an zu vielen Themen.",
    outputFields: createStructuredOutputFields({
      principle: {
        placeholder:
          "Grundsaetzlich schuetzt ihr den 90-Tage-Fokus, indem ...",
        helperText:
          "Formuliert den Grundsatz, nach dem ihr neue Themen gegen euren Fokus haltet.",
      },
      operatingRule: {
        placeholder:
          "In den naechsten 90 Tagen haben diese Themen Vorrang: ...",
        helperText:
          "Nennt wenige klare Prioritaeten statt einer langen Liste.",
        highlight: true,
      },
      escalationRule: {
        placeholder:
          "Wenn neue Themen auftauchen oder Prioritaeten kippen, dann ...",
        helperText:
          "Legt fest, wie ihr Fokus veraendert statt ihn schleichend zu verlieren.",
      },
      boundaryRule: {
        placeholder:
          "Bewusst nicht ziehen werdet ihr in diesem Zeitraum ...",
        helperText:
          "Schreibt auf, was in diesem Zyklus nicht noch zusaetzlich gestartet wird.",
      },
      reviewTrigger: {
        placeholder:
          "Ihr prueft diesen 90-Tage-Fokus neu, wenn ...",
        helperText:
          "Nennt ein klares Signal, an dem ihr Fortschritt oder Fokusverlust frueh erkennt.",
      },
    }),
  },
  advisor_closing: {
    context: [
      "Am Ende einer Alignment-Session kann eine neutrale dritte Perspektive oft noch einmal besonders klar sichtbar machen, wo Muster, offene Spannungen oder gute Ansatzpunkte liegen.",
      "Dieser Abschlussblock ersetzt keine Founder-Vereinbarungen, sondern ordnet das Gespraech als zusaetzliche Beobachtung, Rueckfrage und Empfehlung ein.",
    ],
    everyday:
      "Im Alltag ist das vor allem dann hilfreich, wenn ein Advisor rote Faeden, ungeklaerte Punkte oder konkrete naechste Schritte benoennen kann, bevor sie zwischen Meeting und Umsetzung wieder verschwimmen.",
  },
};
