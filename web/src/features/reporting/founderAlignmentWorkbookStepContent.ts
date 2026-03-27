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
      "Unternehmenslogik ist keine Vision-Uebung, sondern die Regel dafuer, was bei euch im Alltag zuerst Geld, Fokus und Ressourcen bekommt.",
      "Wenn das unklar bleibt, wirkt fast jede neue Chance plausibel und Zielkonflikte werden nicht entschieden, sondern nur je nach Lautstaerke oder Drucklage verschoben.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo neue Kundenwuensche, Vertriebschancen oder Produktideen ploetzlich wichtiger werden als der bisherige Fokus und niemand klar sagt, was dafuer liegen bleiben muss.",
    scenario:
      "Ein grosser Kunde fragt ein Sonderpaket an, das kurzfristig viel Umsatz bringen wuerde. Gleichzeitig wuerde es euer Produktteam fuer Wochen aus dem Kernroadmap-Fokus ziehen. Eine Person will zusagen, die andere den Fokus halten.",
    riskHint:
      "Wenn ihr das nicht klaert, lauft ihr lauteren Chancen hinterher, verwischt euren Fokus und trifft Zielkonflikte jedes Mal neu aus dem Bauch.",
    outputFields: [
      {
        key: "priorityRule",
        title: "Priorisierungsregel",
        placeholder:
          "Nach welcher festen Regel entscheidet ihr, was bei Zielkonflikten Vorrang bekommt?",
        helperText:
          "Zum Beispiel nach Umsatzhebel, Produktfit, Lernwert oder strategischer Passung.",
        highlight: true,
      },
      {
        key: "nonFocusRule",
        title: "Nicht-Fokus-Regel",
        placeholder:
          "Welche Art von Chancen, Anfragen oder Ideen lehnt ihr bewusst ab oder verschiebt sie trotz Reiz?",
        helperText:
          "Nicht 'wir bleiben fokussiert', sondern was konkret gerade nicht verfolgt wird.",
      },
      {
        key: "tradeoffRule",
        title: "Zielkonflikt-Regel",
        placeholder:
          "Was passiert konkret, wenn Umsatz, Tempo und Aufbau in verschiedene Richtungen ziehen?",
        helperText:
          "Hilfreich ist eine If/Then-Regel mit Ausloeser und finalem Stop- oder Go-Punkt.",
      },
    ],
  },
  roles_responsibility: {
    context: [
      "Rollen und Verantwortung sind keine Organigramm-Frage, sondern eine Betriebsregel dafuer, wer Themen fuehrt, was sichtbar bleiben muss und wo Rueckkopplung Pflicht ist.",
      "Wenn das unscharf bleibt, wird Arbeit doppelt gemacht, Verantwortung weitergereicht oder kritische Themen bleiben genau zwischen euch liegen.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo zwei Personen parallel an demselben Thema arbeiten, Entscheidungen im Kreis laufen oder niemand klar sagen kann, wer etwas jetzt wirklich zieht.",
    scenario:
      "Eine Person fuehrt Vertrieb und Kundengespraeche, die andere Produkt und Delivery. Ein wichtiger Kunde fordert kurzfristig ein Sonderfeature. Beide gehen davon aus, dass die andere Person die Federfuehrung uebernimmt.",
    riskHint:
      "Wenn ihr das nicht klaert, entstehen Doppelarbeit, Luecken in der Verantwortung und Entscheidungen, die entweder niemand trifft oder zwei Personen gleichzeitig treiben.",
    outputFields: [
      {
        key: "ownershipRule",
        title: "Ownership-Regel",
        placeholder:
          "Wer fuehrt welchen Bereich verbindlich und woran erkennt ihr im Alltag, dass die Verantwortung dort liegt?",
        helperText:
          "Schreibt keine Rollenbeschreibung, sondern eine klare Zuordnung mit sichtbarem Verantwortungsraum.",
        highlight: true,
      },
      {
        key: "decisionBoundary",
        title: "Freigabegrenze",
        placeholder:
          "Bei welchen Entscheidungen reicht die Federfuehrung allein und ab wann ist gemeinsame Freigabe Pflicht?",
        helperText:
          "Hilfreich sind Schwellen wie Budget, Personalauswirkung, Kundenzusage oder strategische Relevanz.",
      },
      {
        key: "reviewRule",
        title: "Review- und Rueckkopplungsregel",
        placeholder:
          "Welche Informationen muessen aktiv gespiegelt werden und in welchem Rhythmus oder bei welchem Trigger?",
        helperText:
          "Nicht 'wir halten uns auf dem Laufenden', sondern wer wen wann aktiv informiert.",
      },
    ],
  },
  decision_rules: {
    context: [
      "Entscheidungsregeln sind keine Haltungsfrage, sondern Betriebslogik: Wer entscheidet was, was braucht gemeinsame Freigabe und was gilt, wenn Tempo wichtiger wird als Vollstaendigkeit.",
      "Wenn das unklar bleibt, entstehen keine offenen Grundsatzdebatten, sondern stille Vetos, doppelte Absicherung und Entscheidungen, die zu spaet oder nur halb getragen fallen.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo Launches, Hiring oder Prioritaeten haengen bleiben, weil unklar ist, wer final entscheidet, welcher Default unter Druck gilt und wann Diskussion aufhoeren muss.",
    scenario:
      "Ihr seid euch uneinig, ob ihr ein Feature in zwei Wochen launcht oder erst nach zwei offenen Risiken. Eine Person will das Marktfenster nutzen, die andere erst live gehen, wenn Support-Last und technisches Risiko besser abgesichert sind.",
    riskHint:
      "Wenn ihr das nicht klaert, entstehen stille Vetos, doppelte Absicherung und Entscheidungen, die entweder zu spaet fallen oder hinterher niemand wirklich traegt.",
    outputFields: [
      {
        key: "finalRule",
        title: "Finale Entscheidungsregel",
        placeholder:
          "Formuliere eine klare If/Then-Regel statt eines Grundsatzes.",
        helperText:
          "Zum Beispiel nach Verantwortungsbereich, Risikotyp oder Entscheidungshoehe.",
        highlight: true,
      },
      {
        key: "defaultRule",
        title: "Default unter Druck",
        placeholder:
          "Welche Frist, welcher Risikograd oder welcher Datenstand loest euren Default unter Druck aus?",
        helperText:
          "Nicht nur schnell entscheiden, sondern wann genau direkt entschieden, getestet oder vertagt wird.",
      },
      {
        key: "escalationRule",
        title: "Eskalationsregel",
        placeholder:
          "Woran ist sichtbar, dass Diskussion endet und Eskalation beginnt?",
        helperText:
          "Zum Beispiel nach zwei Schleifen ohne Ergebnis, blockierter Umsetzung oder Termin- bzw. Budgetrisiko.",
      },
    ],
  },
  commitment_load: {
    context: [
      "Commitment und Belastung sind keine Fairnessdebatte, sondern eine Arbeitsregel zu Verfuegbarkeit, Einsatzniveau und Ausnahmephasen.",
      "Wenn Erwartungen unausgesprochen bleiben, werden Zusagen unterschiedlich gelesen und Enttaeuschung taucht spaeter oft als stiller Vorwurf wieder auf.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo eine Person schneller reagiert, laenger zieht oder mehr auffaengt und nie klar ist, ob das gerade Ausnahme, neuer Standard oder schon Ueberlast ist.",
    scenario:
      "In den naechsten sechs Wochen stehen Fundraising, ein Produktrelease und zwei Kundentermine an. Eine Person kann wegen Familie oder Nebenjob deutlich weniger spontan einspringen. Die andere geht trotzdem von vollem Einsatz aus.",
    riskHint:
      "Wenn ihr das nicht klaert, entstehen stille Erwartungen, unausgesprochene Ueberlast und das Gefuehl, dass Zusagen oder Einsatz nicht gleich viel wert sind.",
    outputFields: [
      {
        key: "availabilityRule",
        title: "Verfuegbarkeitsregel",
        placeholder:
          "Was ist euer normaler Arbeitsmodus bei Zeit, Erreichbarkeit und Reaktionszeit?",
        helperText:
          "Nennt ein Mindestniveau statt 'so gut es geht'.",
        highlight: true,
      },
      {
        key: "exceptionRule",
        title: "Ausnahmephasen-Regel",
        placeholder:
          "Wann gilt mehr oder weniger Einsatz voruebergehend als vereinbart und wie werden Anfang und Ende dieser Phase markiert?",
        helperText:
          "Schreibt Anlass, Dauer und Rueckkehr zum Normalmodus mit hinein.",
      },
      {
        key: "reliefRule",
        title: "Entlastungsregel",
        placeholder:
          "Was passiert konkret, wenn eine Person ausfaellt, ueberlastet ist oder Zusagen nicht halten kann?",
        helperText:
          "Wichtig ist, wer priorisiert, was faellt und wann neu entschieden wird.",
      },
    ],
  },
  collaboration_conflict: {
    context: [
      "Zusammenarbeit und Konflikt sind keine Frage von Harmonie, sondern eine Regel dafuer, wie Irritationen, Feedback und Reibung bearbeitet werden, bevor sie Leistung kosten.",
      "Wenn das offen bleibt, werden Konflikte selten gross angekuendigt; sie zeigen sich eher in Ausweichen, schaerferen Toenen, zaeher Abstimmung oder aufgeschobenen Entscheidungen.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo Rueckmeldungen zu spaet kommen, Kritik als Eingriff landet oder dieselbe Spannung in mehreren Meetings wieder auftaucht.",
    scenario:
      "Eine Person gibt sehr direkt Feedback und spricht Probleme sofort an. Die andere braucht erst Kontext und erlebt den Ton schnell als Eingriff. Nach zwei angespannten Meetings wird Kritik gar nicht mehr sauber ausgesprochen, sondern nur noch zwischen den Zeilen.",
    riskHint:
      "Wenn ihr das nicht klaert, bleiben Spannungen liegen, Feedback wird vorsichtiger oder haerter als noetig und Konflikte verlagern sich in Alltag und Entscheidungen.",
    outputFields: [
      {
        key: "feedbackRule",
        title: "Feedback-Regel",
        placeholder:
          "Wie und in welchem Rahmen gebt ihr kritisches Feedback, damit es klar und bearbeitbar bleibt?",
        helperText:
          "Hilfreich sind Regeln zu Timing, Kanal und Direktheit.",
        highlight: true,
      },
      {
        key: "conflictRule",
        title: "Konfliktregel",
        placeholder:
          "Wann gilt eine Spannung nicht mehr als normale Reibung, sondern als Konflikt, der bewusst geklaert werden muss?",
        helperText:
          "Nennt beobachtbare Trigger statt nur 'wenn es ernst wird'.",
      },
      {
        key: "resolutionRule",
        title: "Klaerungs- und Eskalationsregel",
        placeholder:
          "Wie laeuft eine Klaerung konkret ab und wer zieht sie, wenn sie sonst liegen bleiben wuerde?",
        helperText:
          "Schreibt Format, Frist und naechsten Schritt hinein.",
      },
    ],
  },
  ownership_risk: {
    context: [
      "Ownership und Risiko sind keine abstrakte Verantwortungsgeste, sondern die Regel dafuer, wer welche Risiken fuehrt, sichtbar macht und wann aktiv eingegriffen wird.",
      "Wenn das offen bleibt, werden Risiken zu lange beobachtet, unterschiedlich bewertet oder erst dann gemeinsam besprochen, wenn sie schon teuer, persoenlich oder schwer rueckholbar geworden sind.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo Runway knapper wird, technische oder personelle Risiken laenger offen bleiben oder Zusagen gemacht werden, ohne dass klar ist, wer das Risiko dafuer wirklich traegt.",
    scenario:
      "Der Runway wird enger, gleichzeitig steht eine groessere Produktwette im Raum. Eine Person will kuerzer auf Sicht fahren und Kosten senken, die andere das Risiko bewusst eingehen, um die Marktchance nicht zu verlieren. Niemand hat sauber festgelegt, wer bei welchem Risikotyp fuehrt.",
    riskHint:
      "Wenn ihr das nicht klaert, werden Risiken zu spaet sichtbar, unterschiedlich bewertet oder zwischen euch hin- und hergeschoben, bis nur noch Notfallentscheidungen bleiben.",
    outputFields: [
      {
        key: "riskOwnerRule",
        title: "Risikoverantwortung",
        placeholder:
          "Wer fuehrt welchen Risikotyp verbindlich und woran ist sichtbar, dass die Verantwortung dort liegt?",
        helperText:
          "Zum Beispiel getrennt nach Runway, Technik, Hiring, Kundenzusage oder persoenlicher Belastung.",
        highlight: true,
      },
      {
        key: "riskVisibilityRule",
        title: "Sichtbarkeitsregel",
        placeholder:
          "Welche Risiken muessen ab welchem Signal sofort sichtbar gemacht werden - auch ohne fertige Loesung?",
        helperText:
          "Nennt Trigger wie Schwellenwert, Terminrisiko, Kosten oder Ausfallwahrscheinlichkeit.",
      },
      {
        key: "riskEscalationRule",
        title: "Eskalations- und Eingriffsregel",
        placeholder:
          "Ab wann wird ein Risiko aktiv neu entschieden, begrenzt oder gestoppt?",
        helperText:
          "Wichtig sind Ausloeser, zustaendige Person und konkrete Folgeentscheidung.",
      },
    ],
  },
  values_guardrails: {
    context: [
      "Werte und Leitplanken sind hier keine Selbstaussage, sondern die Regel dafuer, welche Grauzonen ihr wie entscheidet und wo Ergebnisdruck fuer euch bewusst begrenzt bleibt.",
      "Wenn das offen bleibt, wirken Werte nur so lange klar, bis Umsatzdruck, Runway oder eine grosse Chance auf dem Tisch liegen und ploetzlich jede Ausnahme plausibel klingt.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo ein starker Deal, ein schwieriger Partner oder eine knappe Lage euch zu Schritten verleitet, die ihr im ruhigen Zustand enger bewertet haettet.",
    scenario:
      "Ein grosser Vertriebspartner bringt euch sofort Reichweite und Umsatz, arbeitet aber mit Methoden, die ihr gegenueber Kund:innen und Team nur schwer sauber vertreten koennt. Eine Person will die Chance nutzen, die andere fuerchtet, dass ihr damit eure eigene Linie schleichend verschiebt.",
    riskHint:
      "Wenn ihr das nicht klaert, verschiebt ihr Leitplanken situativ, rechtfertigt Ausnahmen im Einzelfall und streitet spaeter nicht mehr ueber den Schritt selbst, sondern ueber eure ganze Linie.",
    outputFields: [
      {
        key: "guardrailRule",
        title: "Leitplanken-Regel",
        placeholder:
          "Welche Grenze prueft ihr bei kritischen Entscheidungen immer zuerst, auch wenn die Chance gross ist?",
        helperText:
          "Schreibt eine echte Leitplanke mit Ausloeser hinein, nicht nur einen Wertbegriff.",
        highlight: true,
      },
      {
        key: "greyZoneRule",
        title: "Grauzonen-Regel",
        placeholder:
          "Wie geht ihr mit Faellen um, die nicht klar falsch, aber auch nicht sauber stimmig sind?",
        helperText:
          "Wichtig ist, wer prueft, welche Fragen gestellt werden und wann ein Schritt verworfen wird.",
      },
      {
        key: "pressurePriorityRule",
        title: "Priorisierungsregel unter Druck",
        placeholder:
          "Wann darf wirtschaftlicher Druck Vorrang bekommen und wann gerade nicht?",
        helperText:
          "Formuliert eine enge Ausnahme oder ein klares Verbot statt eines allgemeinen Vorsatzes.",
      },
    ],
  },
  alignment_90_days: {
    context: [
      "Entscheidungen bringen nur etwas, wenn daraus in den naechsten Wochen klare Prioritaeten, Verantwortungen und Reviewpunkte werden.",
      "Ohne diesen Uebersetzungsschritt bleibt ein gutes Alignment schnell ein sauberes Dokument, waehrend der Alltag wieder nach Lautstaerke, Tempo und Zufall priorisiert.",
    ],
    everyday:
      "Im Alltag merkt ihr das dort, wo gute Vereinbarungen zwar im Gespraech klar waren, nach zwei Wochen aber niemand mehr sagen kann, was gerade Vorrang hat, wer fuehrt und wann ihr den Stand gemeinsam prueft.",
    scenario:
      "Ihr habt nach dem Report mehrere gute Vereinbarungen getroffen. Zwei Wochen spaeter zieht das Tagesgeschaeft wieder an, neue Themen kommen auf den Tisch und ihr merkt, dass nicht klar ist, welche drei Punkte jetzt wirklich Prioritaet haben und wann ihr gemeinsam nachschaerft.",
    riskHint:
      "Wenn ihr das nicht klaert, bleibt das Workbook ein gutes Protokoll, aber kein Arbeitsmodus. Prioritaeten verrutschen, Verantwortung wird unklar und Review passiert erst, wenn Frust oder Verzug schon sichtbar sind.",
    outputFields: [
      {
        key: "focusRule",
        title: "Prioritaeten- und Fokusregel",
        placeholder:
          "Welche Themen haben in den naechsten 90 Tagen klar Vorrang und was wird dafuer bewusst nicht parallel hochgezogen?",
        helperText:
          "Nennt echte Prioritaeten mit Verzicht, nicht nur eine Wunschliste.",
        highlight: true,
      },
      {
        key: "executionRule",
        title: "Umsetzungs- und Verantwortungsregel",
        placeholder:
          "Wer fuehrt welches Thema, welche ersten Schritte muessen sichtbar werden und woran erkennt ihr Bewegung?",
        helperText:
          "Wichtig sind Verantwortung, erste Frist und ein beobachtbares Fortschrittssignal.",
      },
      {
        key: "reviewAdjustmentRule",
        title: "Review- und Anpassungsregel",
        placeholder:
          "Wann prueft ihr gemeinsam den Stand und was passiert, wenn Prioritaeten kippen oder Vereinbarungen nicht greifen?",
        helperText:
          "Schreibt Rhythmus, Trigger und konkrete Nachsteuerung hinein.",
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
