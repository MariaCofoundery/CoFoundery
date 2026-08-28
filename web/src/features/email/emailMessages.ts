import type { AppLocale } from "@/i18n/config";

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
};

export function getEmailPrivacyUrl(locale: AppLocale) {
  return locale === "en" ? "https://cofoundery.de/datenschutz" : "https://cofoundery.de/datenschutz";
}

export function getReadMyMindStartedEmailCopy(
  locale: AppLocale,
  input: ReadMyMindStartedCopyInput
) {
  const creatorName = input.creatorName?.trim() || (locale === "en" ? "Your co-founder" : "Dein Co-Founder");

  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: `${creatorName} started Read My Mind with you — you’re up`,
      preheader: `${creatorName} has completed their part of a Read My Mind round. You’re up.`,
      eyebrow: "Read My Mind · Beta",
      greeting: "Hi,",
      intro: `${creatorName} has already completed their part of a Read My Mind round.`,
      explanation: `You answer five short work situations independently of ${creatorName}. Only when you are finished too can you reveal your answers together.`,
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
    subject: `${creatorName} hat Read My Mind mit dir gestartet – du bist dran`,
    preheader: `${creatorName} hat den eigenen Teil einer Read-My-Mind-Runde abgeschlossen. Jetzt bist du dran.`,
    eyebrow: "Read My Mind · Beta",
    greeting: "Hi,",
    intro: `${creatorName} hat den eigenen Teil einer Read-My-Mind-Runde bereits abgeschlossen.`,
    explanation: `Du beantwortest fünf kurze Arbeitssituationen unabhängig von ${creatorName}. Erst wenn auch du fertig bist, könnt ihr eure Antworten gemeinsam aufdecken.`,
    turn: "Jetzt bist du dran.",
    cta: "Read My Mind öffnen",
    note: "Es gibt keine richtigen Antworten. Es geht darum, euch und eure Zusammenarbeit noch ein bisschen besser kennenzulernen.",
    beta: "Read My Mind befindet sich aktuell in der Testphase.",
    fallback: "Falls der Button nicht funktioniert, kannst du diesen Link direkt öffnen:",
    privacy: "Datenschutzerklärung",
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
        ? `${inviterName} invited you to Cofoundery Align`
        : "You’ve been invited to Cofoundery Align",
      preheader:
        "Personal invitation to Cofoundery Align: shared report and workbook for your co-founder dynamics.",
      eyebrow: "Personal invitation",
      greeting: "Hi,",
      inviterLine: inviterName
        ? `${inviterName} would like to explore your co-founder dynamics with you in Cofoundery Align.`
        : "You’ve been invited to explore your co-founder dynamics together in Cofoundery Align.",
      productIntro:
        "Cofoundery Align helps founder teams see collaboration more clearly early on, understand differences better, and discuss important topics with more structure.",
      listTitle: "What to expect",
      bullets: [
        "a structured matching report about collaboration, roles, and decision logic",
        "a shared workbook to capture key tensions and agreements concretely",
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
        "You are receiving this email because you were personally invited to a shared Cofoundery Align process.",
      footerIgnore:
        "If you do not want to participate or the invitation is not relevant to you, you can simply ignore this email.",
      privacy: "Privacy policy",
    };
  }

  return {
    htmlLang: "de",
    subject: inviterName
      ? `${inviterName} lädt dich zu eurem Cofoundery Align ein`
      : "Einladung zu eurem Cofoundery Align",
    preheader:
      "Persönliche Einladung zu Cofoundery Align: gemeinsamer Report und Workbook für eure Co-Founder-Dynamik.",
    eyebrow: "Persönliche Einladung",
    greeting: "Hi,",
    inviterLine: inviterName
      ? `${inviterName} möchte gemeinsam mit dir eure Co-Founder-Dynamik in Cofoundery Align anschauen.`
      : "Du wurdest eingeladen, gemeinsam eure Co-Founder-Dynamik in Cofoundery Align anzuschauen.",
    productIntro:
      "Cofoundery Align hilft Founder-Teams dabei, Zusammenarbeit früh klarer zu sehen, Unterschiede besser einzuordnen und wichtige Themen bewusst zu besprechen.",
    listTitle: "Was euch erwartet",
    bullets: [
      "ein strukturierter Matching-Report zu Zusammenarbeit, Rollen und Entscheidungslogik",
      "ein gemeinsames Workbook, um zentrale Spannungen und Vereinbarungen konkret festzuhalten",
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
      "Du erhältst diese E-Mail, weil du persönlich zu einem gemeinsamen Cofoundery-Align-Prozess eingeladen wurdest.",
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
      founderLine: `${input.founderAName} and ${input.founderBName} invited you as an advisor for their founder connection in Cofoundery.`,
      productIntro:
        "Cofoundery Align helps founder teams make differences visible early, understand tension better, and structure important conversations.",
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
    founderLine: `${input.founderAName} und ${input.founderBName} haben Sie als Advisor für ihre Founder-Verbindung in Cofoundery eingeladen.`,
    productIntro:
      "Cofoundery Align hilft Founder-Teams dabei, Unterschiede früh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespräche strukturierter zu führen.",
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
        ? `${advisorName} invited you to Cofoundery`
        : "Your invitation to Cofoundery",
      preheader:
        "Invitation to a shared founder connection in Cofoundery.",
      eyebrow: "Founder invitation",
      greeting: "Hi,",
      advisorLine: advisorName
        ? `${advisorName} would like to support both of you as founders in Cofoundery.`
        : "An advisor invited both of you to a shared founder connection in Cofoundery.",
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
      ? `${advisorName} lädt dich zu CoFoundery ein`
      : "Deine Einladung zu CoFoundery",
    preheader:
      "Einladung zu einer gemeinsamen Founder-Verbindung in CoFoundery.",
    eyebrow: "Founder-Einladung",
    greeting: "Hi,",
    advisorLine: advisorName
      ? `${advisorName} möchte euch als Founder in CoFoundery begleiten.`
      : "Ein Advisor hat euch zu einer gemeinsamen Founder-Verbindung in CoFoundery eingeladen.",
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
