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
              Diese Datenschutzerklärung beschreibt, welche personenbezogenen Daten bei der Nutzung
              von CoFoundery Align verarbeitet werden, wie diese Daten im Produktkontext verwendet
              werden und welche Rechte Nutzer:innen dabei haben. Sie basiert auf dem aktuellen
              technischen Stand des Produkts und wird bei Weiterentwicklungen angepasst.
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
            <p>
              Verantwortlich für die Datenverarbeitung im Zusammenhang mit CoFoundery Align ist:
            </p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>[Name / Firma]</p>
              <p>[Anschrift]</p>
              <p>[PLZ Ort, Land]</p>
              <p>[E-Mail für Datenschutzanfragen]</p>
            </div>
            <p>
              Falls du Fragen zum Datenschutz hast oder deine Rechte ausüben möchtest, kannst du
              dich an die oben genannte Stelle wenden.
            </p>
          </BulletSection>

          <BulletSection number="2" title="Allgemeine Hinweise">
            <p>
              Wir verarbeiten personenbezogene Daten nur insoweit, wie dies für den Betrieb von
              CoFoundery Align, die Erstellung von Reports und Arbeitsdokumenten, die sichere
              Anmeldung sowie die Weiterentwicklung des Produkts erforderlich ist.
            </p>
            <List
              items={[
                "Wir arbeiten nach dem Prinzip der Datensparsamkeit und erheben keine unnötigen Marketing- oder Werbetrackingdaten.",
                "Wir verwenden derzeit keine externen Werbe- oder Reichweiten-Tracker wie Google Analytics, Meta Pixel oder vergleichbare Marketing-Tools.",
                "Datenzugriffe werden im Produkt technisch begrenzt, insbesondere zwischen Founder-, Team- und Advisor-Kontexten.",
                "Sicherheitsmaßnahmen wie rollenbasierte Zugriffe, serverseitige Autorisierungsprüfungen und gehärtete Token-Flows sollen unberechtigte Zugriffe verhindern.",
              ]}
            />
            <p>
              Soweit eine Verarbeitung zur Bereitstellung des Produkts erforderlich ist, erfolgt sie
              in der Regel auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Für Sicherheit, Stabilität
              und Weiterentwicklung stützen wir uns ergänzend auf Art. 6 Abs. 1 lit. f DSGVO. Soweit
              du freiwillig zusätzliche Angaben machst, kann die Verarbeitung außerdem auf deiner
              Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO beruhen.
            </p>
          </BulletSection>

          <BulletSection number="3" title="Erhebung personenbezogener Daten">
            <p>Bei der Nutzung von CoFoundery Align können insbesondere folgende Daten verarbeitet werden:</p>
            <List
              items={[
                "Account-Daten wie E-Mail-Adresse, interne User-ID und Anmeldestatus",
                "Profilinformationen wie Anzeigename, Rollen, Fokus-Skill oder Intention",
                "Einladungs- und Teamdaten wie eingeladene E-Mail-Adresse, Team-Kontext, Einladungsstatus und Zuordnung zwischen Founder:innen",
                "Advisor-bezogene Daten wie verknüpftes Advisor-Profil, Freigabestatus und Zeitpunkte der Verknüpfung",
              ]}
            />
            <p>
              Diese Daten werden verarbeitet, damit Nutzer:innen sich anmelden, Teams aufbauen,
              Einladungen annehmen, Reports gemeinsam nutzen und Advisors strukturiert einbinden
              können.
            </p>
          </BulletSection>

          <BulletSection number="4" title="Nutzung des Produkts">
            <p>
              CoFoundery Align verarbeitet Daten, um den Kern des Produkts bereitzustellen: einen
              strukturierten Co-Founder Matching- und Alignment-Prozess für Gründer:innen, Teams und
              optional eingebundene Advisors.
            </p>
            <List
              items={[
                "Fragebögen: Antworten aus dem Basisfragebogen und optional dem Werte-Add-on",
                "Reports und Matching: individuelle Auswertungen, Vergleichsprofile, Snapshot-Daten und abgeleitete Report-Inhalte",
                "Workbooks und Zusammenarbeit: Inhalte aus dem Founder Alignment Workbook, Vereinbarungen, Status, Notizen und strukturierte Arbeitsstände",
                "Advisor-Einbindung: Advisor-Impulse, Abschlussnotizen, Follow-up-Hinweise und Founder-Reaktionen auf Advisor-Impulse",
              ]}
            />
            <p>
              Diese Verarbeitungen sind notwendig, damit die Plattform die gewünschten Report-,
              Gesprächs- und Workbook-Funktionen überhaupt bereitstellen kann.
            </p>
          </BulletSection>

          <BulletSection number="5" title="Verarbeitung sensibler Inhalte">
            <p>
              Im Produkt werden keine medizinischen Diagnosen oder Gesundheitsdaten im engeren
              Sinne verarbeitet. Gleichwohl können die Inhalte des Produkts für Nutzer:innen sensibel
              sein, weil sie arbeitsbezogene, psychologisch relevante oder persönlich reflektierte
              Angaben enthalten.
            </p>
            <List
              items={[
                "Antworten zu Entscheidungslogik, Risiko, Commitment, Konfliktstil und Zusammenarbeit",
                "Vergleichsauswertungen zwischen Gründer:innen",
                "freie Texte in Workbooks, Vereinbarungen, Advisor-Impulsen und Reaktionen",
              ]}
            />
            <p>
              Diese Inhalte dienen ausschließlich der Erstellung von Reports, der strukturierten
              Reflexion und der Zusammenarbeit im jeweiligen Teamkontext. Sie sind nicht als
              therapeutische, diagnostische oder medizinische Bewertung gedacht.
            </p>
          </BulletSection>

          <BulletSection number="6" title="Nutzungs- und Forschungsdaten">
            <p>
              Wir erfassen produktbezogene Nutzungsereignisse in einer internen
              `research_events`-Struktur, um das Produkt fachlich und technisch weiterzuentwickeln
              sowie spätere Auswertungen zu Nutzungsmustern, Flow-Qualität und Forschungskontexten
              zu ermöglichen.
            </p>
            <List
              items={[
                "Beispiele sind Start, Verlauf und Abschluss von Fragebögen, Report-Aufrufe, Workbook-Aufrufe, Print-/PDF-Auslösungen sowie Advisor-Claim- oder Einladungsereignisse.",
                "Die Verarbeitung erfolgt grundsätzlich pseudonymisiert, z. B. über Hashes für Nutzer-, Flow-, Assessment- oder Teambezüge.",
                "Pseudonymisiert bedeutet nicht anonymisiert: Die Daten sind intern weiterhin einem Produktkontext zuordenbar, auch wenn nicht überall direkt Klarnamen gespeichert werden.",
                "Wir verwenden diese Daten nicht für Werbung, Profiling zu Marketingzwecken oder den Verkauf an Dritte.",
              ]}
            />
            <p>
              Die Verarbeitung erfolgt für Produktverbesserung, Qualitätskontrolle, Analyse und
              Forschung im Zusammenhang mit dem Produkt.
            </p>
          </BulletSection>

          <BulletSection number="7" title="Authentifizierung">
            <p>
              Die Anmeldung erfolgt derzeit per Magic Link über Supabase Auth. Dabei wird deine
              E-Mail-Adresse verarbeitet, um dir einen sicheren Anmeldelink zu senden und deine
              Session zu verwalten.
            </p>
            <List
              items={[
                "Magic Links und Invite-Links dienen als Einstiegspunkte für Login oder Team-Zuordnung.",
                "Invite- und Advisor-Tokens werden technisch gehärtet verarbeitet und nicht dauerhaft im Browser gespeichert.",
                "Nach erfolgreicher Anmeldung oder Verknüpfung wird der Zugriff im Regelfall über dein eingeloggtes Profil und serverseitige Zuordnungen gesteuert, nicht über dauerhaft weitergereichte Tokens.",
              ]}
            />
          </BulletSection>

          <BulletSection number="8" title="Hosting und Infrastruktur">
            <p>Für den Betrieb von CoFoundery Align nutzen wir derzeit insbesondere folgende technische Dienstleister:</p>
            <List
              items={[
                "Supabase für Authentifizierung, Datenbank und sichere serverseitige Datenzugriffe",
                "Vercel für Hosting, Serverausführung und Auslieferung der Webanwendung",
              ]}
            />
            <p>
              Diese Anbieter verarbeiten Daten im Rahmen ihrer technischen Funktion für uns. Eine
              Verarbeitung kann dabei auch außerhalb der EU bzw. des EWR stattfinden, insbesondere
              wenn Anbieter Infrastruktur in Drittländern nutzen. In solchen Fällen sollen
              geeignete datenschutzrechtliche Garantien, etwa Standardvertragsklauseln, zugrunde
              gelegt werden.
            </p>
          </BulletSection>

          <BulletSection number="9" title="Speicherung und Aufbewahrung">
            <p>
              Produktdaten wie Profile, Einladungen, Fragebogenantworten, Reports und Workbooks
              werden grundsätzlich so lange gespeichert, wie dies für die Bereitstellung des
              Produkts und die Nutzung durch aktive Accounts erforderlich ist.
            </p>
            <List
              items={[
                "Reports und Workbooks sind Teil des Produktverlaufs und werden aktuell nicht aggressiv automatisch gelöscht.",
                "Pseudonymisierte Nutzungs- und Forschungsdaten können für Produktanalyse und Qualitätssicherung zeitlich begrenzt gespeichert werden.",
                "Anonymisierte oder nicht mehr personenbezogene Auswertungen können länger aufbewahrt und statistisch genutzt werden.",
              ]}
            />
            <p>
              Eine weiter ausdifferenzierte Retention-, Lösch- und Anonymisierungsstrategie ist
              geplant. Bis dahin prüfen wir Löschanfragen einzelfallbezogen und mit Blick auf
              gemeinsame Teamdaten sorgfältig.
            </p>
          </BulletSection>

          <BulletSection number="10" title="Weitergabe von Daten">
            <p>
              Wir geben personenbezogene Daten nicht an Dritte zu Werbe- oder Marketingzwecken
              weiter und verkaufen keine Nutzerdaten.
            </p>
            <p>Daten werden nur insoweit an Dritte übermittelt, wie dies für den technischen Betrieb erforderlich ist, insbesondere an:</p>
            <List
              items={[
                "Hosting- und Infrastruktur-Dienstleister",
                "Authentifizierungs- und Datenbank-Dienstleister",
                "in seltenen Fällen Behörden oder Gerichte, soweit wir gesetzlich dazu verpflichtet sind",
              ]}
            />
            <p>
              Innerhalb des Produkts selbst werden Daten nur dort sichtbar gemacht, wo dies der
              jeweilige Team-, Founder- oder Advisor-Kontext vorsieht.
            </p>
          </BulletSection>

          <BulletSection number="11" title="Rechte der Nutzer:innen">
            <p>Du hast im Rahmen der gesetzlichen Voraussetzungen insbesondere folgende Rechte:</p>
            <List
              items={[
                "Auskunft über die zu deiner Person gespeicherten Daten",
                "Berichtigung unrichtiger oder unvollständiger Daten",
                "Löschung deiner Daten, soweit keine gesetzlichen oder zwingenden produktbezogenen Gründe entgegenstehen",
                "Einschränkung der Verarbeitung",
                "Datenübertragbarkeit",
                "Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen",
                "Beschwerde bei einer Datenschutzaufsichtsbehörde",
              ]}
            />
            <p>
              Bitte beachte, dass bei Team- und Workbook-Daten auch gemeinsame Kontexte betroffen
              sein können. Wir prüfen daher Lösch- und Auskunftsanfragen immer mit Blick auf den
              konkreten Produktzusammenhang.
            </p>
          </BulletSection>

          <BulletSection number="12" title="Datensicherheit">
            <p>
              Wir treffen technische und organisatorische Maßnahmen, um personenbezogene Daten vor
              unberechtigtem Zugriff, Verlust oder Missbrauch zu schützen.
            </p>
            <List
              items={[
                "rollen- und kontextbezogene Zugriffsbeschränkungen",
                "serverseitige Autorisierungsprüfungen für Founder-, Team- und Advisor-Zugriffe",
                "sichere Authentifizierung über Magic Links",
                "pseudonymisierte Produkt- und Forschungsanalyse, soweit dies möglich und sinnvoll ist",
              ]}
            />
            <p>
              Trotz aller Maßnahmen kann eine vollständige Sicherheit bei internetbasierten
              Diensten nie garantiert werden. Wir entwickeln die Sicherheitsarchitektur deshalb
              laufend weiter.
            </p>
          </BulletSection>

          <BulletSection number="13" title="Schluss">
            <p>
              Wenn du Fragen zum Datenschutz, zu deinen Daten oder zur Nutzung von CoFoundery Align
              hast, kannst du uns jederzeit über die oben genannte Kontaktmöglichkeit schreiben.
            </p>
            <p>
              CoFoundery Align entwickelt sich weiter. Deshalb kann es notwendig sein, diese
              Datenschutzerklärung anzupassen, wenn sich Funktionen, Datenflüsse oder technische
              Dienstleister ändern. Maßgeblich ist jeweils die auf dieser Seite veröffentlichte
              aktuelle Fassung.
            </p>
          </BulletSection>
        </div>
      </div>
    </main>
  );
}
