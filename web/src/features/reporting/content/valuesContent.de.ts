import type { ValuesContent } from "@/features/reporting/content/valuesContent";

export const VALUES_CONTENT_DE = {
  intros: {
    blind_spot_watch:
      "Im Werteblock zeigt sich vor allem, was ihr ähnlich voraussetzt und deshalb leicht nicht mehr aussprecht.",
    clear_difference:
      "Im Werteblock zeigt sich kein harter Gegensatz, aber ein klar anderer Maßstab dafür, was unter Druck zuerst zählt.",
    nuanced_difference:
      "Im Werteblock wird eine gemeinsame Linie sichtbar, aber auch ein anderer Takt darin, was unter Druck zuerst Gewicht bekommt.",
    shared_basis:
      "Im Werteblock zeigt sich vor allem, woran ihr Entscheidungen unter Druck ähnlich ausrichtet.",
  },
  basisTitles: {
    integrity_speed: "Woran ihr Entscheidungen messt",
    stakeholder_balance: "Folgen nicht ausblenden",
    resource_fairness: "Belastung fair verteilen",
    commercial_focus: "Wirtschaftlich anschlussfähig",
    long_term_vs_short_term: "Nicht nur für den Moment",
  },
  differenceTitles: {
    integrity_speed: "Wenn Tempo Druck macht",
    stakeholder_balance: "Wenn Folgen anders gewichtet werden",
    resource_fairness: "Wenn Fairness anders gelesen wird",
    commercial_focus: "Wenn Härte früher greift",
    long_term_vs_short_term: "Wenn Zeithorizonte auseinandergehen",
  },
  guardrailTitles: {
    integrity_speed: "Eine klare Prüfschwelle",
    stakeholder_balance: "Eine feste Abwägungsregel",
    resource_fairness: "Ein fester Fairness-Check",
    commercial_focus: "Eine Grenze für Härte",
    long_term_vs_short_term: "Ein doppelter Zeithorizont",
  },
  basisBodies: {
    integrity_speed:
      "Bei wichtigen Entscheidungen schaut ihr wahrscheinlich nicht nur darauf, was schnell vorangeht. Für euch zählt auch, ob ein Schritt sich unter Druck noch vertreten lässt.",
    stakeholder_balance:
      "Wenn Entscheidungen Folgen für Team, Kundschaft oder Partner haben, blendet ihr diese Wirkung eher nicht aus. Wahrscheinlich schaut ihr beide darauf, wer eine Entscheidung mittragen muss und wer ihren Preis zahlt.",
    resource_fairness:
      "Bei Last, Budget oder Verantwortung habt ihr vermutlich einen ähnlichen Blick darauf, was noch als fair und zumutbar gilt. Das macht es leichter, heikle Verteilungen nicht nur nach Effizienz zu lesen.",
    commercial_focus:
      "Wirtschaftliche Tragfähigkeit ist für euch wahrscheinlich kein Nebenthema. Wenn es eng wird, schaut ihr beide eher darauf, was ein Vorhaben wirklich trägt und was nur gut klingt.",
    long_term_vs_short_term:
      "Ihr scheint Entscheidungen nicht nur nach dem nächsten Schritt zu lesen. Wahrscheinlich achtet ihr beide darauf, ob etwas kurzfristig hilft und später noch stimmig bleibt.",
  },
  differenceBodies: {
    integrity_speed: {
      clear:
        "Unter Druck dürfte einer früher sagen: Das reicht, wir gehen. Der andere hält eher noch dagegen, bis klar ist, dass der Schritt auch in Grenzfällen tragbar bleibt.",
      default:
        "Sobald Tempo hochgeht, setzt ihr den Punkt wahrscheinlich nicht gleich früh. Einer zieht eher vor, der andere prüft länger, ob der Schritt noch sauber begründbar bleibt.",
    },
    stakeholder_balance: {
      clear:
        "Wenn Entscheidungen Nebenfolgen haben, gewichtet ihr diese wahrscheinlich nicht gleich. Einer nimmt wirtschaftliche oder operative Härte früher in Kauf, der andere hält Auswirkungen auf Team, Kundschaft oder Partner länger im Blick.",
      default:
        "Unter Druck verschiebt sich bei euch wahrscheinlich, wessen Folgen zuerst Gewicht bekommen. Einer schaut früher auf Handlungsfähigkeit, der andere länger auf die Menschen oder Gruppen, die den Schritt tragen müssen.",
    },
    resource_fairness: {
      clear:
        "Bei Budget, Last oder Verantwortung zieht einer vermutlich früher eine harte Linie, während der andere länger darauf schaut, wie zumutbar das für die Betroffenen bleibt.",
      default:
        "Sobald etwas knapp wird, legt ihr Fairness nicht ganz gleich aus. Einer priorisiert früher Entlastung oder klare Grenzen, der andere eher Wirksamkeit und zügige Entscheidung.",
    },
    commercial_focus: {
      clear:
        "Wenn Ergebnisse unter Druck geraten, greift wirtschaftliche Härte bei euch nicht gleich früh. Einer zieht früher auf Runway, Zielerreichung und klare Priorisierung, der andere prüft länger die Folgen für Vertrauen, Team oder Zumutbarkeit.",
      default:
        "Unter Druck verschiebt sich bei euch, wie früh Zahlen und Ergebnis den Ton angeben. Einer zieht eher auf wirtschaftliche Klarheit, der andere hält die Nebenfolgen länger offen.",
    },
    long_term_vs_short_term: {
      clear:
        "Wenn eine Entscheidung jetzt entlastet, später aber einen Preis haben kann, priorisiert ihr nicht gleich. Einer sichert früher, was die nächsten Wochen trägt, der andere hält stärker die Linie im Blick, die später noch stimmen soll.",
      default:
        "Unter Druck rutscht ihr wahrscheinlich nicht auf denselben Zeithorizont. Einer will früher absichern, was jetzt trägt, der andere schützt länger die Richtung, die später noch passen soll.",
    },
  },
  differenceFollowUps: {
    clear:
      "Wenn das nicht ausgesprochen ist, bewertet ihr denselben Schritt schnell nach zwei verschiedenen Maßstäben.",
    moderate:
      "Ohne klare Einordnung zieht dieselbe Entscheidung dann schnell in zwei Richtungen.",
    subtle:
      "Das ist kein Grundkonflikt, verschiebt unter Druck aber leicht, was für euch jeweils zuerst zählt.",
  },
  guardrailBodies: {
    guard_shared_blind_spot: {
      integrity_speed:
        "Gerade weil ihr hier ähnlich priorisiert, sollte vor heiklen Entscheidungen einmal festgehalten werden, wo Tempo reicht und ab welcher Grenze ihr noch einmal stoppt.",
      stakeholder_balance:
        "Gerade weil ihr hier ähnlich schaut, sollte bei heiklen Entscheidungen einmal feststehen, welche Folgen für Team, Kundschaft oder Partner ihr nicht still in Kauf nehmt.",
      resource_fairness:
        "Gerade weil ihr hier ähnlich priorisiert, sollte bei Budget-, Last- oder Rollenentscheidungen kurz festgehalten werden, was für euch noch als fair und zumutbar gilt.",
      commercial_focus:
        "Gerade weil ihr hier ähnlich priorisiert, sollte bei Ergebnisdruck klar markiert werden, ab wann wirtschaftliche Härte gilt und welche Grenze trotzdem stehen bleibt.",
      long_term_vs_short_term:
        "Gerade weil ihr hier ähnlich schaut, sollte bei größeren Entscheidungen einmal feststehen, was kurzfristig gewonnen werden soll und welche langfristige Linie dabei nicht kippen darf.",
    },
    guard_priority_gap: {
      integrity_speed:
        "Legt für Entscheidungen unter Druck fest, wer den Punkt zum Go setzt und welche Grenze davor noch einmal ausdrücklich geprüft werden muss.",
      stakeholder_balance:
        "Legt vor Entscheidungen mit Nebenfolgen fest, welche Interessen im Zweifel Vorrang haben und welche nicht still übergangen werden dürfen.",
      resource_fairness:
        "Legt vor Last-, Budget- oder Rollenentscheidungen fest, nach welchen Kriterien ihr Härte, Fairness und Zumutbarkeit gewichtet.",
      commercial_focus:
        "Legt für Druckphasen fest, ab wann Ergebnis und Runway Vorrang haben und welche Nebenfolgen ihr dabei nicht einfach mitschleppt.",
      long_term_vs_short_term:
        "Legt für größere Entscheidungen fest, welcher kurzfristige Nutzen zählen muss und welche langfristige Linie dabei nicht aufgegeben wird.",
    },
  },
} as const satisfies ValuesContent;
