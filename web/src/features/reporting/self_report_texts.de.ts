import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

type TendencyCopy = {
  left: string;
  center: string;
  right: string;
};

export const SELF_DIMENSION_COPY: Record<
  FounderDimensionKey,
  {
    intro: string;
    reflectionQuestion: string;
    tendency: TendencyCopy;
    everydaySignals: string[];
  }
> = {
  "Vision & Unternehmenshorizont": {
    intro:
      "Diese Dimension zeigt, wie du über Richtung, Wachstum und Zeithorizont nachdenkst. Sie prägt, wie du Chancen einordnest und welche Art von Unternehmen du langfristig bauen willst.",
    reflectionQuestion:
      "Welche strategische Entscheidung in den nächsten 90 Tagen zeigt am klarsten, worauf du dein Unternehmen ausrichten willst?",
    tendency: {
      left:
        "Aktuell wirkt dein Profil hier eher auf klare wirtschaftliche Tragfaehigkeit, optionalere Wege und begrenztere Wetten ausgerichtet.",
      center:
        "Aktuell haeltst du hier mehrere Optionen in Balance und wirkst weder klar exit- noch klar auf langfristigen Aufbau festgelegt.",
      right:
        "Aktuell wirkt dein Profil hier eher auf langfristigen Aufbau, unternehmerische Entwicklung und eine groessere Vision ausgerichtet.",
    },
    everydaySignals: [
      "Du priorisierst Chancen unterschiedlich danach, ob sie langfristig Richtung geben oder nur kurzfristig Bewegung erzeugen.",
      "Bei Wachstumsschritten, Hiring oder Kapitalfragen spielt fuer dich der Zeithorizont des Unternehmens eine wichtige Rolle.",
      "In strategischen Diskussionen wirst du oft dort klar, wo es um Richtung statt nur um einzelne Massnahmen geht.",
    ],
  },
  Entscheidungslogik: {
    intro:
      "Diese Dimension beschreibt, wie du Entscheidungen unter Unsicherheit triffst. Sie beeinflusst, wie viel Analyse, Absicherung und Intuition du im Alltag brauchst, bevor du handelst.",
    reflectionQuestion:
      "Woran merkst du konkret, dass eine Entscheidung ausreichend geklaert ist und nicht noch mehr Absicherung braucht?",
    tendency: {
      left:
        "Aktuell suchst du hier eher Struktur, Analyse und eine nachvollziehbare Entscheidungsgrundlage, bevor du festlegst.",
      center:
        "Aktuell wirkst du hier balanciert zwischen analytischer Absicherung und pragmatischem Vorangehen.",
      right:
        "Aktuell setzt du hier eher auf Gespuer, Tempo und zuegige Einordnung, statt lange Analysephasen auszudehnen.",
    },
    everydaySignals: [
      "Du merkst diese Praeferenz vor allem daran, wie schnell du bei offenen Fragen zu einer ersten Richtung kommst.",
      "In dynamischen Phasen zeigt sich das oft darin, wie viel Absicherung du vor einem Go oder No-Go wirklich brauchst.",
      "Auch in Teams wird hier schnell sichtbar, ob du eher ueber Klarheit im Prozess oder ueber Momentum fuehrst.",
    ],
  },
  Risikoorientierung: {
    intro:
      "Diese Dimension macht sichtbar, wie du mit Unsicherheit, Wagnis und neuen Chancen umgehst. Sie praegt, wie mutig du Schritte setzt und wie viel Absicherung du dabei brauchst.",
    reflectionQuestion:
      "Bei welcher Art von Risiko willst du kuenftig bewusster festlegen, was fuer dich noch tragbar ist und was nicht mehr?",
    tendency: {
      left:
        "Aktuell wirkt dein Profil hier eher vorsichtig und auf Absicherung, Stabilitaet und klare Leitplanken ausgerichtet.",
      center:
        "Aktuell gehst du hier weder besonders vorsichtig noch besonders offensiv vor, sondern eher mit balancierter Risikoabwaegung.",
      right:
        "Aktuell wirkt dein Profil hier eher chancenorientiert und offen fuer mutigere Schritte trotz Unsicherheit.",
    },
    everydaySignals: [
      "Das zeigt sich haeufig bei Experimenten, Launch-Entscheidungen oder der Frage, wie frueh etwas live gehen darf.",
      "Auch Finanzierung, Runway und Wachstumswetten werden von dieser Grundhaltung oft direkt mitgepraegt.",
      "Unter Unsicherheit wird hier schnell sichtbar, ob du eher zuerst absicherst oder eher zuerst ausprobierst.",
    ],
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    intro:
      "Diese Dimension zeigt, wie du Zusammenarbeit zwischen Eigenstaendigkeit und enger Abstimmung organisierst. Sie beeinflusst, wie viel Einblick, Mitsprache und Struktur du im Alltag brauchst.",
    reflectionQuestion:
      "Welche Form von Abstimmung brauchst du im Alltag wirklich, und wo willst du bewusst mehr Eigenstaendigkeit behalten?",
    tendency: {
      left:
        "Aktuell bevorzugst du hier eher Eigenstaendigkeit, klare Verantwortungsraeume und viel operative Freiheit.",
      center:
        "Aktuell wirkst du hier balanciert zwischen Austausch, Transparenz und eigenverantwortlicher Umsetzung.",
      right:
        "Aktuell bevorzugst du hier eher enge Abstimmung, hoehere Transparenz und ein gemeinsames laufendes Bild der Arbeit.",
    },
    everydaySignals: [
      "Im Alltag zeigt sich das daran, wie viel Einblick du in die Arbeit anderer brauchst und wie viel Mitsprache fuer dich sinnvoll ist.",
      "Auch Rollen, Verantwortungsgrenzen und Meeting-Rhythmen werden von dieser Praeferenz stark beeinflusst.",
      "Gerade in Gruendungsteams wird hier frueh spuerbar, ob Zusammenarbeit entlastet oder eher Zusatzkoordination erzeugt.",
    ],
  },
  Commitment: {
    intro:
      "Diese Dimension beschreibt, welchen Stellenwert Verfuegbarkeit, Fokus und Einsatz in deinem Gruenderalltag haben. Sie ist zentral fuer Erwartungen an Tempo, Belastung und Prioritaeten.",
    reflectionQuestion:
      "Welche Erwartung an Fokus, Verfuegbarkeit oder Einsatz solltest du kuenftig frueher explizit machen?",
    tendency: {
      left:
        "Aktuell wirkt dein Profil hier eher flexibel und offen fuer wechselnde Belastung, Prioritaeten und Verfuegbarkeit.",
      center:
        "Aktuell wirkst du hier balanciert zwischen Verbindlichkeit und einem realistischen, tragfaehigen Arbeitsmodus.",
      right:
        "Aktuell wirkt dein Profil hier eher stark fokussiert, verbindlich und auf hohe Prioritaet des Startups ausgerichtet.",
    },
    everydaySignals: [
      "Spuerbar wird das haeufig bei der Frage, wie verfuegbar du im Alltag sein willst und welchen Stellenwert das Startup gegenueber anderen Verpflichtungen hat.",
      "Auch Tempo, Erwartung an Einsatz und der Umgang mit Belastung werden von dieser Haltung mitbestimmt.",
      "In Co-Founder-Konstellationen wird hier oft sichtbar, was fuer dich als fairer und realistischer Einsatz gilt.",
    ],
  },
  Konfliktstil: {
    intro:
      "Diese Dimension zeigt, wie du Spannungen, Feedback und Meinungsverschiedenheiten bearbeitest. Sie beeinflusst direkt, wie schnell Konflikte geklaert werden und wie sich Zusammenarbeit unter Druck anfuehlt.",
    reflectionQuestion:
      "Wie willst du kuenftig mit einem schwierigen Punkt umgehen, damit Klarheit entsteht, ohne die Zusammenarbeit unnötig zu belasten?",
    tendency: {
      left:
        "Aktuell gehst du hier eher reflektierend, mit mehr Abstand und vorsichtigerem Timing in schwierige Gespraeche.",
      center:
        "Aktuell wirkst du hier balanciert zwischen Klarheit, Timing und Ruecksicht auf den Rahmen des Gespraechs.",
      right:
        "Aktuell gehst du hier eher direkt, schnell und ohne viel Umweg in Spannungen oder kritische Rueckmeldungen.",
    },
    everydaySignals: [
      "Das zeigt sich oft daran, wie schnell du Irritationen ansprichst und wie direkt dein Feedback ausfaellt.",
      "Auch Timing, Ton und die Frage, ob Spannung zuerst intern verarbeitet oder sofort benannt wird, spielen hier hinein.",
      "Gerade unter Druck praegt dieser Stil stark, ob Klaerung schnell gelingt oder Missverstaendnisse laenger stehen bleiben.",
    ],
  },
};

export const SELF_DEVELOPMENT_COPY: Record<
  FounderDimensionKey,
  { whyItMatters: string; nextSteps: string[] }
> = {
  "Vision & Unternehmenshorizont": {
    whyItMatters:
      "Eine klare Richtung hilft dir spaeter, Wachstum, Prioritaeten und Kapitalfragen konsistent einzuordnen. Gerade in der Co-Founder-Suche schafft sie frueh Orientierung.",
    nextSteps: [
      "Halte schriftlich fest, welche Art von Unternehmen du in den naechsten drei bis fuenf Jahren wirklich bauen willst.",
      "Pruefe bei strategischen Chancen bewusst, ob sie zu deinem bevorzugten Zeithorizont passen.",
      "Benutze Vision nicht nur als Leitbild, sondern als Filter fuer Prioritaeten und Nein-Entscheidungen.",
    ],
  },
  Entscheidungslogik: {
    whyItMatters:
      "Wenn du deine eigene Entscheidungslogik klar kennst, faellt spaetere Abstimmung mit Mitgruendern deutlich leichter. So werden Tempo und Absicherung bewusster statt zufaellig.",
    nextSteps: [
      "Definiere fuer dich, welche Entscheidungen du mit 70 Prozent Klarheit treffen kannst und welche mehr Absicherung brauchen.",
      "Halte bei groesseren Entscheidungen kurz fest, worauf du dich konkret gestuetzt hast.",
      "Beobachte bei den naechsten Entscheidungen, wann du zu lange analysierst oder zu schnell springst.",
    ],
  },
  Risikoorientierung: {
    whyItMatters:
      "Dein Umgang mit Risiko praegt Wachstum, Experimente und finanzielle Sicherheit. Ein klares eigenes Profil hilft dir, spaeter bessere gemeinsame Guardrails zu setzen.",
    nextSteps: [
      "Lege fuer riskantere Schritte ein einfaches Abbruch- oder Stop-Kriterium fest.",
      "Trenne bewusster zwischen Risiken, die du aktiv eingehen willst, und Risiken, die du nur aus Druck heraus eingehst.",
      "Verknuepfe groessere Experimente kuenftig mit einer klaren Lernfrage statt nur mit Hoffnung.",
    ],
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    whyItMatters:
      "Wie du Zusammenarbeit organisieren willst, entscheidet spaeter ueber Tempo, Transparenz und Reibung im Alltag. Gerade hier lohnen fruehe Klarheit und konkrete Erwartungen.",
    nextSteps: [
      "Halte fest, wo du klare Verantwortungsraeume brauchst und wo dir enge Abstimmung wichtig ist.",
      "Definiere ein realistisches Mindestmass an Transparenz, das du in gemeinsamer Arbeit erwartest.",
      "Notiere fuer dich, welche Rollen- und Abstimmungsform dich im Alltag wirklich entlastet.",
    ],
  },
  Commitment: {
    whyItMatters:
      "Commitment ist im Gruenderalltag nicht nur Einsatz, sondern auch Erwartungsmanagement. Je klarer du deinen eigenen Rahmen kennst, desto eher lassen sich spaetere Missverstaendnisse vermeiden.",
    nextSteps: [
      "Lege fest, welche Form von Verfuegbarkeit du realistisch zusagen kannst.",
      "Sprich innere Annahmen ueber Prioritaet und Belastung bewusst aus, bevor andere sie erraten muessen.",
      "Pruefe regelmaessig, wo hoher Einsatz sinnvoll ist und wo er nur unsichtbaren Druck erzeugt.",
    ],
  },
  Konfliktstil: {
    whyItMatters:
      "Ein geklaerter Konfliktstil macht Zusammenarbeit robuster. Gerade in Gruenderteams entscheidet oft nicht das Thema selbst, sondern die Art des Umgangs miteinander.",
    nextSteps: [
      "Formuliere fuer dich, wann du Spannung direkt ansprechen willst und wann du erst Abstand brauchst.",
      "Achte darauf, Kritik kuenftig so konkret zu machen, dass daraus ein naechster Schritt entstehen kann.",
      "Notiere eine einfache Regel, wie du nach einem schwierigen Gespraech wieder in Zusammenarbeit findest.",
    ],
  },
};
