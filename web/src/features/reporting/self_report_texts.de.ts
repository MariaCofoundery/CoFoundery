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
        "Du denkst das Unternehmen zuerst von Tragfähigkeit und Substanz her. Im Alltag prüfst du Chancen eher auf Machbarkeit als auf große Vision. Das hält Entscheidungen bodenständig, kann Teams aber länger vor mutigen Sprüngen bremsen.",
      center:
        "Du hältst bei Richtung und Horizont bewusst mehrere Optionen offen. Im Alltag wechselst du zwischen Aufbau, Gelegenheit und wirtschaftlicher Vernunft, statt dich früh festzulegen. Das macht dich flexibel, kann Teams aber in der Schwebe halten, wenn Richtung nicht aktiv entschieden wird.",
      right:
        "Du denkst das Unternehmen klar vom langfristigen Aufbau und einer größeren Richtung her. Im Alltag ordnest du Chancen danach ein, ob sie zur Vision passen und das Unternehmen wirklich weitertragen. Das gibt Teams Zug und Orientierung, erhöht aber den Druck auf gemeinsame strategische Klarheit.",
    },
    everydaySignals: [
      "Bei Wachstum, Hiring oder Kapitalfragen spielt für dich die langfristige Richtung mit hinein.",
      "In strategischen Diskussionen wirst du besonders klar, wenn es um den Kurs des Unternehmens geht.",
    ],
  },
  Entscheidungslogik: {
    intro:
      "Diese Dimension beschreibt, wie du Entscheidungen unter Unsicherheit triffst. Sie beeinflusst, wie viel Analyse, Absicherung und Intuition du im Alltag brauchst, bevor du handelst.",
    reflectionQuestion:
      "Woran merkst du konkret, dass eine Entscheidung ausreichend geklaert ist und nicht noch mehr Absicherung braucht?",
    tendency: {
      left:
        "Du willst Entscheidungen sauber begründen, bevor du sie triffst. Im Alltag sammelst du lieber erst Struktur, Daten und Gegenargumente, statt vorschnell auf Momentum zu setzen. Das erhöht die Qualität, kostet in schnellen Phasen aber spürbar Tempo.",
      center:
        "Du verbindest Analyse und pragmatisches Vorangehen, statt nur einer Logik zu folgen. Im Alltag schaltest du je nach Situation zwischen Absicherung und Tempo um. Das macht dich anschlussfähig, verlangt im Team aber klare Kriterien dafür, wann für dich wirklich genug Grundlage da ist.",
      right:
        "Du entscheidest zügig und vertraust stark auf Einordnung, Gespür und Bewegung nach vorn. Im Alltag gehst du lieber mit einer tragfähigen ersten Richtung los, statt Analysefenster lange offenzuhalten. Das bringt Tempo, braucht im Team aber Gegenchecks bei folgenreichen Entscheidungen.",
    },
    everydaySignals: [
      "Bei offenen Fragen zeigt sich schnell, wie viel Grundlage du vor einem Go oder No-Go brauchst.",
      "In Teams wird hier sichtbar, ob du eher über Prozessklarheit oder über Momentum führst.",
    ],
  },
  Risikoorientierung: {
    intro:
      "Diese Dimension macht sichtbar, wie du mit Unsicherheit, Wagnis und neuen Chancen umgehst. Sie prägt, wie mutig du Schritte setzt und wie viel Absicherung du dabei brauchst.",
    reflectionQuestion:
      "Bei welcher Art von Risiko willst du künftig bewusster festlegen, was für dich noch tragbar ist und was nicht mehr?",
    tendency: {
      left:
        "Du gehst Risiken kontrolliert an und willst zuerst wissen, was ein Schritt kosten kann. Im Alltag suchst du eher Leitplanken, Sicherheiten und klare Stop-Kriterien. Das schützt vor teuren Schnellschüssen, lässt Chancen aber oft später anlaufen.",
      center:
        "Du wägt Risiken bewusst ab und gehst weder reflexhaft auf Sicherheit noch auf maximale Chance. Im Alltag prüfst du, wann Mut sinnvoll ist und wann Stabilität wichtiger wird. Das ist für Teams tragfähig, solange unter Druck trotzdem klar bleibt, wo deine Grenze liegt.",
      right:
        "Du bist offen für mutige Schritte, wenn darin echte unternehmerische Chance liegt. Im Alltag hält dich Unsicherheit selten lange auf, wenn Richtung oder Lerngewinn greifbar wirken. Das kann Teams stark nach vorne ziehen, braucht aber gemeinsame Guardrails für Tragfähigkeit.",
    },
    everydaySignals: [
      "Diese Haltung wird bei Experimenten, Launches und Wachstumswetten schnell sichtbar.",
      "Unter Unsicherheit zeigt sich, ob du zuerst absicherst oder zuerst ausprobierst.",
    ],
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    intro:
      "Diese Dimension zeigt, wie du Zusammenarbeit zwischen Eigenständigkeit und enger Abstimmung organisierst. Sie beeinflusst, wie viel Einblick, Mitsprache und Struktur du im Alltag brauchst.",
    reflectionQuestion:
      "Welche Form von Abstimmung brauchst du im Alltag wirklich, und wo willst du bewusst mehr Eigenständigkeit behalten?",
    tendency: {
      left:
        "Du arbeitest am stärksten mit klaren Verantwortungsräumen und viel operativer Freiheit. Im Alltag willst du nicht jede Bewegung abstimmen, sondern in deinem Bereich eigenständig liefern. Das schafft Tempo und Ownership, erzeugt ohne klare Transparenz aber schnell stille Missverständnisse.",
      center:
        "Du verbindest Eigenständigkeit mit Austausch, statt nur auf einen Arbeitsmodus zu setzen. Im Alltag willst du genug Transparenz für gute Abstimmung, ohne Verantwortung zu verwässern. Das macht Zusammenarbeit flexibel, braucht im Team aber klare Regeln für Einblick und Mitsprache.",
      right:
        "Du bevorzugst enge Abstimmung und ein gemeinsames laufendes Bild der Arbeit. Im Alltag suchst du Transparenz, Mitsprache und kurze Schleifen, damit nichts auseinanderläuft. Das kann Teams eng und wirksam machen, kostet aber schnell Energie, wenn Verantwortungsräume nicht klar bleiben.",
    },
    everydaySignals: [
      "Sichtbar wird das daran, wie viel Einblick du in andere Bereiche brauchst und wie viel Mitsprache für dich sinnvoll ist.",
      "Auch Rollen, Verantwortungsgrenzen und Meeting-Rhythmen hängen stark an dieser Präferenz.",
    ],
  },
  Commitment: {
    intro:
      "Diese Dimension beschreibt, welchen Stellenwert Verfügbarkeit, Fokus und Einsatz in deinem Gründeralltag haben. Sie ist zentral für Erwartungen an Tempo, Belastung und Prioritäten.",
    reflectionQuestion:
      "Welche Erwartung an Fokus, Verfügbarkeit oder Einsatz solltest du künftig früher explizit machen?",
    tendency: {
      left:
        "Du definierst Commitment nicht nur über maximale Verfügbarkeit, sondern über einen tragfähigen Rahmen. Im Alltag achtest du darauf, dass Einsatz, Belastung und andere Verpflichtungen realistisch zusammenpassen. Das schützt vor Überforderung, kann im Team aber schnell als geringerer Anspruch gelesen werden, wenn Erwartungen unausgesprochen bleiben.",
      center:
        "Du verbindest Verbindlichkeit mit einem realistischen Blick auf Belastung und Nachhaltigkeit. Im Alltag willst du liefern, ohne daraus automatisch einen Dauer-Hochmodus zu machen. Das ist für Zusammenarbeit gesund, braucht aber klare Absprachen darüber, was für dich verbindlich zugesagt ist.",
      right:
        "Du gibst dem Startup hohe Priorität und setzt Commitment stark über Fokus, Verfügbarkeit und Verbindlichkeit. Im Alltag zeigt sich das in klarem Einsatz, hoher Präsenz und wenig Toleranz für lose Zusagen. Das erzeugt Zugkraft, setzt im Team aber voraus, dass andere diesen Anspruch kennen und mittragen.",
    },
    everydaySignals: [
      "Spürbar wird das bei der Frage, wie verfügbar du im Alltag sein willst und welchen Stellenwert das Startup hat.",
      "Hier zeigt sich auch, was für dich als fairer und realistischer Einsatz gilt.",
    ],
  },
  Konfliktstil: {
    intro:
      "Diese Dimension zeigt, wie du Spannungen, Feedback und Meinungsverschiedenheiten bearbeitest. Sie beeinflusst direkt, wie schnell Konflikte geklärt werden und wie sich Zusammenarbeit unter Druck anfühlt.",
    reflectionQuestion:
      "Wie willst du kuenftig mit einem schwierigen Punkt umgehen, damit Klarheit entsteht, ohne die Zusammenarbeit unnötig zu belasten?",
    tendency: {
      left:
        "Du gehst Spannungen eher über Reflexion, Timing und Abstand an, bevor du sie öffnest. Im Alltag sortierst du Kritik und Irritationen zuerst, statt jedes Thema sofort direkt zu adressieren. Das kann Konflikte klüger rahmen, lässt wichtige Punkte aber leicht zu lange liegen.",
      center:
        "Du verbindest Klarheit mit Timing und entscheidest situativ, wie direkt ein schwieriger Punkt sein muss. Im Alltag spürst du meist gut, wann Offenheit hilft und wann ein besserer Rahmen zuerst wichtiger ist. Das macht dich im Konflikt anschlussfähig, verlangt aber, dass Unschärfe nicht zu lange stehen bleibt.",
      right:
        "Du sprichst Spannungen schnell an und gehst ohne große Umwege in kritische Gespräche. Im Alltag gibst du direktes Feedback und willst Reibung lieber klären als mitschleppen. Das schafft Tempo in der Klärung, braucht im Team aber Vertrauen und ein Gefühl dafür, wie viel Direktheit der Moment trägt.",
    },
    everydaySignals: [
      "Das zeigt sich daran, wie schnell du Irritationen ansprichst und wie direkt dein Feedback ausfällt.",
      "Unter Druck entscheidet dieser Stil oft darüber, ob Klärung gelingt oder Missverständnisse stehen bleiben.",
    ],
  },
};

export const SELF_DEVELOPMENT_COPY: Record<
  FounderDimensionKey,
  { whyItMatters: string; nextSteps: string[] }
> = {
  "Vision & Unternehmenshorizont": {
    whyItMatters:
      "Eine klare Richtung hilft dir später, Wachstum, Prioritäten und Kapitalfragen konsistent einzuordnen. Gerade in der Co-Founder-Suche schafft sie früh Orientierung.",
    nextSteps: [
      "Halte schriftlich fest, welche Art von Unternehmen du in den nächsten drei bis fünf Jahren wirklich bauen willst.",
      "Prüfe bei strategischen Chancen bewusst, ob sie zu deinem bevorzugten Zeithorizont passen.",
      "Benutze Vision nicht nur als Leitbild, sondern als Filter für Prioritäten und Nein-Entscheidungen.",
    ],
  },
  Entscheidungslogik: {
    whyItMatters:
      "Wenn du deine eigene Entscheidungslogik klar kennst, fällt spätere Abstimmung mit Mitgründern deutlich leichter. So werden Tempo und Absicherung bewusster statt zufällig.",
    nextSteps: [
      "Definiere für dich, welche Entscheidungen du mit 70 Prozent Klarheit treffen kannst und welche mehr Absicherung brauchen.",
      "Halte bei größeren Entscheidungen kurz fest, worauf du dich konkret gestützt hast.",
      "Beobachte bei den nächsten Entscheidungen, wann du zu lange analysierst oder zu schnell springst.",
    ],
  },
  Risikoorientierung: {
    whyItMatters:
      "Dein Umgang mit Risiko prägt Wachstum, Experimente und finanzielle Sicherheit. Ein klares eigenes Profil hilft dir, später bessere gemeinsame Guardrails zu setzen.",
    nextSteps: [
      "Lege für riskantere Schritte ein einfaches Abbruch- oder Stop-Kriterium fest.",
      "Trenne bewusster zwischen Risiken, die du aktiv eingehen willst, und Risiken, die du nur aus Druck heraus eingehst.",
      "Verknüpfe größere Experimente künftig mit einer klaren Lernfrage statt nur mit Hoffnung.",
    ],
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    whyItMatters:
      "Wie du Zusammenarbeit organisieren willst, entscheidet später über Tempo, Transparenz und Reibung im Alltag. Gerade hier lohnen frühe Klarheit und konkrete Erwartungen.",
    nextSteps: [
      "Halte fest, wo du klare Verantwortungsräume brauchst und wo dir enge Abstimmung wichtig ist.",
      "Definiere ein realistisches Mindestmaß an Transparenz, das du in gemeinsamer Arbeit erwartest.",
      "Notiere für dich, welche Rollen- und Abstimmungsform dich im Alltag wirklich entlastet.",
    ],
  },
  Commitment: {
    whyItMatters:
      "Commitment ist im Gründeralltag nicht nur Einsatz, sondern auch Erwartungsmanagement. Je klarer du deinen eigenen Rahmen kennst, desto eher lassen sich spätere Missverständnisse vermeiden.",
    nextSteps: [
      "Lege fest, welche Form von Verfügbarkeit du realistisch zusagen kannst.",
      "Sprich innere Annahmen über Priorität und Belastung bewusst aus, bevor andere sie erraten müssen.",
      "Prüfe regelmäßig, wo hoher Einsatz sinnvoll ist und wo er nur unsichtbaren Druck erzeugt.",
    ],
  },
  Konfliktstil: {
    whyItMatters:
      "Ein geklärter Konfliktstil macht Zusammenarbeit robuster. Gerade in Gründerteams entscheidet oft nicht das Thema selbst, sondern die Art des Umgangs miteinander.",
    nextSteps: [
      "Formuliere für dich, wann du Spannung direkt ansprechen willst und wann du erst Abstand brauchst.",
      "Achte darauf, Kritik künftig so konkret zu machen, dass daraus ein nächster Schritt entstehen kann.",
      "Notiere eine einfache Regel, wie du nach einem schwierigen Gespräch wieder in Zusammenarbeit findest.",
    ],
  },
};
