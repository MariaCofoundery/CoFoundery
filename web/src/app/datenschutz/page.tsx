import Link from "next/link";

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
              Diese Datenschutzerklärung informiert dich darüber, welche personenbezogenen Daten wir
              verarbeiten, wofür wir sie nutzen und welche Rechte dir dabei zustehen.
            </p>
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
            <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>Maria Schulz</p>
              <p>Am Juliusturm 89</p>
              <p>13597 Berlin</p>
              <p>E-Mail: business.mariaschulz@gmail.com</p>
            </div>
          </BulletSection>

          <BulletSection number="2" title="Überblick über die Datenverarbeitung">
            <p>
              Wir verarbeiten personenbezogene Daten, damit du CoFoundery Align nutzen kannst:
              für Login, Profil, Fragebögen, Auswertungen, Matching, gemeinsames Workbook und
              technische Produktanalyse.
            </p>
            <List
              items={[
                "Account- und Login-Daten, vor allem deine E-Mail-Adresse",
                "Profildaten, z. B. Name, Rolle, Fokus, Intention und optional Avatar",
                "Antworten auf strukturierte Fragebögen",
                "daraus abgeleitete Scores, Dimensionen und Reports",
                "gemeinsame Daten mit einem Co-Founder, z. B. Matching-Report und Workbook",
                "Einladungsdaten, z. B. die E-Mail-Adresse einer eingeladenen Person",
                "Daten zu freigegebenen Advisor- oder Moderationszugängen",
                "technische Nutzungs- und Analyseereignisse",
              ]}
            />
          </BulletSection>

          <BulletSection number="3" title="Zweck der Verarbeitung">
            <p>Die Verarbeitung erfolgt zu folgenden Zwecken:</p>
            <List
              items={[
                "Bereitstellung und sicherer Betrieb des Produkts",
                "Erstellung von Profilen, Scores, individuellen Reports und Matching-Reports",
                "Vergleich zweier Founder-Profile im Matching",
                "Unterstützung der Zusammenarbeit im Workbook",
                "Einbindung von Advisors oder Moderatoren nach Freigabe",
                "technische Analyse, Fehlerbehebung und Produktverbesserung",
                "Missbrauchsverhinderung und Systemsicherheit",
              ]}
            />
          </BulletSection>

          <BulletSection number="4" title="Rechtsgrundlagen">
            <p>Die Verarbeitung erfolgt auf Basis folgender Rechtsgrundlagen:</p>
            <List
              items={[
                "Art. 6 Abs. 1 lit. b DSGVO (Vertrag / Nutzung des Tools)",
                "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Produktverbesserung und Sicherheit)",
                "Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Verpflichtungen, z. B. Rechnungsstellung)",
              ]}
            />
            <p>
              Unser berechtigtes Interesse liegt in der sicheren Bereitstellung des Produkts, der
              technischen Fehleranalyse, der Missbrauchsverhinderung sowie der Weiterentwicklung
              und Verbesserung des Tools.
            </p>
          </BulletSection>

          <BulletSection number="5" title="Account und Login">
            <p>
              Für den Login verwenden wir ein Magic-Link-Verfahren. Dabei nutzen wir deine
              E-Mail-Adresse, um dir einen sicheren Anmeldelink zu senden.
            </p>
            <p>
              Nach erfolgreicher Anmeldung verarbeiten wir außerdem technisch notwendige Session-
              Daten, damit du eingeloggt bleibst und geschützte Produktbereiche nutzen kannst.
            </p>
            <p>Die Authentifizierung erfolgt über:</p>
            <List items={["Supabase (Supabase Inc.)"]} />
          </BulletSection>

          <BulletSection number="6" title="Verarbeitung von Profildaten und Fragebögen">
            <p>
              Im Rahmen der Nutzung verarbeiten wir die Daten, die du im Produkt selbst angibst.
              Dazu gehören insbesondere:
            </p>
            <List
              items={[
                "dein Kernprofil mit Name, Rolle, Fokus und Intention",
                "optional ein Avatar",
                "optional weitere Profilangaben wie Kurzbeschreibung, Erfahrungen, Fähigkeiten oder ein LinkedIn-Profil, soweit solche Funktionen von dir genutzt werden",
                "deine Antworten auf strukturierte Fragebögen",
              ]}
            />
            <p>Diese Daten nutzen wir, um:</p>
            <List
              items={[
                "dein Profil im Produkt darzustellen",
                "Fragebogenantworten auszuwerten",
                "Dimensionen und Scores zu berechnen",
                "individuelle und gemeinsame Auswertungen zu erstellen",
              ]}
            />
          </BulletSection>

          <BulletSection number="7" title="Matching, Reports und gemeinsame Inhalte">
            <p>
              Wenn du mit einer weiteren Person eine Founder-Konstellation bildest, werden Daten
              beider Personen zusammengeführt. Daraus entstehen gemeinsame Ergebnisse.
            </p>
            <List
              items={[
                "eure Fragebogen- und Profildaten werden für das Matching gemeinsam ausgewertet",
                "es entstehen gemeinsame Ergebnisse wie Matching-Report, Vergleichssignale und Workbook-Inhalte",
                "beide beteiligten Founder haben Zugriff auf diese gemeinsamen Ergebnisse",
              ]}
            />
            <p>
              Diese Inhalte betreffen beide Founder gemeinsam. Sie lassen sich deshalb nicht wie
              reine Einzeldaten behandeln.
            </p>
            <p>
              In der aktuellen Produktphase werden gemeinsame Reports, Workbooks und weitere
              gemeinsame Founder-Ergebnisse bei Löschung eines Accounts ebenfalls entfernt, soweit
              sie dieser Founder-Konstellation zugeordnet sind.
            </p>
          </BulletSection>

          <BulletSection number="8" title="Eingeladene Personen (Co-Founder)">
            <p>Wenn du eine andere Person einlädst:</p>
            <List
              items={[
                "verarbeiten wir deren E-Mail-Adresse, um die Einladung zuzustellen und zuzuordnen",
                "die Daten stammen zunächst von der einladenden Person",
                "die Verarbeitung dient dazu, die Einladung, den Login-Kontext und den späteren Matching-Prozess technisch umzusetzen",
              ]}
            />
          </BulletSection>

          <BulletSection number="9" title="Advisor / Moderation">
            <p>Founder können optional einen Advisor oder Moderator in den Arbeitskontext einbinden.</p>
            <p>Dabei werden verarbeitet:</p>
            <List
              items={[
                "Zugriffs- und Freigabedaten",
                "die Zuordnung zu einem konkreten Founder-Team",
                "Inhalte im Workbook, z. B. Hinweise, Notizen, Rückfragen oder Abschlussimpulse",
              ]}
            />
            <p>
              Ein Advisor erhält Zugriff nur im freigegebenen Teamkontext. Dort kann er
              freigegebene Inhalte einsehen und eigene Beiträge hinzufügen. Diese Beiträge sind für
              die beteiligten Founder sichtbar.
            </p>
          </BulletSection>

          <BulletSection number="10" title="Verarbeitung abgeleiteter Daten (Profiling)">
            <p>
              Auf Basis deiner Profilangaben und Fragebogenantworten berechnen wir strukturierte
              Auswertungen.
            </p>
            <List
              items={[
                "Dimensionswerte und Scores",
                "individuelle Einordnungen und individuelle Reports",
                "gemeinsame Matching-Analysen und gemeinsame Reports",
                "inhaltliche Zusammenfassungen für Matching und Workbook",
              ]}
            />
            <p>
              Vereinfacht gesagt: Antworten werden in Dimensionen und Signale übersetzt. Daraus
              entstehen individuelle und gemeinsame Auswertungen.
            </p>
            <p>
              Dabei handelt es sich um automatisierte Auswertungen, aber nicht um automatisierte
              Entscheidungen mit rechtlicher Wirkung.
            </p>
          </BulletSection>

          <BulletSection number="11" title="Produktanalyse und Forschung">
            <p>
              Wir erfassen bestimmte Nutzungsereignisse, um das Produkt technisch zu verstehen und
              weiterzuentwickeln.
            </p>
            <List
              items={[
                "Start und Abschluss von Fragebögen",
                "Anzeigen einzelner Fragen",
                "Speichern von Antworten",
                "Bearbeitungsdauer, Fortschritt und technische Nutzungskontexte",
              ]}
            />
            <p>
              Dabei können insbesondere Angaben wie Modul, Frage-ID, Dimension, Frageposition,
              Antwortspeicherung, Bearbeitungsdauer, Fortschritt und Seitenpfad verarbeitet werden.
            </p>
            <p>
              Soweit möglich, speichern wir diese Ereignisse nicht mit Klartext-Identifikatoren wie
              E-Mail-Adresse oder offener Nutzer-ID, sondern in pseudonymisierter Form, z. B. über
              Hash-Werte. Pseudonymisierte Daten bleiben personenbezogene Daten.
            </p>
            <p>
              Aus diesen Daten können anonyme oder ausreichend aggregierte Statistiken entstehen,
              die wir für Produktanalyse und Forschung weiter nutzen.
            </p>
          </BulletSection>

          <BulletSection number="12" title="Anonymisierung und Weiterverwendung">
            <p>Wir unterscheiden zwischen pseudonymisierten Rohdaten und anonymen Aggregaten.</p>
            <List
              items={[
                "Pseudonymisierte Analyse-Rohdaten dienen nur der kurzfristigen Produktanalyse.",
                "Anschließend können daraus aggregierte statistische Auswertungen entstehen.",
                "Aggregierte Auswertungen sollen keinen Rückschluss mehr auf einzelne Personen oder konkrete Founder-Paare erlauben.",
              ]}
            />
            <p>
              Eine Weiterverwendung außerhalb personenbezogener Kontexte erfolgt nur, wenn danach
              kein Rückschluss auf einzelne Personen mehr möglich sein soll.
            </p>
          </BulletSection>

          <BulletSection number="13" title="Zahlungen (PayPal)">
            <p>Wenn du eine freiwillige Zahlung tätigst:</p>
            <List items={["erfolgt die Abwicklung über PayPal (PayPal Europe S.à r.l.)"]} />
            <p>PayPal verarbeitet die Daten eigenständig. Es gelten die Datenschutzbestimmungen von PayPal.</p>
            <p>In unserem System speichern wir keine Zahlungsdaten.</p>
          </BulletSection>

          <BulletSection number="14" title="E-Mail-Kommunikation">
            <p>
              Wenn du uns per E-Mail kontaktierst oder uns Daten, z. B. Rechnungsdaten,
              übermittelst, werden diese zur Bearbeitung deiner Anfrage verarbeitet.
            </p>
            <p>Wir nutzen hierfür:</p>
            <List items={["Gmail (Google Ireland Limited, Dublin, Irland)"]} />
            <p>
              Es kann dabei zu einer Übermittlung in Drittländer kommen. Google verwendet
              Standardvertragsklauseln gemäß DSGVO.
            </p>
          </BulletSection>

          <BulletSection number="15" title="Hosting und Infrastruktur">
            <p>Wir nutzen folgende Dienstleister:</p>
            <List
              items={[
                "Vercel (Hosting)",
                "Supabase (Datenbank und Authentifizierung)",
              ]}
            />
            <p>Diese verarbeiten Daten in unserem Auftrag.</p>
            <p>
              Soweit personenbezogene Daten in Staaten außerhalb der Europäischen Union oder des
              Europäischen Wirtschaftsraums übermittelt werden, erfolgt dies nur unter Beachtung
              der gesetzlichen Voraussetzungen, insbesondere auf Grundlage von
              Angemessenheitsbeschlüssen oder geeigneten Garantien wie
              Standardvertragsklauseln.
            </p>
          </BulletSection>

          <BulletSection number="16" title="Cookies und technische Speicherung">
            <p>
              Wir verwenden technisch notwendige Cookies und vergleichbare browserseitige
              Speichermechanismen, um zentrale Produktfunktionen umzusetzen.
            </p>
            <List
              items={[
                "Session-Cookies für Login und geschützte Produktbereiche",
                "kurzlebige Cookies für Founder- und Advisor-Einladungsprozesse",
                "browserseitigen Speicher, z. B. sessionStorage, für technische Flow- und Analysekontexte",
              ]}
            />
            <p>
              Diese Speicherungen dienen dem Betrieb, der sicheren Anmeldung und der technischen
              Durchführung von Einladungs- und Produktabläufen.
            </p>
          </BulletSection>

          <BulletSection number="17" title="Speicherdauer">
            <p>Wir speichern personenbezogene Daten nicht länger als nötig.</p>
            <List
              items={[
                "Account-, Profil-, Fragebogen-, Report- und Workbook-Daten speichern wir grundsätzlich so lange, wie sie für die Nutzung des Produkts erforderlich sind oder bis eine Löschung erfolgt.",
                "Pseudonymisierte Analyse-Rohdaten speichern wir nur für einen begrenzten Zeitraum und löschen sie anschließend in der Regel wieder. Aktuell liegt dieser Zeitraum typischerweise bei bis zu 30 Tagen.",
                "Anonyme oder ausreichend aggregierte Statistikdaten können länger aufbewahrt werden.",
                "Gesetzliche Aufbewahrungspflichten, z. B. bei rechnungsbezogenen Daten, bleiben unberührt.",
              ]}
            />
            <p>
              Anschließend werden personenbezogene Daten gelöscht, soweit keine gesetzlichen
              Aufbewahrungspflichten entgegenstehen. Daten können darüber hinaus nur dann
              anonymisiert oder aggregiert weiterverarbeitet werden, wenn danach kein
              Personenbezug mehr besteht.
            </p>
          </BulletSection>

          <BulletSection number="18" title="Deine Rechte">
            <p>Du hast das Recht auf:</p>
            <List
              items={[
                "Auskunft",
                "Berichtigung",
                "Löschung",
                "Einschränkung der Verarbeitung",
                "Datenübertragbarkeit",
                "Widerspruch",
              ]}
            />
            <p>
              Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
              beschweren.
            </p>
          </BulletSection>

          <BulletSection number="19" title="Löschung und gemeinsame Daten">
            <p>Bei Löschung deines Accounts:</p>
            <p>
              Soweit keine gesetzlichen Aufbewahrungspflichten oder sonstigen rechtlichen Gründe
              entgegenstehen, werden deine personenbezogenen Daten gelöscht.
            </p>
            <p>
              In der aktuellen Produktphase gilt das auch für gemeinsame Founder-Daten, soweit sie
              der betroffenen Founder-Konstellation zugeordnet sind. Dazu gehören insbesondere
              gemeinsame Reports, Matching-Ergebnisse und Workbook-Inhalte.
            </p>
            <p>
              Anonyme oder ausreichend aggregierte Statistikdaten können bestehen bleiben, wenn
              daraus kein Rückschluss mehr auf einzelne Personen möglich ist.
            </p>
          </BulletSection>

          <BulletSection number="20" title="Kontakt">
            <p>Bei Fragen zum Datenschutz:</p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>business.mariaschulz@gmail.com</p>
            </div>
          </BulletSection>
        </div>
      </div>
    </main>
  );
}
