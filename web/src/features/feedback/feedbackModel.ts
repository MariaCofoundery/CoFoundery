/**
 * Feedback neu (Entwurf vom 09.11.2026, freigegeben): eine Art, ein Text, der Ort, optional die Wichtigkeit - und ein
 * ausdrueckliches "darf angeschrieben werden". Reine Funktionen; die Datenbank prueft dieselben Grenzen noch einmal
 * (`20270404120000_product_feedback_panel.sql`).
 */

export const FEEDBACK_KINDS = ["help", "unclear", "bug", "missing"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_IMPORTANCE = ["minor", "important", "very"] as const;
export type FeedbackImportance = (typeof FEEDBACK_IMPORTANCE)[number];

export const FEEDBACK_DEVICES = ["desktop", "phone"] as const;
export type FeedbackDevice = (typeof FEEDBACK_DEVICES)[number];

/** Die Schluesselmomente, nach denen eine kleine Frage im Fluss steht (je Konto hoechstens einmal). */
export const FEEDBACK_MOMENTS = ["setup_done", "workstyle_report", "team_workstyle"] as const;
export type FeedbackMoment = (typeof FEEDBACK_MOMENTS)[number];
export const feedbackMomentOf = (value: unknown): FeedbackMoment | null => FEEDBACK_MOMENTS.find((entry) => entry === value) ?? null;

/** Ja / Nicht so; "more" = gleich zu "Mehr sagen"; "dismissed" = weggeklickt. */
export const FEEDBACK_MOMENT_ANSWERS = ["yes", "no", "more", "dismissed"] as const;
export type FeedbackMomentAnswer = (typeof FEEDBACK_MOMENT_ANSWERS)[number];
export const feedbackMomentAnswerOf = (value: unknown): FeedbackMomentAnswer | null => FEEDBACK_MOMENT_ANSWERS.find((entry) => entry === value) ?? null;

export const FEEDBACK_LIMITS = { message: 4000, path: 300 } as const;

export const feedbackKindOf = (value: unknown): FeedbackKind | null => FEEDBACK_KINDS.find((entry) => entry === value) ?? null;

/* ---------------------------------------------------------------------------
   Der Ort: aus der Adresse, nicht aus der Eingabe
   --------------------------------------------------------------------------- */

export type FeedbackContext = { area: string; sub: string | null };

/** Die Bereiche, nach denen der Admin-Bereich filtert. */
export const FEEDBACK_AREAS = ["start", "align", "find", "connect", "events", "today", "teamraum", "calendar", "program", "follow", "setup", "messages", "account", "other"] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export const feedbackAreaOf = (value: unknown): FeedbackArea | null => FEEDBACK_AREAS.find((entry) => entry === value) ?? null;

/** Unterbereiche, die es als eigene Beschriftung gibt (`feedback.subs.<area>_<sub>`). */
export const FEEDBACK_SUBS: Record<string, readonly string[]> = {
  align: ["profile", "team", "questionnaires"],
  find: ["discover", "intros", "profile"],
  connect: ["discover", "people", "problems", "ventures", "contacts", "mine"],
  teamraum: ["week", "tasks", "chat", "social", "pages", "who"],
};

const TEAMRAUM_SEGMENTS: Record<string, string> = { aufgaben: "tasks", chat: "chat", social: "social", seiten: "pages", wer: "who", woche: "week" };

const segmentsOf = (pathname: string) => pathname.split(/[?#]/)[0].split("/").filter(Boolean);

/**
 * Wo steht die Person? Dieselben Bereiche wie die Seitenleisten (Founder: Start, Align, Find, Connect, Events;
 * Arbeitsbereich: Heute, Teamraum, Kalender, Programm, Begleitung, Einrichten). Was keinem gehoert: "other".
 */
export function feedbackContextOf(pathname: string): FeedbackContext {
  const [first = "", second = "", third = ""] = segmentsOf(pathname);
  const sub = (area: string, value: string | null): FeedbackContext => ({ area, sub: value && (FEEDBACK_SUBS[area] ?? []).includes(value) ? value : null });
  switch (first) {
    case "dashboard":
    case "start":
      return { area: "start", sub: null };
    case "me":
      return sub("align", "profile");
    case "profile":
      return sub("align", "profile");
    case "connections":
    case "teams":
    case "founder-alignment":
      return sub("align", "team");
    case "fragebogen":
    case "research":
      return sub("align", "questionnaires");
    case "founder-library":
      return sub("align", "team");
    case "programm":
      return { area: "program", sub: null };
    case "discovery":
      return sub("find", second === "intros" ? "intros" : second === "profile" ? "profile" : "discover");
    case "connect": {
      const map: Record<string, string> = { people: "people", problems: "problems", workspaces: "problems", ventures: "ventures", contacts: "contacts", messages: "contacts", my: "mine", profile: "mine", searches: "mine" };
      return sub("connect", map[second] ?? "discover");
    }
    case "events":
      return { area: "events", sub: null };
    case "messages":
    case "einladungen":
      return { area: "messages", sub: null };
    case "account":
      return { area: "account", sub: null };
    case "advisor":
      if (second === "dashboard") return { area: "today", sub: null };
      if (second === "teamraum") return sub("teamraum", third === "" ? "week" : (TEAMRAUM_SEGMENTS[third] ?? null));
      if (second === "kalender") return { area: "calendar", sub: null };
      if (second === "organisation" || second === "programm") return { area: "program", sub: null };
      if (["begleitung", "einladen", "person", "group", "review", "report", "snapshot", "session"].includes(second)) return { area: "follow", sub: null };
      if (second === "los-gehts" || second === "seitenleiste") return { area: "setup", sub: null };
      return { area: "other", sub: null };
    case "team-intake":
      return { area: "follow", sub: null };
    default:
      return { area: "other", sub: null };
  }
}

/** Der Wert fuer die Spalte `area`: "connect.people" oder "connect". */
export const feedbackAreaValue = (context: FeedbackContext) => (context.sub ? `${context.area}.${context.sub}` : context.area);

/* ---------------------------------------------------------------------------
   Die Seite - ohne Kennungen
   --------------------------------------------------------------------------- */

/** Erste Adressteile, die es im Produkt gibt. Alles andere (Einladungen, Codes, Berichte per Link) wird nicht gespeichert. */
const PATH_ROOTS = new Set([
  "dashboard", "me", "profile", "connections", "teams", "founder-alignment", "fragebogen", "research", "founder-library", "programm",
  "discovery", "connect", "events", "messages", "account", "advisor", "team-intake",
]);

/** Ein Wort aus Kleinbuchstaben und Strichen: eine Seite. Alles andere ist eine Kennung oder ein Code. */
const WORD = /^[a-z][a-z-]{0,31}$/;

/**
 * Die Seite ohne Abfrage und ohne Kennungen: jeder Teil, der kein einfaches Wort ist (UUID, Code, Token, Zahl), wird zu
 * ":id". So steht im Feedback "/teams/:id/setup" und nie ein Einladungscode. Unbekannter Anfang: gar nichts.
 */
export function sanitizeFeedbackPath(pathname: string | null | undefined): string | null {
  if (typeof pathname !== "string") return null;
  const parts = segmentsOf(pathname);
  if (parts.length === 0 || !PATH_ROOTS.has(parts[0])) return null;
  const cleaned = parts.slice(0, 6).map((part, index) => (index === 0 || WORD.test(part) ? part : ":id"));
  const path = `/${cleaned.join("/")}`;
  return path.length <= FEEDBACK_LIMITS.path ? path : null;
}

/** Eine Seite ohne ":id" laesst sich aufrufen; mit ":id" nur lesen. */
export const feedbackPathIsLinkable = (path: string | null) => Boolean(path) && !path!.includes(":id");

/* ---------------------------------------------------------------------------
   Die Eingabe
   --------------------------------------------------------------------------- */

export type FeedbackSubmissionInput = {
  source: "nav" | "workbook";
  invitationId?: string | null;
  kind: string;
  message: string;
  importance?: string | null;
  mayContact?: boolean;
  pathname?: string | null;
  device?: string | null;
  /** Wozu das Feedback gehoert, wenn es aus einer kleinen Frage kommt ('Mehr sagen'). */
  moment?: string | null;
};

export type SanitizedFeedback = {
  source: "nav" | "workbook";
  invitationId: string | null;
  kind: FeedbackKind;
  message: string;
  importance: FeedbackImportance | null;
  mayContact: boolean;
  area: string;
  pagePath: string | null;
  device: FeedbackDevice | null;
  moment: FeedbackMoment | null;
};

export function sanitizeFeedbackSubmission(input: FeedbackSubmissionInput): { ok: true; value: SanitizedFeedback } | { ok: false; error: "invalid_kind" | "missing_message" } {
  const kind = feedbackKindOf(input.kind);
  if (!kind) return { ok: false, error: "invalid_kind" };
  const message = (input.message ?? "").trim().slice(0, FEEDBACK_LIMITS.message);
  if (!message) return { ok: false, error: "missing_message" };
  const importance = FEEDBACK_IMPORTANCE.find((entry) => entry === input.importance) ?? null;
  const device = FEEDBACK_DEVICES.find((entry) => entry === input.device) ?? null;
  const invitation = input.invitationId?.trim();
  return {
    ok: true,
    value: {
      source: input.source === "workbook" ? "workbook" : "nav",
      invitationId: invitation ? invitation : null,
      kind,
      message,
      importance,
      // Nur ein ausdrueckliches Ja zaehlt. Alles andere - fehlend, "yes" als Text, 1 - ist ein Nein.
      mayContact: input.mayContact === true,
      area: feedbackAreaValue(feedbackContextOf(input.pathname ?? "")),
      pagePath: sanitizeFeedbackPath(input.pathname),
      device,
      moment: feedbackMomentOf(input.moment),
    },
  };
}
