import {
  buildSelfReportSelection,
  SELF_REPORT_SELECTION_DEBUG_CASES,
  type SelfReportComplementRole,
  type SelfReportComplementRoleKind,
  type SelfReportStrengthBand,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

export type ComplementCard = {
  role: SelfReportComplementRoleKind;
  title: string;
  description: string;
};

type ComplementEntry = {
  title: string;
  description: string | ((band: SelfReportStrengthBand) => string);
};

type ComplementRoleMap = Record<
  SelfReportComplementRoleKind,
  Record<FounderDimensionKey, Record<SelfReportTendencyKey, ComplementEntry>>
>;

const COMPLEMENT_TEXT: ComplementRoleMap = {
  counterweight: {
    Unternehmenslogik: {
      left: {
        title: "Mehr Substanz im Blick",
        description:
          "Gut ergänzt wirst du durch Menschen, die Wachstum und Wirkung nicht kleinreden, aber früh fragen, was davon auch morgen noch trägt. Genau darin liegt der Ausgleich: strategische Zugkraft bleibt da, ohne dass Aufbau und Belastbarkeit unter die Räder kommen. So werden große Hebel eher in Schritte übersetzt, die im Alltag standhalten.",
      },
      center: {
        title: "Klarer an Weggabelungen",
        description: (band) =>
          band === "balanced"
            ? "Gut ergänzt wirst du durch Menschen, die an Grundsatzpunkten klar benennen, ob gerade Wirkung oder Aufbau führen soll. Die Ergänzung liegt hier nicht im Gegenpol, sondern in klarer Zuspitzung. Dadurch bleibt ihr nicht zu lange in einer offenen Grundsatzfrage hängen."
            : "Gut ergänzt wirst du durch Menschen, die bei Grundsatzfragen früher zuspitzen, woran ihr euch gerade orientiert. Die Ergänzung liegt hier vor allem in Klarheit, nicht in Härte. So kippen offene Richtungsfragen seltener in lange Schleifen.",
      },
      right: {
        title: "Mehr Zug nach vorn",
        description:
          "Hilfreich ist oft ein Gegenüber, das Marktfenster und Hebel schnell erkennt, ohne deinen Blick auf Substanz kleinzumachen. Die Ergänzung liegt darin, Bewegung auszulösen, während du Tragfähigkeit absicherst. So bleibt Aufbau nicht hängen, wenn eigentlich ein klarer nächster Schritt auf dem Tisch liegt.",
      },
    },
    Entscheidungslogik: {
      left: {
        title: "Früher zum Punkt",
        description:
          "Gut ergänzt wirst du durch Menschen, die auch mit offeneren Fragen handlungsfähig bleiben und nicht jede Lücke erst ganz schließen müssen. Darin liegt der Ausgleich: deine Sorgfalt bleibt erhalten, während Entscheidungen früher einen klaren Punkt bekommen. So zieht sich Abwägung seltener länger als die Sache selbst.",
      },
      center: {
        title: "Klarer entscheiden",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das sichtbar markiert, wann Prüfen reicht und wann eine Entscheidung dran ist. Die Ergänzung liegt hier in Klarheit über den Umschaltpunkt. Dadurch bleibt Situationsgefühl kein stilles Rätsel für das Team."
            : "Hilfreich ist eher ein Gegenüber, das im entscheidenden Moment den Punkt setzt, ohne deine Abwägung zu übergehen. Genau das gleicht deine Beweglichkeit aus: Sorgfalt bleibt, aber der Abschluss wird klarer. So bleibt ihr nicht zwischen Prüfen und Handeln hängen.",
      },
      right: {
        title: "Mehr Gegenprüfung dabei",
        description:
          "Hilfreich ist oft ein Gegenüber, das Tempo nicht ausbremst, aber bei größeren Weichenstellungen sauber gegenprüft. Darin liegt der Ausgleich: Entscheidungen bleiben beweglich und bekommen trotzdem mehr Unterbau. Gerade bei folgenreichen Schritten nimmt das Druck aus schnellen Zuspitzungen.",
      },
    },
    Risikoorientierung: {
      left: {
        title: "Mutiger nach vorn",
        description:
          "Gut ergänzt wirst du durch Menschen, die Chancen klar benennen und bei guten Fenstern früher Bewegung erzeugen. Die Ergänzung liegt hier darin, dass dein Blick für Grenzen erhalten bleibt, ohne dass jedes Wagnis zu lange auf Halt wartet. So kommt eher Tempo rein, wenn der Rahmen eigentlich schon tragbar ist.",
      },
      center: {
        title: "Klarer bei Wagnissen",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das bei Chancen und Risiken klarer markiert, wie weit ihr wirklich gehen wollt. Die Ergänzung liegt hier in expliziten Schwellen statt situativem Erraten. Dadurch wird Risiko im Team seltener jedes Mal neu verhandelt."
            : "Hilfreich ist eher ein Gegenüber, das bei Risiko-Fragen früh Klartext spricht und eure Schwelle sichtbar macht. Genau das gleicht deine situative Beweglichkeit aus. So bleibt besser lesbar, wann Vorangehen dran ist und wann nicht.",
      },
      right: {
        title: "Mehr Maß im Risiko",
        description:
          "Hilfreich ist oft ein Gegenüber, das Chancen nicht kleinredet, aber Geld, Timing und Tragbarkeit früh begrenzt. Die Ergänzung liegt darin, dass dein Vorwärtsdrang nicht gebremst, sondern sauber gerahmt wird. So muss das Team Grenzen nicht erst nachziehen, wenn schon viel Einsatz auf dem Tisch liegt.",
      },
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      left: {
        title: "Mehr Mitsicht im Ablauf",
        description:
          "Gut ergänzt wirst du durch Menschen, die dir Eigenraum lassen und trotzdem früh sichtbar machen, wenn etwas kippt, hängt oder abgestimmt werden muss. Die Ergänzung liegt hier in Verbindung ohne Übersteuerung. So fühlen sich andere nicht erst sehr spät eingebunden, wenn du längst weiter bist.",
      },
      center: {
        title: "Stabiler im Modus",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das Arbeitsmodi sichtbar macht und nicht voraussetzt, dass beide denselben Abstimmungsbedarf haben. Die Ergänzung liegt hier in Verlässlichkeit darüber, wann Nähe hilft und wann Eigenraum trägt. So müsst ihr den Arbeitsmodus nicht ständig nebenbei klären."
            : "Hilfreich ist eher ein Gegenüber, das gut markiert, wann enge Abstimmung hilft und wann sie nur Reibung erzeugt. Das gleicht deinen wechselnden Modus aus, ohne ihn festzuzurren. So bleibt Zusammenarbeit lesbar, auch wenn die Lage sich ändert.",
      },
      right: {
        title: "Mehr Eigenraum im Alltag",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die eigenständig arbeiten können und trotzdem früh teilen, was wichtig, offen oder kritisch wird. Darin liegt der Ausgleich: du bleibst verbunden, ohne jeden Schritt eng begleiten zu müssen. So wird Abstimmung seltener zur Daueraufgabe.",
      },
    },
    Commitment: {
      left: {
        title: "Mehr Fokus auf die Sache",
        description:
          "Gut ergänzt wirst du durch Menschen, die in wichtigen Phasen mehr Zug auf das Startup bringen, ohne deinen breiteren Rahmen in Frage zu stellen. Die Ergänzung liegt darin, Priorität sichtbar zu machen, ohne sie moralisch aufzuladen. So wird aus unterschiedlichem Einsatzniveau nicht automatisch Erwartungsdruck.",
      },
      center: {
        title: "Klarer bei Intensität",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das früh benennt, wann hoher Fokus gefragt ist und wann ein begrenzterer Modus völlig reicht. Die Ergänzung liegt hier in expliziten Erwartungen statt stiller Deutung. So bleibt Intensität im Team besser lesbar."
            : "Hilfreich ist eher ein Gegenüber, das Verfügbarkeit und Einsatz konkret macht, statt sie aus dem Moment heraus zu verhandeln. Genau das gleicht deine situative Steuerung aus. So entstehen seltener stille Differenzen darüber, wie viel gerade wirklich gefragt ist.",
      },
      right: {
        title: "Mehr Luft im Einsatz",
        description:
          "Hilfreich ist oft ein Gegenüber, das hohe Priorisierung versteht, aber Unterschiede in Kapazität und Alltag früh sichtbar macht. Die Ergänzung liegt darin, Tempo ernst zu nehmen, ohne jeden Rahmen gleich hochzuziehen. So wird aus Intensität seltener stiller Druck auf andere.",
      },
    },
    Konfliktstil: {
      left: {
        title: "Früher an den Punkt",
        description:
          "Gut ergänzt wirst du durch Menschen, die Themen ruhig, aber früher aufmachen, wenn du noch sortierst. Die Ergänzung liegt nicht in mehr Härte, sondern in einem etwas früheren Gesprächsbeginn. So bleibt Reibung seltener zu lange unter der Oberfläche.",
      },
      center: {
        title: "Klarer im Timing",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das Spannungen weder unnötig schärft noch zu lange mitschwingen lässt. Die Ergänzung liegt hier in einem verlässlichen Gefühl dafür, wann ein Thema jetzt auf den Tisch muss. So bleibt Timing nicht bloß Bauchgefühl."
            : "Hilfreich ist eher ein Gegenüber, das Dinge offen benennt, ohne jede Reibung sofort unnötig scharf zu machen. Genau das gleicht deinen situativen Konfliktrhythmus aus. So wird früher klar, wann ein Thema Gespräch braucht.",
      },
      right: {
        title: "Mehr Ruhe in Reibung",
        description:
          "Hilfreich ist oft ein Gegenüber, das Direktheit aushält, ohne selbst in Verteidigung oder Rückzug zu kippen. Die Ergänzung liegt darin, Klarheit zu halten und gleichzeitig den sozialen Druck zu senken. So kommen Themen auf den Tisch, ohne dass Gespräche sofort enger werden.",
      },
    },
  },
  regulator: {
    Unternehmenslogik: {
      left: {
        title: "Fundament mit im Blick",
        description:
          "Entlastend ist oft ein Gegenüber, das bei viel Zug nach vorn früh die Frage nach Aufbau und Tragfähigkeit mit hineinnimmt. Die Ergänzung wirkt hier als Puffer gegen vorschnelle Verengung auf reine Wirkung. So kippen Richtungsfragen seltener in Grundsatzstreit.",
      },
      center: {
        title: "Zielkonflikte früher sortieren",
        description: (band) =>
          band === "balanced"
            ? "Entlastend ist oft ein Gegenüber, das offen markiert, worauf eine Entscheidung gerade eigentlich zielt. Die Regulierung liegt hier in expliziter Sortierung statt stiller Mehrdeutigkeit. So müsst ihr Grundsatzfragen nicht immer wieder neu aufladen."
            : "Entlastend ist oft ein Gegenüber, das Zielkonflikte früh sortiert, bevor sie breit werden. Die Regulierung liegt hier weniger im Gegenpol als in klarer Ordnung. So geraten Entscheidungen seltener in diffuse Grundsatzdebatten.",
      },
      right: {
        title: "Hebel nüchtern einordnen",
        description:
          "Entlastend ist oft ein Gegenüber, das Chancen klar sieht und sie in realistische Schritte übersetzt. Die Regulierung liegt darin, Spannung aus der Frage zu nehmen, ob Bewegung und Substanz überhaupt zusammengehen. So wird aus Hebel gegen Fundament seltener ein Grundsatzkonflikt.",
      },
    },
    Entscheidungslogik: {
      left: {
        title: "Druck aus Entscheidungen nehmen",
        description:
          "Hilfreich ist eher ein Gegenüber, das in offenen Lagen nicht unruhig wird und trotzdem einen klaren nächsten Schritt benennen kann. Die Regulierung liegt darin, Zeitdruck nicht gegen Sorgfalt auszuspielen. So wird Entscheidungsdichte seltener zum Reibungspunkt.",
      },
      center: {
        title: "Schleifen sauber beenden",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das sichtbar markiert, wann Abwägung reicht und wann jetzt entschieden wird. Die Regulierung liegt hier in einem klaren Schlusspunkt. So dreht sich Diskussion nicht länger als nötig im Kreis."
            : "Hilfreich ist eher ein Gegenüber, das Prüfen und Entscheiden sauber trennt, wenn beides durcheinanderläuft. Die Regulierung liegt in einem klaren Abschluss, nicht in mehr Druck. So bleiben offene Diskussionen seltener in Schleife.",
      },
      right: {
        title: "Entscheidungen erden",
        description:
          "Entlastend ist oft ein Gegenüber, das Tempo mitgeht und bei größeren Weichenstellungen spürbar Unterbau gibt. Die Regulierung liegt darin, schnelle Zuspitzung lesbarer zu machen. So müssen andere weniger gegen das Tempo selbst arbeiten.",
      },
    },
    Risikoorientierung: {
      left: {
        title: "Risiko besser einhegen",
        description:
          "Entlastend ist oft ein Gegenüber, das Chancen nicht kleinredet, aber den Einsatz sauber begrenzt. Die Regulierung liegt darin, Risiko nicht abstrakt zu diskutieren, sondern mit klaren Leitplanken zu versehen. So wird Vorsicht seltener zur Dauerbremse.",
      },
      center: {
        title: "Risikoschwellen sichtbar machen",
        description: (band) =>
          band === "balanced"
            ? "Hilfreich ist eher ein Gegenüber, das offen sagt, welches Risiko ihr tragen wollt und welches nicht. Die Regulierung liegt hier in klaren Schwellen statt stiller Interpretation. So wird Unsicherheit seltener jedes Mal neu gelesen."
            : "Hilfreich ist eher ein Gegenüber, das bei Chancen und Risiken früh eine nachvollziehbare Schwelle benennt. Die Regulierung liegt darin, situative Unterschiede übersetzbar zu machen. So wird Vorangehen seltener selbst zum Streitpunkt.",
      },
      right: {
        title: "Mehr Leitplanken im Vorangehen",
        description:
          "Entlastend ist oft ein Gegenüber, das Chancen sieht und gleichzeitig Geld, Timing und Tragbarkeit begrenzt. Die Regulierung liegt darin, Mut nicht zurückzunehmen, sondern ihm einen Rahmen zu geben. So entsteht aus Tempo seltener sozialer Druck im Team.",
      },
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      left: {
        title: "Mehr Verbindung im Prozess",
        description:
          "Entlastend ist oft ein Gegenüber, das relevante Zwischenstände früh teilt, ohne deinen Eigenraum zu zerlegen. Die Regulierung liegt hier in Mitsicht an den richtigen Stellen. So fühlen sich andere seltener abgehängt, wenn du schnell eigenständig vorangehst.",
      },
      center: {
        title: "Abstimmung sichtbar halten",
        description: (band) =>
          band === "balanced"
            ? "Entlastend ist oft ein Gegenüber, das den Arbeitsmodus früh sichtbar macht und nicht auf stilles Mitdenken setzt. Die Regulierung liegt hier in expliziter Abstimmung. So wird aus wechselnder Nähe und Distanz kein stiller Reibungspunkt."
            : "Entlastend ist oft ein Gegenüber, das gut markiert, wann Rückkopplung nötig ist und wann nicht. Die Regulierung liegt in Klarheit über den Modus, nicht in mehr Nähe um jeden Preis. So kostet Zusammenarbeit weniger Nebenenergie.",
      },
      right: {
        title: "Mehr Ruhe im Ablauf",
        description:
          "Hilfreich ist eher ein Gegenüber, das eigenständig arbeiten kann und dabei verlässlich sichtbar bleibt. Die Regulierung liegt darin, Verbindung zu halten, ohne dauernd neue Schleifen aufzumachen. So wird enge Abstimmung seltener zur Dauerbelastung.",
      },
    },
    Commitment: {
      left: {
        title: "Erwartungen früh entlasten",
        description:
          "Entlastend ist oft ein Gegenüber, das Priorität und Einsatz offen abstimmt, statt still nach oben zu ziehen. Die Regulierung liegt hier in klaren Erwartungen ohne moralischen Unterton. So wird aus unterschiedlichem Fokus seltener Rechtfertigungsdruck.",
      },
      center: {
        title: "Einsatz klar rahmen",
        description: (band) =>
          band === "balanced"
            ? "Entlastend ist oft ein Gegenüber, das sichtbar macht, wann hoher Fokus gefragt ist und wann ein begrenzterer Rahmen reicht. Die Regulierung liegt in klaren Arbeitsrealitäten statt stiller Deutung. So wird Intensität seltener zum Missverständnis."
            : "Entlastend ist oft ein Gegenüber, das Verfügbarkeit und Einsatz konkret benennt, bevor Enttäuschung entsteht. Die Regulierung liegt darin, Intensität lesbar zu machen. So kippt Einsatzniveau seltener in verdeckte Spannung.",
      },
      right: {
        title: "Druck aus Intensität nehmen",
        description:
          "Hilfreich ist eher ein Gegenüber, das hohe Priorisierung versteht und Unterschiede in Kapazität früh übersetzt. Die Regulierung liegt darin, Ernst und Begrenzung nebeneinander halten zu können. So wird dein Fokus seltener als stiller Maßstab für alle gelesen.",
      },
    },
    Konfliktstil: {
      left: {
        title: "Themen früher öffnen",
        description:
          "Entlastend ist oft ein Gegenüber, das Spannungen ruhig anspricht, bevor sie lange mitschwingen. Die Regulierung liegt hier in früherer Bearbeitung ohne zusätzliche Härte. So bleibt weniger unter der Oberfläche liegen.",
      },
      center: {
        title: "Reibung sauber markieren",
        description: (band) =>
          band === "balanced"
            ? "Entlastend ist oft ein Gegenüber, das klar macht, wann ein Thema jetzt besprochen werden muss und wann es noch Zeit hat. Die Regulierung liegt in Timing mit Ansage. So bleibt Reibung seltener diffus im Raum."
            : "Entlastend ist oft ein Gegenüber, das Timing und Direktheit gut rahmt, wenn beides im Team auseinanderläuft. Die Regulierung liegt darin, Gesprächsmomente lesbar zu machen. So wird Konflikt seltener durch Unsicherheit verstärkt.",
      },
      right: {
        title: "Direktheit gut rahmen",
        description:
          "Hilfreich ist eher ein Gegenüber, das deine Klarheit aushält und Gespräche gleichzeitig ruhig hält. Die Regulierung liegt darin, Spannung zu bearbeiten, ohne dass der Ton sofort enger wird. So bleiben Konflikte eher arbeitsfähig als persönlich aufgeladen.",
      },
    },
  },
  rhythm_partner: {
    Unternehmenslogik: {
      left: {
        title: "Schnell klar bei Hebeln",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die Wirkung früh sehen und trotzdem tragfähig übersetzen können. Die Passung liegt hier im gemeinsamen Vorwärtsgang ohne strategische Unschärfe. So müsst ihr Richtungsfragen im Alltag seltener mehrfach öffnen.",
      },
      center: {
        title: "Verlässlich an Weggabelungen",
        description: (band) =>
          band === "balanced"
            ? "Im Alltag trägt ein Gegenüber, das an Weggabelungen klar sagt, worauf ihr euch jetzt stützt. Die Passung liegt hier in Verlässlichkeit, wenn mehrere Richtungen gleichzeitig sinnvoll wirken. So bleibt Grundsatzklärung nicht dauernd nebenher offen."
            : "Im Alltag trägt ein Gegenüber, das an Weggabelungen zügig klärt, was jetzt führt. Die Passung liegt darin, offene Richtungsfragen nicht zu lange mitzuschleppen. So geht weniger Energie in wiederholte Grundsatzklärung.",
      },
      right: {
        title: "Marktfenster gut übersetzen",
        description:
          "Im Alltag trägt ein Gegenüber, das Chancen früh erkennt und sie in Schritte übersetzt, die zu deinem Aufbauanspruch passen. Die Passung liegt darin, Bewegung und Substanz gleichzeitig zusammenzuhalten. So ziehen Wachstum und Belastbarkeit seltener auseinander.",
      },
    },
    Entscheidungslogik: {
      left: {
        title: "Mit weniger Kreisen weiter",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die in offenen Lagen einen nächsten Schritt setzen können, ohne deine Sorgfalt kleinzumachen. Die Passung liegt im Arbeitsrhythmus: du prüfst, das Gegenüber hilft beim sauberen Übergang ins Handeln. So bleibt Tempo seltener an offenen Details hängen.",
      },
      center: {
        title: "Klar am Umschaltpunkt",
        description: (band) =>
          band === "balanced"
            ? "Im Alltag trägt ein Gegenüber, das sauber markiert, wann Prüfen reicht und wann jetzt entschieden wird. Die Passung liegt hier in sichtbaren Umschaltpunkten. So müsst ihr den Entscheidungsmodus nicht jedes Mal neu aushandeln."
            : "Im Alltag trägt ein Gegenüber, das den Wechsel zwischen Prüfen und Entscheiden gut lesen kann. Die Passung liegt darin, dass Abwägung nicht in Endlosschleifen kippt. So bleibt euer Entscheidungsrhythmus näher beieinander.",
      },
      right: {
        title: "Struktur im Vorangehen",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die dein Tempo mitgehen und an den wichtigen Stellen Struktur nachreichen. Die Passung liegt darin, dass Vorangehen nicht gegen Nachvollziehbarkeit ausgespielt wird. So bleibt Geschwindigkeit für andere besser anschlussfähig.",
      },
    },
    Risikoorientierung: {
      left: {
        title: "Gemeinsam mutiger werden",
        description:
          "Im Alltag trägt ein Gegenüber, das gute Chancen schneller nach vorn zieht, ohne Grenzen zu ignorieren. Die Passung liegt darin, dass du Absicherung mitbringst und das Gegenüber früher Bewegung. So bleibt ihr weder zu lange im Warten noch geht ihr blind ins Risiko.",
      },
      center: {
        title: "Gleiche Schwelle fürs Risiko",
        description: (band) =>
          band === "balanced"
            ? "Leichter wird Zusammenarbeit mit Menschen, die bei Risiko-Fragen offen sagen, wie weit sie wirklich gehen wollen. Die Passung liegt hier in einer sichtbaren gemeinsamen Schwelle. So wird Vorangehen seltener erst im Konfliktfall geklärt."
            : "Leichter wird Zusammenarbeit mit Menschen, die bei Chancen und Risiken eine klare Schwelle mitbringen. Die Passung liegt darin, dass situative Unterschiede nicht dauernd neu übersetzt werden müssen. So bleibt Unsicherheit im Alltag besser handhabbar.",
      },
      right: {
        title: "Sicherer im Vorwärtsgang",
        description:
          "Im Alltag trägt ein Gegenüber, das Chancen ernst nimmt und gleichzeitig Leitplanken verlässlich sichtbar macht. Die Passung liegt darin, dass Tempo nicht dauernd gegen Absicherung ausgespielt wird. So bleibt Vorangehen eher gemeinsamer Schritt statt Streitpunkt.",
      },
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      left: {
        title: "Mehr Sichtbarkeit im Prozess",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die Eigenraum respektieren und trotzdem relevante Zwischenstände früh teilen. Die Passung liegt darin, dass du autonom arbeiten kannst, ohne andere zu verlieren. So wird Mitsicht seltener erst eingefordert, wenn schon etwas hängt.",
      },
      center: {
        title: "Klarer im Arbeitsmodus",
        description: (band) =>
          band === "balanced"
            ? "Im Alltag trägt ein Gegenüber, das Nähe und Eigenraum früh sichtbar macht, statt beides still vorauszusetzen. Die Passung liegt hier in klaren Erwartungen an denselben Prozess. So arbeitet ihr seltener mit unterschiedlichen inneren Plänen."
            : "Im Alltag trägt ein Gegenüber, das Abstimmungsbedarf früh markiert und nicht auf stilles Einvernehmen setzt. Die Passung liegt in einem lesbaren Arbeitsmodus. So wird weniger nebenbei verhandelt, wie ihr eigentlich arbeitet.",
      },
      right: {
        title: "Verbunden, ohne festzuhalten",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die sichtbar bleiben, ohne jede Schleife gemeinsam zu machen. Die Passung liegt darin, dass du Rückkopplung bekommst und trotzdem nicht alles eng begleiten musst. So bleibt Nähe im Alltag tragfähig.",
      },
    },
    Commitment: {
      left: {
        title: "Klarer Fokus im Alltag",
        description:
          "Im Alltag trägt ein Gegenüber, das wichtige Phasen früher auf Priorität stellt, ohne daraus eine Grundsatzfrage zu machen. Die Passung liegt darin, dass mehr Zug reinkommt, ohne deinen Rahmen dauernd in Frage zu stellen. So wird Einsatzniveau seltener zum stillen Vergleichsmaßstab.",
      },
      center: {
        title: "Verlässlicher bei Intensität",
        description: (band) =>
          band === "balanced"
            ? "Leichter wird Zusammenarbeit mit Menschen, die klar aussprechen, wann voller Fokus gefragt ist und wann ein kleinerer Modus reicht. Die Passung liegt hier in sichtbaren Erwartungen. So müsst ihr Intensität nicht erst dann klären, wenn Enttäuschung schon im Raum ist."
            : "Leichter wird Zusammenarbeit mit Menschen, die Verfügbarkeit und Einsatz früh konkret machen. Die Passung liegt darin, dass unterschiedliche Intensitäten besser lesbar werden. So bleiben Alltagsrahmen seltener unausgesprochen.",
      },
      right: {
        title: "Tragfähig bei hohem Zug",
        description:
          "Im Alltag trägt ein Gegenüber, das Priorität ernst nimmt und gleichzeitig Grenzen, Kapazitäten und Alltag sauber mitführt. Die Passung liegt darin, dass hohes Tempo nicht automatisch zum Maßstab für alle wird. So wirkt Fokus eher verbindend als druckvoll.",
      },
    },
    Konfliktstil: {
      left: {
        title: "Früher ruhig ansprechen",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die Themen ruhig, aber nicht zu spät aufmachen. Die Passung liegt darin, dass du sortieren kannst und Reibung trotzdem nicht liegenbleibt. So stauen sich heikle Punkte seltener unnötig an.",
      },
      center: {
        title: "Klar im richtigen Moment",
        description: (band) =>
          band === "balanced"
            ? "Im Alltag trägt ein Gegenüber, das ein gutes Gefühl dafür hat, wann etwas sofort auf den Tisch muss und wann noch ein kurzer Abstand hilft. Die Passung liegt hier in verlässlichem Timing. So bleiben Spannungen weder liegen noch werden sie vorschnell groß."
            : "Im Alltag trägt ein Gegenüber, das Timing und Offenheit gut austariert. Die Passung liegt darin, dass Konflikte weder dauernd verschoben noch unnötig forciert werden. So bleibt ihr unter Druck eher gesprächsfähig.",
      },
      right: {
        title: "Direkt und trotzdem ruhig",
        description:
          "Leichter wird Zusammenarbeit mit Menschen, die Spannungen ernst nehmen und dabei einen guten Gesprächsrahmen halten. Die Passung liegt darin, dass deine Direktheit aufgenommen wird, ohne in Rückzug oder Verteidigung zu kippen. So bleiben heikle Gespräche schneller arbeitsfähig.",
      },
    },
  },
};

function resolveComplementEntry(entry: SelfReportComplementRole): ComplementCard {
  const text = COMPLEMENT_TEXT[entry.role][entry.signal.dimension][entry.signal.tendencyKey];

  return {
    role: entry.role,
    title: text.title,
    description:
      typeof text.description === "function" ? text.description(entry.signal.strengthBand) : text.description,
  };
}

export function buildComplements(complementDimensions: SelfReportComplementRole[]): ComplementCard[] {
  return complementDimensions.map((entry) => resolveComplementEntry(entry));
}

export function buildComplementsFromScores(scores: SelfAlignmentReport["scoresA"]) {
  return buildComplements(buildSelfReportSelection(scores).complementRoles);
}

export function buildComplementExamples() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    complements: buildComplementsFromScores(entry.scores),
  }));
}
