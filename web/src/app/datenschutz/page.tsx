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
              Wir verarbeiten personenbezogene Daten, um dir die Nutzung unseres Tools zur Analyse
              und Abstimmung von Founder-Teams zu ermöglichen.
            </p>
            <List
              items={[
                "Account- und Login-Daten (E-Mail-Adresse)",
                "Profildaten (z. B. Name, Rollen, Fokus)",
                "Antworten auf strukturierte Fragebögen",
                "daraus abgeleitete Auswertungen (z. B. Matching-Reports)",
                "Inhalte aus der Zusammenarbeit (z. B. Workbook)",
                "Einladungsdaten (z. B. E-Mail eines Co-Founders)",
                "Daten im Zusammenhang mit Advisor-/Moderationszugängen",
                "technische Nutzungsdaten",
              ]}
            />
          </BulletSection>

          <BulletSection number="3" title="Zweck der Verarbeitung">
            <p>Die Verarbeitung erfolgt zu folgenden Zwecken:</p>
            <List
              items={[
                "Bereitstellung und Betrieb des Tools",
                "Erstellung individueller und gemeinsamer Auswertungen",
                "Matching zwischen Founder-Teams",
                "Unterstützung der Zusammenarbeit (Workbook)",
                "Einbindung von Advisoren oder Moderatoren",
                "Verbesserung des Produkts und der Nutzererfahrung",
                "Gewährleistung der technischen Sicherheit",
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
              Für den Login verwenden wir ein sogenanntes Magic-Link-Verfahren. Dabei wird deine
              E-Mail-Adresse genutzt, um dir einen sicheren Login-Link zu senden.
            </p>
            <p>Die Authentifizierung erfolgt über:</p>
            <List items={["Supabase (Supabase Inc.)"]} />
          </BulletSection>

          <BulletSection number="6" title="Verarbeitung von Profildaten und Fragebögen">
            <p>
              Im Rahmen der Nutzung des Tools verarbeitest du selbst eingegebene Daten,
              insbesondere:
            </p>
            <List
              items={[
                "Profildaten",
                "Antworten auf strukturierte Fragebögen",
              ]}
            />
            <p>Diese Daten werden verwendet, um:</p>
            <List
              items={[
                "individuelle Profile zu erstellen",
                "Matching-Analysen zu berechnen",
                "Unterschiede und Gemeinsamkeiten sichtbar zu machen",
              ]}
            />
          </BulletSection>

          <BulletSection number="7" title="Matching, Reports und gemeinsame Inhalte">
            <p>
              Wenn du einen Co-Founder einlädst:
            </p>
            <List
              items={[
                "werden eure Daten miteinander verknüpft",
                "gemeinsame Auswertungen erstellt",
                "Inhalte im Workbook gemeinsam bearbeitet",
              ]}
            />
            <p>
              Wichtig: Diese Inhalte betreffen immer beide Founder gemeinsam und können nicht
              vollständig isoliert einer einzelnen Person zugeordnet werden.
            </p>
            <p>
              In der aktuellen Produktphase werden gemeinsame Reports und Workbooks der
              betroffenen Founder-Konstellation bei Löschung eines Accounts ebenfalls gelöscht.
            </p>
          </BulletSection>

          <BulletSection number="8" title="Eingeladene Personen (Co-Founder)">
            <p>Wenn du eine andere Person einlädst:</p>
            <List
              items={[
                "wird deren E-Mail-Adresse verarbeitet",
                "die Daten stammen von der einladenden Person",
                "die Verarbeitung dient ausschließlich dazu, die Einladung und den Matching-Prozess zu ermöglichen",
              ]}
            />
          </BulletSection>

          <BulletSection number="9" title="Advisor / Moderation">
            <p>Im Rahmen der Nutzung kann ein Advisor oder Moderator eingebunden werden.</p>
            <p>Dabei werden verarbeitet:</p>
            <List
              items={[
                "Zugriffsdaten",
                "Zuordnungen zu einem Founder-Team",
                "Inhalte im Workbook (z. B. Notizen oder Kommentare)",
              ]}
            />
            <p>Der Zugriff erfolgt ausschließlich im freigegebenen Kontext.</p>
          </BulletSection>

          <BulletSection number="10" title="Verarbeitung abgeleiteter Daten (Profiling)">
            <p>Auf Basis deiner Eingaben erstellen wir:</p>
            <List
              items={[
                "strukturierte Auswertungen",
                "Matching-Analysen",
                "inhaltliche Interpretationen",
              ]}
            />
            <p>
              Dabei handelt es sich um automatisierte Auswertungen, jedoch keine automatisierten
              Entscheidungen mit rechtlicher Wirkung.
            </p>
          </BulletSection>

          <BulletSection number="11" title="Produktanalyse und Forschung">
            <p>Wir verwenden Daten zur Verbesserung unseres Produkts, insbesondere:</p>
            <List
              items={[
                "Nutzungsabläufe",
                "Interaktionen",
                "aggregierte Auswertungen",
              ]}
            />
            <p>
              Soweit möglich, erfolgt dies in pseudonymisierter Form. Pseudonymisierte Daten
              bleiben personenbezogene Daten. Eine Weiterverwendung außerhalb personenbezogener
              Kontexte erfolgt nur nach Anonymisierung oder Aggregation, wenn danach kein
              Rückschluss auf einzelne Personen mehr möglich ist.
            </p>
          </BulletSection>

          <BulletSection number="12" title="Anonymisierung und Weiterverwendung">
            <p>Daten können nach Abschluss der Nutzung:</p>
            <List
              items={[
                "anonymisiert oder aggregiert werden",
                "für Analyse- und Forschungszwecke weiterverarbeitet werden",
              ]}
            />
            <p>
              Eine Weiterverarbeitung erfolgt nur, wenn kein Rückschluss auf einzelne Personen mehr
              möglich ist.
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
            <p>Wir verwenden notwendige Cookies und ähnliche Technologien, um:</p>
            <List
              items={[
                "Login-Sessions zu verwalten",
                "Einladungsprozesse technisch umzusetzen",
              ]}
            />
            <p>Diese sind für den Betrieb erforderlich.</p>
          </BulletSection>

          <BulletSection number="17" title="Speicherdauer">
            <p>Wir speichern personenbezogene Daten:</p>
            <List
              items={[
                "solange sie für die Nutzung erforderlich sind",
                "oder gesetzliche Aufbewahrungspflichten bestehen",
              ]}
            />
            <p>
              Anschließend werden personenbezogene Daten gelöscht, soweit keine gesetzlichen
              Aufbewahrungspflichten entgegenstehen. Daten können darüber hinaus anonymisiert oder
              aggregiert weiterverarbeitet werden, sofern danach kein Personenbezug mehr besteht.
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
              entgegenstehen, werden personenbezogene Daten bei Löschung des Accounts gelöscht.
              Gemeinsame Reports und Workbooks der betroffenen Founder-Konstellation werden in der
              aktuellen Produktphase ebenfalls gelöscht.
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
