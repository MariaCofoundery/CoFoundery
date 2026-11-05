/**
 * Diktat -> Aufgaben-Vorschlaege (Wunsch von Maria, 05.11.2026): "eine Diktierfunktion, die Aufgaben
 * erkennt und einsortiert, Vorschlaege macht, und man korrigiert nur noch."
 *
 * BEWUSST REGELN, KEIN KI-DIENST. Der Text verlaesst das Geraet nicht (die Spracherkennung selbst ist
 * die des Browsers), und jede Erkennung ist nachvollziehbar. Was die Regeln nicht sicher erkennen,
 * bleibt leer - die Person korrigiert in den Karten. Lieber eine Luecke als eine falsche Frist.
 *
 * Erkannt wird je Aufgabe:
 *   wer        ein Vorname aus dem Team am Satzanfang ("Pia soll ...", "Jonas fragt ..."), "fuer Pia",
 *              "ich/mir/mich" -> man selbst, "wir" -> niemand. Sonst: man selbst (wie beim Schnell-Eintragen).
 *   bis wann   heute, morgen, uebermorgen, Wochentage, naechste Woche, Ende der Woche/des Monats,
 *              in N Tagen/Wochen, 12.11.(2026), 12. November - und dasselbe auf Englisch.
 *   Team       der Name eines Teams im Programm, das die Person sieht.
 * Getrennt wird an Satzzeichen, Zeilen und an Woertern, mit denen man beim Sprechen eine neue Sache
 * anfaengt ("ausserdem", "und dann", "und Jonas ..."), nicht an jedem "und".
 */

export type DictationMember = { userId: string; name: string };
export type DictationProgram = { programId: string; name: string };
export type TaskSuggestion = { title: string; assigneeUserId: string | null; dueOn: string | null; programId: string | null };

const WEEKDAYS: Record<string, number> = {
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const MONTHS: Record<string, number> = {
  januar: 1, jänner: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10, december: 12,
};
const NUMBERS: Record<string, number> = { ein: 1, einem: 1, einer: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, one: 1, a: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Wortgrenzen fuer Deutsch: `\b` kennt in JavaScript nur a-z - vor "übermorgen" oder "Ärger" laege
 * keine Grenze. Jedes `\b` in den Mustern hier wird zu einer Grenze zwischen Buchstabe/Ziffer und Rest.
 */
const BOUNDARY = "(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))";
const unicode = (pattern: RegExp) => new RegExp(pattern.source.replaceAll("\\b", BOUNDARY), pattern.flags.includes("u") ? pattern.flags : `${pattern.flags}u`);
const pad = (value: number) => String(value).padStart(2, "0");

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
function nextWeekday(today: string, weekday: number) {
  const diff = (weekday - weekdayOf(today) + 7) % 7;
  return addDays(today, diff === 0 ? 7 : diff);
}
function endOfMonth(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}
/** Ein Tag ohne Jahr: dieses Jahr, oder naechstes, wenn er schon vorbei ist. */
function dayMonth(today: string, day: number, month: number, year?: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const thisYear = Number(today.slice(0, 4));
  let candidate = `${year ?? thisYear}-${pad(month)}-${pad(day)}`;
  if (new Date(`${candidate}T00:00:00Z`).getUTCDate() !== day) return null;
  if (!year && candidate < today) candidate = `${thisYear + 1}-${pad(month)}-${pad(day)}`;
  return candidate;
}

const DUE_RULES: { pattern: RegExp; due: (match: RegExpMatchArray, today: string) => string | null }[] = ([
  { pattern: /\b(?:bis |am )?übermorgen\b|\b(?:by )?the day after tomorrow\b/i, due: (_m, today) => addDays(today, 2) },
  { pattern: /\b(?:bis |by )?(?:heute|today)(?: abend| evening)?\b/i, due: (_m, today) => today },
  { pattern: /\b(?:bis |by )?(?:morgen|tomorrow)(?: früh| frueh| morning)?\b/i, due: (_m, today) => addDays(today, 1) },
  { pattern: /\b(?:bis |zum |am |by |on )?(?:ende (?:der|dieser) woche|end of (?:the|this) week)\b/i, due: (_m, today) => nextWeekday(addDays(today, -1), 5) },
  { pattern: /\b(?:bis |zum |by )?(?:ende (?:des|dieses) monats|monatsende|end of (?:the|this) month)\b/i, due: (_m, today) => endOfMonth(today) },
  { pattern: /\b(?:bis |by )?(?:nächste|naechste|kommende|next) woche|\b(?:bis |by )?next week\b/i, due: (_m, today) => nextWeekday(today, 1) },
  {
    pattern: /\bin (\d{1,2}|ein|einem|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|one|a|two|three|four|five|six|seven|eight|nine|ten) (tag|tagen|days?|woche|wochen|weeks?)\b/i,
    due: (match, today) => {
      const count = /^\d+$/.test(match[1]) ? Number(match[1]) : NUMBERS[match[1].toLowerCase()] ?? 1;
      return addDays(today, /^(woche|wochen|week)/i.test(match[2]) ? count * 7 : count);
    },
  },
  {
    pattern: /\b(?:bis (?:zum )?|am |zum |by |on )?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?!\d)/i,
    due: (match, today) => dayMonth(today, Number(match[1]), Number(match[2]), match[3] ? (match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])) : undefined),
  },
  {
    pattern: /\b(?:bis (?:zum )?|am |zum |by |on )?(\d{1,2})\.? (januar|jänner|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|may|june|july|october|december)\b/i,
    due: (match, today) => dayMonth(today, Number(match[1]), MONTHS[match[2].toLowerCase()]),
  },
  {
    pattern: /\b(?:bis |am |zum |nächsten |naechsten |kommenden |by |on |next )?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    due: (match, today) => nextWeekday(today, WEEKDAYS[match[1].toLowerCase()]),
  },
] as { pattern: RegExp; due: (match: RegExpMatchArray, today: string) => string | null }[]).map((rule) => ({ ...rule, pattern: unicode(rule.pattern) }));

const SELF = unicode(/^(?:ich|mir|mich|i|me)\b/i);
const NOBODY = unicode(/^(?:wir|we)\b/i);
const OPENERS = unicode(/^(?:und dann|und|dann|danach|außerdem|ausserdem|zusätzlich|noch|also|ach ja|bitte|erstens|zweitens|drittens|als nächstes|als naechstes|and then|then|also|next|plus|please)\b[,:]?\s*/i);
const MODALS = unicode(/^(?:soll(?:te)?|muss|müsste|kann|könnte|wird|möchte|will|should|must|needs? to|has to|will|can)\s+/i);
// "ich muss ..." und, nach "ausserdem"/"dann", umgestellt: "muss ich ...".
const SELF_PHRASES = unicode(/^(?:ich (?:muss|sollte|soll|will|möchte|kann|werde)|(?:muss|sollte|soll|will|möchte|kann|werde) ich|mir (?:merken|notieren)|i (?:need to|have to|must|should|will)|i'll)\s+/i);
const NOBODY_PHRASES = unicode(/^(?:wir (?:müssen|sollten|sollen|wollen|brauchen)|(?:müssen|sollten|sollen|wollen) wir|jemand (?:muss|sollte|soll)|we (?:need to|have to|must|should))\s+/i);

/** In einzelne Sachen zerlegen. */
export function splitDictation(text: string, members: DictationMember[]): string[] {
  const names = members.map((member) => firstName(member.name)).filter((name) => name.length >= 2).map(escape);
  const nameStart = names.length > 0 ? `|(?:${names.join("|")})\\b` : "";
  const connector = unicode(new RegExp(`\\s+(?:und dann|außerdem|ausserdem|danach|als nächstes|and then|also,)\\s+|\\s+und\\s+(?=(?:ich|wir${nameStart})\\s)`, "gi"));
  // Die Punkte eines Datums ("12.11.", "3. Januar") beenden keinen Satz: vor dem Zerlegen geschuetzt.
  const DATE_DOT = "\u2024";
  const protectedText = text
    .replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/gu, (_m, day: string, month: string, year?: string) => `${day}${DATE_DOT}${month}${DATE_DOT}${year ?? ""}`)
    .replace(unicode(new RegExp(`(\\d{1,2})\\.(?=\\s+(?:${Object.keys(MONTHS).join("|")})\\b)`, "gi")), `$1${DATE_DOT}`);
  return protectedText
    .split(/[\n\r]+|(?<=[.!?;])\s+/u)
    .flatMap((part) => part.split(connector))
    .map((part) => part.trim().replace(/[.!?;,]+$/u, "").trim().replaceAll(DATE_DOT, "."))
    .filter((part) => part.length >= 3);
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

function cleanTitle(text: string) {
  const cleaned = text
    .replace(/\s{2,}/g, " ")
    .replace(/^[,:\-–\s]+|[,:\-–\s]+$/g, "")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  return cleaned ? cleaned[0].toLocaleUpperCase("de") + cleaned.slice(1) : "";
}

export function suggestTasks(
  text: string,
  context: { me: string; members: DictationMember[]; programs: DictationProgram[]; today: string },
): TaskSuggestion[] {
  return splitDictation(text, context.members)
    .map((fragment) => {
      let rest = fragment;
      for (let i = 0; i < 3; i += 1) rest = rest.replace(OPENERS, "");

      // Bis wann - die erste Regel, die passt; die Wendung faellt aus dem Titel.
      let dueOn: string | null = null;
      for (const rule of DUE_RULES) {
        const match = rest.match(rule.pattern);
        if (!match) continue;
        dueOn = rule.due(match, context.today);
        if (dueOn) {
          rest = rest.replace(match[0], " ");
          break;
        }
      }

      // Wer - am Satzanfang, "fuer Pia", oder man selbst.
      let assigneeUserId: string | null | undefined;
      if (SELF_PHRASES.test(rest)) {
        assigneeUserId = context.me;
        rest = rest.replace(SELF_PHRASES, "");
      } else if (NOBODY_PHRASES.test(rest)) {
        assigneeUserId = null;
        rest = rest.replace(NOBODY_PHRASES, "");
      } else if (SELF.test(rest)) {
        assigneeUserId = context.me;
        rest = rest.replace(SELF, "").replace(MODALS, "");
      } else if (NOBODY.test(rest)) {
        assigneeUserId = null;
        rest = rest.replace(NOBODY, "").replace(MODALS, "");
      } else {
        for (const member of context.members) {
          const name = firstName(member.name);
          if (name.length < 2) continue;
          const atStart = unicode(new RegExp(`^${escape(name)}\\b[,:]?\\s*(?:(?:kümmert sich (?:um|darum)|übernimmt|takes care of)\\s+)?`, "i"));
          const forName = unicode(new RegExp(`\\s*\\b(?:für|an|for)\\s+${escape(name)}\\b[,:]?`, "i"));
          if (atStart.test(rest)) {
            assigneeUserId = member.userId;
            rest = rest.replace(atStart, "").replace(MODALS, "");
            break;
          }
          if (forName.test(rest)) {
            assigneeUserId = member.userId;
            rest = rest.replace(forName, " ");
            break;
          }
        }
      }

      // Welches Team - der laengste Name zuerst, damit "Kita-Kompass Nord" nicht als "Kita-Kompass" endet.
      const program = [...context.programs]
        .filter((entry) => entry.name.trim().length >= 3)
        .sort((a, b) => b.name.length - a.name.length)
        .find((entry) => new RegExp(`(?<![\\p{L}\\d])${escape(entry.name.trim())}(?![\\p{L}\\d])`, "iu").test(rest));

      return {
        title: cleanTitle(rest).slice(0, 200),
        assigneeUserId: assigneeUserId === undefined ? context.me : assigneeUserId,
        dueOn,
        programId: program?.programId ?? null,
      };
    })
    .filter((suggestion) => suggestion.title.length >= 3)
    .slice(0, 20);
}
