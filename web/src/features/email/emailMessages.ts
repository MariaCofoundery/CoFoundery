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

export function getEmailPrivacyUrl(locale: AppLocale) {
  return locale === "en" ? "https://cofoundery.de/datenschutz" : "https://cofoundery.de/datenschutz";
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
      subject: `${input.founderAName} and ${input.founderBName} would like to involve you as an advisor`,
      preheader: `Personal advisor invitation from ${input.founderAName} and ${input.founderBName} for Cofoundery Align.`,
      eyebrow: "Personal advisor invitation",
      greeting: advisorGreeting,
      founderLine: `${input.founderAName} and ${input.founderBName} would like to involve you as an advisor in their Cofoundery Align context.`,
      productIntro:
        "Cofoundery Align helps founder teams make differences visible early, understand tension better, and structure important conversations.",
      accessIntro:
        "As an advisor, you get access to the shared team context, the workbook, and the advisor report so you can add observations, questions, and useful next steps.",
      listTitle: "What you can see",
      bullets: [
        "the shared team context and relevant founder perspectives",
        "the workbook with the team’s current working state",
        "the advisor report as a structured foundation for your support",
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
    subject: `${input.founderAName} und ${input.founderBName} möchten Sie als Advisor einbinden`,
    preheader: `Persönliche Advisor-Einladung von ${input.founderAName} und ${input.founderBName} für Cofoundery Align.`,
    eyebrow: "Persönliche Advisor-Einladung",
    greeting: advisorGreeting,
    founderLine: `${input.founderAName} und ${input.founderBName} möchten Sie gezielt als Advisor in ihren Cofoundery-Align-Kontext einbinden.`,
    productIntro:
      "Cofoundery Align hilft Founder-Teams dabei, Unterschiede früh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespräche strukturierter zu führen.",
    accessIntro:
      "Als Advisor erhalten Sie Zugriff auf den freigegebenen Teamkontext, das gemeinsame Workbook und den Advisor-Report, um Beobachtungen, Rückfragen und nächste sinnvolle Schritte beizutragen.",
    listTitle: "Was Sie sehen können",
    bullets: [
      "den freigegebenen Teamkontext und die relevanten Founder-Perspektiven",
      "das Workbook mit den aktuellen Arbeitsständen des Teams",
      "den Advisor-Report als strukturierte Grundlage für Ihre Begleitung",
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
        ? `${advisorName} invited you into a founder matching`
        : "Invitation to a founder matching",
      preheader:
        "Invitation into an advisor-initiated founder matching in Cofoundery Align.",
      eyebrow: "Founder invitation",
      greeting: "Hi,",
      advisorLine: advisorName
        ? `${advisorName} would like to invite you into a structured founder matching with Cofoundery Align.`
        : "You’ve been invited into a structured founder matching with Cofoundery Align.",
      counterpartLine: counterpartLabel
        ? `Once ${counterpartLabel} has also started, your shared matching context will be created automatically.`
        : "Once the second founder has also started, your shared matching context will be created automatically.",
      startConfirmation:
        "With this step, you only confirm your start in the flow.",
      listTitle: "What happens next",
      bullets: [
        "a shared matching context for both founders",
        "an Alignment Workbook once both of you have started",
        "a clear progress view for the advisor supporting you",
      ],
      teamLabel: "Team/project",
      contextLabel: "Context",
      contextValue: "Founder matching",
      cta: "Start matching",
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
      ? `${advisorName} lädt dich in ein Founder-Matching ein`
      : "Einladung in ein Founder-Matching",
    preheader:
      "Einladung in ein von einem Advisor initiiertes Founder-Matching bei Cofoundery Align.",
    eyebrow: "Founder-Einladung",
    greeting: "Hi,",
    advisorLine: advisorName
      ? `${advisorName} möchte euch in ein strukturiertes Founder-Matching mit Cofoundery Align einladen.`
      : "Du wurdest in ein strukturiertes Founder-Matching mit Cofoundery Align eingeladen.",
    counterpartLine: counterpartLabel
      ? `Sobald auch ${counterpartLabel} gestartet ist, wird euer gemeinsamer Matching-Kontext automatisch angelegt.`
      : "Sobald auch die zweite Founder-Person gestartet ist, wird euer gemeinsamer Matching-Kontext automatisch angelegt.",
    startConfirmation:
      "Mit diesem Schritt bestätigst du nur deinen Start in den Flow.",
    listTitle: "Was danach entsteht",
    bullets: [
      "ein gemeinsamer Matching-Kontext für beide Founder",
      "ein Alignment-Workbook, sobald ihr beide gestartet habt",
      "ein sauberer Fortschrittsblick für eure begleitende Advisor-Person",
    ],
    teamLabel: "Team/Projekt",
    contextLabel: "Kontext",
    contextValue: "Founder-Matching",
    cta: "Matching starten",
    fallback: "Falls der Button nicht funktioniert, kannst du auch direkt diesen Link öffnen:",
    footerReason:
      "Du erhältst diese E-Mail, weil du von einer Advisor-Person gezielt in ein Founder-Matching eingeladen wurdest.",
    footerIgnore:
      "Wenn du nicht teilnehmen möchtest oder die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.",
    privacy: "Datenschutzerklärung",
  };
}
