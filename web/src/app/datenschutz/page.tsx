import Link from "next/link";

/*
 * DATENSCHUTZERKLÄRUNG – Stand 20.10.2026, gegen den Code geprüft (Änderungen seit 13.10.2026:
 * LinkedIn nur noch für Verbundene oder niemanden sichtbar, Absicht „Wofür ich hier bin“,
 * Löschung abgeschlossener KI-Aufgaben und alter Hinweise).
 *
 * Grundsatz: Hier steht nur, was der Code tatsächlich tut. Was aus Repo und
 * dokumentierter Konfiguration nicht belegbar ist, steht nicht als Tatsache im
 * Text, sondern als Kommentar „LEGAL REVIEW REQUIRED“ an der Stelle, an der es
 * vor der Veröffentlichung geklärt werden muss. Kommentare werden nicht
 * ausgeliefert.
 *
 * Konkrete Löschfristen und ihre technischen Belege:
 *   - Nutzungs- und Forschungsereignisse: purge_old_research_events(30) nach
 *     received_at (Migration 20261124120000), täglicher Vercel-Cron 03:00 UTC
 *     (vercel.json, /api/cron/privacy-retention) -> rund 30, höchstens etwa 32 Tage.
 *   - Event-Teilnahme und -Antworten: cleanup_expired_event_data(), ends_at
 *     < now() - 24h (Migration 20260525113000), Nicht-Draft-Events haben immer
 *     ends_at (20261125120000), gleicher Cron -> innerhalb von rund zwei Tagen.
 *   - Abgeschlossene KI-Aufgaben (90 Tage) und Hinweise in der Anwendung (180 Tage):
 *     purge_stale_operational_rows (Migration 20261213120000), gleicher Cron.
 *   - Cookies und Browserspeicher: Laufzeiten aus dem Code (siehe Abschnitt 21).
 * Alle anderen Daten: bis zur Löschung des Kontos bzw. solange erforderlich.
 */

type BulletSectionProps = {
  number: string;
  title: string;
  children: React.ReactNode;
};

function BulletSection({ number, title, children }: BulletSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{number}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item) => (
        <li key={item} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-base font-semibold text-slate-900">{children}</h3>;
}

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_28%,#f8fafc_100%)] px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 flex flex-col gap-5 rounded-[32px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] md:flex-row md:items-start md:justify-between md:p-10">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Datenschutz</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Datenschutzerklärung
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Diese Datenschutzerklärung beschreibt, welche personenbezogenen Daten Made2Found
              verarbeitet, wofür, auf welcher Grundlage, wie lange – und welche Rechte du hast. Sie
              beschreibt den tatsächlichen technischen Stand des Produkts.
            </p>
            <p className="mt-2 text-sm text-slate-500">Stand: 13. Oktober 2026</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Zur Startseite
            </Link>
            <Link
              href="/impressum"
              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Zum Impressum
            </Link>
          </div>
        </header>

        <div className="grid gap-6">
          <BulletSection number="1" title="Verantwortlicher">
            <p>Verantwortlich für die Datenverarbeitung bei Made2Found ist:</p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>Maria Schulz</p>
              <p>Am Juliusturm 89</p>
              <p>13597 Berlin</p>
              <p>E-Mail: hello@cofoundery.de</p>
            </div>
            <p>
              Made2Found ist der neue Name von CoFoundery. Die E-Mail-Adresse
              hello@cofoundery.de gilt weiterhin.
            </p>
          </BulletSection>

          <BulletSection number="2" title="Worum es bei Made2Found geht – und was wir nicht tun">
            <p>
              Made2Found hilft Menschen, die gemeinsam gründen wollen oder schon gründen, ihre
              Arbeitsweise, ihre Fähigkeiten und ihre Absprachen sichtbar zu machen. Dafür
              verarbeiten wir die Angaben, die du selbst machst, und die Inhalte, die du mit
              anderen teilst.
            </p>
            <p>Was wir ausdrücklich nicht tun:</p>
            <List
              items={[
                "Wir berechnen keinen Gesamtwert für „Passung“ oder „Kompatibilität“ zwischen Menschen und geben keine Erfolgsprognose ab.",
                "Wir ordnen dich keinem Persönlichkeitstyp zu.",
                "Wir setzen keine Werbe-, Analyse- oder Marketing-Cookies und binden keine Tracking-Dienste Dritter ein.",
                "Wir verkaufen keine Daten.",
                "Forschung ist freiwillig. Das Produkt funktioniert ohne deine Teilnahme genauso.",
              ]}
            />
          </BulletSection>

          <BulletSection number="3" title="Hosting, Infrastruktur und Empfänger">
            <p>
              Für den Betrieb von Made2Found setzen wir folgende Dienstleister ein. Sie verarbeiten
              Daten in unserem Auftrag und nach unseren Weisungen.
            </p>
            {/*
              LEGAL REVIEW REQUIRED:
              - Abgeschlossene Auftragsverarbeitungsverträge (AVV/DPA) mit Vercel, Supabase und
                Resend bestätigen.
              - Genaue Vertragspartner (Gesellschaft, Sitz) eintragen; im Repo nicht belegt.
              - Supabase-Region: London (eu-west-2), laut Supabase-Dashboard am 23.10.2026
                bestätigt.
              - Resend-Region: im Repo nicht belegt.
              - Welcher Dienst die Anmelde-E-Mails von Supabase Auth versendet (Supabase-Standard
                oder eigenes SMTP), ist im Repo nicht belegt (supabase/config.toml: SMTP
                auskommentiert, Produktionsvorlagen im Dashboard).
            */}
            <List
              items={[
                "Vercel – Hosting der Website und der Serverfunktionen. Die Serverfunktionen laufen nach unserer Konfiguration in der Region London (Vereinigtes Königreich).",
                "Supabase – Datenbank, Anmeldung (Authentifizierung) und Dateispeicher, z. B. für Profilfotos. Die Datenbank liegt in der Region London (Vereinigtes Königreich).",
                "Resend – Versand von E-Mails aus dem Produkt, z. B. Einladungen und Benachrichtigungen.",
              ]}
            />
            <p>
              Wenn du Mitteilungen aufs Gerät (Push) aktivierst, werden diese über den Push-Dienst
              deines Browser- bzw. Betriebssystemanbieters zugestellt, z. B. Apple, Google, Mozilla
              oder Microsoft (siehe Abschnitt 15).
            </p>
            <p>
              Weitere externe Dienste, an die im laufenden Betrieb Nutzerdaten gehen, setzen wir
              nicht ein. Schriftarten liefern wir selbst aus; es werden keine Inhalte von
              Drittservern wie Google Fonts oder externen Bild-Diensten nachgeladen.
            </p>
            <Sub>Übermittlung in Drittländer</Sub>
            {/*
              LEGAL REVIEW REQUIRED:
              - Vereinigtes Königreich: Status des Angemessenheitsbeschlusses zum Zeitpunkt der
                Veröffentlichung prüfen.
              - Vercel, Supabase und Resend haben ihren Unternehmenssitz bzw. Unterauftragnehmer in
                den USA. Grundlage (EU-US Data Privacy Framework, Standardvertragsklauseln) je
                Anbieter prüfen und konkret benennen.
              - Bis dahin bewusst keine Aussage „alle Daten bleiben in der EU“.
            */}
            <p>
              Unsere Serverfunktionen und unsere Datenbank liegen im Vereinigten Königreich und damit außerhalb der EU.
              Die Anbieter haben ihren Sitz bzw. Unterauftragnehmer teilweise in den USA, sodass ein
              Zugriff aus Drittländern nicht ausgeschlossen werden kann. Übermittlungen in Staaten
              außerhalb der EU bzw. des EWR erfolgen nur, wenn die gesetzlichen Voraussetzungen
              erfüllt sind, insbesondere auf Grundlage eines Angemessenheitsbeschlusses oder
              geeigneter Garantien wie Standardvertragsklauseln.
            </p>
          </BulletSection>

          <BulletSection number="4" title="Konto und Anmeldung">
            <p>
              Die Anmeldung funktioniert ohne Passwort: Du gibst deine E-Mail-Adresse ein und
              erhältst einen Anmeldelink bzw. einen Code per E-Mail. Die Anmeldung läuft über
              Supabase.
            </p>
            <List
              items={[
                "verarbeitet werden deine E-Mail-Adresse, der Anmeldezeitpunkt und technische Sitzungsdaten",
                "die Sprache, in der du Made2Found nutzt, damit die Anmelde-E-Mail in dieser Sprache ankommt",
                "nach der Anmeldung halten Sitzungs-Cookies dich angemeldet (Abschnitt 21)",
              ]}
            />
            <p>Rechtsgrundlage ist die Bereitstellung des Produkts (Art. 6 Abs. 1 lit. b DSGVO).</p>
          </BulletSection>

          <BulletSection number="5" title="Dein Profil">
            <p>Du entscheidest selbst, welche Angaben du machst. Dazu gehören:</p>
            <List
              items={[
                "Name, Kurzbeschreibung (Headline), Text über dich, Ort und Arbeitsweise (vor Ort, hybrid, remote)",
                "Fachgebiete (Expertise) und Branchen",
                "optional ein Profilfoto und ein LinkedIn-Link; den LinkedIn-Link sehen nur Personen, mit denen du verbunden bist, oder niemand, je nach deiner Wahl – er erscheint nirgends öffentlich",
                "deine Angabe, wofür du Made2Found nutzen möchtest (z. B. Team verstehen, Mitgründende finden, vernetzen, begleiten); sie ist nur für dich sichtbar und bestimmt allein, was dir die Startseite vorschlägt – sie schaltet nichts frei",
                "deine Sprache und deine Rolle(n) im Produkt, z. B. Founder oder Advisor",
              ]}
            />
            <p>
              Diese Grunddaten speicherst du einmal. Wo sie für andere sichtbar werden, entscheidest
              du über die jeweiligen Bereiche: Dein FIND-Profil sehen angemeldete Founder, dein
              CONNECT-Profil sehen Mitglieder des Netzwerks (Abschnitte 10 und 11). Dein
              Profilfoto wird nur über eine geschützte Abfrage an angemeldete Personen ausgeliefert,
              die es sehen dürfen.
            </p>
            <p>
              Lebenslauf-Import: Du kannst eine Textdatei mit deinem Lebenslauf auswählen. Sie wird
              nur in deinem Browser ausgewertet und nicht hochgeladen oder gespeichert. Übernommen
              werden nur die Vorschläge, die du selbst anhakst.
            </p>
          </BulletSection>

          <BulletSection number="6" title="Fragebögen und Arbeitsprofil">
            <p>Du kannst strukturierte Fragebögen beantworten, insbesondere:</p>
            <List
              items={[
                "den Fragebogen zur Arbeitsweise; daraus entsteht dein Arbeitsprofil – eine beschreibende Auswertung ohne Gesamtwert und ohne Typzuordnung",
                "den Fragebogen zu eurem Vorhaben, den ihr als Team ausfüllt",
                "Fragen in gemeinsamen Formaten zu zweit, z. B. Commitment Lab, Read My Mind oder Founder in the Wild",
              ]}
            />
            <p>
              Deine Antworten und dein Arbeitsprofil siehst zunächst nur du. Andere sehen sie nur,
              soweit du sie freigibst (Abschnitt 8). Die abgegebenen Antworten zum Vorhaben sehen
              alle aktuellen Mitglieder deines Teams.
            </p>
            <p>
              Aus älteren Fragebogen-Versionen können noch Auswertungen mit Dimensionswerten
              vorhanden sein. Diese Fragebögen lassen sich nicht mehr neu ausfüllen; ihre
              Ergebnisse bleiben für bestehende Daten lesbar.
            </p>
          </BulletSection>

          {/*
            Ausfüllverlauf (alignment_item_views): bis 28.09.2026 nur in einer Testfassung,
            heute im Vorhaben-Fragebogen für noch nicht abgegebene Bögen erhoben
            (itemViewActions.ts). Personenbezogen, deshalb eigener
            Absatz; der Test datenschutzNenntDieMessung.test.ts hält ihn fest.
          */}
          <BulletSection number="6b" title="Ausfüllverlauf beim Fragebogen zum Vorhaben">
            <p>
              Damit wir erkennen, ob die Fragen verständlich sind, zeichnen wir beim Ausfüllen des
              Fragebogens zum Vorhaben zusätzlich auf, wann eine Frage angezeigt und wann sie
              beantwortet wurde und wie oft eine Antwort noch geändert wurde.
            </p>
            <p>
              Daraus lesen wir ab, welche Fragen lange dauern, welche oft ausgelassen werden und an
              welcher Stelle Menschen abbrechen. Das sagt nichts über die Person aus – lange
              gebraucht heißt nicht unentschlossen, oft geändert heißt nicht unsicher.
            </p>
            <p>
              Diese Aufzeichnung gehört zu deinem Fragebogen und wird mit ihm gelöscht. Sie wird
              niemandem sonst gezeigt – auch nicht den Personen, denen du deine Antworten
              freigegeben hast, und nicht deinem Team. Rechtsgrundlage ist unser berechtigtes
              Interesse an einem verständlichen Produkt (Art. 6 Abs. 1 lit. f DSGVO). Sie ist von
              einer Einwilligung in die Nutzung deiner Daten für Forschung getrennt und ersetzt sie
              nicht.
            </p>
          </BulletSection>

          <BulletSection number="7" title="Fähigkeiten (Capabilities) und Interview">
            <p>
              Du kannst angeben, in welchen Bereichen du Erfahrung hast, wie tief diese Erfahrung
              ist und welche Verantwortung du dir dort wünschst. Erfahrung und Verantwortungswunsch
              sind zwei getrennte Angaben. Dazu kannst du Belege in eigenen Worten schreiben und
              Fragen in einem geführten Interview beantworten.
            </p>
            <List
              items={[
                "Deine Belege und Interview-Antworten siehst nur du. Sie werden nie an andere weitergegeben.",
                "Was andere von deinen Fähigkeiten sehen, legst du selbst fest: nichts (Standard), nur die Bereiche, oder die Bereiche und – nach einer Kontaktaufnahme – auch die Tiefe.",
                "Gibst du deinem Team dein Arbeitsprofil frei, sieht es auch deine Stufen und Verantwortungswünsche.",
                "Für automatische Vorschläge oder eine Reihenfolge von Personen werden deine Fähigkeiten nicht verwendet.",
              ]}
            />
          </BulletSection>

          <BulletSection number="8" title="Teams, Freigaben und gemeinsame Inhalte">
            <p>
              Teams bestehen aus zwei bis vier Personen. Mitglied eines Teams zu sein gibt noch
              niemandem Einblick in deine persönlichen Auswertungen – dafür gibt es jeweils eine
              eigene, ausdrückliche Freigabe, die du jederzeit beenden kannst.
            </p>
            <List
              items={[
                "Freigabe deines Arbeitsprofils an dein Team oder an einzelne Personen",
                "gemeinsame Team-Inhalte, z. B. Rollen, der Fragebogen zum Vorhaben und das Founder Setup mit euren Absprachen",
                "Formate zu zweit (z. B. Commitment Lab), deren Inhalte nur die beiden Beteiligten sehen",
              ]}
            />
            <p>
              Gemeinsame Inhalte betreffen mehrere Personen. Was bei der Löschung eines Kontos mit
              ihnen geschieht, steht in Abschnitt 24.
            </p>
            <p>Rechtsgrundlage ist die Bereitstellung des Produkts (Art. 6 Abs. 1 lit. b DSGVO).</p>
          </BulletSection>

          <BulletSection number="9" title="Advisors">
            <p>
              Founder können Advisors einbeziehen. Ein Advisor sieht nur, was ausdrücklich
              freigegeben wurde:
            </p>
            <List
              items={[
                "Freigaben einzelner Personen, aufgeteilt nach Bereichen (z. B. Auswertungen, Fähigkeiten, Stärken, Ausrichtung)",
                "Team-Reviews, die erst entstehen, wenn alle Teammitglieder zugestimmt haben, und die enden, sobald sich das Team ändert",
                "Einblick in das Founder Setup nur mit Zustimmung aller und nur in bestätigte Inhalte",
                "Advisor-Organisationen mit ihren Mitgliedern",
              ]}
            />
            <p>
              Hinweise, die ein Advisor für Founder schreibt, sind für diese sichtbar. Private
              Notizen und Wiedervorlagen eines Advisors sieht nur der Advisor selbst – weder die
              Founder noch andere Mitglieder seiner Organisation.
            </p>
          </BulletSection>

          <BulletSection number="9b" title="Teilnahme an einem Programm einer Organisation">
            <p>
              Eine Advisor-Organisation, zum Beispiel ein Accelerator, kann dein Team zu ihrem
              Programm einladen. Die Teilnahme beginnt erst, wenn jede Person im Team ausdrücklich
              zugestimmt hat. Kommt jemand ins Team, ist die Zustimmung für das Team nicht mehr
              vollständig, bis auch diese Person zugestimmt hat. Jede Person im Team kann die
              Teilnahme jederzeit beenden.
            </p>
            <List
              items={[
                "Wir speichern, welches Team in welchem Programm ist, wer zugestimmt hat und wann.",
                "Sehen können das Programm die Inhaberinnen und Inhaber der Organisation sowie die Bezugspersonen, die der Organisation deinem Team zuordnet. Du siehst, wer das ist.",
                "Dein Team kann ein Programmprofil mit freien Angaben anlegen (Name des Unternehmens, Gründerinnen und Gründer, Adresse, E-Mail, Telefon). Es kommt nicht aus euren persönlichen Profilen und ist für dieselben Personen sichtbar wie die übrigen Angaben im Programm.",
                "Im Programm legt dein Team zusammen mit den Bezugspersonen Meilensteine fest und gibt alle zwei Wochen ein kurzes Update mit Antworten auf die Fragen der Bezugspersonen ab. Diese Angaben sehen das Team, die Bezugspersonen und die Inhaberinnen und Inhaber der Organisation, solange alle im Team zugestimmt haben.",
                "Vor einem fälligen Update erinnern wir mit einem Hinweis in der App. Eine Mitteilung aufs Gerät oder eine E-Mail bekommst du nur, wenn du sie in deinem Konto eingeschaltet hast (Abschnitt 15); die Erinnerung nennt weder Team noch Organisation.",
                "Eine Organisation kann eine öffentliche Programmseite einrichten (Kurzname, Willkommenstext, Logo). Sie ist erst nach ausdrücklicher Veröffentlichung für alle mit dem Link sichtbar und zeigt nichts über Teams oder Mitglieder. Mit einem gültigen Programmcode oder einer gültigen Programm-Einladung kann man über diesen Weg auch ein Konto anlegen.",
                "Mit einem Programmcode kann ein Team selbst beitreten. Wir speichern den Code, wie oft er benutzt wurde und bis wann er gilt. Gibst du einen falschen Code ein, speichern wir den Fehlversuch mit deinem Konto, höchstens einen Tag lang, damit niemand Codes durchprobieren kann.",
                "Lädt eine Organisation per E-Mail ein, geben Inhaberinnen oder Inhaber dafür eine E-Mail-Adresse ein. Wir nutzen sie nur für den Versand der Einladung über unseren E-Mail-Dienst und speichern sie nicht.",
                "Mit der Zustimmung zum Programm sehen die Inhaberinnen und Inhaber der Organisation und die Bezugspersonen deines Teams auch die gemeinsam bestätigten Vereinbarungen im Founder Setup, nur lesend. Entwürfe und Punkte, die nicht alle bestätigt haben, sehen sie nicht. Das steht vor der Zustimmung ausdrücklich da. Programme, die vor dieser Regel begonnen haben, bekommen sie nicht nachträglich.",
                "Eine Organisation kann einen Programmplan mit Veranstaltungen anlegen, den die Teams im Programm sehen. Die Inhaberinnen und Inhaber und die Bezugspersonen deines Teams tragen von Hand ein, ob dein Team teilgenommen hat (da, fehlte, entschuldigt). Du siehst den Eintrag deines Teams, nicht die anderer Teams. Die Einträge werden gelöscht, sobald dein Team das Programm verlässt.",
                "Die Teilnahme öffnet keine weiteren Freigaben: Arbeitsweisen und Team-Review bleiben getrennte Entscheidungen.",
                "Wer über einen Programmcode ein Konto anlegt, wird mit diesem Code verknüpft (damit ein Code nicht beliebig viele Konten erzeugt: höchstens fünf je Team-Platz). Das Konto bleibt damit verknüpft, bis du es löschst. Mit dem Löschen entfällt die Verknüpfung.",
                "Besteht ein Team nur aus einer Person, kann das Team selbst oder die Organisation (Inhaber oder Bezugsperson) es als vollständig markieren. Wir speichern, wann und von wem. Die Markierung ersetzt keine Zustimmung.",
                "Beendest du die Teilnahme, endet der Zugriff der Organisation auf das Programm; zugeordnete Bezugspersonen, Programmprofil, Meilensteine, Updates, Teilnahme-Einträge und die privaten Notizen der Beratenden zu deinem Team werden gelöscht. Diese Notizen sieht nur die Person, die sie schreibt.",
              ]}
            />
          </BulletSection>

          <BulletSection number="10" title="FIND – Mitgründende finden">
            <List
              items={[
                "Dein FIND-Profil (z. B. Rollen, die du mitbringst und suchst, verfügbare Zeit, Phase und Ziel deines Vorhabens, Suchstand, Startzeitpunkt) sehen angemeldete Founder, sobald du es veröffentlichst. Entwürfe siehst nur du.",
                "Deine Suchkriterien (Muss-Kriterien) sind privat und werden niemandem angezeigt.",
                "Kontaktanfragen (Intros) sehen nur die beiden Beteiligten; gespeicherte Suchen nur du.",
                "Suchergebnisse werden heute nach deinen ausdrücklichen Kriterien gefiltert und nach Veröffentlichungsdatum sortiert. Es wird keine Punktzahl und kein Prozentwert berechnet.",
                "Gemeinsamkeiten und Gesprächspunkte aus dem Arbeitsprofil erscheinen nur, wenn beide Personen dem ausdrücklich zugestimmt haben – als Beschreibung, nicht als Wertung, und ohne Einfluss auf die Reihenfolge.",
              ]}
            />
          </BulletSection>

          <BulletSection number="11" title="CONNECT – das Netzwerk">
            <p>CONNECT ist derzeit eine geschlossene Beta; Inhalte sehen nur Mitglieder.</p>
            <List
              items={[
                "Netzwerk-Profil, Anzeigen (Gesuche und Angebote), Probleme, Ansätze und Vorhaben, die du einstellst",
                "Kontaktanfragen und Nachrichten, die nur die Beteiligten sehen",
                "Blockierungen und Meldungen; Meldungen bearbeiten wir zur Moderation und zum Schutz der Gemeinschaft",
                "gespeicherte Suchen und Benachrichtigungen dazu",
              ]}
            />
            <p>
              Vorschläge („Für dich“): Einmal täglich prüfen wir, ob sich deine eingetragenen
              Fachgebiete, Branchen und Themen mit denen anderer überschneiden – ein reiner
              Begriffsabgleich, ohne KI. Du erhältst höchstens drei Vorschläge pro Woche. Ob du
              selbst anderen vorgeschlagen wirst, kannst du in deinem Netzwerk-Profil abschalten.
            </p>
            <p>
              Rechtsgrundlage ist die Bereitstellung des Produkts (Art. 6 Abs. 1 lit. b DSGVO); für
              Moderation und Sicherheit zusätzlich unser berechtigtes Interesse (Art. 6 Abs. 1 lit.
              f DSGVO).
            </p>
            {/*
              LEGAL REVIEW REQUIRED: „Vorgeschlagen werden“ ist standardmäßig eingeschaltet
              (network_profiles.suggestable default true, Migration 20261018120000). Prüfen, ob
              lit. b/f trägt oder eine Voreinstellung „aus“ geboten ist.
            */}
          </BulletSection>

          <BulletSection number="12" title="Wie Made2Found Vorschläge und Auswertungen bildet">
            <List
              items={[
                "Auswertungen beschreiben Gemeinsamkeiten und Unterschiede als Anlass für ein Gespräch. Sie sagen nicht, ob Menschen „zusammenpassen“.",
                "Es gibt keinen Kompatibilitäts- oder Passungswert, keine Erfolgsprognose und keine Persönlichkeitstypen.",
                "Dein Arbeitsprofil fließt in keine Reihenfolge und keine automatische Auswahl von Personen ein.",
                "Deine Fähigkeiten werden nicht für automatische Vorschläge verwendet.",
              ]}
            />
            <p>
              Wir werten deine Angaben automatisiert aus, um dir Auswertungen und Vorschläge zu
              zeigen. Entscheidungen mit rechtlicher Wirkung oder vergleichbar erheblicher
              Beeinträchtigung treffen wir dabei nicht automatisiert (Art. 22 DSGVO).
            </p>
          </BulletSection>

          <BulletSection number="13" title="Optionale KI-Unterstützung">
            <p>
              An einigen Stellen kannst du dir Vorschläge von einem Sprachmodell machen lassen,
              z. B. Stichworte zu einer CONNECT-Anzeige, Vorschläge für Fähigkeitsbereiche aus
              deinem Interview oder Formulierungsvorschläge für deine Ausrichtung.
            </p>
            <List
              items={[
                "Das passiert nur, wenn du es an der jeweiligen Stelle ausdrücklich anforderst – nicht automatisch im Hintergrund.",
                "Verarbeitet wird nur der Text, um den es geht, z. B. der Text deiner Anzeige oder deine Interview-Antworten.",
                "Das Sprachmodell läuft auf einem Rechner, den wir selbst betreiben. Es wird kein externer KI-Anbieter eingesetzt.",
                "Das Ergebnis ist ein Vorschlag. Übernommen wird nur, was du bestätigst.",
              ]}
            />
            {/*
              LEGAL REVIEW REQUIRED: Rechtsgrundlage der optionalen KI-Vorschläge (Ausführung einer
              ausdrücklichen Nutzeranfrage, lit. b, oder Einwilligung, lit. a). Technisch belegt:
              Auslösung nur per Nutzeraktion (connectAiActions.ts, capabilityInterviewActions.ts,
              directionStatementActions.ts), Worker mit lokalem Ollama (web/scripts/ai-worker.ts,
              web/src/lib/ai/ollama.ts). Dass der Worker im Betrieb lokal läuft, ist eine
              Betriebszusage, keine Code-Eigenschaft.
            */}
          </BulletSection>

          <BulletSection number="14" title="Einladungen">
            <p>Wenn du jemanden einlädst – als Co-Founder, ins Team oder als Advisor –:</p>
            <List
              items={[
                "speichern wir die E-Mail-Adresse der eingeladenen Person, den Einladungskontext (z. B. Team- und Absendername) und einen nur verschlüsselt (gehasht) gespeicherten Einladungscode",
                "senden wir ihr eine Einladungs-E-Mail über Resend",
                "ist die Einladung je nach Art 14 oder 30 Tage gültig",
              ]}
            />
            <p>
              Die Daten der eingeladenen Person stammen von dir als einladender Person.
              Rechtsgrundlage ist unser berechtigtes Interesse, die von dir gewünschte Einladung
              zuzustellen (Art. 6 Abs. 1 lit. f DSGVO).
            </p>
          </BulletSection>

          <BulletSection number="15" title="E-Mails und Mitteilungen">
            <Sub>E-Mails</Sub>
            <p>
              Wir senden E-Mails, die für die Nutzung nötig sind, z. B. Anmelde-E-Mails und
              Einladungen. Benachrichtigungen per E-Mail, z. B. über neue Vorschläge, schicken wir
              nur, wenn du sie eingeschaltet hast; abbestellen kannst du sie in deinem Konto.
              Benachrichtigungen enthalten in der Regel nur, dass etwas passiert ist, und den Namen
              der beteiligten Person – nicht den Inhalt von Nachrichten.
            </p>
            <Sub>Mitteilungen aufs Gerät (Push)</Sub>
            <p>
              Push-Mitteilungen sind aus, bis du sie in deinem Konto ausdrücklich einschaltest und
              in deinem Browser erlaubst. Dann speichern wir die Zustelladresse deines Browsers,
              die zugehörigen Schlüssel, eine gekürzte Browserkennung und den Zeitpunkt der letzten
              Nutzung.
            </p>
            <List
              items={[
                "Die Mitteilung wird verschlüsselt an den Push-Dienst deines Browsers übergeben (z. B. Apple, Google, Mozilla, Microsoft) und dort höchstens 24 Stunden zur Zustellung bereitgehalten.",
                "Sie enthält einen kurzen Hinweis, z. B. den Namen der Person, die dir geschrieben hat, aber nicht den Inhalt der Nachricht.",
                "Du kannst Push jederzeit ausschalten; die Zustelladresse wird dann gelöscht. Sie wird auch gelöscht, wenn der Push-Dienst sie als ungültig meldet oder die Zustellung wiederholt scheitert.",
              ]}
            />
            {/*
              LEGAL REVIEW REQUIRED: Rechtsgrundlage für Push (Einwilligung nach Art. 6 Abs. 1
              lit. a DSGVO und § 25 Abs. 1 TDDDG für den Service Worker / die Browser-Berechtigung)
              und für E-Mail-Benachrichtigungen mit Opt-in (notification_opt_ins).
            */}
          </BulletSection>

          <BulletSection number="16" title="Technische Produktanalyse">
            <p>
              Wenn du angemeldet bist, erfassen wir bei Fragebögen minimale Nutzungsereignisse: z. B.
              Ereignistyp, Modul, Fragebogenversion, Frage-Nummer, Bearbeitungsdauer und Pausen,
              Fortschritt, Geräteklasse (Mobil, Desktop, Tablet), App-Version und die aufgerufene
              Seite.
            </p>
            <List
              items={[
                "Diese Ereignisse speichern wir ohne deinen Namen, ohne E-Mail-Adresse und ohne Nutzerkennung.",
                "Sie enthalten keine ausgewählten Antworten, keine Freitexte und keine Auswertungen.",
                "Sie werden automatisch gelöscht (Abschnitt 23).",
              ]}
            />
            <p>
              Rechtsgrundlage ist unser berechtigtes Interesse an einem fehlerfreien und
              verständlichen Produkt (Art. 6 Abs. 1 lit. f DSGVO). Diese Produktanalyse ist von der
              freiwilligen Forschung (Abschnitt 17) getrennt.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: product_analytics_events wird für alle angemeldeten Personen
              ohne Einwilligung geschrieben (web/src/features/research/server.ts, Insert vor der
              Consent-Prüfung). page_path ist der rohe Pfad; ob einzelne Pfade Kennungen enthalten
              und die Daten damit personenbeziehbar sind, ist nicht für jede Aufrufstelle geprüft.
            */}
          </BulletSection>

          <BulletSection number="17" title="Freiwillige Forschung">
            <p>
              Du kannst freiwillig an der Forschung zu Made2Found teilnehmen. Ohne deine Teilnahme
              funktioniert das Produkt genauso; nichts wird dafür vorausgesetzt.
            </p>
            <Sub>Forschungsteilnahme allgemein</Sub>
            <List
              items={[
                "Nur nach deiner ausdrücklichen Einwilligung werden ausgewählte strukturierte Antwortwerte zusammen mit Fragebogenversion, Frage, Dimension und Zeitangaben in einem getrennten Forschungsdatensatz gespeichert.",
                "Die Einträge tragen statt deines Namens eine zufällige, pseudonyme Kennung. Pseudonymisierte Daten sind nicht anonym.",
                "Gespeichert wird nur, was in einer festen Liste erlaubt ist; Namen, E-Mail-Adressen und Teamnamen gehören nicht dazu.",
                "Welche Fassung der Einwilligung du gegeben hast, speichern wir mit.",
              ]}
            />
            <Sub>Forschung zum Fragebogen zur Arbeitsweise</Sub>
            <p>
              Für zusätzliche Forschungsfragen zur Arbeitsweise gibt es eine eigene, getrennte
              Einwilligung. Nur damit speichern wir Antworten auf diese zusätzlichen Fragen,
              Angaben zum Ausfüllkontext, Antwortzeiten und deine freiwilligen Rückmeldungen. Diese
              Daten fließen nicht in dein Arbeitsprofil und werden niemandem freigegeben; die
              Auswertung für die Forschung erfolgt durch uns.
            </p>
            <Sub>Widerruf</Sub>
            <p>
              Du kannst deine Einwilligung jederzeit in deinem Konto widerrufen. Danach werden
              keine neuen Forschungsdaten gespeichert, und die noch dir zuordenbaren
              Forschungsrohdaten werden gelöscht. Bereits zusammengefasste statistische
              Auswertungen, die keiner Person mehr zugeordnet werden können, bleiben bestehen.
            </p>
            <p>Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).</p>
            {/*
              Technischer Beleg: research_consent_preferences / set_my_research_consent
              (research_consent_v1, Migration 20260830160000), Workstyle-Forschung mit
              consent_version workstyle_research_v3 (Migration 20261118140000), Löschung bei
              Widerruf über Trigger bzw. erase_workstyle_research.
            */}
          </BulletSection>

          <BulletSection number="18" title="Event-Check">
            <p>
              Bei Veranstaltungen kann man ohne Konto am Event-Check teilnehmen. Dabei verarbeiten
              wir:
            </p>
            <List
              items={[
                "deinen Namen und deine E-Mail-Adresse",
                "deine Antworten auf die Event-Fragen und ein daraus berechnetes Kurzprofil",
                "einen Teilnahme-Code, der in einem Cookie gespeichert wird, damit du während des Events angemeldet bleibst",
                "deine Zustimmung zum Vergleich und zur Sichtbarkeit gegenüber anderen Teilnehmenden",
              ]}
            />
            <p>
              Andere Teilnehmende sehen dein Kurzprofil nur über den Vergleich, dem du zugestimmt
              hast. Deine Teilnahme- und Antwortdaten werden automatisch innerhalb von rund zwei
              Tagen nach Ende des Events gelöscht (Abschnitt 23). Das Event selbst (Name, Zeitraum)
              bleibt bestehen; es enthält keine Angaben über Teilnehmende.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Rechtsgrundlage des Event-Checks (lit. b für die Teilnahme
              oder lit. a, da consent_compare und consent_visibility Pflicht-Zustimmungen sind).
            */}
          </BulletSection>

          <BulletSection number="19" title="Feedback">
            <p>
              Wenn du uns über das Produkt Feedback gibst, speichern wir deine Antworten zusammen
              mit deinem Konto. Zusätzlich erhalten wir eine interne Benachrichtigung per E-Mail
              (über Resend) mit deinen Antworten, damit wir sie lesen und beantworten können.
              Rechtsgrundlage ist unser berechtigtes Interesse an der Verbesserung des Produkts
              (Art. 6 Abs. 1 lit. f DSGVO).
            </p>
          </BulletSection>

          <BulletSection number="20" title="Kontakt per E-Mail">
            <p>
              Wenn du uns per E-Mail schreibst, verarbeiten wir deine Nachricht und deine Angaben,
              um dein Anliegen zu bearbeiten. Für unser E-Mail-Postfach nutzen wir Gmail (Google
              Ireland Limited, Dublin, Irland). Dabei kann es zu einer Übermittlung in Drittländer
              kommen; Google stützt solche Übermittlungen auf Standardvertragsklauseln.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Betriebsangabe, im Repo nicht belegbar (übernommen aus der
              bisherigen Fassung). Vor Veröffentlichung bestätigen, ebenso die Transfergrundlage.
            */}
          </BulletSection>

          <BulletSection number="21" title="Cookies und Speicherung im Browser">
            <p>
              Wir verwenden nur Speicherungen, die für die Funktionen nötig sind, die du nutzt.
              Werbe-, Analyse- oder Tracking-Cookies setzen wir nicht; deshalb gibt es auch keinen
              Cookie-Banner.
            </p>
            <List
              items={[
                "Anmelde-Cookies von Supabase: halten dich nach der Anmeldung eingeloggt.",
                "Sprach-Cookie: merkt sich deine gewählte Sprache, gültig ein Jahr.",
                "Arbeitsbereich-Cookie: merkt sich nur nach einem ausdrücklichen Wechsel, ob du gerade als Founder oder Advisor arbeitest; endet mit der Browsersitzung.",
                "Einladungs-Cookies: halten den Einladungscode während der Anmeldung fest, gültig 15 Minuten.",
                "Event-Cookie: hält deine Event-Teilnahme fest, gültig 7 Tage.",
                "Anmeldung (Sitzungsspeicher): Nach dem Klick auf einen Anmeldelink werden die Anmeldedaten kurz im Sitzungsspeicher des Browsers abgelegt und gleich danach entfernt.",
                "Interview-Entwürfe (lokaler Speicher): Was du in einem Interview tippst, wird bis zum Speichern im Browser zwischengespeichert und nach dem Speichern, beim Absenden, beim Abmelden und bei der Kontolöschung entfernt.",
                "Forschungs-Ablaufkennung (Sitzungsspeicher): nur bei aktiver Forschungsteilnahme eine zufällige Kennung für einen Ablauf; ohne Teilnahme wird sie entfernt.",
                "Service Worker: nur wenn du Push-Mitteilungen einschaltest, um sie anzuzeigen; er speichert keine Seiten zwischen.",
              ]}
            />
            <p>
              Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG, soweit die Speicherung für einen von dir
              ausdrücklich gewünschten Dienst unbedingt erforderlich ist, und für die anschließende
              Verarbeitung Art. 6 Abs. 1 lit. b DSGVO.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Einordnung des Sprach-Cookies (ein Jahr) und des Service
              Workers für Push nach § 25 TDDDG. Name und Laufzeit der Supabase-Anmelde-Cookies
              sind Bibliotheksstandard und im Repo nicht festgelegt.
            */}
          </BulletSection>

          <BulletSection number="22" title="Server-Protokolle">
            <p>
              Beim Aufruf der Website und bei der Nutzung der Serverfunktionen verarbeiten unsere
              Hosting- und Datenbankdienstleister technisch notwendige Verbindungsdaten, z. B.
              IP-Adresse, Zeitpunkt, aufgerufene Adresse und Browserangaben. Unsere
              Serverfunktionen protokollieren Fehler; diese Einträge können technische Kennungen
              und in Einzelfällen eine E-Mail-Adresse enthalten. Wir nutzen Protokolle nur für
              Betrieb, Fehlersuche und Sicherheit (Art. 6 Abs. 1 lit. f DSGVO).
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Aufbewahrungsdauer der Protokolle bei Vercel und Supabase ist
              im Repo nicht konfiguriert; ohne Beleg keine Frist nennen. Die bekannte Stelle mit
              E-Mail im Protokoll (dashboard/actions.ts) ist am 14.10.2026 entfernt; die
              Formulierung „in Einzelfällen“ bleibt, weil nicht jeder Protokollaufruf im Repo
              geprüft ist.
            */}
          </BulletSection>

          <BulletSection number="23" title="Speicherdauer">
            <p>
              Wir speichern personenbezogene Daten nicht länger als nötig. Konkrete automatische
              Fristen gibt es dort, wo sie technisch umgesetzt sind:
            </p>
            <List
              items={[
                "Nutzungs- und Forschungsereignisse (Abschnitte 16 und 17) werden automatisiert gelöscht. Maßgeblich ist der Zeitpunkt, zu dem sie bei uns eingegangen sind. Die Aufbewahrungsdauer beträgt rund 30 Tage; weil der Löschlauf einmal täglich stattfindet, können es technisch bis zu etwa 32 Tage sein.",
                "Personenbezogene Teilnahme- und Antwortdaten zum Event-Check werden automatisiert innerhalb von rund zwei Tagen nach Ende des jeweiligen Events gelöscht.",
                "Abgeschlossene Aufgaben der KI-Warteschlange (nur Verweise und technische Angaben, keine Inhalte) löschen wir automatisch nach 90 Tagen, Hinweise in der Anwendung nach 180 Tagen.",
                "Push-Zustelladressen speichern wir, bis du Push ausschaltest, der Push-Dienst sie als ungültig meldet oder du dein Konto löschst.",
                "Einladungen laufen nach 14 bzw. 30 Tagen ab. Abgelaufene Einladungen werden derzeit nicht automatisch gelöscht, sondern spätestens mit dem Konto der einladenden Person.",
                "Die Laufzeiten von Cookies und Browserspeicher stehen in Abschnitt 21.",
              ]}
            />
            <p>
              Alle übrigen Konto-, Profil-, Fragebogen-, Team- und Netzwerkdaten
              speichern wir grundsätzlich so lange, wie du dein Konto nutzt, bzw. bis du sie selbst
              löschst oder dein Konto löschst. Der Ausfüllverlauf (Abschnitt 6b) hängt am jeweiligen Fragebogen
              und wird zusammen mit ihm gelöscht.
            </p>
            <p>
              Zusammengefasste Statistiken ohne Personenbezug können länger bestehen; dafür gibt es
              keine automatische Frist. Gesetzliche Aufbewahrungspflichten, z. B. für Rechnungen,
              bleiben unberührt.
            </p>
          </BulletSection>

          <BulletSection number="24" title="Konto löschen und gemeinsame Daten">
            <p>
              Du kannst dein Konto jederzeit in deinen Kontoeinstellungen löschen. Die Löschung
              erfolgt sofort und kann nicht rückgängig gemacht werden.
            </p>
            <Sub>Was gelöscht wird</Sub>
            <List
              items={[
                "dein Konto mit Anmeldedaten, dein Profil, deine Fotos und deine Fragebogen-Antworten mit ihren Auswertungen",
                "deine Fähigkeiten, Belege und Interview-Antworten",
                "dein FIND-Profil, deine Suchkriterien und gespeicherten Suchen",
                "dein CONNECT-Profil, deine Anzeigen, Blockierungen und Meldungen, Vorschläge und Benachrichtigungseinstellungen",
                "deine Forschungsdaten, soweit sie dir noch zugeordnet werden können",
                "Einladungen, die du verschickt hast oder die an deine E-Mail-Adresse gingen",
                "Event-Teilnahmen mit deiner E-Mail-Adresse",
                "gemeinsame Formate zu zweit (z. B. Commitment Lab) – vollständig, also auch mit den Antworten der anderen Person",
              ]}
            />
            <Sub>Was ohne Bezug zu dir bestehen bleiben kann</Sub>
            <List
              items={[
                "Nachrichten, die du in CONNECT geschrieben hast, bleiben für die Empfangenden sichtbar; der Bezug zu deinem Konto wird entfernt.",
                "Probleme, die du in CONNECT eingestellt hast, werden je nach deiner Wahl gelöscht oder ohne Bezug zu dir weitergeführt.",
                "Absprachen und Beiträge im Founder Setup eines Teams bleiben für die übrigen Mitglieder erhalten; der Bezug zu deinem Konto wird entfernt.",
                "Nutzungsereignisse ohne Nutzerkennung (Abschnitt 16) werden nicht gesondert gelöscht, sondern nach der dort genannten Frist.",
              ]}
            />
            <Sub>Teams</Sub>
            <p>
              Bleibt mindestens ein weiteres Mitglied, besteht das Team weiter. Löscht die letzte
              Person ihr Konto, wird das Team gelöscht bzw. archiviert; offene Einladungen und
              Freigaben werden beendet. Personen, mit denen du in Align verbunden warst, und
              Advisors dieser Verbindung erhalten einen Hinweis ohne Namen, dass die Verbindung
              beendet ist.
            </p>
          </BulletSection>

          <BulletSection number="25" title="Deine Rechte">
            <p>Du hast das Recht auf:</p>
            <List
              items={[
                "Auskunft über deine Daten (Art. 15 DSGVO)",
                "Berichtigung unrichtiger Daten (Art. 16 DSGVO) – die meisten Angaben kannst du direkt im Produkt ändern",
                "Löschung (Art. 17 DSGVO) – dein Konto kannst du selbst löschen (Abschnitt 24)",
                "Einschränkung der Verarbeitung (Art. 18 DSGVO)",
                "Datenübertragbarkeit (Art. 20 DSGVO) – einen Export wesentlicher Kontodaten kannst du in deinen Kontoeinstellungen herunterladen; eine vollständige Auskunft erhältst du auf Anfrage",
                "Widerspruch gegen Verarbeitungen auf Grundlage unseres berechtigten Interesses (Art. 21 DSGVO)",
                "Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO), z. B. der Forschungsteilnahme in deinem Konto",
              ]}
            />
            <p>
              Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum
              Beispiel bei der Berliner Beauftragten für Datenschutz und Informationsfreiheit.
            </p>
            <p>Für alle Anliegen genügt eine E-Mail an hello@cofoundery.de.</p>
          </BulletSection>

          <BulletSection number="26" title="Kontakt">
            <p>Bei Fragen zum Datenschutz:</p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>Maria Schulz</p>
              <p>hello@cofoundery.de</p>
            </div>
          </BulletSection>
        </div>
      </div>
    </main>
  );
}
