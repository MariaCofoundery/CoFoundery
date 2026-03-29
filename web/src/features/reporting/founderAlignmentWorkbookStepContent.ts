import { type FounderAlignmentWorkbookStepId } from "@/features/reporting/founderAlignmentWorkbook";

export type WorkbookStructuredOutputField = {
  key: string;
  title: string;
  placeholder: string;
  helperText: string;
  highlight?: boolean;
};

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
    outputFields: [
      {
        key: "priorityRule",
        title: "Priorisierungsregel",
        placeholder:
          "Wenn Umsatzchance, Produktfokus und Aufbau gleichzeitig ziehen, dann hat ... Vorrang.",
        helperText:
          "Schreibt die Reihenfolge klar auf, nach der ihr im Zweifel priorisiert.",
        highlight: true,
      },
      {
        key: "nonFocusRule",
        title: "Nicht-Fokus-Regel",
        placeholder:
          "Wenn eine Anfrage nicht zu eurem Fokus passt, dann sagt ihr ... oder verschiebt sie auf ...",
        helperText:
          "Nennt konkret, was ihr trotz Reiz gerade nicht verfolgt.",
      },
      {
        key: "tradeoffRule",
        title: "Zielkonflikt-Regel",
        placeholder:
          "Wenn ein Thema Umsatz bringt, euch aber vom Kernfokus wegzieht, dann ...",
        helperText:
          "Schreibt auf, wer stoppt, wer entscheidet und was dann Vorrang hat.",
      },
    ],
  },
  roles_responsibility: {
    context: [
      "Klaert hier, wer fuehrt und wann die andere Person mit reinmuss.",
    ],
    everyday:
      "Trigger: Zwei Personen arbeiten am selben Thema oder warten darauf, dass die andere Person es uebernimmt.",
    scenario:
      "Eine Person fuehrt Vertrieb, die andere Produkt. Ein wichtiger Kunde fordert kurzfristig ein Sonderfeature. Beide gehen davon aus, dass die andere Person jetzt fuehrt.",
    riskHint:
      "Sonst wird doppelt gearbeitet, etwas bleibt liegen oder niemand entscheidet rechtzeitig.",
    outputFields: [
      {
        key: "ownershipRule",
        title: "Verantwortungsregel",
        placeholder:
          "Wenn ein Thema in diesen Bereich faellt, dann fuehrt ... . Wenn Budget, Kundenzusage oder Team betroffen sind, dann entscheiden ... gemeinsam. Wenn andere betroffen sind, dann teilt ... das sofort.",
        helperText:
          "Formuliert eine konkrete Arbeitsregel statt einer allgemeinen Rollenbeschreibung.",
        highlight: true,
      },
    ],
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
    outputFields: [
      {
        key: "finalRule",
        title: "Entscheidungsregel",
        placeholder:
          "Wenn die Entscheidung im Verantwortungsbereich liegt, dann entscheidet ... . Wenn Risiko, Budget oder Aussenwirkung groesser werden, dann entscheiden ... gemeinsam. Wenn Zeitdruck da ist und ihr euch nicht einig seid, dann gilt ...",
        helperText:
          "Schreibt eine klare Regel mit Ausloeser und Default statt eines Grundsatzes.",
        highlight: true,
      },
    ],
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
    outputFields: [
      {
        key: "availabilityRule",
        title: "Commitment-Regel",
        placeholder:
          "Wenn alles im Normalmodus laeuft, dann gilt ... . Wenn eine Person an ihre Grenze kommt, dann sagt sie ... sofort. Wenn Zusagen oder Deadlines wackeln, dann wird zuerst ... angepasst.",
        helperText:
          "Schreibt einen klaren Arbeitsmodus plus Entlastungsregel statt einer Absichtserklaerung.",
        highlight: true,
      },
    ],
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
    outputFields: [
      {
        key: "feedbackRule",
        title: "Feedback-Regel",
        placeholder:
          "Wenn mich etwas stoert, dann spreche ich es ... an und nutze dafuer ...",
        helperText:
          "Haltet Timing, Kanal und Ton klar fest.",
        highlight: true,
      },
      {
        key: "conflictRule",
        title: "Konfliktregel",
        placeholder:
          "Wenn ein Thema nach ... noch nicht geloest ist oder wiederkommt, dann gilt es als Konflikt und ...",
        helperText:
          "Nennt einen klaren Ausloeser statt nur ein Gefuehl.",
      },
      {
        key: "resolutionRule",
        title: "Klaerungs- und Eskalationsregel",
        placeholder:
          "Wenn ihr ein Thema im Alltag nicht loest, dann zieht ... die Klaerung und ... passiert als Naechstes.",
        helperText:
          "Schreibt hinein, wer startet, in welchem Rahmen ihr klaert und bis wann.",
      },
    ],
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
    outputFields: [
      {
        key: "riskOwnerRule",
        title: "Risikoverantwortung",
        placeholder:
          "Wenn es um Runway, Technik, Hiring oder Kundenzusagen geht, dann fuehrt ...",
        helperText:
          "Ordnet die wichtigsten Risikotypen klar einer Person zu.",
        highlight: true,
      },
      {
        key: "riskVisibilityRule",
        title: "Sichtbarkeitsregel",
        placeholder:
          "Wenn dieses Signal auftaucht, dann wird das Risiko sofort sichtbar gemacht: ...",
        helperText:
          "Nennt klare Signale wie Schwellenwert, Deadline, Kosten oder Ausfall.",
      },
      {
        key: "riskEscalationRule",
        title: "Eskalations- und Eingriffsregel",
        placeholder:
          "Wenn ein Risiko diese Schwelle erreicht, dann ... und ... entscheiden gemeinsam ueber den naechsten Schritt.",
        helperText:
          "Schreibt die Schwelle und die Folgeentscheidung konkret auf.",
      },
    ],
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
    outputFields: [
      {
        key: "guardrailRule",
        title: "Leitplanken-Regel",
        placeholder:
          "Wenn ein Angebot nicht zu unseren Prinzipien passt, dann ...",
        helperText:
          "Schreibt hinein, woran ihr die Grenze erkennt und was dann gilt.",
        highlight: true,
      },
      {
        key: "greyZoneRule",
        title: "Grauzonen-Regel",
        placeholder:
          "Wenn ein Fall nicht klar falsch, aber auch nicht sauber passend ist, dann ...",
        helperText:
          "Haltet fest, wer prueft, welche Frage zuerst geklaert wird und wann ihr stoppt.",
      },
      {
        key: "pressurePriorityRule",
        title: "Priorisierungsregel unter Druck",
        placeholder:
          "Wenn Wachstum und Prinzipien kollidieren, dann ...",
        helperText:
          "Formuliert eine klare Regel statt einer allgemeinen Haltung.",
      },
    ],
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
    outputFields: [
      {
        key: "focusRule",
        title: "Prioritaeten- und Fokusregel",
        placeholder:
          "Unser Fokus in den naechsten 90 Tagen ist ...",
        helperText:
          "Nennt wenige klare Prioritaeten statt einer langen Liste.",
        highlight: true,
      },
      {
        key: "executionRule",
        title: "Umsetzungs- und Verantwortungsregel",
        placeholder:
          "Wenn neue Themen auftauchen, dann ... und ... bleibt dafuer liegen.",
        helperText:
          "Schreibt hinein, was ihr bewusst nicht mitzieht oder verschiebt.",
      },
      {
        key: "reviewAdjustmentRule",
        title: "Review- und Anpassungsregel",
        placeholder:
          "Fortschritt messen wir daran, dass ...",
        helperText:
          "Nennt ein klares Signal, an dem ihr frueh merkt, ob ihr auf Kurs seid.",
      },
    ],
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
