import type { ReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";

export const REPORT_BUILDER_COPY_DE = {
  executiveSummary: {
    dimensionLabels: {
      Unternehmenslogik: "Unternehmenslogik",
      Entscheidungslogik: "Entscheidungslogik",
      Risikoorientierung: "Risikoorientierung",
      "Arbeitsstruktur & Zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
      Commitment: "Commitment",
      Konfliktstil: "Konfliktstil",
    },
    dimensionPrefix: {
      withDimension: "im Bereich {dimension}",
      fallback: "in eurer Zusammenarbeit",
    },
    headlines: {
      insufficientData: "Noch keine belastbare Gesamteinschaetzung",
      sharedBlindSpot: "Viel gemeinsame Basis mit stillen Watchpoints",
      strongBase: "Strategisch und operativ tragfaehige Basis",
      strategicCloseOperationalClarify: "Strategisch nah, operativ mit Klaerungsbedarf",
      everydayCloseStrategicTension: "Im Alltag anschlussfaehig, strategisch mit Spannungsfeld",
      highClarification: "Strategisch und operativ mit hohem Klaerungsbedarf",
      partial: "Teilweise tragfaehig, aber nicht in denselben Feldern",
    },
    intro: {
      fit: {
        insufficientData:
          "Die aktuelle Datenlage erlaubt noch keine belastbare Gesamteinschaetzung eurer Zusammenarbeit.",
        sharedBlindSpot:
          "Strategisch und im Arbeitsalltag habt ihr eine tragfaehige gemeinsame Basis.",
        strongBase:
          "Strategisch und im Arbeitsalltag habt ihr eine tragfaehige gemeinsame Basis.",
        strategicCloseOperationalClarify:
          "Strategisch seid ihr naeher beieinander als im Alltag; Reibung entsteht eher aus Zusammenarbeit als aus Richtung.",
        everydayCloseStrategicTension:
          "Im Alltag koennt ihr gut anschliessen, aber strategisch lest ihr zentrale Fragen noch nicht nach denselben Massstaeben.",
        highClarification:
          "Strategische Richtung und operative Zusammenarbeit brauchen beide deutlich mehr bewusste Klaerung.",
        partial: "Ihr habt belastbare Anknuepfungspunkte, aber nicht in denselben Feldern.",
      },
      strengthWithDimension: "Eine klare Staerke liegt derzeit {dimensionPrefix}.",
      strengthFallback: "Einige gemeinsame Staerken sind bereits gut erkennbar.",
      complementaryWithDimension:
        "Gerade Unterschiede {dimensionPrefix} koennen eine produktive Ergaenzung sein.",
      sharedBlindSpotWithDimension:
        "Besonders aufmerksam solltet ihr auf {dimensionPrefix} schauen, weil gemeinsame Tendenzen dort leicht still mitlaufen koennen.",
      sharedBlindSpotFallback:
        "Gerade Felder mit hoher gemeinsamer Naehe verdienen Aufmerksamkeit, damit aus Gleichlauf kein stiller Blind Spot wird.",
      tensionOppositeWithDimension:
        "Besonders aufmerksam solltet ihr auf die Abstimmung {dimensionPrefix} schauen.",
      tensionCoordinationWithDimension:
        "Besonders bewusst fuehren solltet ihr {dimensionPrefix}, weil dort wiederkehrende Koordination noetig wird.",
      tensionFallback: "Die wichtigsten Abstimmungsthemen wirken derzeit gut besprechbar.",
      closing: {
        preFounder:
          "Vor einer gemeinsamen Gruendung ist jetzt vor allem relevant, welche Unterschiede ihr gut nutzen koennt und was ihr vorher klar miteinander besprecht.",
        existingTeam:
          "Fuer eure bestehende Zusammenarbeit ist jetzt besonders relevant, was euch bereits traegt und an welchen Stellen eine klarere gemeinsame Linie entlastend wirken kann.",
      },
    },
    topMessages: {
      strength:
        "Staerke eurer Zusammenarbeit liegt aktuell vor allem {dimensionPrefix}: {title}",
      complementaryDynamic:
        "Ergaenzend wirkt bei euch besonders {dimensionPrefix}: {title}",
      tension:
        "Bewusst besprechen solltet ihr vor allem {dimensionPrefix}: {title}",
      sharedBlindSpotTension:
        "Aufmerksam beobachten solltet ihr vor allem {dimensionPrefix}: {title}",
    },
    fallbackFocus: [
      "Welche Erwartungen habt ihr an gemeinsame Verantwortung und Entscheidungswege?",
      "Wo braucht ihr frueh Klarheit, damit Zusammenarbeit unter Druck stabil bleibt?",
    ],
    focusPromptsByDimension: {
      Unternehmenslogik: [
        "Woran richtet ihr unternehmerische Entscheidungen aus: eher an strategischer Wirkung oder eher an Tragfähigkeit und Aufbau?",
        "Woran wuerdet ihr frueh merken, dass ihr Marktchance und Substanz nicht mehr gleich gewichtet?",
      ],
      Entscheidungslogik: [
        "Wie wollt ihr Entscheidungen treffen, wenn Tempo und Sorgfalt in Spannung geraten?",
        "Bei welchen Themen braucht ihr klare Entscheidungsrechte statt laengerer Abstimmung?",
      ],
      Risikoorientierung: [
        "Wo wollt ihr bewusst mutig sein und wo klare Sicherheitslinien ziehen?",
        "Wie nutzt ihr unterschiedliche Risikoperspektiven fuer bessere strategische Entscheidungen?",
      ],
      "Arbeitsstruktur & Zusammenarbeit": [
        "Wie eng wollt ihr im Alltag abgestimmt arbeiten und wo braucht ihr bewusst mehr Eigenraum?",
        "Wie sichtbar sollen Fortschritt, Entscheidungen und offene Punkte fuereinander sein?",
      ],
      Commitment: [
        "Welche Erwartungen habt ihr an Priorisierung, Verfuegbarkeit und Einsatzniveau im Alltag?",
        "Woran erkennt ihr frueh, wenn eure Arbeitsrealitaeten in Intensitaet oder Prioritaet auseinanderlaufen?",
      ],
      Konfliktstil: [
        "Wie wollt ihr Meinungsverschiedenheiten ansprechen, bevor sie sich verfestigen?",
        "Welche Regeln helfen euch, Spannung produktiv statt persoenlich zu verarbeiten?",
      ],
    },
    dynamicFocus: {
      complementaryFallback:
        "Welche Unterschiede sind fuer euch produktiv und welche brauchen klare Moderation?",
      protectStrengthPreFounder:
        "Was muesstet ihr bewusst schuetzen, damit eure aktuelle Staerke {dimensionPrefix} auch in der Gruendungsphase tragfaehig bleibt?",
      protectStrengthExistingTeam:
        "Wie koennt ihr eure aktuelle Staerke {dimensionPrefix} im Alltag gezielt stabil halten?",
    },
  },
  sections: {
    vision: {
      dimension: "Unternehmenslogik",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, liegt derzeit noch keine tragfaehige Grundlage fuer eine gemeinsame Einschaetzung vor.",
          existing_team:
            "Fuer die Frage, woran ihr euer Unternehmen im Kern ausrichten wollt, liegt derzeit noch keine belastbare Grundlage fuer eine gemeinsame Einordnung vor.",
        },
        very_high: {
          pre_founder:
            "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, seid ihr derzeit sehr nah beieinander. Das spricht dafuer, dass ihr ein moegliches Gruenderteam auf einem aehnlichen Verstaendnis von Marktchance, Skalierbarkeit und Tragfaehigkeit aufbauen koennt.",
          existing_team:
            "In der Frage, woran ihr euer Unternehmen ausrichtet, seid ihr derzeit sehr nah beieinander. Fuer eure bestehende Zusammenarbeit ist das ein starker Anker, weil strategische Wirkung und Substanz bei euch gut zusammenpassen.",
        },
        high: {
          pre_founder:
            "Ihr richtet unternehmerische Entscheidungen in eine aehnliche Richtung aus, auch wenn in einzelnen Punkten Unterschiede sichtbar werden. Fuer eine moegliche Zusammenarbeit ist das eine gute Voraussetzung, solange ihr offene Fragen zu Marktlogik, Substanz und Prioritaeten frueh besprecht.",
          existing_team:
            "Ihr arbeitet aus einer aehnlichen Unternehmenslogik heraus, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Fuer eure Zusammenarbeit ist das eine gute Basis, solange ihr diese Unterschiede nicht nebenbei laufen lasst, sondern gemeinsam einordnet.",
        },
        mixed: {
          pre_founder:
            "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, gibt es erkennbare Unterschiede, zum Beispiel bei Marktchance, Skalierbarkeit oder der Bedeutung von Substanz und Aufbau. Vor einer gemeinsamen Gruendung lohnt es sich, diese Punkte klar anzusprechen, bevor daraus unausgesprochene Erwartungen werden.",
          existing_team:
            "In der Frage, woran ihr euer Unternehmen ausrichtet, gibt es erkennbare Unterschiede, zum Beispiel bei Marktwirkung, Skalierbarkeit oder der Frage, wie viel Substanz vor Beschleunigung stehen soll. Fuer ein bestehendes Team ist das kein Ausnahmefall, aber ein Bereich, der klare gemeinsame Orientierung braucht.",
        },
        low: {
          pre_founder:
            "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gruenden wollt, solltet ihr diesen Punkt vor einer verbindlichen Zusammenarbeit sehr offen besprechen, weil hier spaeter Grundsatzkonflikte entstehen koennen.",
          existing_team:
            "In der Frage, woran ihr euer Unternehmen ausrichtet, liegen deutliche Unterschiede vor. Fuer ein bestehendes Team ist das ein zentraler Bereich, in dem gemeinsame Prioritaeten und Entscheidungsgrundlagen nachgeschaerft werden sollten.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr Marktchancen unterschiedlich bewertet oder frueh anders gewichtet, ob Wirkung und Skalierbarkeit oder Substanz und Aufbau Vorrang haben.",
        existing_team:
          "Im Alltag merkt man das oft daran, dass ihr strategische Chancen unterschiedlich einordnet oder bei Wachstum, Prioritaeten und unternehmerischer Tragfaehigkeit nicht automatisch dieselben Maßstäbe anlegt.",
      },
      tensionCards: {
        base: {
          topic: "Wachstumstempo",
          explanation:
            "Unterschiedliche Vorstellungen darueber, wie stark Marktwirkung vor strukturellen Aufbau treten darf, koennen sich spaeter in Entscheidungen ueber Finanzierung, Teamaufbau oder Marktexpansion zeigen.",
        },
        extended: [
          {
            topic: "Verwertbarkeit oder Aufbau",
            explanation:
              "Waehrend eine Person Entscheidungen staerker an strategischer Verwertbarkeit ausrichtet, denkt die andere deutlicher in Substanz, Aufbau und langfristiger Tragfaehigkeit.",
          },
          {
            topic: "Marktchance vs Substanz",
            explanation:
              "Eine Person will Chancen staerker nach Hebel und Wirkung sortieren, waehrend die andere eher darauf schaut, ob sie den Aufbau des Unternehmens wirklich staerken.",
          },
        ],
        elevated: {
          topic: "Werte vs Marktchance",
          explanation:
            "Unterschiedliche Vorstellungen darueber, welche Chancen man aus strategischer Sicht verfolgen sollte und wo aus Sicht von Substanz und Unternehmensaufbau Grenzen liegen.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Welche Rolle soll dieses Unternehmen in fuenf Jahren in eurem Leben spielen und was waere euch dafuer wichtig?",
          "Woran wuerdet ihr frueh merken, dass ihr trotz gleicher Idee unternehmerische Entscheidungen an unterschiedlichen Maßstäben ausrichtet?",
          "Was soll bei euch in Zweifelsfällen mehr Gewicht haben: strategische Wirkung, Skalierbarkeit oder tragfaehiger Aufbau?",
          "Wann darf Marktchance Vorrang haben und wann soll Substanz oder Tragfaehigkeit die Entscheidung fuehren?",
        ],
        existing_team: [
          "Welche Maßstäbe fuehren eure wichtigsten unternehmerischen Entscheidungen heute tatsaechlich: Wirkung, Skalierbarkeit oder Aufbau?",
          "Wie entscheidet ihr, wann Marktanpassung sinnvoll ist, ohne dass Substanz oder Tragfaehigkeit zu kurz kommen?",
          "Wo gehen eure Erwartungen an Marktwirkung, Aufbau oder strategische Priorisierung derzeit am deutlichsten auseinander?",
          "Welche Entscheidungen solltet ihr kuenftig staerker daran messen, woran ihr euer Unternehmen im Kern ausrichtet?",
        ],
      },
    },
    decisionLogic: {
      dimension: "Entscheidungslogik",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, wie ihr Entscheidungen treffen und Verantwortung verteilen wuerdet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Fuer die Frage, wie ihr in eurer Zusammenarbeit Entscheidungen trefft und Verantwortung verteilt, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Art, wie ihr Entscheidungen trefft, seid ihr derzeit sehr nah beieinander. Das schafft fuer eine moegliche Zusammenarbeit Klarheit, weil Tempo, Absicherung und Verantwortungsverteilung aehnlich verstanden werden.",
          existing_team:
            "In der Art, wie ihr Entscheidungen trefft, seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit schafft das Klarheit im Alltag, weil Tempo, Absicherung und Verantwortungsverteilung aehnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt in eurer Entscheidungslogik viel gemeinsame Basis mit, auch wenn sich in Tempo oder Absicherung einzelne Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst nutzt.",
          existing_team:
            "Ihr bringt in eurer Entscheidungslogik viel gemeinsame Basis mit, auch wenn sich in Tempo oder Absicherung Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst in eure Abstimmung einbaut.",
        },
        mixed: {
          pre_founder:
            "In eurer Entscheidungslogik zeigen sich spuerbar unterschiedliche Praeferenzen. Das kann produktiv sein, wenn eine Person eher Tempo und die andere eher Struktur einbringt. Ohne klare Absprachen entsteht daraus jedoch leicht Reibung.",
          existing_team:
            "In eurer Entscheidungslogik zeigen sich spuerbar unterschiedliche Praeferenzen. Im Alltag kann das produktiv sein, wenn eine Person eher Tempo und die andere eher Struktur einbringt. Ohne klare Absprachen entsteht daraus jedoch leicht Reibung.",
        },
        low: {
          pre_founder:
            "In eurer Entscheidungslogik liegen deutliche Unterschiede vor. Das betrifft Tempo, Entscheidungsgrundlagen, Verantwortung und Abstimmung. Wenn ihr gemeinsam gruenden wollt, braucht dieser Bereich frueh klare Vereinbarungen.",
          existing_team:
            "In eurer Entscheidungslogik liegen deutliche Unterschiede vor. Das betrifft Tempo, Entscheidungsgrundlagen, Verantwortung und Abstimmung. Fuer ein bestehendes Team ist das ein Bereich, der frueh wieder klare Orientierung braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr bei offenen Fragen unterschiedlich schnell entscheiden wuerdet oder verschieden viel Daten, Rueckversicherung und Bauchgefuehl braucht, bevor ihr losgeht.",
        existing_team:
          "Spuerbar wird das haeufig dort, wo Entscheidungen unter Zeitdruck anstehen, Verantwortung verteilt werden muss oder ihr unterschiedlich einschaetzt, wann etwas genug abgesichert ist.",
      },
      tensionCards: {
        base: {
          topic: "Entscheidungstempo",
          explanation:
            "Unterschiedliche Erwartungen daran, wie schnell Entscheidungen getroffen werden sollten und wann weiteres Abwaegen sinnvoll ist.",
        },
        extended: [
          {
            topic: "Daten vs Intuition",
            explanation:
              "Spannungen koennen entstehen, wenn eine Person Entscheidungen staerker an Daten und Analysen ausrichtet, waehrend die andere ihrem Urteilsvermoegen oder Marktgefuehl mehr Gewicht gibt.",
          },
          {
            topic: "Konsens vs Verantwortungsprinzip",
            explanation:
              "Unterschiedliche Vorstellungen darueber, ob wichtige Entscheidungen gemeinsam getragen oder klar einer verantwortlichen Person zugeordnet sein sollten.",
          },
        ],
        elevated: {
          topic: "Entscheidungen unter Unsicherheit",
          explanation:
            "Abweichende Haltungen dazu, wie viel Unklarheit akzeptabel ist, bevor eine Richtung festgelegt wird.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Wie schnell moechtet ihr strategische Entscheidungen treffen, wenn noch nicht alle Informationen vorliegen?",
          "Woran soll sich bei euch eine gute Entscheidung orientieren: eher an Daten, Erfahrung, Intuition oder Marktfeedback?",
          "Welche Entscheidungen wollt ihr gemeinsam treffen und welche sollten klar in einer Hand liegen?",
          "Wie merkt ihr, dass ihr gerade zu lange absichert oder zu schnell entscheidet?",
        ],
        existing_team: [
          "Bei welchen Entscheidungen merkt ihr im Alltag bereits Unterschiede in Tempo oder Absicherungsbeduerfnis?",
          "Wo braucht ihr mehr gemeinsame Abstimmung und wo eher klarere Verantwortung?",
          "Wie geht ihr damit um, wenn Daten, Erfahrung und Bauchgefuehl in unterschiedliche Richtungen zeigen?",
          "Welche Entscheidungsarten sollten bei euch kuenftig bewusster geregelt werden?",
        ],
      },
    },
    riskOrientation: {
      dimension: "Risikoorientierung",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, wie ihr mit Risiko, Unsicherheit und Wagnis umgehen wuerdet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Fuer die Frage, wie ihr in eurer Zusammenarbeit Risiko, Unsicherheit und Wagnis einordnet, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In eurer Haltung zu Risiko und Unsicherheit seid ihr derzeit sehr nah beieinander. Das schafft fuer eine moegliche Zusammenarbeit Klarheit, weil Risiko, Tempo und Sicherheitsbeduerfnis aehnlich eingeschaetzt werden.",
          existing_team:
            "In eurer Haltung zu Risiko und Unsicherheit seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit schafft das Klarheit im Alltag, weil Risiko, Tempo und Sicherheitsbeduerfnis aehnlich eingeschaetzt werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt in eurer Risikoorientierung viel gemeinsame Basis mit, auch wenn sich in Chancenorientierung oder Absicherungsbeduerfnis Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.",
          existing_team:
            "Ihr bringt in eurer Risikoorientierung viel gemeinsame Basis mit, auch wenn sich in Chancenorientierung oder Absicherungsbeduerfnis Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.",
        },
        mixed: {
          pre_founder:
            "In eurer Risikoorientierung zeigen sich spuerbar unterschiedliche Perspektiven auf Risiko und Unsicherheit. Das kann wertvoll sein, wenn eine Person Chancen staerker treibt und die andere Risiken besser absichert. Ohne bewusste Abstimmung entstehen daraus jedoch leicht Spannungen.",
          existing_team:
            "In eurer Risikoorientierung zeigen sich spuerbar unterschiedliche Perspektiven auf Risiko und Unsicherheit. Im Alltag kann das wertvoll sein, wenn eine Person Chancen staerker treibt und die andere Risiken besser absichert. Ohne bewusste Abstimmung entstehen daraus jedoch leicht Spannungen.",
        },
        low: {
          pre_founder:
            "In eurer Risikoorientierung liegen deutliche Unterschiede vor. Das betrifft den Umgang mit Unsicherheit, Wachstum, Tempo und Wagnis. Wenn ihr gemeinsam gruenden wollt, sollte dieser Bereich frueh offen besprochen werden.",
          existing_team:
            "In eurer Risikoorientierung liegen deutliche Unterschiede vor. Das betrifft den Umgang mit Unsicherheit, Wachstum, Tempo und Wagnis. Fuer ein bestehendes Team ist das ein Bereich, den ihr wieder klarer gemeinsam einordnen solltet.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass eine Person frueher testen oder live gehen wuerde, waehrend die andere erst mehr Klarheit, Daten oder finanzielle Absicherung sehen moechte.",
        existing_team:
          "Im Alltag merkt man das oft daran, wie ihr Launches vorbereitet, Unsicherheit aushaltet oder bei Finanzierung und Wachstum unterschiedlich schnell bereit seid, ein Wagnis einzugehen.",
      },
      tensionCards: {
        base: {
          topic: "Tempo von Experimenten",
          explanation:
            "Unterschiedliche Vorstellungen darueber, wie frueh Ideen getestet oder Produkte in den Markt gegeben werden sollten.",
        },
        extended: [
          {
            topic: "Umgang mit Unsicherheit",
            explanation:
              "Abweichende Haltungen dazu, wie viel Unklarheit tragbar ist, bevor eine Entscheidung oder ein naechster Schritt sinnvoll erscheint.",
          },
          {
            topic: "Finanzielle Risikobereitschaft",
            explanation:
              "Spannungen koennen entstehen, wenn eine Person deutlich mehr finanzielles Wagnis akzeptieren wuerde als die andere.",
          },
        ],
        elevated: {
          topic: "Wachstum vs Absicherung",
          explanation:
            "Unterschiedliche Einschaetzungen dazu, wann eine Chance mutig genutzt werden sollte und wann mehr Absicherung noetig ist.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Wie viel Unsicherheit fuehlt sich fuer euch produktiv an und ab wann wird sie zu viel?",
          "Wann sollte man eine Idee frueh im Markt testen, und wann ist mehr Absicherung sinnvoll?",
          "Welche Arten von Risiko wuerdet ihr bewusst eingehen und welche eher nicht?",
          "Woran wuerdet ihr merken, dass eine Person zu stark treibt oder die andere zu stark bremst?",
        ],
        existing_team: [
          "In welchen Situationen merkt ihr im Alltag bereits Unterschiede in Risikobereitschaft oder Sicherheitsbeduerfnis?",
          "Wo hilft euch eure unterschiedliche Perspektive und wo bremst sie euch eher aus?",
          "Wie entscheidet ihr, wann ihr mutig vorangeht und wann ihr bewusst absichert?",
          "Welche finanziellen oder strategischen Risiken solltet ihr kuenftig klarer gemeinsam einordnen?",
        ],
      },
    },
    workStructure: {
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, wie eng ihr im Alltag verbunden arbeiten und wie viel Abstimmung ihr laufend braucht, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Fuer die Frage, wie eng ihr im Alltag verbunden arbeitet und wie viel Abstimmung ihr laufend braucht, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In euren Vorstellungen davon, wie autonom oder eng abgestimmt ihr im Alltag arbeiten wollt, seid ihr derzeit sehr nah beieinander. Das ist fuer eine moegliche Zusammenarbeit eine starke Basis, weil euer Arbeitsmodus nicht staendig neu ausgehandelt werden muss.",
          existing_team:
            "In euren Vorstellungen davon, wie autonom oder eng abgestimmt ihr im Alltag arbeiten wollt, seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit ist das eine starke Basis, weil euer Arbeitsmodus nicht staendig neu ausgehandelt werden muss.",
        },
        high: {
          pre_founder:
            "Ihr bringt beim gewuenschten Arbeitsmodus viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsnaehe oder Eigenraum Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.",
          existing_team:
            "Ihr bringt beim gewuenschten Arbeitsmodus viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsnaehe oder Eigenraum Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.",
        },
        mixed: {
          pre_founder:
            "In euren Vorstellungen davon, wie eng ihr im Alltag zusammenarbeiten wollt, zeigen sich spuerbare Unterschiede. Das kann produktiv sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen.",
          existing_team:
            "In euren Vorstellungen davon, wie eng ihr im Alltag zusammenarbeiten wollt, zeigen sich spuerbare Unterschiede. Im Alltag kann das produktiv sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen.",
        },
        low: {
          pre_founder:
            "In eurer Vorstellung davon, wie eng ihr im Alltag gekoppelt arbeiten wollt, liegen deutliche Unterschiede vor. Das betrifft Abstimmungsnaehe, Sichtbarkeit und den gewuenschten Austausch ueber laufende Arbeit. Wenn ihr gemeinsam gruenden wollt, braucht dieser Bereich frueh konkrete Regeln.",
          existing_team:
            "In eurer Vorstellung davon, wie eng ihr im Alltag gekoppelt arbeiten wollt, liegen deutliche Unterschiede vor. Das betrifft Abstimmungsnaehe, Sichtbarkeit und den gewuenschten Austausch ueber laufende Arbeit. Fuer ein bestehendes Team ist das ein Bereich, der frueh wieder konkrete Regeln braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich oft Rueckkopplung braucht, Zwischenstaende frueher oder spaeter teilen wollt oder Zusammenarbeit verschieden eng organisiert.",
        existing_team:
          "Im Alltag wird das oft dort sichtbar, wo unterschiedliche Erwartungen an Check-ins, Sichtbarkeit und laufenden Austausch aufeinandertreffen.",
      },
      tensionCards: {
        base: {
          topic: "Abstimmungsbedarf",
          explanation:
            "Unterschiedliche Erwartungen daran, wie eng ihr euch im Alltag abstimmt und wie viel laufende Rueckkopplung fuer euch noetig ist.",
        },
        extended: [
          {
            topic: "Sichtbarkeit von Fortschritt und offenen Punkten",
            explanation:
              "Spannungen koennen entstehen, wenn eine Person wichtige Zwischenstaende frueh teilen will, waehrend die andere lieber laenger autonom arbeitet, bevor etwas sichtbar wird.",
          },
          {
            topic: "Uebergaben und Rueckkopplung",
            explanation:
              "Unterschiedliche Vorstellungen darueber, wie haeufig ihr euch rueckkoppelt und wann laufende Arbeit gemeinsam nachkalibriert werden sollte.",
          },
        ],
        elevated: {
          topic: "Arbeitskopplung im Alltag",
          explanation:
            "Abweichende Erwartungen daran, wie eng ihr ueber Fortschritt, Entscheidungen und offene Punkte dauerhaft verbunden bleiben wollt.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Wie eng moechtet ihr euch im Alltag abstimmen, ohne euch gegenseitig auszubremsen?",
          "Wie sichtbar sollen Fortschritt, offene Punkte und Zwischenstaende fuer den jeweils anderen sein?",
          "An welchen Stellen reicht gezielte Abstimmung, und wo braucht ihr laufende Rueckkopplung?",
          "Woran wuerdet ihr merken, dass eure Zusammenarbeit zu eng oder zu lose gekoppelt ist?",
        ],
        existing_team: [
          "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Abstimmungsnaehe, Sichtbarkeit oder Eigenraum?",
          "Wo braucht ihr mehr laufende Rueckkopplung, und wo wuerde weniger Kopplung euch eher entlasten?",
          "Welche Form von Sichtbarkeit ueber Fortschritt oder offene Punkte hilft euch wirklich, und wo fuehlt sie sich eher zu eng an?",
          "Was wuerde euren gemeinsamen Arbeitsmodus operativ spuerbar leichter machen?",
        ],
      },
    },
    commitment: {
      dimension: "Commitment",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, welchen Stellenwert das Startup im Alltag haben soll und welches Einsatzniveau ihr erwartet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Fuer die Frage, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eure Zusammenarbeit tragen soll, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Frage, welchen Stellenwert das Startup im Alltag haben soll, seid ihr derzeit sehr nah beieinander. Das ist eine stabile Grundlage fuer eine moegliche Zusammenarbeit, weil Priorisierung und erwartetes Einsatzniveau aehnlich ausfallen.",
          existing_team:
            "In der Frage, wie stark das Startup im Alltag priorisiert wird, seid ihr derzeit sehr nah beieinander. Fuer die bestehende Zusammenarbeit ist das eine stabile Basis, weil Verfuegbarkeit und Intensitaet aehnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich in Prioritaet, Verfuegbarkeit oder Intensitaet Unterschiede abzeichnen. Fuer eine moegliche Zusammenarbeit ist das gut anschlussfaehig, solange diese Unterschiede frueh angesprochen werden.",
          existing_team:
            "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich bei Prioritaet, Verfuegbarkeit oder Intensitaet Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn Erwartungen im Alltag klar benannt bleiben.",
        },
        mixed: {
          pre_founder:
            "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfuegbarkeit oder dem erwarteten Einsatzniveau im Alltag. Vor einer gemeinsamen Zusammenarbeit lohnt es sich, darueber offen zu sprechen, bevor daraus stille Erwartungen entstehen.",
          existing_team:
            "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfuegbarkeit oder dem erwarteten Einsatzniveau im Alltag. Fuer ein bestehendes Team ist das ein Bereich, in dem unausgesprochene Annahmen schnell Reibung erzeugen koennen, wenn sie nicht besprochen werden.",
        },
        low: {
          pre_founder:
            "Beim Commitment liegen deutliche Unterschiede vor. Das kann sich spaeter stark darauf auswirken, wie ihr Verfuegbarkeit, Intensitaet und Priorisierung im Alltag erlebt. Vor einer gemeinsamen Gruendung lohnt sich hier eine sehr offene Klaerung.",
          existing_team:
            "Beim Commitment liegen deutliche Unterschiede vor. Im Alltag kann das Verfuegbarkeit, Intensitaet und Zusammenarbeit spuerbar beeinflussen. Fuer ein bestehendes Team ist das ein Thema, das klare Sprache und gemeinsame Erwartungen braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich viel Verfuegbarkeit erwartet, dem Startup einen anderen Stellenwert im Alltag gebt oder Intensitaet in verschiedenen Phasen nicht gleich einordnet.",
        existing_team:
          "Im Alltag merkt man das oft daran, dass Verfuegbarkeit, Einsatzniveau und Prioritaeten nicht gleich verstanden werden oder still vorausgesetzt wird, wie viel Fokus gerade selbstverstaendlich sein sollte.",
      },
      tensionCards: {
        base: {
          topic: "Prioritaet des Startups",
          explanation:
            "Unterschiedliche Vorstellungen darueber, welchen Stellenwert das Startup im Verhaeltnis zu anderen Lebens- oder Arbeitsthemen haben soll.",
        },
        extended: [
          {
            topic: "Einsatzniveau im Alltag",
            explanation:
              "Abweichende Erwartungen daran, wie viel Zeit, Energie und Praesenz eine Zusammenarbeit im Alltag tragen soll.",
          },
          {
            topic: "Umgang mit Belastung",
            explanation:
              "Unterschiedliche Haltungen dazu, wie intensive Phasen begrenzt, abgestimmt und wieder heruntergefahren werden.",
          },
        ],
        elevated: {
          topic: "Fokus und Nebenprojekte",
          explanation:
            "Spannungen koennen entstehen, wenn eine Person klare Priorisierung des Startups erwartet, waehrend die andere bewusst Raum fuer weitere Themen oder Projekte behaelt.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Welche Rolle soll das Startup aktuell in eurem Alltag und in eurem Leben spielen?",
          "Woran wuerdet ihr frueh merken, dass eure Erwartungen an Einsatz und Verfuegbarkeit auseinanderlaufen?",
          "Wie viel Fokus auf das Unternehmen erwartet ihr voneinander und was ist dabei fuer euch beide realistisch?",
          "Wie wollt ihr mit Phasen umgehen, in denen Belastung, Energie oder Kapazitaet spuerbar auseinandergehen?",
        ],
        existing_team: [
          "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Einsatzniveau, Priorisierung oder Verfuegbarkeit?",
          "Welche unausgesprochenen Erwartungen an Verbindlichkeit gibt es vielleicht schon zwischen euch?",
          "Wie sprecht ihr darueber, wenn Belastung oder Prioritaeten sich veraendern?",
          "Was braucht ihr, damit Commitment nicht zur stillen Reibungsquelle wird?",
        ],
      },
    },
    conflictStyle: {
      dimension: "Konfliktstil",
      interpretations: {
        fallback: {
          pre_founder:
            "Fuer die Frage, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgehen wuerdet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Fuer die Frage, wie ihr in eurer Zusammenarbeit mit Spannungen, Feedback und Meinungsverschiedenheiten umgeht, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Art, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgehen wuerdet, seid ihr derzeit sehr nah beieinander. Das kann fuer ein moegliches Gruenderteam ein echter Stabilitaetsfaktor sein, weil Irritationen aehnlich gelesen und bearbeitet werden.",
          existing_team:
            "In der Art, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgeht, seid ihr derzeit sehr nah beieinander. Fuer eure bestehende Zusammenarbeit ist das ein Stabilitaetsfaktor, weil Reibung und Klaerung aehnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt im Konfliktstil viel gemeinsame Basis mit, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, solange euch auch die Art eures Umgangs miteinander frueh klar ist.",
          existing_team:
            "Ihr bringt im Konfliktstil viel gemeinsame Basis mit, auch wenn sich im Stil Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, solange ihr nicht nur Inhalte klaert, sondern auch eure Art des Umgangs miteinander im Blick behaltet.",
        },
        mixed: {
          pre_founder:
            "In eurem Konfliktstil zeigen sich erkennbare Unterschiede darin, wie Spannungen angesprochen und verarbeitet werden. Das kann produktiv sein, fuehrt aber leicht zu Reibung, wenn beide den eigenen Stil fuer selbstverstaendlich halten.",
          existing_team:
            "In eurem Konfliktstil zeigen sich erkennbare Unterschiede darin, wie Spannungen angesprochen und verarbeitet werden. Im Alltag kann das produktiv sein, aber auch zu Reibung fuehren, wenn unterschiedliche Erwartungen an Timing, Direktheit oder Klaerung unausgesprochen bleiben.",
        },
        low: {
          pre_founder:
            "In eurem Konfliktstil liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gruenden wollt, koennen Missverstaendnisse spaeter eher aus der Art des Umgangs miteinander entstehen als aus dem eigentlichen Inhalt.",
          existing_team:
            "In eurem Konfliktstil liegen deutliche Unterschiede vor. Fuer ein bestehendes Team entsteht Missverstaendnis dann oft weniger durch das Thema selbst als durch die Art, wie Spannungen angesprochen, ausgetragen oder vermieden werden.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass eine Person Irritationen sofort ansprechen wuerde, waehrend die andere erst Abstand braucht oder Direktheit sehr unterschiedlich als hilfreich erlebt wird.",
        existing_team:
          "Spuerbar wird das haeufig dort, wo Feedback gegeben wird, kleine Irritationen frueh oder spaet angesprochen werden und ihr unterschiedlich erlebt, wie direkt Klaerung sein sollte.",
      },
      tensionCards: {
        base: {
          topic: "Timing von Feedback",
          explanation:
            "Unterschiedliche Vorstellungen darueber, ob Probleme sofort angesprochen oder erst mit Abstand reflektiert werden sollten.",
        },
        extended: [
          {
            topic: "Direktheit im Umgang",
            explanation:
              "Eine Person bevorzugt moeglicherweise sehr klare und unmittelbare Rueckmeldungen, waehrend die andere staerker auf Ton, Kontext oder Beziehung achtet.",
          },
          {
            topic: "Umgang mit Meinungsverschiedenheiten",
            explanation:
              "Spannungen koennen entstehen, wenn eine Person Reibung als produktiv erlebt, waehrend die andere staerker auf Ruhe, Ausgleich oder Deeskalation setzt.",
          },
        ],
        elevated: {
          topic: "Fehlerkultur",
          explanation:
            "Unterschiedliche Erwartungen daran, wie offen Fehler benannt, analysiert und im Team besprochen werden sollen.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Wie schnell moechtet ihr Spannungen oder Irritationen ansprechen?",
          "Was versteht ihr jeweils unter fairem und hilfreichem Feedback?",
          "Woran wuerdet ihr merken, dass ein Konflikt gerade nicht mehr sachlich, sondern persoenlich wird?",
          "Welche Form von Direktheit fuehlt sich fuer euch produktiv an und welche nicht?",
        ],
        existing_team: [
          "An welchen Stellen unterscheiden sich eure Erwartungen an Timing und Direktheit von Feedback bereits im Alltag?",
          "Welche Konflikte sprecht ihr frueh an und welche eher zu spaet?",
          "Wie wollt ihr damit umgehen, wenn eine Person mehr Reibung aushaelt als die andere?",
          "Was braucht ihr, damit Feedback Klarheit schafft, ohne unnoetig Beziehungsspannung aufzubauen?",
        ],
      },
    },
  },
  enPilotExamples: {
    fallbackSummary:
      "Dieser Platzhalter bleibt deutsch, weil produktive englische Builder-Narrative noch nicht freigeschaltet sind.",
    focusPrompt:
      "Welche konkrete Abstimmung wuerde euch helfen, die naechste Entscheidung bewusster zu fuehren?",
    sectionInterpretation:
      "Diese Beispielzeile schuetzt den spaeteren Migrationspfad, ohne aktuelle Reporttexte zu veraendern.",
  },
} as const satisfies ReportBuilderCopy;
