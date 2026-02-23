import { type ReportDimension } from "@/features/reporting/types";

export const SELF_DIMENSION_COPY: Record<
  ReportDimension,
  {
    intro: string;
    reflectionQuestion: string;
  }
> = {
  Vision: {
    intro:
      "Diese Dimension beschreibt, wie du Wachstum priorisierst: solides Fundament oder schnelle Skalierung. Deine Tendenz hier beeinflusst, wie mutig du Ressourcen einsetzt und wie klar du strategische Prioritäten setzt.",
    reflectionQuestion:
      "Welche Entscheidung in den nächsten 30 Tagen zeigt am klarsten, ob du gerade Fundament oder Skalierung priorisierst?",
  },
  Entscheidung: {
    intro:
      "Diese Dimension zeigt, wie du unter Unsicherheit entscheidest: analytisch, pragmatisch oder stark tempoorientiert. Sie prägt, wie schnell du handlungsfähig bleibst und wie gut Entscheidungen im Alltag tragen.",
    reflectionQuestion:
      "Woran erkennst du konkret, dass du genug Information für eine belastbare Entscheidung hast?",
  },
  Risiko: {
    intro:
      "Diese Dimension macht sichtbar, wie du mit Unsicherheit und Risiko umgehst. Sie bestimmt, wie du Chancen nutzt, ohne Stabilität und Runway aus dem Blick zu verlieren.",
    reflectionQuestion:
      "Bei welchem Risikotyp brauchst du künftig ein klares Abbruchkriterium, bevor du startest?",
  },
  Autonomie: {
    intro:
      "Diese Dimension zeigt, wie du Zusammenarbeit zwischen Nähe und Eigenverantwortung ausbalancierst. Sie beeinflusst direkt, ob dein Arbeitsmodus eher synchronisierend oder stark autonom wirkt.",
    reflectionQuestion:
      "Welche Abstimmung brauchst du zwingend, und wo willst du bewusst mehr operative Freiheit leben?",
  },
  Verbindlichkeit: {
    intro:
      "Diese Dimension beschreibt, wie du Verbindlichkeit und Leistungsanspruch im Alltag lebst. Sie ist zentral für Vertrauen, klare Zusagen und eine realistische Umsetzungsdynamik.",
    reflectionQuestion:
      "Welche zwei Zusagen pro Woche sind für dich wirklich nicht verhandelbar und wie machst du sie transparent?",
  },
  Konflikt: {
    intro:
      "Diese Dimension zeigt, wie du Spannungen ansprichst und nach Reibung wieder arbeitsfähig wirst. Sie beeinflusst, ob Konflikte für dich eher bremsen oder als Klärungshebel funktionieren.",
    reflectionQuestion:
      "Wie sprichst du einen kritischen Punkt so an, dass Klarheit entsteht und die Beziehung stabil bleibt?",
  },
};

export const SELF_DEVELOPMENT_COPY: Record<
  ReportDimension,
  { whyItMatters: string; nextSteps: string[] }
> = {
  Vision: {
    whyItMatters:
      "Die Vision-Dimension steuert, ob du dein Startup eher als solides Langstreckenmodell oder als schnelles Skalierungsvehikel führst. Das prägt Kapitalbedarf, Teamaufbau und strategische Prioritäten.",
    nextSteps: [
      "Lege für die nächsten 90 Tage eine klare Priorität fest: Fundament stärken oder Reichweite erhöhen.",
      "Definiere eine Kennzahl, die den Wechsel von Aufbau in Skalierung auslöst.",
      "Prüfe alle zwei Wochen, welche Aktivitäten echten langfristigen Wert schaffen.",
    ],
  },
  Entscheidung: {
    whyItMatters:
      "Dein Entscheidungsstil bestimmt, wie schnell du unter Unsicherheit handlungsfähig bleibst und wie stabil deine Entscheidungen im Team getragen werden. Gerade in frühen Phasen entscheidet das über Tempo und Fokus.",
    nextSteps: [
      "Nutze ein einfaches Entscheidungsraster mit drei Feldern: Faktenlage, Risiko, nächster Schritt.",
      "Definiere für wichtige Themen eine feste Entscheidungsfrist, um Endlosschleifen zu vermeiden.",
      "Plane nach großen Entscheidungen einen kurzen Review-Termin zur Kurskorrektur ein.",
    ],
  },
  Risiko: {
    whyItMatters:
      "Die Risiko-Dimension beeinflusst, wie mutig du Ressourcen einsetzt und wie robust du mit Unsicherheit umgehst. Sie ist zentral für Runway, Experimente und Krisenfestigkeit.",
    nextSteps: [
      "Erstelle für jede größere Wette ein klares Worst-Case-Szenario mit Abbruchkriterium.",
      "Führe eine monatliche Risiko-Liste mit Top-3-Risiken und konkreten Gegenmaßnahmen.",
      "Verknüpfe risikoreiche Entscheidungen immer mit einer messbaren Lernhypothese.",
    ],
  },
  Autonomie: {
    whyItMatters:
      "Diese Dimension legt fest, wie du zwischen enger Abstimmung und eigenverantwortlicher Umsetzung balancierst. Das entscheidet über Geschwindigkeit, Transparenz und Teamenergie.",
    nextSteps: [
      "Definiere pro Arbeitsbereich klar, was autonom entschieden wird und was gemeinsame Abstimmung braucht.",
      "Setze einen festen Wochenrhythmus aus Sync-Meeting und fokussierten Deep-Work-Blöcken.",
      "Dokumentiere offene Entscheidungen kurz schriftlich, damit asynchrone Arbeit sauber anschließt.",
    ],
  },
  Verbindlichkeit: {
    whyItMatters:
      "Verbindlichkeit ist ein Kernfaktor für Vertrauen im Gründeralltag. Sie bestimmt, wie planbar Zusagen, Deadlines und Verantwortungen tatsächlich sind.",
    nextSteps: [
      "Führe pro Woche maximal drei verbindliche Prioritäten, statt zu vieler paralleler Zusagen.",
      "Kennzeichne Risiken für Deadlines frühzeitig und kommuniziere sie vor dem Verzug.",
      "Schließe jede Woche mit einem kurzen Commit-Check ab: zugesagt, geliefert, nachjustiert.",
    ],
  },
  Konflikt: {
    whyItMatters:
      "Konfliktverhalten entscheidet, ob Spannungen produktiv geklärt oder aufgestaut werden. Für Gründerteams ist das direkt mit Geschwindigkeit und psychologischer Sicherheit verbunden.",
    nextSteps: [
      "Vereinbare eine klare Konfliktregel: Kritik zeitnah, konkret und lösungsorientiert ansprechen.",
      "Plane bei strittigen Themen zuerst zehn Minuten für Sichtweisen, dann zehn Minuten für Entscheidungen.",
      "Halte bei Konflikten immer einen konkreten nächsten Schritt und Verantwortliche fest.",
    ],
  },
};
