import { FOUNDER_ALIGNMENT_WORKBOOK_STEPS } from "@/features/reporting/founderAlignmentWorkbook";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import type { WorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

export const WORKBOOK_CONTENT_DE: WorkbookContent = {
  steps: FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  stepContent: WORKBOOK_STEP_CONTENT,
  premiumWorkflow: {
    readyText:
      "Ihr habt beide eure Perspektive eingebracht. Im naechsten Schritt koennt ihr die Punkte gemeinsam einordnen.",
    advisorReadyText: "Beide Founder haben ihre Perspektive eingebracht.",
    missingPerspectiveText: (missingLabel) =>
      `Bevor ihr gemeinsam weiterarbeitet, fehlt noch die Perspektive von ${missingLabel}.`,
    approval: {
      title: "Diese Fassung bestaetigen",
      intro:
        "Prueft die aktuelle Fassung noch einmal. Bestaetigt sie, wenn sie das festhaelt, worauf ihr euch fuer diesen Punkt verstaendigt habt.",
      confirmButton: "Ich bestaetige diese Fassung",
      withdrawButton: "Bestaetigung zuruecknehmen",
    },
    guidedFlow: {
      collectIntro:
        "Bringt zunaechst eure Perspektiven ein. Ihr muesst euch hier noch nicht auf eine gemeinsame Formulierung einigen.",
      weightingIntro: "Schaut euch die eingebrachten Punkte an und ordnet sie jeweils fuer euch ein.",
      ruleIntro:
        "Formuliert anschliessend, was ihr fuer diesen Punkt konkret festhalten wollt. Die aktuelle Fassung soll eure Vereinbarung verstaendlich festhalten und kann spaeter angepasst werden.",
    },
    sectionTitles: {
      collect: "1. Perspektiven sammeln",
      weighting: "2. Punkte einordnen",
      rule: "3. Vereinbarung festhalten",
    },
    sharedSpace: {
      collaborativeFounder:
        "Ihr arbeitet im selben Raum. Eigene Punkte bleiben editierbar; auf fremde Punkte koennt ihr mit einer Einordnung oder einem eigenen Beitrag reagieren.",
      soloFounder:
        "Du beginnst mit deiner Perspektive. Die andere Person kann spaeter eigene Punkte ergaenzen und vorhandene Punkte einordnen.",
      advisor:
        "Hier siehst du die bisher eingebrachten Founder-Perspektiven. Die Beitraege bleiben den jeweiligen Personen zugeordnet.",
    },
    ruleFields: {
      editingIntro:
        "Haltet hier die aktuelle Fassung eurer Vereinbarung fest. Ihr koennt sie vor der Bestaetigung weiter bearbeiten.",
      agreementPlaceholder: "Haltet eure Vereinbarung in ein oder zwei klaren Saetzen fest.",
      escalationTitle: "Vorgehen bei weiterem Klaerungsbedarf",
      escalationPlaceholder:
        "Haltet fest, wie ihr vorgeht, wenn dieser Punkt offen bleibt oder sich die Situation veraendert.",
      escalationHelper: "Beschreibt einen konkreten naechsten Schritt, eine Zustaendigkeit oder einen Zeitpunkt.",
      reviewTitle: "Zeitpunkt fuer erneute Pruefung",
      reviewPlaceholder: "Haltet fest, wann ihr diese Vereinbarung erneut ansehen wollt.",
      reviewHelper: "Nennt einen Zeitpunkt oder eine beobachtbare Veraenderung als Ausloeser.",
      currentAgreementTitle: "Aktuelle Vereinbarung fuer diesen Punkt",
      emptyAgreementText: "Noch keine Vereinbarung festgehalten.",
    },
    suggestionPresentation: {
      title: "Moeglicher Startpunkt",
      intro:
        "Dieser Systemvorschlag ist eine Formulierungshilfe. Prueft und bearbeitet ihn, bevor ihr ihn als eure Vereinbarung uebernehmt.",
      applyButton: "Als Startpunkt uebernehmen",
    },
    suggestionGuidance: {
      furtherDiscussion:
        "Besprecht Punkte mit weiterem Klaerungsbedarf vor einer endgueltigen Fassung und haltet fest, was noch offen ist.",
      differentResponses:
        "Besprecht unterschiedlich eingeordnete Punkte und haltet fest, was jede Person fuer die Vereinbarung braucht.",
    },
    matchingHints: {
      stable_base:
        "Die Matching-Auswertung gibt fuer diesen Punkt keinen eindeutigen Handlungsauftrag vor. Ihr koennt trotzdem pruefen, was ihr ausdruecklich festhalten moechtet.",
      conditional_complement:
        "Die Matching-Auswertung weist auf unterschiedliche Sichtweisen hin, die sich je nach Situation verschieden auswirken koennen. Klaert, wie ihr damit konkret umgehen wollt.",
      high_rule_need:
        "Die Matching-Auswertung markiert hier einen moeglichen Bedarf fuer eine ausdrueckliche Regel. Prueft, welche Zustaendigkeit, Grenze oder Entscheidung ihr festhalten wollt.",
      critical_clarification_point:
        "Die Matching-Auswertung markiert diesen Punkt als moeglichen Klaerungsanlass. Besprecht, was vor einer Vereinbarung noch konkretisiert werden soll.",
      default:
        "Ihr koennt besprechen, welche Erwartungen hinter diesem Punkt stehen und was ihr dazu ausdruecklich vereinbaren moechtet.",
    },
    markerImpulseIntro:
      "Diese Fragen greifen den Matching-Kontext als moeglichen Gespraechsanlass auf, nicht als Bewertung eurer Zusammenarbeit.",
    markerImpulses: {
      stable_base: [
        "Welche Annahmen teilt ihr zu diesem Punkt, und was soll trotzdem ausdruecklich festgehalten werden?",
        "Eine moegliche Frage ist, wann ihr diese Vereinbarung erneut pruefen wollt.",
      ],
      conditional_complement: [
        "Ihr koennt besprechen, wie eure unterschiedlichen Sichtweisen in eine konkrete Vereinbarung einfliessen sollen.",
        "Was braucht jede Person, damit ein Unterschied im Alltag handhabbar bleibt?",
      ],
      high_rule_need: [
        "Es kann hilfreich sein, Zustaendigkeit, Grenze und naechsten Pruefmoment ausdruecklich festzuhalten.",
        "Welche Situation soll eure Vereinbarung konkret abdecken?",
      ],
      critical_clarification_point: [
        "Eine moegliche Frage ist, was vor einer endgueltigen Fassung noch geklaert werden soll.",
        "Welchen naechsten Gespraechsschritt wollt ihr fuer diesen Punkt vereinbaren?",
      ],
      default: [
        "Ihr koennt besprechen, was jede Person bei diesem Punkt braucht.",
        "Welche konkrete Vereinbarung waere fuer den naechsten Schritt hilfreich?",
      ],
    },
    reactionPresentation: {
      prompt: "Wie moechtest du diesen Punkt im Moment einordnen?",
      choiceHint: "Waehle die Option, die am ehesten passt.",
      labels: {
        important: "Besonders wichtig",
        agree: "Kann so stehen",
        critical: "Weiter klaeren",
      },
      missingLabel: "Noch offen",
      legacy: {
        label: "Fruehere Einordnung",
        title: "Fruehere Einordnung vorhanden",
        body:
          "Mindestens eine Einordnung stammt aus einer frueheren Version. Bitte ordnet diesen Punkt erneut ein, damit eure aktuelle Einordnung eindeutig ist.",
      },
      observations: {
        missing: {
          title: "Einordnung noch offen",
          body: "Mindestens eine aktuelle Einordnung fehlt noch.",
        },
        similar: {
          title: "Aehnlich eingeordnet",
          importantBody: "Dieser Punkt ist euch beiden besonders wichtig.",
          agreeBody: "Dieser Punkt kann fuer euch beide aktuell so stehen.",
          furtherDiscussionBody: "Ihr moechtet diesen Punkt beide noch weiter klaeren.",
        },
        different: {
          title: "Unterschiedlich eingeordnet",
          body:
            "Ihr habt diesen Punkt unterschiedlich eingeordnet. Sprecht kurz darueber, was hinter euren jeweiligen Einordnungen steht.",
          furtherDiscussionBody: "Mindestens eine Person moechte diesen Punkt noch weiter klaeren.",
        },
      },
      counters: {
        similar: {
          label: "Aehnlich eingeordnet",
          body: "Beide aktuellen Einordnungen verwenden dieselbe Option.",
        },
        different: {
          label: "Unterschiedlich eingeordnet",
          body: "Beide aktuellen Einordnungen verwenden unterschiedliche Optionen.",
        },
        open: {
          label: "Noch offen",
          body: "Mindestens eine Einordnung fehlt oder stammt aus einer frueheren Version.",
        },
      },
    },
  },
  premiumSteps: {
    vision_direction: {
      question:
        "Welche Richtung wollt ihr mit dem Unternehmen verfolgen - und was ist euch dabei jeweils wichtig?",
      collectPlaceholder: "Beschreibe eine Richtung, Prioritaet oder offene Abwaegung.",
      collectHelper: "Startet mit zwei oder drei klaren Prioritaets- oder Fokusbeobachtungen.",
      agreementTitle: "Richtungsregel",
      reviewSummary: "Review-Punkt optional ergaenzen",
      impulseQuestions: [
        "Welche Richtung ist euch fuer die naechste Phase wichtig?",
        "Welche Chancen wollt ihr genauer pruefen, bevor ihr Prioritaeten veraendert?",
        "Was soll bei konkurrierenden Themen Orientierung geben?",
        "Wann wollt ihr eure Richtung erneut gemeinsam ansehen?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, welche Richtung oder Prioritaet fuer diesen Punkt aktuell gelten soll und welche Abwaegung ihr dabei beruecksichtigt.",
        escalationRule:
          "Legt fest, wie ihr vorgeht, wenn ihr eine neue Chance unterschiedlich einordnet oder sich die Rahmenbedingungen veraendern.",
        reviewTrigger:
          "Prueft die Vereinbarung zu einem festgelegten Zeitpunkt oder wenn sich relevante Annahmen veraendern.",
      },
    },
    roles_responsibility: {
      question: "Wie wollt ihr Rollen, Zustaendigkeiten und Verantwortung im Team verteilen?",
      collectPlaceholder: "Beschreibe eine Rolle, Zustaendigkeit oder notwendige Abstimmung.",
      collectHelper: "Ein guter Punkt nennt Thema, Fuehrung und wann die andere Person reinmuss.",
      agreementTitle: "Verantwortungsregel",
      reviewSummary: "Ownership-Signal optional ergaenzen",
      impulseQuestions: [
        "Welche Themen soll eine Person federfuehrend uebernehmen?",
        "Wann braucht die andere Person Information oder Beteiligung?",
        "Wo wollt ihr Entscheidungen gemeinsam treffen?",
        "Wann soll eine Rollenverteilung erneut besprochen werden?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, wer diesen Punkt federfuehrend uebernimmt und wann die andere Person informiert oder beteiligt wird.",
        escalationRule:
          "Legt fest, wie ihr vorgeht, wenn eine Zustaendigkeit unklar ist oder mehrere Bereiche betroffen sind.",
        reviewTrigger:
          "Prueft die Rollenverteilung erneut, wenn Aufgaben, Entscheidungsumfang oder Zusammenarbeit sich veraendern.",
      },
    },
    decision_rules: {
      question: "Wie wollt ihr Entscheidungen treffen, besonders wenn ihr unterschiedlich urteilt?",
      collectPlaceholder: "Beschreibe eine Entscheidungssituation oder eine gewuenschte Regel.",
      collectHelper: "Startet mit zwei oder drei Punkten, nicht mit einem perfekten Text.",
      agreementTitle: "Entscheidungsregel",
      reviewSummary: "Review-Trigger optional ergaenzen",
      impulseQuestions: [
        "Welche Entscheidungen kann eine Person eigenstaendig treffen?",
        "Wann wollt ihr euch vor einer Entscheidung abstimmen?",
        "Wie wollt ihr mit unterschiedlichen Einschaetzungen umgehen?",
        "Welche Frist oder welcher naechste Schritt hilft bei offenen Entscheidungen?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, wer in welcher Situation entscheidet und wann eine gemeinsame Abstimmung vorgesehen ist.",
        escalationRule:
          "Legt fest, wie ihr bei einer offenen Entscheidung vorgeht, wer den naechsten Schritt uebernimmt und welche Frist gilt.",
        reviewTrigger:
          "Prueft die Regel erneut, wenn Entscheidungen wiederholt offen bleiben oder Zustaendigkeiten sich veraendern.",
      },
    },
    commitment_load: {
      question:
        "Welche zeitliche Verfuegbarkeit und Arbeitsbelastung koennt und wollt ihr aktuell einbringen?",
      collectPlaceholder: "Beschreibe deine aktuelle Verfuegbarkeit, eine Erwartung oder eine Grenze.",
      collectHelper:
        "Ein guter Punkt nennt Erwartung, Grenze oder fruehes Signal. Kein Rechtfertigungstext noetig.",
      agreementTitle: "Commitment-Regel",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
      impulseQuestions: [
        "Welche Verfuegbarkeit ist fuer dich aktuell realistisch?",
        "Welche Erwartungen wollt ihr gegenseitig transparent machen?",
        "Wie wollt ihr Veraenderungen der Belastung ansprechen?",
        "Was soll neu priorisiert werden, wenn Kapazitaet sich veraendert?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, welche Verfuegbarkeit und Kommunikation ihr fuer diesen Punkt aktuell vereinbart.",
        escalationRule:
          "Legt fest, wie ihr Prioritaeten, Zustaendigkeiten oder Termine anpasst, wenn sich Kapazitaet veraendert.",
        reviewTrigger:
          "Prueft die Vereinbarung erneut, wenn Verfuegbarkeit, Arbeitsumfang oder Rahmenbedingungen sich veraendern.",
      },
    },
    collaboration_conflict: {
      question:
        "Wie wollt ihr mit Meinungsverschiedenheiten, Spannungen oder schwierigen Situationen umgehen?",
      collectPlaceholder: "Beschreibe, was dir bei Feedback oder Meinungsverschiedenheiten wichtig ist.",
      collectHelper: "Startet mit konkreten Situationen, nicht mit langen Erklaerungen.",
      agreementTitle: "Klaerungsregel",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
      impulseQuestions: [
        "Wie moechtest du Meinungsverschiedenheiten ansprechen?",
        "Was hilft dir, Feedback gut aufzunehmen und zu geben?",
        "Wann ist ein eigener Gespraechsrahmen hilfreich?",
        "Wie wollt ihr offene Punkte nach einem Gespraech festhalten?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, wie ihr Meinungsverschiedenheiten oder schwierige Situationen ansprechen und besprechen wollt.",
        escalationRule:
          "Legt fest, welchen Gespraechsrahmen oder welche Unterstuetzung ihr nutzt, wenn ein Punkt offen bleibt.",
        reviewTrigger:
          "Prueft die Vereinbarung erneut, wenn eure bisherige Form der Klaerung nicht mehr zu euren Beduerfnissen passt.",
      },
    },
    ownership_risk: {
      question:
        "Wie wollt ihr Verantwortung, Beteiligung und persoenliche oder finanzielle Risiken miteinander klaeren?",
      collectPlaceholder: "Beschreibe eine Verantwortung, Unsicherheit oder Entscheidungsschwelle.",
      collectHelper: "Ein guter Punkt nennt Risiko, Schwelle und wer spaetestens dazu muss.",
      agreementTitle: "Fuehrungsregel fuer Risiken",
      reviewSummary: "Fruehwarnsignal optional ergaenzen",
      impulseQuestions: [
        "Welche Verantwortung soll eine Person eigenstaendig uebernehmen?",
        "Welche Unsicherheiten sollen frueh sichtbar werden?",
        "Ab wann wollt ihr eine Entscheidung gemeinsam treffen?",
        "Wann ist zusaetzliche fachliche Beratung sinnvoll?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, wer diesen Punkt beobachtet oder bearbeitet und wann die andere Person beteiligt wird.",
        escalationRule:
          "Legt fest, bei welcher Veraenderung oder Schwelle ihr gemeinsam entscheidet oder externe Beratung einholt.",
        reviewTrigger:
          "Prueft die Vereinbarung erneut, wenn Auswirkungen, Unsicherheit oder Verantwortlichkeiten sich veraendern.",
      },
    },
    values_guardrails: {
      question:
        "Welche Prinzipien, Grenzen oder Prioritaeten sollen euch bei wichtigen Entscheidungen Orientierung geben?",
      collectPlaceholder: "Beschreibe ein Prinzip, eine Prioritaet oder eine Grenze, die dir Orientierung gibt.",
      collectHelper: "Ein guter Punkt beschreibt einen echten Fall, keine abstrakte Werteformel.",
      agreementTitle: "Leitplankenregel",
      reviewSummary: "Prueffrage optional ergaenzen",
      impulseQuestions: [
        "Welche Prinzipien sollen euch bei Entscheidungen Orientierung geben?",
        "Welche Prioritaeten wollt ihr in schwierigen Abwaegungen sichtbar machen?",
        "Welche Grenzen moechte jede Person ausdruecklich benennen?",
        "Wie wollt ihr mit neuen oder uneindeutigen Situationen umgehen?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, welches Prinzip, welche Prioritaet oder welche Grenze ihr fuer diesen Punkt vereinbaren moechtet.",
        escalationRule:
          "Legt fest, wie ihr eine Situation besprecht, wenn eure Prinzipien oder Grenzen unterschiedlich beruehrt sind.",
        reviewTrigger:
          "Prueft die Vereinbarung erneut, wenn neue Situationen oder veraenderte Rahmenbedingungen eine weitere Abwaegung erfordern.",
      },
    },
    alignment_90_days: {
      question: "Worauf wollt ihr euch in den naechsten 90 Tagen konkret konzentrieren?",
      collectPlaceholder: "Beschreibe einen Fokus, ein Ergebnis oder eine bewusste Nicht-Prioritaet.",
      collectHelper:
        "Ein guter Punkt ist kein To-do, sondern eine Fokusentscheidung fuer die naechste Phase.",
      agreementTitle: "90-Tage-Fokus",
      reviewSummary: "Fortschritts- und Review-Punkt festlegen",
      impulseQuestions: [
        "Welche Ergebnisse sind euch fuer die naechsten 90 Tage wichtig?",
        "Worauf wollt ihr eure begrenzte Zeit konzentrieren?",
        "Welche Themen sollen vorerst nicht parallel laufen?",
        "Wann und woran wollt ihr euren Fokus ueberpruefen?",
      ],
      suggestion: {
        agreement:
          "Haltet fest, worauf ihr euch in den naechsten 90 Tagen konzentrieren und welche Themen ihr vorerst nicht parallel verfolgen wollt.",
        escalationRule:
          "Legt fest, wie ihr mit neuen Themen umgeht und wie ihr entscheidet, was dafuer angepasst oder verschoben wird.",
        reviewTrigger:
          "Prueft euren Fokus zum vereinbarten Termin oder wenn sich Ziele, Kapazitaet oder Rahmenbedingungen wesentlich veraendern.",
      },
    },
  },
};
