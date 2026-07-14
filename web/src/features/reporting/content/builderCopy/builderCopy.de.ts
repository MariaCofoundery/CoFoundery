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
      insufficientData: "Noch keine belastbare Gesamteinschätzung",
      sharedBlindSpot: "Viel gemeinsame Basis mit stillen Watchpoints",
      strongBase: "Strategisch und operativ tragfähige Basis",
      strategicCloseOperationalClarify: "Strategisch nah, operativ mit Klärungsbedarf",
      everydayCloseStrategicTension: "Im Alltag anschlussfähig, strategisch mit Spannungsfeld",
      highClarification: "Strategisch und operativ mit hohem Klärungsbedarf",
      partial: "Teilweise tragfähig, aber nicht in denselben Feldern",
    },
    intro: {
      fit: {
        insufficientData:
          "Die aktuelle Datenlage erlaubt noch keine belastbare Gesamteinschätzung eurer Zusammenarbeit.",
        sharedBlindSpot:
          "Strategisch und im Arbeitsalltag habt ihr eine tragfähige gemeinsame Basis.",
        strongBase:
          "Strategisch und im Arbeitsalltag habt ihr eine tragfähige gemeinsame Basis.",
        strategicCloseOperationalClarify:
          "Strategisch seid ihr näher beieinander als im Alltag; Reibung entsteht eher aus Zusammenarbeit als aus Richtung.",
        everydayCloseStrategicTension:
          "Im Alltag könnt ihr gut anschließen, aber strategisch lest ihr zentrale Fragen noch nicht nach denselben Maßstäben.",
        highClarification:
          "Strategische Richtung und operative Zusammenarbeit brauchen beide deutlich mehr bewusste Klärung.",
        partial: "Ihr habt belastbare Anknüpfungspunkte, aber nicht in denselben Feldern.",
      },
      strengthWithDimension: "Eine klare Stärke liegt derzeit {dimensionPrefix}.",
      strengthFallback: "Einige gemeinsame Stärken sind bereits gut erkennbar.",
      complementaryWithDimension:
        "Gerade Unterschiede {dimensionPrefix} können eine produktive Ergänzung sein.",
      sharedBlindSpotWithDimension:
        "Besonders aufmerksam solltet ihr auf {dimensionPrefix} schauen, weil gemeinsame Tendenzen dort leicht still mitlaufen können.",
      sharedBlindSpotFallback:
        "Gerade Felder mit hoher gemeinsamer Nähe verdienen Aufmerksamkeit, damit aus Gleichlauf kein stiller Blind Spot wird.",
      tensionOppositeWithDimension:
        "Besonders aufmerksam solltet ihr auf die Abstimmung {dimensionPrefix} schauen.",
      tensionCoordinationWithDimension:
        "Besonders bewusst führen solltet ihr {dimensionPrefix}, weil dort wiederkehrende Koordination nötig wird.",
      tensionFallback: "Die wichtigsten Abstimmungsthemen wirken derzeit gut besprechbar.",
      closing: {
        preFounder:
          "Vor einer gemeinsamen Gründung ist jetzt vor allem relevant, welche Unterschiede ihr gut nutzen könnt und was ihr vorher klar miteinander besprecht.",
        existingTeam:
          "Für eure bestehende Zusammenarbeit ist jetzt besonders relevant, was euch bereits trägt und an welchen Stellen eine klarere gemeinsame Linie entlastend wirken kann.",
      },
    },
    topMessages: {
      strength:
        "Stärke eurer Zusammenarbeit liegt aktuell vor allem {dimensionPrefix}: {title}",
      complementaryDynamic:
        "Ergänzend wirkt bei euch besonders {dimensionPrefix}: {title}",
      tension:
        "Bewusst besprechen solltet ihr vor allem {dimensionPrefix}: {title}",
      sharedBlindSpotTension:
        "Aufmerksam beobachten solltet ihr vor allem {dimensionPrefix}: {title}",
    },
    fallbackFocus: [
      "Welche Erwartungen habt ihr an gemeinsame Verantwortung und Entscheidungswege?",
      "Wo braucht ihr früh Klarheit, damit Zusammenarbeit unter Druck stabil bleibt?",
    ],
    focusPromptsByDimension: {
      Unternehmenslogik: [
        "Woran richtet ihr unternehmerische Entscheidungen aus: eher an strategischer Wirkung oder eher an Tragfähigkeit und Aufbau?",
        "Woran würdet ihr früh merken, dass ihr Marktchance und Substanz nicht mehr gleich gewichtet?",
      ],
      Entscheidungslogik: [
        "Wie wollt ihr Entscheidungen treffen, wenn Tempo und Sorgfalt in Spannung geraten?",
        "Bei welchen Themen braucht ihr klare Entscheidungsrechte statt längerer Abstimmung?",
      ],
      Risikoorientierung: [
        "Wo wollt ihr bewusst mutig sein und wo klare Sicherheitslinien ziehen?",
        "Wie nutzt ihr unterschiedliche Risikoperspektiven für bessere strategische Entscheidungen?",
      ],
      "Arbeitsstruktur & Zusammenarbeit": [
        "Wie eng wollt ihr im Alltag abgestimmt arbeiten und wo braucht ihr bewusst mehr Eigenraum?",
        "Wie sichtbar sollen Fortschritt, Entscheidungen und offene Punkte füreinander sein?",
      ],
      Commitment: [
        "Welche Erwartungen habt ihr an Priorisierung, Verfügbarkeit und Einsatzniveau im Alltag?",
        "Woran erkennt ihr früh, wenn eure Arbeitsrealitäten in Intensität oder Priorität auseinanderlaufen?",
      ],
      Konfliktstil: [
        "Wie wollt ihr Meinungsverschiedenheiten ansprechen, bevor sie sich verfestigen?",
        "Welche Regeln helfen euch, Spannung produktiv statt persönlich zu verarbeiten?",
      ],
    },
    dynamicFocus: {
      complementaryFallback:
        "Welche Unterschiede sind für euch produktiv und welche brauchen klare Moderation?",
      protectStrengthPreFounder:
        "Was müsstet ihr bewusst schützen, damit eure aktuelle Stärke {dimensionPrefix} auch in der Gründungsphase tragfähig bleibt?",
      protectStrengthExistingTeam:
        "Wie könnt ihr eure aktuelle Stärke {dimensionPrefix} im Alltag gezielt stabil halten?",
    },
  },
  sections: {
    vision: {
      dimension: "Unternehmenslogik",
      interpretations: {
        fallback: {
          pre_founder:
            "Für die Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, liegt derzeit noch keine tragfähige Grundlage für eine gemeinsame Einschätzung vor.",
          existing_team:
            "Für die Frage, woran ihr euer Unternehmen im Kern ausrichten wollt, liegt derzeit noch keine belastbare Grundlage für eine gemeinsame Einordnung vor.",
        },
        very_high: {
          pre_founder:
            "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, seid ihr derzeit sehr nah beieinander. Das spricht dafür, dass ihr ein mögliches Gründerteam auf einem ähnlichen Verständnis von Marktchance, Skalierbarkeit und Tragfähigkeit aufbauen könnt.",
          existing_team:
            "In der Frage, woran ihr euer Unternehmen ausrichtet, seid ihr derzeit sehr nah beieinander. Für eure bestehende Zusammenarbeit ist das ein starker Anker, weil strategische Wirkung und Substanz bei euch gut zusammenpassen.",
        },
        high: {
          pre_founder:
            "Ihr richtet unternehmerische Entscheidungen in eine ähnliche Richtung aus, auch wenn in einzelnen Punkten Unterschiede sichtbar werden. Für eine mögliche Zusammenarbeit ist das eine gute Voraussetzung, solange ihr offene Fragen zu Marktlogik, Substanz und Prioritäten früh besprecht.",
          existing_team:
            "Ihr arbeitet aus einer ähnlichen Unternehmenslogik heraus, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Für eure Zusammenarbeit ist das eine gute Basis, solange ihr diese Unterschiede nicht nebenbei laufen lasst, sondern gemeinsam einordnet.",
        },
        mixed: {
          pre_founder:
            "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, gibt es erkennbare Unterschiede, zum Beispiel bei Marktchance, Skalierbarkeit oder der Bedeutung von Substanz und Aufbau. Vor einer gemeinsamen Gründung lohnt es sich, diese Punkte klar anzusprechen, bevor daraus unausgesprochene Erwartungen werden.",
          existing_team:
            "In der Frage, woran ihr euer Unternehmen ausrichtet, gibt es erkennbare Unterschiede, zum Beispiel bei Marktwirkung, Skalierbarkeit oder der Frage, wie viel Substanz vor Beschleunigung stehen soll. Für ein bestehendes Team ist das kein Ausnahmefall, aber ein Bereich, der klare gemeinsame Orientierung braucht.",
        },
        low: {
          pre_founder:
            "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gründen wollt, solltet ihr diesen Punkt vor einer verbindlichen Zusammenarbeit sehr offen besprechen, weil hier später Grundsatzkonflikte entstehen können.",
          existing_team:
            "In der Frage, woran ihr euer Unternehmen ausrichtet, liegen deutliche Unterschiede vor. Für ein bestehendes Team ist das ein zentraler Bereich, in dem gemeinsame Prioritäten und Entscheidungsgrundlagen nachgeschärft werden sollten.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr Marktchancen unterschiedlich bewertet oder früh anders gewichtet, ob Wirkung und Skalierbarkeit oder Substanz und Aufbau Vorrang haben.",
        existing_team:
          "Im Alltag merkt man das oft daran, dass ihr strategische Chancen unterschiedlich einordnet oder bei Wachstum, Prioritäten und unternehmerischer Tragfähigkeit nicht automatisch dieselben Maßstäbe anlegt.",
      },
      tensionCards: {
        base: {
          topic: "Wachstumstempo",
          explanation:
            "Unterschiedliche Vorstellungen darüber, wie stark Marktwirkung vor strukturellen Aufbau treten darf, können sich später in Entscheidungen über Finanzierung, Teamaufbau oder Marktexpansion zeigen.",
        },
        extended: [
          {
            topic: "Verwertbarkeit oder Aufbau",
            explanation:
              "Waehrend eine Person Entscheidungen stärker an strategischer Verwertbarkeit ausrichtet, denkt die andere deutlicher in Substanz, Aufbau und langfristiger Tragfähigkeit.",
          },
          {
            topic: "Marktchance vs Substanz",
            explanation:
              "Eine Person will Chancen stärker nach Hebel und Wirkung sortieren, während die andere eher darauf schaut, ob sie den Aufbau des Unternehmens wirklich stärken.",
          },
        ],
        elevated: {
          topic: "Werte vs Marktchance",
          explanation:
            "Unterschiedliche Vorstellungen darüber, welche Chancen man aus strategischer Sicht verfolgen sollte und wo aus Sicht von Substanz und Unternehmensaufbau Grenzen liegen.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Welche Rolle soll dieses Unternehmen in fuenf Jahren in eurem Leben spielen und was wäre euch dafür wichtig?",
          "Woran würdet ihr früh merken, dass ihr trotz gleicher Idee unternehmerische Entscheidungen an unterschiedlichen Maßstäben ausrichtet?",
          "Was soll bei euch in Zweifelsfällen mehr Gewicht haben: strategische Wirkung, Skalierbarkeit oder tragfähiger Aufbau?",
          "Wann darf Marktchance Vorrang haben und wann soll Substanz oder Tragfähigkeit die Entscheidung führen?",
        ],
        existing_team: [
          "Welche Maßstäbe führen eure wichtigsten unternehmerischen Entscheidungen heute tatsächlich: Wirkung, Skalierbarkeit oder Aufbau?",
          "Wie entscheidet ihr, wann Marktanpassung sinnvoll ist, ohne dass Substanz oder Tragfähigkeit zu kurz kommen?",
          "Wo gehen eure Erwartungen an Marktwirkung, Aufbau oder strategische Priorisierung derzeit am deutlichsten auseinander?",
          "Welche Entscheidungen solltet ihr kuenftig stärker daran messen, woran ihr euer Unternehmen im Kern ausrichtet?",
        ],
      },
    },
    decisionLogic: {
      dimension: "Entscheidungslogik",
      interpretations: {
        fallback: {
          pre_founder:
            "Für die Frage, wie ihr Entscheidungen treffen und Verantwortung verteilen würdet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Für die Frage, wie ihr in eurer Zusammenarbeit Entscheidungen trefft und Verantwortung verteilt, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Art, wie ihr Entscheidungen trefft, seid ihr derzeit sehr nah beieinander. Das schafft für eine mögliche Zusammenarbeit Klarheit, weil Tempo, Absicherung und Verantwortungsverteilung ähnlich verstanden werden.",
          existing_team:
            "In der Art, wie ihr Entscheidungen trefft, seid ihr derzeit sehr nah beieinander. Für eure Zusammenarbeit schafft das Klarheit im Alltag, weil Tempo, Absicherung und Verantwortungsverteilung ähnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt in eurer Entscheidungslogik viel gemeinsame Basis mit, auch wenn sich in Tempo oder Absicherung einzelne Unterschiede zeigen. Für eine mögliche Zusammenarbeit ist das gut tragfähig, wenn ihr diese Unterschiede bewusst nutzt.",
          existing_team:
            "Ihr bringt in eurer Entscheidungslogik viel gemeinsame Basis mit, auch wenn sich in Tempo oder Absicherung Unterschiede zeigen. Für die Zusammenarbeit ist das gut tragfähig, wenn ihr diese Unterschiede bewusst in eure Abstimmung einbaut.",
        },
        mixed: {
          pre_founder:
            "In eurer Entscheidungslogik zeigen sich spürbar unterschiedliche Präferenzen. Das kann produktiv sein, wenn eine Person eher Tempo und die andere eher Struktur einbringt. Ohne klare Absprachen entsteht daraus jedoch leicht Reibung.",
          existing_team:
            "In eurer Entscheidungslogik zeigen sich spürbar unterschiedliche Präferenzen. Im Alltag kann das produktiv sein, wenn eine Person eher Tempo und die andere eher Struktur einbringt. Ohne klare Absprachen entsteht daraus jedoch leicht Reibung.",
        },
        low: {
          pre_founder:
            "In eurer Entscheidungslogik liegen deutliche Unterschiede vor. Das betrifft Tempo, Entscheidungsgrundlagen, Verantwortung und Abstimmung. Wenn ihr gemeinsam gründen wollt, braucht dieser Bereich früh klare Vereinbarungen.",
          existing_team:
            "In eurer Entscheidungslogik liegen deutliche Unterschiede vor. Das betrifft Tempo, Entscheidungsgrundlagen, Verantwortung und Abstimmung. Für ein bestehendes Team ist das ein Bereich, der früh wieder klare Orientierung braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr bei offenen Fragen unterschiedlich schnell entscheiden würdet oder verschieden viel Daten, Rückversicherung und Bauchgefühl braucht, bevor ihr losgeht.",
        existing_team:
          "Spürbar wird das häufig dort, wo Entscheidungen unter Zeitdruck anstehen, Verantwortung verteilt werden muss oder ihr unterschiedlich einschätzt, wann etwas genug abgesichert ist.",
      },
      tensionCards: {
        base: {
          topic: "Entscheidungstempo",
          explanation:
            "Unterschiedliche Erwartungen daran, wie schnell Entscheidungen getroffen werden sollten und wann weiteres Abwägen sinnvoll ist.",
        },
        extended: [
          {
            topic: "Daten vs Intuition",
            explanation:
              "Spannungen können entstehen, wenn eine Person Entscheidungen stärker an Daten und Analysen ausrichtet, während die andere ihrem Urteilsvermögen oder Marktgefühl mehr Gewicht gibt.",
          },
          {
            topic: "Konsens vs Verantwortungsprinzip",
            explanation:
              "Unterschiedliche Vorstellungen darüber, ob wichtige Entscheidungen gemeinsam getragen oder klar einer verantwortlichen Person zugeordnet sein sollten.",
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
          "Wie schnell möchtet ihr strategische Entscheidungen treffen, wenn noch nicht alle Informationen vorliegen?",
          "Woran soll sich bei euch eine gute Entscheidung orientieren: eher an Daten, Erfahrung, Intuition oder Marktfeedback?",
          "Welche Entscheidungen wollt ihr gemeinsam treffen und welche sollten klar in einer Hand liegen?",
          "Wie merkt ihr, dass ihr gerade zu lange absichert oder zu schnell entscheidet?",
        ],
        existing_team: [
          "Bei welchen Entscheidungen merkt ihr im Alltag bereits Unterschiede in Tempo oder Absicherungsbedürfnis?",
          "Wo braucht ihr mehr gemeinsame Abstimmung und wo eher klarere Verantwortung?",
          "Wie geht ihr damit um, wenn Daten, Erfahrung und Bauchgefühl in unterschiedliche Richtungen zeigen?",
          "Welche Entscheidungsarten sollten bei euch kuenftig bewusster geregelt werden?",
        ],
      },
    },
    riskOrientation: {
      dimension: "Risikoorientierung",
      interpretations: {
        fallback: {
          pre_founder:
            "Für die Frage, wie ihr mit Risiko, Unsicherheit und Wagnis umgehen würdet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Für die Frage, wie ihr in eurer Zusammenarbeit Risiko, Unsicherheit und Wagnis einordnet, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In eurer Haltung zu Risiko und Unsicherheit seid ihr derzeit sehr nah beieinander. Das schafft für eine mögliche Zusammenarbeit Klarheit, weil Risiko, Tempo und Sicherheitsbedürfnis ähnlich eingeschaetzt werden.",
          existing_team:
            "In eurer Haltung zu Risiko und Unsicherheit seid ihr derzeit sehr nah beieinander. Für eure Zusammenarbeit schafft das Klarheit im Alltag, weil Risiko, Tempo und Sicherheitsbedürfnis ähnlich eingeschaetzt werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt in eurer Risikoorientierung viel gemeinsame Basis mit, auch wenn sich in Chancenorientierung oder Absicherungsbedürfnis Unterschiede zeigen. Für eine mögliche Zusammenarbeit ist das gut tragfähig, wenn ihr diese Unterschiede bewusst einordnet.",
          existing_team:
            "Ihr bringt in eurer Risikoorientierung viel gemeinsame Basis mit, auch wenn sich in Chancenorientierung oder Absicherungsbedürfnis Unterschiede zeigen. Für die Zusammenarbeit ist das gut tragfähig, wenn ihr diese Unterschiede bewusst einordnet.",
        },
        mixed: {
          pre_founder:
            "In eurer Risikoorientierung zeigen sich spürbar unterschiedliche Perspektiven auf Risiko und Unsicherheit. Das kann wertvoll sein, wenn eine Person Chancen stärker treibt und die andere Risiken besser absichert. Ohne bewusste Abstimmung entstehen daraus jedoch leicht Spannungen.",
          existing_team:
            "In eurer Risikoorientierung zeigen sich spürbar unterschiedliche Perspektiven auf Risiko und Unsicherheit. Im Alltag kann das wertvoll sein, wenn eine Person Chancen stärker treibt und die andere Risiken besser absichert. Ohne bewusste Abstimmung entstehen daraus jedoch leicht Spannungen.",
        },
        low: {
          pre_founder:
            "In eurer Risikoorientierung liegen deutliche Unterschiede vor. Das betrifft den Umgang mit Unsicherheit, Wachstum, Tempo und Wagnis. Wenn ihr gemeinsam gründen wollt, sollte dieser Bereich früh offen besprochen werden.",
          existing_team:
            "In eurer Risikoorientierung liegen deutliche Unterschiede vor. Das betrifft den Umgang mit Unsicherheit, Wachstum, Tempo und Wagnis. Für ein bestehendes Team ist das ein Bereich, den ihr wieder klarer gemeinsam einordnen solltet.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass eine Person früher testen oder live gehen würde, während die andere erst mehr Klarheit, Daten oder finanzielle Absicherung sehen möchte.",
        existing_team:
          "Im Alltag merkt man das oft daran, wie ihr Launches vorbereitet, Unsicherheit aushaltet oder bei Finanzierung und Wachstum unterschiedlich schnell bereit seid, ein Wagnis einzugehen.",
      },
      tensionCards: {
        base: {
          topic: "Tempo von Experimenten",
          explanation:
            "Unterschiedliche Vorstellungen darüber, wie früh Ideen getestet oder Produkte in den Markt gegeben werden sollten.",
        },
        extended: [
          {
            topic: "Umgang mit Unsicherheit",
            explanation:
              "Abweichende Haltungen dazu, wie viel Unklarheit tragbar ist, bevor eine Entscheidung oder ein nächster Schritt sinnvoll erscheint.",
          },
          {
            topic: "Finanzielle Risikobereitschaft",
            explanation:
              "Spannungen können entstehen, wenn eine Person deutlich mehr finanzielles Wagnis akzeptieren würde als die andere.",
          },
        ],
        elevated: {
          topic: "Wachstum vs Absicherung",
          explanation:
            "Unterschiedliche Einschätzungen dazu, wann eine Chance mutig genutzt werden sollte und wann mehr Absicherung nötig ist.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Wie viel Unsicherheit fühlt sich für euch produktiv an und ab wann wird sie zu viel?",
          "Wann sollte man eine Idee früh im Markt testen, und wann ist mehr Absicherung sinnvoll?",
          "Welche Arten von Risiko würdet ihr bewusst eingehen und welche eher nicht?",
          "Woran würdet ihr merken, dass eine Person zu stark treibt oder die andere zu stark bremst?",
        ],
        existing_team: [
          "In welchen Situationen merkt ihr im Alltag bereits Unterschiede in Risikobereitschaft oder Sicherheitsbedürfnis?",
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
            "Für die Frage, wie eng ihr im Alltag verbunden arbeiten und wie viel Abstimmung ihr laufend braucht, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Für die Frage, wie eng ihr im Alltag verbunden arbeitet und wie viel Abstimmung ihr laufend braucht, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In euren Vorstellungen davon, wie autonom oder eng abgestimmt ihr im Alltag arbeiten wollt, seid ihr derzeit sehr nah beieinander. Das ist für eine mögliche Zusammenarbeit eine starke Basis, weil euer Arbeitsmodus nicht staendig neu ausgehandelt werden muss.",
          existing_team:
            "In euren Vorstellungen davon, wie autonom oder eng abgestimmt ihr im Alltag arbeiten wollt, seid ihr derzeit sehr nah beieinander. Für eure Zusammenarbeit ist das eine starke Basis, weil euer Arbeitsmodus nicht staendig neu ausgehandelt werden muss.",
        },
        high: {
          pre_founder:
            "Ihr bringt beim gewünschten Arbeitsmodus viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsnähe oder Eigenraum Unterschiede zeigen. Für eine mögliche Zusammenarbeit ist das gut tragfähig, wenn ihr diese Unterschiede bewusst einordnet.",
          existing_team:
            "Ihr bringt beim gewünschten Arbeitsmodus viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsnähe oder Eigenraum Unterschiede zeigen. Für die Zusammenarbeit ist das gut tragfähig, wenn ihr diese Unterschiede bewusst einordnet.",
        },
        mixed: {
          pre_founder:
            "In euren Vorstellungen davon, wie eng ihr im Alltag zusammenarbeiten wollt, zeigen sich spürbare Unterschiede. Das kann produktiv sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen.",
          existing_team:
            "In euren Vorstellungen davon, wie eng ihr im Alltag zusammenarbeiten wollt, zeigen sich spürbare Unterschiede. Im Alltag kann das produktiv sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen.",
        },
        low: {
          pre_founder:
            "In eurer Vorstellung davon, wie eng ihr im Alltag gekoppelt arbeiten wollt, liegen deutliche Unterschiede vor. Das betrifft Abstimmungsnähe, Sichtbarkeit und den gewünschten Austausch über laufende Arbeit. Wenn ihr gemeinsam gründen wollt, braucht dieser Bereich früh konkrete Regeln.",
          existing_team:
            "In eurer Vorstellung davon, wie eng ihr im Alltag gekoppelt arbeiten wollt, liegen deutliche Unterschiede vor. Das betrifft Abstimmungsnähe, Sichtbarkeit und den gewünschten Austausch über laufende Arbeit. Für ein bestehendes Team ist das ein Bereich, der früh wieder konkrete Regeln braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich oft Rückkopplung braucht, Zwischenstände früher oder später teilen wollt oder Zusammenarbeit verschieden eng organisiert.",
        existing_team:
          "Im Alltag wird das oft dort sichtbar, wo unterschiedliche Erwartungen an Check-ins, Sichtbarkeit und laufenden Austausch aufeinandertreffen.",
      },
      tensionCards: {
        base: {
          topic: "Abstimmungsbedarf",
          explanation:
            "Unterschiedliche Erwartungen daran, wie eng ihr euch im Alltag abstimmt und wie viel laufende Rückkopplung für euch nötig ist.",
        },
        extended: [
          {
            topic: "Sichtbarkeit von Fortschritt und offenen Punkten",
            explanation:
              "Spannungen können entstehen, wenn eine Person wichtige Zwischenstände früh teilen will, während die andere lieber länger autonom arbeitet, bevor etwas sichtbar wird.",
          },
          {
            topic: "Übergaben und Rückkopplung",
            explanation:
              "Unterschiedliche Vorstellungen darüber, wie häufig ihr euch rückkoppelt und wann laufende Arbeit gemeinsam nachkalibriert werden sollte.",
          },
        ],
        elevated: {
          topic: "Arbeitskopplung im Alltag",
          explanation:
            "Abweichende Erwartungen daran, wie eng ihr über Fortschritt, Entscheidungen und offene Punkte dauerhaft verbunden bleiben wollt.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Wie eng möchtet ihr euch im Alltag abstimmen, ohne euch gegenseitig auszubremsen?",
          "Wie sichtbar sollen Fortschritt, offene Punkte und Zwischenstände für den jeweils anderen sein?",
          "An welchen Stellen reicht gezielte Abstimmung, und wo braucht ihr laufende Rückkopplung?",
          "Woran würdet ihr merken, dass eure Zusammenarbeit zu eng oder zu lose gekoppelt ist?",
        ],
        existing_team: [
          "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Abstimmungsnähe, Sichtbarkeit oder Eigenraum?",
          "Wo braucht ihr mehr laufende Rückkopplung, und wo würde weniger Kopplung euch eher entlasten?",
          "Welche Form von Sichtbarkeit über Fortschritt oder offene Punkte hilft euch wirklich, und wo fühlt sie sich eher zu eng an?",
          "Was würde euren gemeinsamen Arbeitsmodus operativ spürbar leichter machen?",
        ],
      },
    },
    commitment: {
      dimension: "Commitment",
      interpretations: {
        fallback: {
          pre_founder:
            "Für die Frage, welchen Stellenwert das Startup im Alltag haben soll und welches Einsatzniveau ihr erwartet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Für die Frage, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eure Zusammenarbeit tragen soll, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Frage, welchen Stellenwert das Startup im Alltag haben soll, seid ihr derzeit sehr nah beieinander. Das ist eine stabile Grundlage für eine mögliche Zusammenarbeit, weil Priorisierung und erwartetes Einsatzniveau ähnlich ausfallen.",
          existing_team:
            "In der Frage, wie stark das Startup im Alltag priorisiert wird, seid ihr derzeit sehr nah beieinander. Für die bestehende Zusammenarbeit ist das eine stabile Basis, weil Verfügbarkeit und Intensität ähnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich in Priorität, Verfügbarkeit oder Intensität Unterschiede abzeichnen. Für eine mögliche Zusammenarbeit ist das gut anschlussfähig, solange diese Unterschiede früh angesprochen werden.",
          existing_team:
            "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich bei Priorität, Verfügbarkeit oder Intensität Unterschiede zeigen. Für die Zusammenarbeit ist das gut tragfähig, wenn Erwartungen im Alltag klar benannt bleiben.",
        },
        mixed: {
          pre_founder:
            "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfügbarkeit oder dem erwarteten Einsatzniveau im Alltag. Vor einer gemeinsamen Zusammenarbeit lohnt es sich, darüber offen zu sprechen, bevor daraus stille Erwartungen entstehen.",
          existing_team:
            "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfügbarkeit oder dem erwarteten Einsatzniveau im Alltag. Für ein bestehendes Team ist das ein Bereich, in dem unausgesprochene Annahmen schnell Reibung erzeugen können, wenn sie nicht besprochen werden.",
        },
        low: {
          pre_founder:
            "Beim Commitment liegen deutliche Unterschiede vor. Das kann sich später stark darauf auswirken, wie ihr Verfügbarkeit, Intensität und Priorisierung im Alltag erlebt. Vor einer gemeinsamen Gründung lohnt sich hier eine sehr offene Klärung.",
          existing_team:
            "Beim Commitment liegen deutliche Unterschiede vor. Im Alltag kann das Verfügbarkeit, Intensität und Zusammenarbeit spürbar beeinflussen. Für ein bestehendes Team ist das ein Thema, das klare Sprache und gemeinsame Erwartungen braucht.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich viel Verfügbarkeit erwartet, dem Startup einen anderen Stellenwert im Alltag gebt oder Intensität in verschiedenen Phasen nicht gleich einordnet.",
        existing_team:
          "Im Alltag merkt man das oft daran, dass Verfügbarkeit, Einsatzniveau und Prioritäten nicht gleich verstanden werden oder still vorausgesetzt wird, wie viel Fokus gerade selbstverständlich sein sollte.",
      },
      tensionCards: {
        base: {
          topic: "Priorität des Startups",
          explanation:
            "Unterschiedliche Vorstellungen darüber, welchen Stellenwert das Startup im Verhältnis zu anderen Lebens- oder Arbeitsthemen haben soll.",
        },
        extended: [
          {
            topic: "Einsatzniveau im Alltag",
            explanation:
              "Abweichende Erwartungen daran, wie viel Zeit, Energie und Präsenz eine Zusammenarbeit im Alltag tragen soll.",
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
            "Spannungen können entstehen, wenn eine Person klare Priorisierung des Startups erwartet, während die andere bewusst Raum für weitere Themen oder Projekte behält.",
        },
      },
      conversationPrompts: {
        pre_founder: [
          "Welche Rolle soll das Startup aktuell in eurem Alltag und in eurem Leben spielen?",
          "Woran würdet ihr früh merken, dass eure Erwartungen an Einsatz und Verfügbarkeit auseinanderlaufen?",
          "Wie viel Fokus auf das Unternehmen erwartet ihr voneinander und was ist dabei für euch beide realistisch?",
          "Wie wollt ihr mit Phasen umgehen, in denen Belastung, Energie oder Kapazität spürbar auseinandergehen?",
        ],
        existing_team: [
          "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Einsatzniveau, Priorisierung oder Verfügbarkeit?",
          "Welche unausgesprochenen Erwartungen an Verbindlichkeit gibt es vielleicht schon zwischen euch?",
          "Wie sprecht ihr darüber, wenn Belastung oder Prioritäten sich verändern?",
          "Was braucht ihr, damit Commitment nicht zur stillen Reibungsquelle wird?",
        ],
      },
    },
    conflictStyle: {
      dimension: "Konfliktstil",
      interpretations: {
        fallback: {
          pre_founder:
            "Für die Frage, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgehen würdet, liegt derzeit noch keine belastbare Grundlage vor.",
          existing_team:
            "Für die Frage, wie ihr in eurer Zusammenarbeit mit Spannungen, Feedback und Meinungsverschiedenheiten umgeht, liegt derzeit noch keine belastbare Grundlage vor.",
        },
        very_high: {
          pre_founder:
            "In der Art, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgehen würdet, seid ihr derzeit sehr nah beieinander. Das kann für ein mögliches Gründerteam ein echter Stabilitätsfaktor sein, weil Irritationen ähnlich gelesen und bearbeitet werden.",
          existing_team:
            "In der Art, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgeht, seid ihr derzeit sehr nah beieinander. Für eure bestehende Zusammenarbeit ist das ein Stabilitätsfaktor, weil Reibung und Klärung ähnlich verstanden werden.",
        },
        high: {
          pre_founder:
            "Ihr bringt im Konfliktstil viel gemeinsame Basis mit, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Für eine mögliche Zusammenarbeit ist das gut tragfähig, solange euch auch die Art eures Umgangs miteinander früh klar ist.",
          existing_team:
            "Ihr bringt im Konfliktstil viel gemeinsame Basis mit, auch wenn sich im Stil Unterschiede zeigen. Für die Zusammenarbeit ist das gut tragfähig, solange ihr nicht nur Inhalte klärt, sondern auch eure Art des Umgangs miteinander im Blick behaltet.",
        },
        mixed: {
          pre_founder:
            "In eurem Konfliktstil zeigen sich erkennbare Unterschiede darin, wie Spannungen angesprochen und verarbeitet werden. Das kann produktiv sein, führt aber leicht zu Reibung, wenn beide den eigenen Stil für selbstverständlich halten.",
          existing_team:
            "In eurem Konfliktstil zeigen sich erkennbare Unterschiede darin, wie Spannungen angesprochen und verarbeitet werden. Im Alltag kann das produktiv sein, aber auch zu Reibung führen, wenn unterschiedliche Erwartungen an Timing, Direktheit oder Klärung unausgesprochen bleiben.",
        },
        low: {
          pre_founder:
            "In eurem Konfliktstil liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gründen wollt, können Missverständnisse später eher aus der Art des Umgangs miteinander entstehen als aus dem eigentlichen Inhalt.",
          existing_team:
            "In eurem Konfliktstil liegen deutliche Unterschiede vor. Für ein bestehendes Team entsteht Missverständnis dann oft weniger durch das Thema selbst als durch die Art, wie Spannungen angesprochen, ausgetragen oder vermieden werden.",
        },
      },
      everydaySignals: {
        pre_founder:
          "Das kann sich im Alltag z. B. daran zeigen, dass eine Person Irritationen sofort ansprechen würde, während die andere erst Abstand braucht oder Direktheit sehr unterschiedlich als hilfreich erlebt wird.",
        existing_team:
          "Spürbar wird das häufig dort, wo Feedback gegeben wird, kleine Irritationen früh oder spät angesprochen werden und ihr unterschiedlich erlebt, wie direkt Klärung sein sollte.",
      },
      tensionCards: {
        base: {
          topic: "Timing von Feedback",
          explanation:
            "Unterschiedliche Vorstellungen darüber, ob Probleme sofort angesprochen oder erst mit Abstand reflektiert werden sollten.",
        },
        extended: [
          {
            topic: "Direktheit im Umgang",
            explanation:
              "Eine Person bevorzugt möglicherweise sehr klare und unmittelbare Rückmeldungen, während die andere stärker auf Ton, Kontext oder Beziehung achtet.",
          },
          {
            topic: "Umgang mit Meinungsverschiedenheiten",
            explanation:
              "Spannungen können entstehen, wenn eine Person Reibung als produktiv erlebt, während die andere stärker auf Ruhe, Ausgleich oder Deeskalation setzt.",
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
          "Wie schnell möchtet ihr Spannungen oder Irritationen ansprechen?",
          "Was versteht ihr jeweils unter fairem und hilfreichem Feedback?",
          "Woran würdet ihr merken, dass ein Konflikt gerade nicht mehr sachlich, sondern persönlich wird?",
          "Welche Form von Direktheit fühlt sich für euch produktiv an und welche nicht?",
        ],
        existing_team: [
          "An welchen Stellen unterscheiden sich eure Erwartungen an Timing und Direktheit von Feedback bereits im Alltag?",
          "Welche Konflikte sprecht ihr früh an und welche eher zu spät?",
          "Wie wollt ihr damit umgehen, wenn eine Person mehr Reibung aushält als die andere?",
          "Was braucht ihr, damit Feedback Klarheit schafft, ohne unnötig Beziehungsspannung aufzubauen?",
        ],
      },
    },
  },
  enPilotExamples: {
    fallbackSummary:
      "Dieser Platzhalter bleibt deutsch, weil produktive englische Builder-Narrative noch nicht freigeschaltet sind.",
    focusPrompt:
      "Welche konkrete Abstimmung würde euch helfen, die nächste Entscheidung bewusster zu führen?",
    sectionInterpretation:
      "Diese Beispielzeile schützt den späteren Migrationspfad, ohne aktuelle Reporttexte zu verändern.",
  },
} as const satisfies ReportBuilderCopy;
