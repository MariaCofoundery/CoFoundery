import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  buildSelfReportSelection,
  SELF_REPORT_SELECTION_DEBUG_CASES,
  type SelfReportHeroSignals,
  type SelfReportSignal,
  type SelfReportStrengthBand,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type HeroTextInput = Pick<
  SelfReportHeroSignals,
  "primarySignal" | "workModeSignal" | "tensionCarrier" | "balancedProfile"
>;

type DimensionSentenceMap = Record<
  FounderDimensionKey,
  Record<SelfReportTendencyKey, string | ((band: SelfReportStrengthBand) => string)>
>;

const PRIMARY_SENTENCES: DimensionSentenceMap = {
  Unternehmenslogik: {
    left: "Dein Kernmuster: Du pruefst neue Chancen zuerst darauf, ob sie das Unternehmen belastbarer und tragfaehiger machen - genau dort kippt es im Team, wenn andere aus derselben Chance schon den naechsten Hebel ableiten.",
    center: (band) =>
      band === "balanced"
        ? "Dein Kernmuster: Bei neuen Chancen schaust du mal zuerst auf Aufbau und Tragfaehigkeit und mal zuerst auf Hebel und Reichweite - genau dort kippt es im Team, weil dein Wechsel oft erst spaet lesbar wird."
        : "Dein Kernmuster: Du hältst Aufbau und Wirkung gleichzeitig im Blick, statt dich früh auf nur eine Seite festzulegen.",
    right: "Dein Kernmuster: Du sortierst neue Chancen zuerst nach Reichweite, Zug und strategischer Wirkung - genau dort kippt es im Team, wenn andere zuerst Stabilitaet und Tragfaehigkeit sichern wollen.",
  },
  Entscheidungslogik: {
    left: "Dein Kernmuster: Du legst Entscheidungen ungern fest, solange wichtige Annahmen oder Gegenargumente noch offen sind - genau dort kippt es im Team, wenn andere den naechsten Schritt schon festhalten wollen.",
    center: (band) =>
      band === "balanced"
        ? "Dein Kernmuster: Bei manchen Entscheidungen willst du erst offene Annahmen sehen, bei anderen setzt du frueh einen naechsten Schritt - genau dort kippt es im Team, weil dein Wechsel nicht stabil vorhersagbar ist."
        : "Dein Kernmuster: Du prüfst oft kurz und gehst dann in eine Entscheidung, statt lange in einer Schleife zu bleiben.",
    right: "Dein Kernmuster: Wenn fuer dich ein gangbarer naechster Schritt sichtbar ist, entscheidest du lieber, als die Frage weiter offen zu halten - genau dort kippt es im Team, wenn andere dieselbe Frage noch weiter pruefen wollen.",
  },
  Risikoorientierung: {
    left: "Dein Kernmuster: Du gehst Risiko lieber mit klaren Leitplanken, Puffern und Stop-Kriterien ein - genau dort kippt es im Team, wenn andere frueher ins Handeln wollen.",
    center: (band) =>
      band === "balanced"
        ? "Dein Kernmuster: Bei manchen Chancen gehst du frueh los, bei anderen willst du erst klare Leitplanken sehen - genau dort kippt es im Team, weil deine Risikoschwelle schwer lesbar bleibt."
        : "Dein Kernmuster: Du wägest Mut und Absicherung gegeneinander ab, statt automatisch nur einer Seite zu folgen.",
    right: "Dein Kernmuster: Wenn du in einer unsicheren Lage eine echte Chance siehst, gehst du eher in Bewegung als in laengere Absicherung - genau dort kippt es im Team, wenn andere zuerst Sicherheit herstellen wollen.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Dein Kernmuster: Du arbeitest am liebsten mit klarem Eigenraum und gezielter statt dauernder Abstimmung - genau dort kippt es im Team, wenn andere fruehe Mitsicht erwarten.",
    center: (band) =>
      band === "balanced"
        ? "Dein Kernmuster: In manchen Aufgaben willst du Eigenraum, in anderen fruehe Rueckkopplung - genau dort kippt es im Team, wenn andere zu spaet merken, welchen Modus du gerade erwartest."
        : "Dein Kernmuster: Du steuerst Nähe und Eigenraum situativ, statt nur in Autonomie oder Dauerschleifen zu arbeiten.",
    right: "Dein Kernmuster: Du arbeitest am besten, wenn Fortschritt, offene Punkte und Entscheidungen frueh gemeinsam sichtbar sind - genau dort kippt es im Team, wenn andere autonomer weiterarbeiten wollen.",
  },
  Commitment: {
    left: "Dein Kernmuster: Das Startup hat fuer dich Gewicht, bleibt im Alltag aber Teil eines groesseren Arbeits- und Lebensrahmens - genau dort kippt es im Team, wenn andere mehr Verfuegbarkeit still voraussetzen.",
    center: (band) =>
      band === "balanced"
        ? "Dein Kernmuster: In intensiven Phasen ziehst du Fokus sichtbar hoch und nimmst ihn wieder raus, wenn der Druck sinkt - genau dort kippt es im Team, weil dein Einsatzniveau nicht dauerhaft gleich lesbar bleibt."
        : "Dein Kernmuster: Du passt dein Einsatzniveau an die aktuelle Phase an, statt es dauerhaft gleich hoch oder gleich begrenzt zu halten.",
    right: "Dein Kernmuster: Du richtest Zeit, Energie und Aufmerksamkeit deutlich auf das Startup aus - genau dort kippt es im Team, wenn andere Prioritaet und Verfuegbarkeit anders einordnen.",
  },
  Konfliktstil: {
    left: "Dein Kernmuster: Wenn ein Unterschied spuerbar wird, sortierst du ihn meist erst fuer dich, bevor du ihn ansprichst - genau dort kippt es im Team, wenn andere direkte Klaerung sofort erwarten.",
    center: (band) =>
      band === "balanced"
        ? "Dein Kernmuster: Manche Unterschiede sprichst du sofort an, andere laesst du erst kurz liegen, bevor du sie aufmachst - genau dort kippt es im Team, weil dein Timing schwer vorhersagbar ist."
        : "Dein Kernmuster: Du waehlst bewusst zwischen direkter Ansprache und mehr Timing, je nachdem, was die Lage traegt.",
    right: "Dein Kernmuster: Du sprichst Unterschiede lieber frueh und direkt an, bevor sie laenger mitlaufen - genau dort kippt es im Team, wenn andere dafuer mehr Schonraum brauchen.",
  },
};

const WORK_MODE_SENTENCES: DimensionSentenceMap = {
  Unternehmenslogik: {
    left: "Im Tagesgeschaeft gibst du vor allem den Themen Raum, die das Fundament staerken und auch in sechs oder zwoelf Monaten noch tragen.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wirkt das so: Bei einer Chance sprichst du zuerst ueber Tragfaehigkeit und Aufbau, bei der naechsten zuerst ueber das Marktfenster."
        : "Im Alltag pruefst du oft parallel, was das Unternehmen langfristig traegt und wo trotzdem ein echter Hebel liegt.",
    right: "Im Alltag ziehst du Themen nach vorn, wenn schnell sichtbar wird, wo Reichweite, Zugang oder Momentum entstehen koennen.",
  },
  Entscheidungslogik: {
    left: "Im Arbeiten merkt man das daran, dass du Annahmen, Luecken und Gegenargumente eher noch einmal sichtbar machst, bevor ihr festlegt.",
    center: (band) =>
      band === "balanced"
        ? "Im Arbeiten wirkt das so: Manche Entscheidungen willst du erst sauber pruefen, andere schiebst du frueh in einen klaren naechsten Schritt."
        : "Im Arbeiten wechselst du oft zwischen kurzer Pruefung und pragmatischer Entscheidung, ohne lange auf einer Seite zu bleiben.",
    right: "Im Arbeiten setzt du lieber einen naechsten Schritt, sobald fuer dich genug Kontur da ist.",
  },
  Risikoorientierung: {
    left: "Im Tagesgeschaeft gibst du Themen eher dann frei, wenn Grenzen, Kosten und Puffer sichtbar genug sind.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wirkt das so: Bei einem Schritt willst du erst Leitplanken, beim naechsten reicht dir schon ein plausibler Hebel fuer Bewegung."
        : "Oft entscheidest du danach, wann Absicherung reicht und wann ein mutigerer Schritt den groesseren Effekt hat.",
    right: "Sobald du echten Spielraum erkennst, gehst du schneller in Tests, Wetten und Bewegung.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Am liebsten arbeitest du autonom vor und willst nicht jeden Zwischenschritt gemeinsam kalibrieren.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wirkt das so: Bei manchen Themen willst du erst allein vorarbeiten, bei anderen brauchst du fruehe Rueckkopplung."
        : "Oft dosierst du Austausch so, dass er Orientierung gibt, aber nicht jeden Schritt begleitet.",
    right: "Im taeglichen Arbeiten willst du frueh sehen, wo Dinge stehen, was entschieden ist und wo noch etwas offen bleibt.",
  },
  Commitment: {
    left: "Du planst Verfuegbarkeit und Einsatz so, dass das Startup Platz hat, aber nicht alles andere verdraengt.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wirkt das so: In einer Phase bist du sehr praesenz, in der naechsten faehrst du bewusst wieder auf ein integriertes Niveau zurueck."
        : "Oft ziehst du Intensitaet dann hoch, wenn sie begruendet ist, und nimmst sie wieder raus, wenn der Druck sinkt.",
    right: "Im Alltag behandelst du das Startup als klaren Schwerpunkt und liest Zusammenarbeit auch ueber dieses Fokusniveau.",
  },
  Konfliktstil: {
    left: "Bei heiklen Punkten nimmst du dir eher kurz Zeit, bevor du sie offen ansprichst.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wirkt das so: Einen Unterschied sprichst du sofort an, einen anderen erst am naechsten passenden Moment."
        : "Oft steuerst du, wann Direktheit hilft und wann mehr Timing klueger ist.",
    right: "Im Alltag merkt man das daran, dass du Unterschiede eher frueh sichtbar machst, statt sie laenger im Hintergrund laufen zu lassen.",
  },
};

const TENSION_SENTENCES: DimensionSentenceMap = {
  Unternehmenslogik: {
    left: "Die groesste Reibung entsteht dort, wo andere aus einer Chance schon den naechsten Schritt ableiten und du zuerst wissen willst, ob das Modell dafuer schon tragfaehig genug ist.",
    center: (band) =>
      band === "balanced"
        ? "Die groesste Reibung entsteht dort, wo du zwischen Aufbau und Hebel wechselst, ohne dass fuer andere sofort klar ist, welche Logik gerade fuehrt."
        : "Reibung entsteht dort, wo niemand klar sagt, ob ihr gerade bewusst Fundament baut oder den naechsten Hebel sucht.",
    right: "Die groesste Reibung entsteht dort, wo du in einer neuen Chance schon den naechsten Hebel siehst, waehrend andere erst klaeren wollen, ob Aufbau und Tragfaehigkeit dafuer schon reichen.",
  },
  Entscheidungslogik: {
    left: "Die groesste Reibung entsteht, wenn im Meeting schon ein naechster Schritt festgehalten werden soll, waehrend fuer dich noch zentrale Annahmen offen sind.",
    center: (band) =>
      band === "balanced"
        ? "Die groesste Reibung entsteht, wenn du zwischen Pruefen und Festlegen wechselst und fuer andere nicht klar ist, ab wann du etwas wirklich fuer entscheidbar haeltst."
        : "Reibung entsteht, wenn das Team zwischen Pruefen und Entscheiden haengen bleibt.",
    right: "Die groesste Reibung entsteht, wenn fuer dich der naechste Schritt schon klar ist, waehrend andere dieselbe Frage noch weiter pruefen wollen.",
  },
  Risikoorientierung: {
    left: "Die groesste Reibung entsteht, wenn andere schon testen oder zusagen wollen und dir dafuer Leitplanken, Puffer oder Stop-Kriterien fehlen.",
    center: (band) =>
      band === "balanced"
        ? "Die groesste Reibung entsteht, wenn du Risiko mal eng und mal offensiv liest und fuer andere nicht klar ist, wo deine Grenze in diesem Fall liegt."
        : "Reibung entsteht, wenn Chancen im Raum stehen, aber offenbleibt, welches Risiko ihr gemeinsam wirklich tragen wollt.",
    right: "Die groesste Reibung entsteht, wenn im Team zuerst Sicherheit hergestellt werden soll und du in derselben Lage schon eine echte Chance siehst.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Die groesste Reibung entsteht, wenn andere laufende Mitsicht erwarten und du einen Arbeitsstand erst zeigen willst, wenn fuer dich schon etwas Belastbares da ist.",
    center: (band) =>
      band === "balanced"
        ? "Die groesste Reibung entsteht, wenn du zwischen Eigenraum und Rueckkopplung wechselst und fuer andere nicht frueh sichtbar wird, welcher Modus gerade gilt."
        : "Reibung entsteht, wenn Abstimmung weder klar begrenzt noch klar eng gefuehrt wird.",
    right: "Die groesste Reibung entsteht, wenn andere autonom weiterarbeiten und du wichtige Entscheidungen oder Zwischenstaende erst spaet mitbekommst.",
  },
  Commitment: {
    left: "Die groesste Reibung entsteht, wenn im Team mehr Praesenz, Tempo oder Verfuegbarkeit erwartet wird, als du fuer deinen Alltag realistisch zugesagt hast.",
    center: (band) =>
      band === "balanced"
        ? "Die groesste Reibung entsteht, wenn du dein Einsatzniveau sichtbar hoch- oder herunterfaehrst und andere erst spaet merken, welches Prioritaetsniveau du gerade erwartest."
        : "Reibung entsteht, wenn offenbleibt, wann hoher Fokus gefragt ist und wann ein begrenzterer Modus reicht.",
    right: "Die groesste Reibung entsteht, wenn du hohe Prioritaet und Verfuegbarkeit fuer selbstverstaendlich haeltst, waehrend andere das Startup in ihrem Alltag anders einordnen.",
  },
  Konfliktstil: {
    left: "Die groesste Reibung entsteht, wenn andere einen Unterschied sofort besprechen wollen und du ihn erst fuer dich sortieren willst.",
    center: (band) =>
      band === "balanced"
        ? "Die groesste Reibung entsteht, wenn du manche Themen sofort und andere spaeter aufmachst und fuer andere nicht klar ist, wann bei dir wirklich Klaerung dran ist."
        : "Reibung entsteht, wenn Timing und Direktheit im Team unterschiedlich gelesen werden.",
    right: "Die groesste Reibung entsteht, wenn du einen Unterschied direkt ansprechen willst und dein Gegenueber dafuer deutlich mehr Schonraum oder indirektere Annaeherung braucht.",
  },
};

function resolveSentence(
  map: DimensionSentenceMap,
  signal: SelfReportSignal
) {
  const entry = map[signal.dimension][signal.tendencyKey];
  return typeof entry === "function" ? entry(signal.strengthBand) : entry;
}

function resolveImpactSentence(input: HeroTextInput) {
  if (input.balancedProfile) {
    return "Im Alltag wird oft erst spaet sichtbar, welchen Modus du gerade erwartest. Dadurch wirkst du schnell sprunghaft, obwohl du fuer dich nur zwischen passenden Modi wechselst.";
  }

  if (!input.tensionCarrier) {
    return "Im Alltag werden Tempo, Klarheit oder Rueckkopplung verschieden gelesen. Dann zaehlt oft staerker die Wirkung deines Arbeitsmodus als deine eigentliche Absicht.";
  }

  switch (input.tensionCarrier.family) {
    case "direction":
      return "Im Alltag wird dieselbe Chance schnell noch einmal aufgemacht: Du siehst schon den naechsten Schritt, dein Gegenueber erst den offenen Aufbau-, Fokus- oder Risikopunkt. Im Gespraech wirkt das schnell so, als wuerdest du zu frueh ziehen oder zu spaet bremsen.";
    case "decision_under_uncertainty":
      return "Im Alltag landet dieselbe Entscheidung schnell noch einmal auf dem Tisch, obwohl fuer dich innerlich schon klar ist, ob noch geprueft oder schon entschieden werden sollte. Im Meeting wirkt das schnell so, als waerst du schon einen Schritt weiter oder noch nicht so weit wie der Rest.";
    case "collaboration_under_pressure":
      return "Im Alltag reibt ihr euch dann weniger an Zielen als an Sichtbarkeit, Timing und Ansprache. Das wirkt schnell so, als waerst du zu spaet sichtbar, zu eng dran oder zu direkt.";
    default:
      return "Dann merkt ihr die Differenz weniger in Grundsaetzen als in kleinen Alltagssituationen, die ploetzlich viel Abstimmung brauchen.";
  }
}

function buildFallbackHeroText() {
  return [
    "Aus den vorliegenden Antworten entsteht noch kein belastbares Kernsignal.",
    "Im Alltag lässt sich deshalb noch nicht sauber ableiten, wie du typischerweise arbeitest.",
    "Spannungspotenziale bleiben in diesem Zustand offen und sollten nicht überinterpretiert werden.",
    "Sobald das Profil vollständiger ist, lässt sich die Wirkung im Team deutlich präziser beschreiben.",
  ].join(" ");
}

export function buildPrimarySentence(signal: SelfReportSignal | null) {
  if (!signal) return null;
  return resolveSentence(PRIMARY_SENTENCES, signal);
}

export function buildWorkModeSentence(signal: SelfReportSignal | null) {
  if (!signal) return null;
  return resolveSentence(WORK_MODE_SENTENCES, signal);
}

export function buildTensionSentence(signal: SelfReportSignal | null) {
  if (!signal) return null;
  return resolveSentence(TENSION_SENTENCES, signal);
}

export function buildImpactSentence(input: HeroTextInput) {
  return resolveImpactSentence(input);
}

export function buildHeroText(input: HeroTextInput): string {
  const primarySentence = buildPrimarySentence(input.primarySignal);
  if (!primarySentence) return buildFallbackHeroText();

  const workModeSentence =
    buildWorkModeSentence(input.workModeSignal) ??
    "Im Alltag wird daran früh spürbar, wie du Tempo, Austausch und Entscheidungen behandelst.";

  const tensionSentence =
    buildTensionSentence(input.tensionCarrier) ??
    "Reibung entsteht vor allem dort, wo Erwartungen im Team nicht früh genug offen gemacht werden.";

  const impactSentence = buildImpactSentence(input);

  return [primarySentence, workModeSentence, tensionSentence, impactSentence].join(" ");
}

export function buildHeroTextFromScores(scores: SelfAlignmentReport["scoresA"]) {
  return buildHeroText(buildSelfReportSelection(scores).hero);
}

export function buildHeroTextExamples() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    heroText: buildHeroTextFromScores(entry.scores),
  }));
}
