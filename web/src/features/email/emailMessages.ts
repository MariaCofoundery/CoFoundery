import type { AppLocale } from "@/i18n/config";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";

type TeamContext = "pre_founder" | "existing_team";
type ReportScope = "basis" | "basis_plus_values";

type CoFounderInviteCopyInput = {
  inviterDisplayName: string | null;
};

type AdvisorInviteCopyInput = {
  advisorName: string | null;
  founderAName: string;
  founderBName: string;
};

type AdvisorTeamFounderInviteCopyInput = {
  advisorName: string | null;
  counterpartLabel: string | null | undefined;
};

type ReadMyMindStartedCopyInput = {
  creatorName: string | null;
  packTitles: string[];
};

type FounderInTheWildHandoffCopyInput = {
  founderName: string | null;
};

export function getEmailPrivacyUrl(_locale: AppLocale) {
  return toPublicAppUrl("/datenschutz");
}

/**
 * The approved Made2Found wordmark for light backgrounds (2000 x 500, 4:1).
 * PNG rather than SVG: many mail clients do not show SVG. The old
 * /cofoundery-align-logo.svg stays published for mails already sent.
 */
export function getEmailLogoUrl() {
  return toPublicAppUrl("/brand/made2found-logo-on-light.png");
}

export function getReadMyMindStartedEmailCopy(
  locale: AppLocale,
  input: ReadMyMindStartedCopyInput
) {
  const creatorName = input.creatorName?.trim() || (locale === "en" ? "Your co-founder" : "Dein Co-Founder");
  const packCount = input.packTitles.length;

  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: packCount > 1 ? `${creatorName} prepared ${packCount} Read My Mind packs for you — you’re up` : `${creatorName} started Read My Mind with you — you’re up`,
      preheader: packCount > 1 ? `${creatorName} has completed their part in ${packCount} Read My Mind packs.` : `${creatorName} has completed their part of a Read My Mind round. You’re up.`,
      eyebrow: "Read My Mind · Beta",
      greeting: "Hi,",
      intro: packCount > 1 ? `${creatorName} has already completed their part in several Read My Mind packs.` : `${creatorName} has already completed their part of a Read My Mind round.`,
      explanation: packCount > 1 ? `You can answer the packs one after another. Within each pack, your answers stay hidden until you have both finished.` : `You answer five short work situations independently of ${creatorName}. Only when you are finished too can you reveal your answers together.`,
      packListTitle: packCount > 1 ? "Waiting for you:" : null,
      packTitles: input.packTitles,
      turn: "Now it’s your turn.",
      cta: "Open Read My Mind",
      note: "There are no right answers. The idea is simply to learn a little more about each other and how you work together.",
      beta: "Read My Mind is currently in testing.",
      fallback: "If the button does not work, you can open this link directly:",
      privacy: "Privacy policy",
    };
  }

  return {
    htmlLang: "de",
    subject: packCount > 1 ? `${creatorName} hat ${packCount} Read-My-Mind-Packs für dich vorbereitet – du bist dran` : `${creatorName} hat Read My Mind mit dir gestartet – du bist dran`,
    preheader: packCount > 1 ? `${creatorName} hat den eigenen Teil in ${packCount} Read-My-Mind-Packs abgeschlossen.` : `${creatorName} hat den eigenen Teil einer Read-My-Mind-Runde abgeschlossen. Jetzt bist du dran.`,
    eyebrow: "Read My Mind · Beta",
    greeting: "Hi,",
    intro: packCount > 1 ? `${creatorName} hat den eigenen Teil in mehreren Read-My-Mind-Packs bereits abgeschlossen.` : `${creatorName} hat den eigenen Teil einer Read-My-Mind-Runde bereits abgeschlossen.`,
    explanation: packCount > 1 ? "Du kannst die Packs nacheinander beantworten. Innerhalb jedes Packs bleiben eure Antworten verborgen, bis ihr beide fertig seid." : `Du beantwortest fünf kurze Arbeitssituationen unabhängig von ${creatorName}. Erst wenn auch du fertig bist, könnt ihr eure Antworten gemeinsam aufdecken.`,
    packListTitle: packCount > 1 ? "Auf dich warten:" : null,
    packTitles: input.packTitles,
    turn: "Jetzt bist du dran.",
    cta: "Read My Mind öffnen",
    note: "Es gibt keine richtigen Antworten. Es geht darum, euch und eure Zusammenarbeit noch ein bisschen besser kennenzulernen.",
    beta: "Read My Mind befindet sich aktuell in der Testphase.",
    fallback: "Falls der Button nicht funktioniert, kannst du diesen Link direkt öffnen:",
    privacy: "Datenschutzerklärung",
  };
}

export function getFounderInTheWildHandoffEmailCopy(
  locale: AppLocale,
  input: FounderInTheWildHandoffCopyInput
) {
  const founderName = input.founderName?.trim() || (locale === "en" ? "Your co-founder" : "Dein Co-Founder");
  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: "Founder in the Wild: You’re up",
      preheader: `${founderName} has completed their part of Founder in the Wild.`,
      eyebrow: "Founder in the Wild",
      greeting: "Hi,",
      intro: `${founderName} has completed their part of Founder in the Wild.`,
      privacy: "Your answers remain hidden until you have both answered all five situations.",
      turn: "You can answer your part now.",
      cta: "Open Founder in the Wild",
      fallback: "If the button does not work, you can open this link directly:",
      privacyLink: "Privacy policy",
    };
  }
  return {
    htmlLang: "de",
    subject: "Founder in the Wild: Du bist dran",
    preheader: `${founderName} hat den eigenen Teil bei Founder in the Wild abgeschlossen.`,
    eyebrow: "Founder in the Wild",
    greeting: "Hi,",
    intro: `${founderName} hat den eigenen Teil bei Founder in the Wild abgeschlossen.`,
    privacy: "Eure Antworten bleiben verdeckt, bis ihr beide alle fünf Situationen beantwortet habt.",
    turn: "Du kannst jetzt deinen Teil beantworten.",
    cta: "Founder in the Wild öffnen",
    fallback: "Falls der Button nicht funktioniert, kannst du diesen Link direkt öffnen:",
    privacyLink: "Datenschutzerklärung",
  };
}

export function getCoFounderInviteEmailCopy(
  locale: AppLocale,
  input: CoFounderInviteCopyInput
) {
  const inviterName = input.inviterDisplayName?.trim() || null;

  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: inviterName
        ? `${inviterName} invited you to Made2Found`
        : "You’ve been invited to Made2Found",
      preheader:
        "Personal invitation to Made2Found: shared report and Founder Setup for your collaboration.",
      eyebrow: "Personal invitation",
      greeting: "Hi,",
      inviterLine: inviterName
        ? `${inviterName} would like to explore your co-founder dynamics with you in Made2Found.`
        : "You’ve been invited to explore your co-founder dynamics together in Made2Found.",
      productIntro:
        "Made2Found helps founder teams see collaboration more clearly early on, understand differences better, and discuss important topics with more structure.",
      listTitle: "What to expect",
      bullets: [
        "a structured matching report about collaboration, roles, and decision logic",
        "Founder Setup to discuss topics and explicitly confirm shared agreements",
        "a clear shared conversation frame instead of vague impressions",
      ],
      teamLabel: "Team/project",
      contextLabel: "Context",
      moduleLabel: "Start module",
      personalNote: "This invitation is personal and takes you directly into the shared flow.",
      cta: "Open invitation",
      fallback:
        "If the button does not work, you can also open this link directly:",
      footerReason:
        "You are receiving this email because you were personally invited to a shared Made2Found process.",
      footerIgnore:
        "If you do not want to participate or the invitation is not relevant to you, you can simply ignore this email.",
      privacy: "Privacy policy",
    };
  }

  return {
    htmlLang: "de",
    subject: inviterName
      ? `${inviterName} lädt dich zu Made2Found ein`
      : "Einladung zu Made2Found",
    preheader:
      "Persönliche Einladung zu Made2Found: gemeinsamer Report und Founder Setup für eure Zusammenarbeit.",
    eyebrow: "Persönliche Einladung",
    greeting: "Hi,",
    inviterLine: inviterName
      ? `${inviterName} möchte gemeinsam mit dir eure Co-Founder-Dynamik in Made2Found anschauen.`
      : "Du wurdest eingeladen, gemeinsam eure Co-Founder-Dynamik in Made2Found anzuschauen.",
    productIntro:
      "Made2Found hilft Founder-Teams dabei, Zusammenarbeit früh klarer zu sehen, Unterschiede besser einzuordnen und wichtige Themen bewusst zu besprechen.",
    listTitle: "Was euch erwartet",
    bullets: [
      "ein strukturierter Matching-Report zu Zusammenarbeit, Rollen und Entscheidungslogik",
      "Founder Setup, um Themen zu besprechen und gemeinsame Vereinbarungen ausdrücklich zu bestätigen",
      "ein klarer gemeinsamer Gesprächsrahmen statt vager Eindrücke",
    ],
    teamLabel: "Team/Projekt",
    contextLabel: "Kontext",
    moduleLabel: "Startmodul",
    personalNote:
      "Die Einladung ist persönlich und führt dich direkt in den bestehenden gemeinsamen Flow.",
    cta: "Einladung öffnen",
    fallback:
      "Falls der Button nicht funktioniert, kannst du auch direkt diesen Link öffnen:",
    footerReason:
      "Du erhältst diese E-Mail, weil du persönlich zu einem gemeinsamen Made2Found-Prozess eingeladen wurdest.",
    footerIgnore:
      "Wenn du nicht teilnehmen möchtest oder die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.",
    privacy: "Datenschutzerklärung",
  };
}

export function getCoFounderContextLabel(locale: AppLocale, teamContext: TeamContext) {
  if (locale === "en") {
    return teamContext === "existing_team"
      ? "Existing team"
      : "Before a closer collaboration";
  }
  return teamContext === "existing_team"
    ? "Bestehendes Team"
    : "Vor einer engeren Zusammenarbeit";
}

export function getCoFounderModuleLabel(locale: AppLocale, reportScope: ReportScope) {
  if (locale === "en") {
    return reportScope === "basis_plus_values" ? "Foundation + values" : "Foundation";
  }
  return reportScope === "basis_plus_values" ? "Basis + Werte" : "Basis";
}

export function getAdvisorInviteEmailCopy(
  locale: AppLocale,
  input: AdvisorInviteCopyInput
) {
  const advisorGreeting = input.advisorName?.trim()
    ? `Hi ${input.advisorName.trim()},`
    : "Hi,";

  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: `${input.founderAName} and ${input.founderBName} invited you as their advisor`,
      preheader: `Advisor invitation for the founder connection between ${input.founderAName} and ${input.founderBName}.`,
      eyebrow: "Personal advisor invitation",
      greeting: advisorGreeting,
      founderLine: `${input.founderAName} and ${input.founderBName} invited you as an advisor for their founder connection in Made2Found.`,
      productIntro:
        "Made2Found helps founder teams make differences visible early, understand tension better, and structure important conversations.",
      accessIntro:
        "Once you accept, you can access the advisor and alignment areas intended for this connection. Founder Setup requires a separate approval from every current founder.",
      listTitle: "What you can see",
      bullets: [
        "the advisor report and the alignment context intended for advisors",
        "historical workbook content, where it exists",
        "not Commitment Lab, current deep dives, open points, or unconfirmed Founder Setup content",
      ],
      teamLabel: "Team/project",
      contextLabel: "Context",
      cta: "Open advisor access",
      fallback: "If the button does not work, you can also open this link directly:",
      footerReason: `You are receiving this email because ${input.founderAName} and ${input.founderBName} would like to involve you specifically as an advisor.`,
      footerIgnore: "If you do not want to accept this invitation, you can simply ignore this email.",
      privacy: "Privacy policy",
    };
  }

  return {
    htmlLang: "de",
    subject: `${input.founderAName} und ${input.founderBName} laden Sie als Advisor ein`,
    preheader: `Advisor-Einladung für die Founder-Verbindung von ${input.founderAName} und ${input.founderBName}.`,
    eyebrow: "Persönliche Advisor-Einladung",
    greeting: advisorGreeting,
    founderLine: `${input.founderAName} und ${input.founderBName} haben Sie als Advisor für ihre Founder-Verbindung in Made2Found eingeladen.`,
    productIntro:
      "Made2Found hilft Founder-Teams dabei, Unterschiede früh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespräche strukturierter zu führen.",
    accessIntro:
      "Nach der Annahme erhalten Sie Zugriff auf die dafür vorgesehenen Advisor- und Alignment-Bereiche dieser Verbindung. Founder Setup wird nur separat und mit Zustimmung aller aktuellen Founder freigegeben.",
    listTitle: "Was Sie sehen können",
    bullets: [
      "den Advisor-Report und den für Advisors vorgesehenen Alignment-Kontext",
      "historische Workbook-Inhalte, soweit vorhanden",
      "nicht Commitment Lab, aktuelle Deep Dives, offene Punkte oder unbestätigte Founder-Setup-Inhalte",
    ],
    teamLabel: "Team/Projekt",
    contextLabel: "Kontext",
    cta: "Advisor-Zugang öffnen",
    fallback: "Falls der Button nicht funktioniert, können Sie auch direkt diesen Link öffnen:",
    footerReason: `Sie erhalten diese E-Mail, weil ${input.founderAName} und ${input.founderBName} Sie gezielt als Advisor einbinden möchten.`,
    footerIgnore: "Wenn Sie diese Einladung nicht annehmen möchten, können Sie die E-Mail einfach ignorieren.",
    privacy: "Datenschutzerklärung",
  };
}

export function getAdvisorTeamContextLabel(locale: AppLocale, teamContext: TeamContext) {
  if (locale === "en") {
    return teamContext === "existing_team"
      ? "Existing founder team"
      : "Early alignment before a closer collaboration";
  }
  return teamContext === "existing_team"
    ? "Bestehendes Founder-Team"
    : "Frühe Abstimmung vor einer engeren Zusammenarbeit";
}

export function getAdvisorTeamFounderInviteEmailCopy(
  locale: AppLocale,
  input: AdvisorTeamFounderInviteCopyInput
) {
  const advisorName = input.advisorName?.trim() || null;
  const counterpartLabel = input.counterpartLabel?.trim() || null;

  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: advisorName
        ? `${advisorName} invited you to Made2Found`
        : "Your invitation to Made2Found",
      preheader:
        "Invitation to a shared founder connection in Made2Found.",
      eyebrow: "Founder invitation",
      greeting: "Hi,",
      advisorLine: advisorName
        ? `${advisorName} would like to support both of you as founders in Made2Found.`
        : "An advisor invited both of you to a shared founder connection in Made2Found.",
      counterpartLine: counterpartLabel
        ? `Once ${counterpartLabel} has also accepted, the founder connection and advisor access for its designated areas will be activated.`
        : "Once the second founder has also accepted, the founder connection and advisor access for its designated areas will be activated.",
      startConfirmation:
        "By accepting, you confirm your part of this founder connection. Both founders must accept separately.",
      listTitle: "What happens next",
      bullets: [
        "the relationship and alignment areas intended for advisor access",
        "Founder Setup remains separate and requires approval from every current founder",
        "Commitment Lab, deep dives, and open points remain private",
      ],
      teamLabel: "Team/project",
      contextLabel: "Context",
      contextValue: "Pairwise founder connection",
      cta: "View invitation",
      fallback: "If the button does not work, you can also open this link directly:",
      footerReason:
        "You are receiving this email because an advisor specifically invited you into a founder matching.",
      footerIgnore:
        "If you do not want to participate or the invitation is not relevant to you, you can simply ignore this email.",
      privacy: "Privacy policy",
    };
  }

  return {
    htmlLang: "de",
      subject: advisorName
      ? `${advisorName} lädt dich zu Made2Found ein`
      : "Deine Einladung zu Made2Found",
    preheader:
      "Einladung zu einer gemeinsamen Founder-Verbindung in Made2Found.",
    eyebrow: "Founder-Einladung",
    greeting: "Hi,",
    advisorLine: advisorName
      ? `${advisorName} möchte euch als Founder in Made2Found begleiten.`
      : "Ein Advisor hat euch zu einer gemeinsamen Founder-Verbindung in Made2Found eingeladen.",
    counterpartLine: counterpartLabel
      ? `Sobald auch ${counterpartLabel} angenommen hat, werden eure Founder-Verbindung und der Advisor-Zugang für die vorgesehenen Bereiche aktiviert.`
      : "Sobald auch die zweite Founder-Person angenommen hat, werden eure Founder-Verbindung und der Advisor-Zugang für die vorgesehenen Bereiche aktiviert.",
    startConfirmation:
      "Mit der Annahme bestätigst du deinen Teil dieser Founder-Verbindung. Beide Founder müssen jeweils selbst annehmen.",
    listTitle: "Was danach entsteht",
    bullets: [
      "die für Advisors vorgesehenen Relationship- und Alignment-Bereiche",
      "Founder Setup bleibt separat und braucht die Zustimmung aller aktuellen Founder",
      "Commitment Lab, Deep Dives und offene Punkte bleiben privat",
    ],
    teamLabel: "Team/Projekt",
    contextLabel: "Kontext",
    contextValue: "Paarweise Founder-Verbindung",
    cta: "Einladung ansehen",
    fallback: "Falls der Button nicht funktioniert, kannst du auch direkt diesen Link öffnen:",
    footerReason:
      "Du erhältst diese E-Mail, weil du von einer Advisor-Person gezielt in ein Founder-Matching eingeladen wurdest.",
    footerIgnore:
      "Wenn du nicht teilnehmen möchtest oder die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.",
    privacy: "Datenschutzerklärung",
  };
}

// ---------------------------------------------------------------------------
// Connect-Benachrichtigungen
// ---------------------------------------------------------------------------
export type NetworkNotificationCopyKind =
  | "contact_request"
  | "problem_interest"
  | "approach_interest"
  | "message"
  | "discovery_intro_request"
  | "discovery_intro_accepted"
  // DAZUGEKOMMEN AM 21.09.2026 und die erste Art, hinter der KEIN Mensch
  // steht: Alle uebrigen entstehen, weil jemand sich gemeldet hat. Diese
  // entsteht, weil eine Mengenschnittmenge etwas gefunden hat - deshalb geht
  // sie nur mit ausdruecklicher Zustimmung hinaus, und deshalb sagt ihre
  // Fusszeile etwas anderes.
  | "connect_suggestions"
  // Erinnerung an einen faelligen Team-Check-in. Kommt vom Zeitplan, nennt weder
  // Team noch Person.
  | "team_check_in"
  // Erinnerung an ein faelliges Programm-Update. Kommt vom Zeitplan, nennt weder
  // Team noch Organisation.
  | "program_update";

/**
 * Welcher Bereich ueber der Ueberschrift steht.
 *
 * Bis zum 20.09.2026 stand dort fest "CoFoundery Connect" - die Vorlage
 * bediente nur Connect. Mit den Vorstellungsanfragen aus Find waere das die
 * erste Mail, die einen falschen Ort nennt: Wer sie bekommt, sucht den Vorgang
 * sonst im falschen Bereich.
 */
function notificationArea(kind: NetworkNotificationCopyKind) {
  if (kind === "team_check_in") return "Made2Found Team";
  if (kind === "program_update") return "Made2Found Programm";
  return kind.startsWith("discovery_intro") ? "Made2Found Find" : "Made2Found Connect";
}

/**
 * Eine Vorlage fuer drei Anlaesse statt drei Vorlagen.
 *
 * Der Aufbau ist immer derselbe - jemand hat sich bei dir gemeldet, hier ist
 * der Weg hin. Was sich unterscheidet, sind zwei Saetze. Drei getrennte
 * Vorlagen waeren dreimal dieselbe Fusszeile zu pflegen.
 */
export function getNetworkNotificationEmailCopy(
  locale: AppLocale,
  input: { kind: NetworkNotificationCopyKind; senderName: string | null; count?: number }
) {
  const name = input.senderName?.trim() || (locale === "en" ? "Someone" : "Jemand");
  // Mindestens eins: Eine Meldung ueber null Vorschlaege gibt es nicht, und
  // "0 Vorschlaege" waere der Fehler, der dann in der Betreffzeile stuende.
  const count = Math.max(1, Math.trunc(input.count ?? 1));

  if (locale === "en") {
    const byKind = {
      contact_request: {
        subject: `${name} would like to get in touch`,
        headline: "A new contact request",
        intro: `${name} has responded to one of your entries and would like to get in touch.`,
        cta: "Open contact requests",
      },
      problem_interest: {
        subject: `${name} would work on your problem`,
        headline: "Someone would work on it",
        intro: `${name} has responded to a problem you described and would work on it.`,
        cta: "Open the problem",
      },
      approach_interest: {
        subject: `${name} got in touch about your approach`,
        headline: "Someone got in touch",
        intro: `${name} has responded to the approach you described for a problem.`,
        cta: "Open the problem",
      },
      message: {
        subject: `New message from ${name}`,
        headline: "A new message",
        intro: `${name} has written to you on Made2Found.`,
        cta: "Open the conversation",
      },
      discovery_intro_request: {
        subject: `${name} would like to get to know you`,
        headline: "A request to be introduced",
        intro: `${name} found your profile in Find and would like to get to know you. Your answer decides whether the two of you get in touch.`,
        cta: "Open the request",
      },
      discovery_intro_accepted: {
        subject: `${name} said yes`,
        headline: "Your request was accepted",
        intro: `${name} would like to get to know you too. You can write to each other from now on.`,
        cta: "Open the conversation",
      },
      connect_suggestions: {
        subject: count === 1 ? "One suggestion for you" : `${count} suggestions for you`,
        headline: count === 1 ? "One suggestion for you" : "New suggestions for you",
        // KEIN NAME, KEIN TITEL. Wer oder was vorgeschlagen wurde, steht in
        // Made2Found - nicht in einem Postfach, dessen Weg wir nicht kennen.
        intro:
          count === 1
            ? "Something in Connect overlaps with what you wrote about yourself. Every suggestion shows you the word that triggered it."
            : `${count} things in Connect overlap with what you wrote about yourself. Every suggestion shows you the word that triggered it.`,
        cta: "Open suggestions",
      },
      program_update: {
        subject: "Your program update is coming up",
        headline: "Time for your update",
        // KEIN TEAM- UND KEIN ORGANISATIONSNAME: Die Mail landet in einem Postfach, dessen Weg wir nicht kennen.
        intro: "The next update to your program is coming up. It takes a few minutes and keeps everyone on the same page.",
        cta: "Open the update",
      },
      team_check_in: {
        subject: "Your team check-in is due",
        headline: "Time for your check-in",
        // KEIN TEAMNAME: Die Mail landet in einem Postfach, dessen Weg wir nicht kennen.
        intro:
          "It has been a while since your team confirmed its agreements. A check-in takes a few minutes and shows whether they still hold.",
        cta: "Open the check-in",
      },
    }[input.kind];

    return {
      htmlLang: "en",
      eyebrow: notificationArea(input.kind),
      ...byKind,
      preheader: byKind.intro,
      // DIE FUSSZEILE SAGT, WARUM DIESE MAIL DA IST, und fuer Vorschlaege ist
      // das eine andere Antwort: Alle uebrigen Arten entstehen aus der Meldung
      // eines Menschen und sind deshalb an, solange man sie nicht abbestellt.
      // Diese geht nur hinaus, weil jemand im Konto ausdruecklich zugestimmt
      // hat - und dann muss die Mail selbst daran erinnern, sonst liest sie
      // sich wie ungefragte Post.
      note:
        input.kind === "program_update"
          ? "You are getting this email because you agreed to it in your account settings. One reminder per due update, nothing more."
          : input.kind === "team_check_in"
          ? "You are getting this email because you agreed to it in your account settings. One reminder per due check-in, nothing more."
          : input.kind === "connect_suggestions"
          ? "You are getting this email because you agreed to it in your account settings. At most once per batch, and never more than three suggestions a week."
          : "We only notify you about your own activity, and at most once per event.",
      settings: "You can switch these emails off in your account settings.",
      fallback: "If the button does not work, use this link:",
      privacy: "Privacy",
    };
  }

  const byKind = {
    contact_request: {
      subject: `${name} möchte mit dir in Kontakt kommen`,
      headline: "Eine neue Kontaktanfrage",
      intro: `${name} hat auf einen deiner Einträge reagiert und möchte mit dir in Kontakt kommen.`,
      cta: "Kontaktanfragen öffnen",
    },
    problem_interest: {
      subject: `${name} würde an deinem Problem arbeiten`,
      headline: "Jemand würde mitarbeiten",
      intro: `${name} hat auf ein Problem reagiert, das du geschildert hast, und würde daran arbeiten.`,
      cta: "Problem öffnen",
    },
    approach_interest: {
      subject: `${name} hat sich zu deinem Ansatz gemeldet`,
      headline: "Jemand hat sich gemeldet",
      intro: `${name} hat auf den Ansatz reagiert, den du zu einem Problem beschrieben hast.`,
      cta: "Problem öffnen",
    },
    message: {
      subject: `Neue Nachricht von ${name}`,
      headline: "Eine neue Nachricht",
      intro: `${name} hat dir auf Made2Found geschrieben.`,
      cta: "Gespräch öffnen",
    },
    discovery_intro_request: {
      subject: `${name} möchte dich kennenlernen`,
      headline: "Eine Vorstellungsanfrage",
      intro: `${name} hat dein Profil in Find gefunden und möchte dich kennenlernen. Deine Antwort entscheidet, ob ihr in Kontakt kommt.`,
      cta: "Anfrage öffnen",
    },
    discovery_intro_accepted: {
      subject: `${name} hat zugesagt`,
      headline: "Deine Anfrage wurde angenommen",
      intro: `${name} möchte dich ebenfalls kennenlernen. Ihr könnt euch ab jetzt schreiben.`,
      cta: "Gespräch öffnen",
    },
    connect_suggestions: {
      subject: count === 1 ? "Ein Vorschlag für dich" : `${count} Vorschläge für dich`,
      headline: count === 1 ? "Ein Vorschlag für dich" : "Neue Vorschläge für dich",
      // KEIN NAME, KEIN TITEL. Wer oder was vorgeschlagen wurde, steht in
      // Made2Found - nicht in einem Postfach, dessen Weg wir nicht kennen.
      intro:
        count === 1
          ? "In Connect gibt es etwas, das sich mit deinen eigenen Angaben überschneidet. Jeder Vorschlag zeigt dir das Wort, das ihn ausgelöst hat."
          : `In Connect gibt es ${count} Dinge, die sich mit deinen eigenen Angaben überschneiden. Jeder Vorschlag zeigt dir das Wort, das ihn ausgelöst hat.`,
      cta: "Vorschläge öffnen",
    },
    program_update: {
      subject: "Euer Programm-Update steht an",
      headline: "Zeit für euer Update",
      // KEIN TEAM- UND KEIN ORGANISATIONSNAME: Die Mail landet in einem Postfach, dessen Weg wir nicht kennen.
      intro: "Das nächste Update an euer Programm steht an. Es dauert ein paar Minuten und hält alle auf demselben Stand.",
      cta: "Update öffnen",
    },
    team_check_in: {
      subject: "Euer Team-Check-in ist fällig",
      headline: "Zeit für euren Check-in",
      // KEIN TEAMNAME: Die Mail landet in einem Postfach, dessen Weg wir nicht kennen.
      intro:
        "Eure Vereinbarungen sind eine Weile her. Ein Check-in dauert ein paar Minuten und zeigt, ob sie noch gelten.",
      cta: "Check-in öffnen",
    },
  }[input.kind];

  return {
    htmlLang: "de",
    eyebrow: notificationArea(input.kind),
    ...byKind,
    preheader: byKind.intro,
    // Siehe die englische Fassung: Fuer Vorschlaege nennt die Fusszeile die
    // Zustimmung, weil sie der Grund ist, aus dem diese Mail ueberhaupt
    // hinausgeht.
    note:
      input.kind === "program_update"
        ? "Du bekommst diese Mail, weil du ihr in deinen Kontoeinstellungen ausdrücklich zugestimmt hast. Eine Erinnerung je fälligem Update, nicht mehr."
        : input.kind === "team_check_in"
        ? "Du bekommst diese Mail, weil du ihr in deinen Kontoeinstellungen ausdrücklich zugestimmt hast. Eine Erinnerung je fälligem Check-in, nicht mehr."
        : input.kind === "connect_suggestions"
        ? "Du bekommst diese Mail, weil du ihr in deinen Kontoeinstellungen ausdrücklich zugestimmt hast. Höchstens einmal je Schwung, und nie mehr als drei Vorschläge pro Woche."
        : "Wir benachrichtigen dich nur über deine eigenen Vorgänge, und höchstens einmal je Vorgang.",
    settings: "Du kannst diese Mails in deinen Kontoeinstellungen abschalten.",
    fallback: "Falls der Knopf nicht funktioniert, nutze diesen Link:",
    privacy: "Datenschutz",
  };
}

/**
 * Die Meldung ueber einen Treffer in einer gespeicherten Suche.
 *
 * Nennt die Gruende, nicht nur die Tatsache: Wer eine Meldung bekommt, soll
 * sehen, welches SEINER Kriterien zutraf. Sonst waere es eine Empfehlung von
 * uns statt ein Treffer auf die eigene Suche.
 */
export function getSavedSearchEmailCopy(
  locale: AppLocale,
  input: { subjectKind: "listing" | "problem"; title: string; reasons: string[] }
) {
  if (locale === "en") {
    return {
      htmlLang: "en",
      eyebrow: "Made2Found Connect",
      subject:
        input.subjectKind === "problem"
          ? "A new problem matches your search"
          : "A new entry matches your search",
      headline:
        input.subjectKind === "problem"
          ? "A new problem matches your search"
          : "A new entry matches your search",
      intro: input.title,
      reasonsTitle: "It matches these criteria of yours:",
      reasons: input.reasons,
      cta: input.subjectKind === "problem" ? "Open the problem" : "Open the entry",
      note: "This is a hit on the search you saved – not a recommendation from us.",
      settings: "You can switch off notifications for a saved search at any time.",
      fallback: "If the button does not work, use this link:",
      privacy: "Privacy",
      preheader: input.title,
    };
  }

  return {
    htmlLang: "de",
    eyebrow: "Made2Found Connect",
    subject:
      input.subjectKind === "problem"
        ? "Ein neues Problem passt zu deiner Suche"
        : "Ein neuer Eintrag passt zu deiner Suche",
    headline:
      input.subjectKind === "problem"
        ? "Ein neues Problem passt zu deiner Suche"
        : "Ein neuer Eintrag passt zu deiner Suche",
    intro: input.title,
    reasonsTitle: "Das trifft auf diese deiner Kriterien zu:",
    reasons: input.reasons,
    cta: input.subjectKind === "problem" ? "Problem öffnen" : "Eintrag öffnen",
    note: "Das ist ein Treffer auf die Suche, die du gespeichert hast – keine Empfehlung von uns.",
    settings: "Du kannst die Benachrichtigung für eine gespeicherte Suche jederzeit abschalten.",
    fallback: "Falls der Knopf nicht funktioniert, nutze diesen Link:",
    privacy: "Datenschutz",
    preheader: input.title,
  };
}

/** Die Meldung ueber ein neues Suchprofil, das zu einer Suche passt. */
export function getDiscoverySavedSearchEmailCopy(
  locale: AppLocale,
  // `hasAlignmentFilter` ist am 30.09.2026 weggefallen. Die Meldung sagte
  // dazu, dass die Liste beim Ansehen kuerzer sein koenne, weil zusaetzlich
  // nach Alignment-Tendenzen gefiltert werde. Diesen Filter gibt es nicht
  // mehr (FIND-Spec, Abschnitt 20) - der Satz waere jetzt eine Warnung vor
  // etwas, das nicht passiert.
  input: { displayName: string; headline: string; reasons: string[] }
) {
  if (locale === "en") {
    return {
      htmlLang: "en",
      eyebrow: "Made2Found Discovery",
      subject: "A new profile matches your search",
      headline: "A new profile matches your search",
      intro: `${input.displayName} – ${input.headline}`,
      reasonsTitle: "It matches these criteria of yours:",
      reasons: input.reasons,
      alignmentNote: null,
      cta: "Open Discovery",
      note: "This is a hit on the search you saved – not a recommendation, and not a statement about whether you fit together.",
      settings: "You can switch off notifications for a saved search at any time.",
      fallback: "If the button does not work, use this link:",
      privacy: "Privacy",
      preheader: `${input.displayName} – ${input.headline}`,
    };
  }

  return {
    htmlLang: "de",
    eyebrow: "Made2Found Discovery",
    subject: "Ein neues Profil passt zu deiner Suche",
    headline: "Ein neues Profil passt zu deiner Suche",
    intro: `${input.displayName} – ${input.headline}`,
    reasonsTitle: "Das trifft auf diese deiner Kriterien zu:",
    reasons: input.reasons,
      alignmentNote: null,
    cta: "Discovery öffnen",
    note: "Das ist ein Treffer auf die Suche, die du gespeichert hast – keine Empfehlung, und keine Aussage darüber, ob ihr zusammenpasst.",
    settings: "Du kannst die Benachrichtigung für eine gespeicherte Suche jederzeit abschalten.",
    fallback: "Falls der Knopf nicht funktioniert, nutze diesen Link:",
    privacy: "Datenschutz",
    preheader: `${input.displayName} – ${input.headline}`,
  };
}
