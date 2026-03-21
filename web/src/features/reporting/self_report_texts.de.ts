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
  Unternehmenslogik: {
    intro:
      "Diese Dimension zeigt, woran du unternehmerische Entscheidungen ausrichtest. Sie macht sichtbar, ob du stärker auf Marktlogik, Skalierbarkeit und strategische Wirkung schaust oder eher auf Substanz, Aufbau und langfristige Tragfähigkeit.",
    reflectionQuestion:
      "Welche anstehende Entscheidung zeigt am klarsten, ob du stärker in strategischer Wirkung oder stärker in Substanz und Aufbau denkst?",
    tendency: {
      left:
        "Du liest unternehmerische Entscheidungen zuerst über Marktlogik, Hebel und strategische Wirkung. Im Alltag fragst du schneller, was Reichweite erzeugt, was verwertbar ist und was das Unternehmen voranbringt. Das schafft Fokus und Zug, kann aber Substanzfragen zu spät auf den Tisch bringen.",
      center:
        "Du denkst weder rein über strategische Wirkung noch rein über Substanz. Im Alltag wägst du ab, wann Marktchance trägt und wann Aufbau wichtiger ist. Das macht dich beweglich, verlangt aber klare Priorisierung, sobald mehrere gute Optionen gleichzeitig auf dem Tisch liegen.",
      right:
        "Du richtest unternehmerische Entscheidungen stark an Substanz, Aufbau und Tragfähigkeit aus. Im Alltag prüfst du Chancen danach, ob sie das Unternehmen wirklich stabiler und belastbarer machen. Das schafft Tiefe und Konsistenz, kann Teams aber bei starken Marktfenstern spürbar bremsen.",
    },
    everydaySignals: [
      "Bei Wachstum, Hiring oder Kapitalfragen zeigt sich schnell, ob du zuerst auf Hebel oder zuerst auf Tragfähigkeit schaust.",
      "In strategischen Diskussionen wirst du besonders klar, wenn entschieden werden muss, was mehr Gewicht bekommt: Marktwirkung oder Aufbau.",
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
      "Diese Dimension zeigt, wie eng du im Alltag mit anderen arbeiten, abstimmen und sichtbar verbunden bleiben willst. Sie macht sichtbar, ob du lieber über klare Zuständigkeiten mit gezielter Abstimmung arbeitest oder über laufenden Austausch und ein gemeinsames Bild der Arbeit.",
    reflectionQuestion:
      "Wie eng willst du im Alltag mit anderen verbunden arbeiten, und an welchen Stellen reicht dir gezielte statt dauernder Abstimmung?",
    tendency: {
      left:
        "Du arbeitest am besten mit klaren Zuständigkeiten und eigenem Raum. Im Alltag willst du nicht bei jedem Schritt im Loop sein, sondern gezielt abstimmen, wenn etwas wirklich relevant wird. Das schafft Fokus und Tempo, kann aber schnell zu Reibung führen, wenn andere viel engere Rückkopplung brauchen.",
      center:
        "Du brauchst weder völlige Entkopplung noch ständige Nähe. Im Alltag ist für dich entscheidend, dass Abstimmung dort stattfindet, wo sie Orientierung gibt, und nicht als Dauergeräusch über allem liegt. Das macht Zusammenarbeit flexibel, verlangt im Team aber klare Absprachen darüber, wann Sichtbarkeit und Rückkopplung nötig sind.",
      right:
        "Du arbeitest lieber mit engem Austausch und einem laufenden Bild davon, was gerade passiert. Im Alltag willst du Fortschritt, offene Punkte und Entscheidungen nicht erst spät mitbekommen, sondern früh gemeinsam kalibrieren. Das hält Teams eng verbunden, wird aber anstrengend, wenn andere viel selbstständiger und mit weniger Sichtbarkeit arbeiten wollen.",
    },
    everydaySignals: [
      "Sichtbar wird das daran, wie oft du Rückkopplung brauchst und wie früh Fortschritt oder offene Punkte für dich geteilt werden sollen.",
      "Auch Check-ins, Übergaben und die Frage, wie viel man voneinander mitbekommen will, hängen stark an dieser Präferenz.",
    ],
  },
  Commitment: {
    intro:
      "Diese Dimension beschreibt, wie stark das Startup im Alltag für dich im Zentrum steht und welches Einsatzniveau du für realistisch hältst. Sie macht sichtbar, wie du Priorität, Verfügbarkeit und Intensität in einer Zusammenarbeit einordnest.",
    reflectionQuestion:
      "Welche Erwartung an Priorität, Verfügbarkeit oder Einsatzniveau willst du künftig früher explizit machen?",
    tendency: {
      left:
        "Das Startup ist für dich wichtig, aber Teil eines größeren Lebens- und Arbeitskontexts. Im Alltag achtest du darauf, dass Verfügbarkeit und Intensität bewusst begrenzt bleiben und auch neben anderen Verpflichtungen tragen. Das schafft einen nachhaltigen Rahmen, führt im Team aber schnell zu Reibung, wenn mehr Präsenz oder höhere Priorität still erwartet werden.",
      center:
        "Du gibst dem Startup spürbar Gewicht, ohne es in jeder Phase absolut in den Mittelpunkt zu stellen. Im Alltag kann die Priorität je nach Situation hoch sein, braucht aber klare Absprachen darüber, wann mehr Fokus erwartet wird und wann ein begrenzterer Modus reicht. Das macht Zusammenarbeit gut steuerbar, solange Intensität nicht bloß vorausgesetzt wird.",
      right:
        "Das Startup steht für dich klar im Zentrum. Im Alltag zeigt sich das in hoher Verfügbarkeit, starkem Fokus und der Erwartung, dass Energie und Aufmerksamkeit spürbar auf das Unternehmen ausgerichtet sind. Das schafft Zug und Klarheit, erzeugt aber schnell Spannung, wenn andere mit einem breiteren Lebens- oder Arbeitsrahmen planen.",
    },
    everydaySignals: [
      "Spürbar wird das bei der Frage, wie viel Verfügbarkeit im Alltag selbstverständlich ist und welchen Stellenwert das Startup gegenüber anderen Themen bekommt.",
      "Hier zeigt sich auch, welches Einsatzniveau du für dich und andere im Team realistisch erwartest.",
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
  Unternehmenslogik: {
    whyItMatters:
      "Wenn du deine Unternehmenslogik klar kennst, werden Prioritäten, Wachstum und strategische Entscheidungen im Team deutlich greifbarer. Gerade in der Co-Founder-Suche verhindert das stille Grundsatzkonflikte.",
    nextSteps: [
      "Halte schriftlich fest, woran du wichtige unternehmerische Entscheidungen ausrichtest: eher an strategischer Wirkung oder eher an tragfähigem Aufbau.",
      "Prüfe bei strategischen Chancen bewusst, ob du gerade Hebel suchst oder Substanz stärken willst.",
      "Nutze diese Achse als Filter für Prioritäten und Nein-Entscheidungen, statt sie nur implizit mitzudenken.",
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
      "Wie eng du im Alltag mit anderen verbunden arbeiten willst, entscheidet später über Reibung, Tempo und Orientierung. Gerade hier lohnt sich frühe Klarheit darüber, wie viel Abstimmung und Sichtbarkeit für dich wirklich nötig sind.",
    nextSteps: [
      "Halte fest, in welchen Situationen dir gezielte Abstimmung reicht und wo du engere Rückkopplung brauchst.",
      "Definiere ein realistisches Maß an Sichtbarkeit, das du über Fortschritt, offene Punkte und Entscheidungen erwartest.",
      "Notiere für dich, welcher Arbeitsrhythmus dich entlastet: mehr Eigenraum, mehr Check-ins oder ein bewusster Wechsel zwischen beidem.",
    ],
  },
  Commitment: {
    whyItMatters:
      "Gerade beim Commitment entstehen viele Spannungen nicht aus bösem Willen, sondern aus unterschiedlichen Arbeitsrealitäten. Je klarer du Priorität und Einsatzniveau für dich benennen kannst, desto eher lassen sich stille Fehlannahmen vermeiden.",
    nextSteps: [
      "Lege fest, welche Form von Verfügbarkeit du im Alltag realistisch zusagen willst.",
      "Sprich deine Annahmen über Priorität und Intensität bewusst aus, bevor andere sie erraten müssen.",
      "Prüfe regelmäßig, in welchen Phasen du ein höheres Einsatzniveau erwartest und wann ein begrenzterer Rahmen für dich stimmig ist.",
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
