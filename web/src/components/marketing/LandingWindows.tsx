import type { getAdvisorPageContent } from "@/data/advisorPage";
import type { getNetworkPageContent } from "@/data/networkPage";
import type { getHomepageContent } from "@/data/homepage";
import styles from "./landing.module.css";

/**
 * Die kleinen App-Fenster auf der Startseite. Sie zeigen, wie die echten Seiten aussehen, mit erfundenen
 * Daten (Mara, Anna und Ben, Advisor Lena ...). Reine Darstellung: kein Link, kein Knopf, nichts davon
 * ist bedienbar, deshalb stehen sie als Bild (role="img") mit Beschriftung im Dokument.
 */

type Content = ReturnType<typeof getHomepageContent>;

const ICONS = {
  find: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  team: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15 14.5c2.5-.3 4.7 1.2 5.5 4.5" /></>,
  net: <><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M8.2 11l7.6-3.8M8.2 13l7.6 3.8" /></>,
  person: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8" /></>,
  talk: <path d="M5 5h14v10H10l-5 4V5zM9 9h6M9 12h4" />,
  doc: <><path d="M7 3h7l4 4v14H7zM14 3v4h4" /><path d="M9.5 14l2 2 3.5-4" /></>,
};
export type LandingIconKind = keyof typeof ICONS;

export function LandingIcon({ kind }: { kind: string }) {
  const paths = ICONS[kind as LandingIconKind] ?? ICONS.find;
  return <span className={styles.ic} aria-hidden="true"><svg viewBox="0 0 24 24">{paths}</svg></span>;
}

const AVATAR = { violet: "", blue: styles.avBlue, teal: styles.avTeal, amber: styles.avAmber } as const;

export function FindWindow({ c }: { c: Content["overview"]["find"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel} data-par>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.winBody} aria-hidden="true">
        <div className={styles.ban}>
          <i className={styles.c1} /><i className={styles.c2} />
          <span className={styles.k}>{c.bannerKicker}</span><b>{c.bannerTitle}</b><span className={styles.t}>{c.bannerText}</span>
        </div>
        <div className={styles.tabs}>{c.tabs.map((t, i) => <span key={t} className={i === 0 ? styles.tabOn : undefined}>{t}</span>)}</div>
        <div className={styles.deck}>
          {c.people.map((person) => (
            <div key={person.name} className={styles.pc}>
              <div className={styles.person}>
                <span className={`${styles.av} ${AVATAR[person.tone]}`}>{person.letter}</span>
                <div><b>{person.name}</b><span>{person.seeks}</span></div>
              </div>
              <div className={styles.chips}>{person.chips.map((chip) => <span key={chip} className={styles.chip}>{chip}</span>)}</div>
            </div>
          ))}
        </div>
        <p className={styles.winNote}>{c.note}</p>
      </div>
    </div>
  );
}

export function AlignWindow({ c }: { c: Content["overview"]["align"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel} data-par>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div aria-hidden="true">
        <div className={styles.hero2}>
          <div><span className={styles.k}>{c.heroKicker}</span><b>{c.heroTitle}</b></div>
          <svg viewBox="0 0 160 120">
            <ellipse cx="80" cy="60" rx="74" ry="54" fill="none" stroke="#3b2e85" strokeWidth="1.2" />
            <ellipse cx="80" cy="60" rx="52" ry="38" fill="none" stroke="#5a49b8" strokeWidth="1.2" />
            <ellipse cx="80" cy="60" rx="30" ry="22" fill="none" stroke="#7f6ce0" strokeWidth="1.2" />
            <circle cx="80" cy="60" r="9" fill="#c9bbf7" /><circle cx="128" cy="32" r="3.6" fill="#fff" /><circle cx="34" cy="84" r="3.2" fill="#6fd3ff" />
          </svg>
        </div>
        <div className={styles.compare}>
          <div className={styles.names}>
            <div className={styles.person}><span className={styles.av}>{c.names[0][0]}</span><b>{c.names[0]}</b></div>
            <div className={styles.person}><span className={`${styles.av} ${styles.avBlue}`}>{c.names[1][0]}</span><b>{c.names[1]}</b></div>
          </div>
          {c.rows.map((row) => (
            <div key={row.label} className={styles.row}><h4>{row.label}</h4><div className={styles.two}><p>{row.a}</p><p>{row.b}</p></div></div>
          ))}
          <div className={`${styles.row} ${styles.rowLast}`}><h4>{c.both.label}</h4><div className={styles.both}><span className={styles.chip}>{c.both.tag}</span><p>{c.both.text}</p></div></div>
          <div className={styles.ask}><b>{c.askTitle}</b><p>{c.ask}</p></div>
        </div>
      </div>
    </div>
  );
}

const TAG = { seek: styles.tagSeek, offer: styles.tagOffer, problem: styles.tagProblem } as const;

export function ConnectWindow({ c }: { c: Content["net"]["connect"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel}>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.winBody} aria-hidden="true">
        <div className={styles.lst}>
          {c.rows.map((row) => (
            <div key={row.title} className={styles.li2}>
              <span className={`${styles.tag} ${TAG[row.tone as keyof typeof TAG]}`}>{row.kind}</span>
              <div><b>{row.title}</b><small>{row.meta}</small></div>
              <em>{c.view}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdvisorWindow({ c }: { c: Content["net"]["advisor"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel}>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.shareBody} aria-hidden="true">
        <p className={styles.shareTitle}>{c.shareTitle}</p>
        <p className={styles.shareSub}>{c.shareSub}</p>
        {c.shares.map((share) => (
          <div key={share.label} className={styles.share}>
            <div>{share.label}<small>{share.who}</small></div>
            <span className={`${styles.tg} ${share.on ? "" : styles.tgOff}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

type AdvisorContent = ReturnType<typeof getAdvisorPageContent>["features"];
const TASK_TAG = { open: styles.tagSeek, due: styles.tagProblem, done: styles.tagOffer } as const;

/** Teamraum: Aufgaben mit Zustand, wer sie macht, und ein Kommentar (alles erfunden). */
export function TeamroomWindow({ c }: { c: AdvisorContent["team"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel} data-par>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.winBody} aria-hidden="true">
        <p className={styles.shareTitle}>{c.title2}</p>
        <div className={styles.lst}>
          {c.tasks.map((task) => (
            <div key={task.title} className={styles.li2}>
              <span className={`${styles.tag} ${TASK_TAG[task.tone]}`}>{task.status}</span>
              <div><b>{task.title}</b><small>{task.who}</small></div>
              <span />
            </div>
          ))}
        </div>
        <p className={styles.winNote}>{c.comment}</p>
      </div>
    </div>
  );
}

/** Programmplan: Formate zum Antippen und die Termine der Woche (alles erfunden). */
export function ProgramWindow({ c }: { c: AdvisorContent["program"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel} data-par>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.winBody} aria-hidden="true">
        <div className={styles.chips}>{c.formats.map((f, i) => <span key={f} className={i === 4 ? `${styles.chip} ${styles.chipOn}` : styles.chip}>{f}</span>)}</div>
        <p className={`${styles.shareTitle} ${styles.afterChips}`}>{c.title2}</p>
        <div className={styles.lst}>
          {c.events.map((event) => (
            <div key={event.title} className={styles.li2}>
              <span className={`${styles.tag} ${styles.tagSeek}`}>{event.when}</span>
              <div><b>{event.title}</b><small>{event.kind}</small></div>
              <span />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type NetworkContent = ReturnType<typeof getNetworkPageContent>["features"];

/** Formular "Etwas einstellen": Art waehlen, Beschreibung, Veroeffentlichen (erfundene Eingabe). */
export function ComposeWindow({ c }: { c: NetworkContent["post"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel} data-par>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.winBody} aria-hidden="true">
        <div className={styles.tabs}>{c.kinds.map((k, i) => <span key={k} className={i === 2 ? styles.tabOn : undefined}>{k}</span>)}</div>
        <p className={styles.shareTitle}>{c.question}</p>
        <p className={styles.shareSub}>{c.hint}</p>
        <div className={styles.field}>{c.sample}</div>
        <div className={styles.formRow}><span className={`${styles.btnMini}`}>{c.publish}</span></div>
      </div>
    </div>
  );
}

/** Benachrichtigungsregel "Sag uns, was du suchst": zwei Felder und der Hinweis zur Mail (erfundene Eingabe). */
export function AlertWindow({ c }: { c: NetworkContent["alert"] }) {
  return (
    <div className={styles.win} role="img" aria-label={c.windowLabel} data-par>
      <div className={styles.winBar}><span>{c.bar} › <b>{c.barPage}</b></span><span className={styles.lg}>DE&nbsp;&nbsp;EN</span></div>
      <div className={styles.winBody} aria-hidden="true">
        <p className={styles.fieldLabel}>{c.question}</p>
        <div className={styles.field}>{c.sample}</div>
        <p className={styles.fieldLabel}>{c.placeLabel}</p>
        <div className={styles.field}>{c.place}</div>
        <div className={styles.formRow}><span className={styles.btnMini}>{c.save}</span></div>
        <p className={styles.winNote}>{c.note}</p>
      </div>
    </div>
  );
}
