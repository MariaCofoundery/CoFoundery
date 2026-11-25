import Link from "next/link";

/*
 * AUFBAU SEIT 23.11.2026: Teil A (A1 bis A5) sind Bausteine aus dem kostenlosen Datenschutz-Generator
 * von eRecht24 (PDF vom 23.11.2026), Teil B (1 bis 26) ist eigener Text. Die Quellenzeile
 * „Quelle: https://www.e-recht24.de“ am Ende von A5 muss stehen bleiben. Änderungen am
 * Generator-Text, bewusst und einzeln:
 *   - A1: „Kontaktformular“ ersetzt durch Registrierung und E-Mail (es gibt kein Kontaktformular).
 *   - A2: Hinweis auf Teil B für Supabase, Resend und IONOS ergänzt (der Generator kennt nur Vercel).
 *   - A3: Verantwortliche Stelle mit „Einzelunternehmen“ und Telefon (beruflich, von Maria zur
 *     Veröffentlichung freigegeben); Pflichtangaben unverändert.
 *   - A4: „Telefax“ gestrichen (kein Fax); Verweis auf Teil B, Abschnitt 21 für die Cookie-Liste.
 *   - A5: Satz über Auswertung von Öffnung, IP-Adresse, Geräten und Klicks gestrichen (Messung bei
 *     Resend am 18.11.2026 ausgeschaltet), „Newsletterdiensteanbieter“ durch Resend ersetzt.
 *   - Die Anrede im Generator-Text ist „Sie“, in Teil B „du“. LEGAL REVIEW REQUIRED: angleichen.
 *   - LEGAL REVIEW REQUIRED: allgemeine Beispiele zu Warenkorb, Zahlungsdiensten und Verträgen im
 *     Generator-Text passen nur teilweise (kein Shop); Ton und Dopplungen zwischen A4/A5 und
 *     Teil B (Abschnitte 15b, 21, 22) von der Beratung glätten lassen.
 *
 * ERGÄNZT AM 17.11.2026 (gegen den Code geprüft): Abschnitte 6c (Werte), 11b (Danke und Herz),
 * 15 (Unterabschnitt Erinnerungen), 15b (Newsletter, mit und ohne Konto) und 15c (öffentlicher
 * Blog), dazu Zeilen in 3, 21, 22, 23 und 24. Was nicht belegbar ist
 * (Resend-Einstellungen, Einordnung durch die Rechtsberatung), steht als LEGAL REVIEW REQUIRED.
 *
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
 *   - Newsletter ohne Konto: nie bestätigte Anmeldungen nach 14 Tagen,
 *     purge_stale_newsletter_public (Migration 20270509120000), gleicher Cron.
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
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Teil A enthält allgemeine Hinweise und Pflichtangaben. Er beruht auf dem
              Datenschutz-Generator von eRecht24 (Stand 23.11.2026) und ist an Made2Found
              angepasst. Teil B ist eigener Text und beschreibt das Produkt im Einzelnen.
            </p>
            <p className="mt-2 text-sm text-slate-500">Stand: 23. November 2026</p>
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
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Teil A · Allgemeine Hinweise und Pflichtangaben
          </p>

          <BulletSection number="A1" title="Datenschutz auf einen Blick">
            <Sub>Allgemeine Hinweise</Sub>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
            </p>
            <Sub>Datenerfassung auf dieser Website</Sub>
            <Sub>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</Sub>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur verantwortlichen Stelle“ in dieser Datenschutzerklärung entnehmen.
            </p>
            <Sub>Wie erfassen wir Ihre Daten?</Sub>
            <p>
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie bei der Registrierung eingeben oder uns per E-Mail senden.
            </p>
            <p>
              Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.
            </p>
            <Sub>Wofür nutzen wir Ihre Daten?</Sub>
            <p>
              Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden. Sofern über die Website Verträge geschlossen oder angebahnt werden können, werden die übermittelten Daten auch für Vertragsangebote, Bestellungen oder sonstige Auftragsanfragen verarbeitet.
            </p>
            <Sub>Welche Rechte haben Sie bezüglich Ihrer Daten?</Sub>
            <p>
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
            </p>
            <p>
              Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.
            </p>
          </BulletSection>

          <BulletSection number="A2" title="Hosting">
            <p>
              Wir hosten die Inhalte unserer Website bei folgendem Anbieter:
            </p>
            <Sub>Externes Hosting</Sub>
            <p>
              Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.
            </p>
            <p>
              Das externe Hosting erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren potenziellen und bestehenden Kunden (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO). Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG, soweit die Einwilligung die Speicherung von Cookies oder den Zugriff auf Informationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des TDDDG umfasst. Die Einwilligung ist jederzeit widerrufbar.
            </p>
            <p>
              Unser(e) Hoster wird bzw. werden Ihre Daten nur insoweit verarbeiten, wie dies zur Erfüllung seiner Leistungspflichten erforderlich ist und unsere Weisungen in Bezug auf diese Daten befolgen.
            </p>
            <p>
              Wir setzen folgende(n) Hoster ein:
            </p>
            <p>
              Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA
              <br />
              Datenschutzkontakt: privacy@vercel.com
              <br />
              EU-Vertreter: EDPO (European Data Protection Office), Avenue Huart Hamoir 71, 1030 Brüssel, Belgien
              <br />
              Zweck und Daten: Hosting, Serverfunktionen und Zeitpläne. Verarbeitet werden Aufrufe, IP-Adresse und Protokolle.
              <br />
              Serverstandort: London, Vereinigtes Königreich (Region lhr1)
              <br />
              Übermittlung in die USA: EU-U.S. Data Privacy Framework (Vercel ist zertifiziert), zusätzlich Standardvertragsklauseln im Vertrag zur Auftragsverarbeitung (vercel.com/legal/dpa)
            </p>
            <Sub>Auftragsverarbeitung</Sub>
            <p>
              Wir haben einen Vertrag über Auftragsverarbeitung (AVV) zur Nutzung des oben genannten Dienstes geschlossen. Hierbei handelt es sich um einen datenschutzrechtlich vorgeschriebenen Vertrag, der gewährleistet, dass dieser die personenbezogenen Daten unserer Websitebesucher nur nach unseren Weisungen und unter Einhaltung der DSGVO verarbeitet.
            </p>
            <p>
              Weitere Dienstleister, etwa für Datenbank, Anmeldung und E-Mail-Versand, nennen wir in Teil B, Abschnitt 3 und 20.
            </p>
          </BulletSection>

          <BulletSection number="A3" title="Allgemeine Hinweise und Pflichtinformationen">
            <Sub>Datenschutz</Sub>
            <p>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>
            <p>
              Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
            </p>
            <p>
              Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.
            </p>
            <Sub>Hinweis zur verantwortlichen Stelle</Sub>
            <p>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>Maria Schulz (Einzelunternehmen)</p>
              <p>Am Juliusturm 89</p>
              <p>13597 Berlin</p>
              <p>Telefon: +49176 76 467099</p>
              <p>E-Mail: hello@cofoundery.de</p>
            </div>
            <p>
              Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
            </p>
            <Sub>Speicherdauer</Sub>
            <p>
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach Fortfall dieser Gründe.
            </p>
            <Sub>Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf dieser Website</Sub>
            <p>
              Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO, sofern besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet werden. Im Falle einer ausdrücklichen Einwilligung in die Übertragung personenbezogener Daten in Drittstaaten erfolgt die Datenverarbeitung außerdem auf Grundlage von Art. 49 Abs. 1 lit. a DSGVO. Sofern Sie in die Speicherung von Cookies oder in den Zugriff auf Informationen in Ihr Endgerät (z. B. via Device-Fingerprinting) eingewilligt haben, erfolgt die Datenverarbeitung zusätzlich auf Grundlage von § 25 Abs. 1 TDDDG. Die Einwilligung ist jederzeit widerrufbar. Sind Ihre Daten zur Vertragserfüllung oder zur Durchführung vorvertraglicher Maßnahmen erforderlich, verarbeiten wir Ihre Daten auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Des Weiteren verarbeiten wir Ihre Daten, sofern diese zur Erfüllung einer rechtlichen Verpflichtung erforderlich sind, auf Grundlage von Art. 6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann ferner auf Grundlage unseres berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO erfolgen. Über die jeweils im Einzelfall einschlägigen Rechtsgrundlagen wird in den folgenden Absätzen dieser Datenschutzerklärung informiert.
            </p>
            <Sub>Empfänger von personenbezogenen Daten</Sub>
            <p>
              Im Rahmen unserer Geschäftstätigkeit arbeiten wir mit verschiedenen externen Stellen zusammen. Dabei ist teilweise auch eine Übermittlung von personenbezogenen Daten an diese externen Stellen erforderlich. Wir geben personenbezogene Daten nur dann an externe Stellen weiter, wenn dies im Rahmen einer Vertragserfüllung erforderlich ist, wenn wir gesetzlich hierzu verpflichtet sind (z. B. Weitergabe von Daten an Steuerbehörden), wenn wir ein berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO an der Weitergabe haben oder wenn eine sonstige Rechtsgrundlage die Datenweitergabe erlaubt. Beim Einsatz von Auftragsverarbeitern geben wir personenbezogene Daten unserer Kunden nur auf Grundlage eines gültigen Vertrags über Auftragsverarbeitung weiter. Im Falle einer gemeinsamen Verarbeitung wird ein Vertrag über gemeinsame Verarbeitung geschlossen.
            </p>
            <Sub>Widerruf Ihrer Einwilligung zur Datenverarbeitung</Sub>
            <p>
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
            </p>
            <Sub>Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen sowie gegen Direktwerbung (Art. 21 DSGVO)</Sub>
            <p>
              WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F DSGVO ERFOLGT, HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS IHRER BESONDEREN SITUATION ERGEBEN, GEGEN DIE VERARBEITUNG IHRER PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN; DIES GILT AUCH FÜR EIN AUF DIESE BESTIMMUNGEN GESTÜTZTES PROFILING. DIE JEWEILIGE RECHTSGRUNDLAGE, AUF DENEN EINE VERARBEITUNG BERUHT, ENTNEHMEN SIE DIESER DATENSCHUTZERKLÄRUNG. WENN SIE WIDERSPRUCH EINLEGEN, WERDEN WIR IHRE BETROFFENEN PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN, WIR KÖNNEN ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG NACHWEISEN, DIE IHRE INTERESSEN, RECHTE UND FREIHEITEN ÜBERWIEGEN ODER DIE VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER VERTEIDIGUNG VON RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1 DSGVO).
            </p>
            <p>
              WERDEN IHRE PERSONENBEZOGENEN DATEN VERARBEITET, UM DIREKTWERBUNG ZU BETREIBEN, SO HABEN SIE DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE VERARBEITUNG SIE BETREFFENDER PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG EINZULEGEN; DIES GILT AUCH FÜR DAS PROFILING, SOWEIT ES MIT SOLCHER DIREKTWERBUNG IN VERBINDUNG STEHT. WENN SIE WIDERSPRECHEN, WERDEN IHRE PERSONENBEZOGENEN DATEN ANSCHLIESSEND NICHT MEHR ZUM ZWECKE DER DIREKTWERBUNG VERWENDET (WIDERSPRUCH NACH ART. 21 ABS. 2 DSGVO).
            </p>
            <Sub>Beschwerderecht bei der zuständigen Aufsichtsbehörde</Sub>
            <p>
              Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
            </p>
            <Sub>Recht auf Datenübertragbarkeit</Sub>
            <p>
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch machbar ist.
            </p>
            <Sub>Auskunft, Berichtigung und Löschung</Sub>
            <p>
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit an uns wenden.
            </p>
            <Sub>Recht auf Einschränkung der Verarbeitung</Sub>
            <p>
              Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Hierzu können Sie sich jederzeit an uns wenden. Das Recht auf Einschränkung der Verarbeitung besteht in folgenden Fällen:
            </p>
            <List
              items={[
                "Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten personenbezogenen Daten bestreiten, benötigen wir in der Regel Zeit, um dies zu überprüfen. Für die Dauer der Prüfung haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.",
                "Wenn die Verarbeitung Ihrer personenbezogenen Daten unrechtmäßig geschah/geschieht, können Sie statt der Löschung die Einschränkung der Datenverarbeitung verlangen.",
                "Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie sie jedoch zur Ausübung, Verteidigung oder Geltendmachung von Rechtsansprüchen benötigen, haben Sie das Recht, statt der Löschung die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.",
                "Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt haben, muss eine Abwägung zwischen Ihren und unseren Interessen vorgenommen werden. Solange noch nicht feststeht, wessen Interessen überwiegen, haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.",
              ]}
            />
            <p>
              Wenn Sie die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt haben, dürfen diese Daten – von ihrer Speicherung abgesehen – nur mit Ihrer Einwilligung oder zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen oder zum Schutz der Rechte einer anderen natürlichen oder juristischen Person oder aus Gründen eines wichtigen öffentlichen Interesses der Europäischen Union oder eines Mitgliedstaats verarbeitet werden.
            </p>
            <Sub>SSL- bzw. TLS-Verschlüsselung</Sub>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie an uns als Seitenbetreiber senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://“ auf „https://“ wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
            </p>
            <p>
              Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns übermitteln, nicht von Dritten mitgelesen werden.
            </p>
            <Sub>Widerspruch gegen Werbe-E-Mails</Sub>
            <p>
              Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten zur Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit widersprochen. Die Betreiber der Seiten behalten sich ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung von Werbeinformationen, etwa durch Spam-E-Mails, vor.
            </p>
          </BulletSection>

          <BulletSection number="A4" title="Datenerfassung auf dieser Website">
            <Sub>Cookies</Sub>
            <p>
              Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch gelöscht. Permanente Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese selbst löschen oder eine automatische Löschung durch Ihren Webbrowser erfolgt.
            </p>
            <p>
              Cookies können von uns (First-Party-Cookies) oder von Drittunternehmen stammen (sog. Third-Party-Cookies). Third-Party-Cookies ermöglichen die Einbindung bestimmter Dienstleistungen von Drittunternehmen innerhalb von Webseiten (z. B. Cookies zur Abwicklung von Zahlungsdienstleistungen).
            </p>
            <p>
              Cookies haben verschiedene Funktionen. Zahlreiche Cookies sind technisch notwendig, da bestimmte Webseitenfunktionen ohne diese nicht funktionieren würden (z. B. die Warenkorbfunktion oder die Anzeige von Videos). Andere Cookies können zur Auswertung des Nutzerverhaltens oder zu Werbezwecken verwendet werden.
            </p>
            <p>
              Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs, zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen (z. B. für die Warenkorbfunktion) oder zur Optimierung der Website (z. B. Cookies zur Messung des Webpublikums) erforderlich sind (notwendige Cookies), werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine andere Rechtsgrundlage angegeben wird. Der Websitebetreiber hat ein berechtigtes Interesse an der Speicherung von notwendigen Cookies zur technisch fehlerfreien und optimierten Bereitstellung seiner Dienste. Sofern eine Einwilligung zur Speicherung von Cookies und vergleichbaren Wiedererkennungstechnologien abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage dieser Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG); die Einwilligung ist jederzeit widerrufbar.
            </p>
            <p>
              Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und Cookies nur im Einzelfall erlauben, die Annahme von Cookies für bestimmte Fälle oder generell ausschließen sowie das automatische Löschen der Cookies beim Schließen des Browsers aktivieren. Bei der Deaktivierung von Cookies kann die Funktionalität dieser Website eingeschränkt sein.
            </p>
            <p>
              Sofern weitere Cookies und Dienste auf dieser Website eingesetzt werden, können Sie dies dieser Datenschutzerklärung entnehmen. Welche Cookies Made2Found setzt, steht in Teil B, Abschnitt 21.
            </p>
            <Sub>Server-Log-Dateien</Sub>
            <p>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
            </p>
            <List
              items={[
                "Browsertyp und Browserversion",
                "verwendetes Betriebssystem",
                "Referrer URL",
                "Hostname des zugreifenden Rechners",
                "Uhrzeit der Serveranfrage",
                "IP-Adresse",
              ]}
            />
            <p>
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
            </p>
            <p>
              Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat ein berechtigtes Interesse an der technisch fehlerfreien Darstellung und der Optimierung seiner Website – hierzu müssen die Server-Log-Files erfasst werden.
            </p>
            <Sub>Anfrage per E-Mail oder Telefon</Sub>
            <p>
              Wenn Sie uns per E-Mail oder Telefon kontaktieren, wird Ihre Anfrage inklusive aller daraus hervorgehenden personenbezogenen Daten (Name, Anfrage) zum Zwecke der Bearbeitung Ihres Anliegens bei uns gespeichert und verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
            <p>
              Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sofern diese abgefragt wurde; die Einwilligung ist jederzeit widerrufbar.
            </p>
            <p>
              Die von Ihnen an uns per Kontaktanfragen übersandten Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihres Anliegens). Zwingende gesetzliche Bestimmungen – insbesondere gesetzliche Aufbewahrungsfristen – bleiben unberührt.
            </p>
          </BulletSection>

          <BulletSection number="A5" title="Newsletter">
            <Sub>Newsletterdaten</Sub>
            <p>
              Wenn Sie den auf der Website angebotenen Newsletter beziehen möchten, benötigen wir von Ihnen eine E-Mail-Adresse sowie Informationen, welche uns die Überprüfung gestatten, dass Sie der Inhaber der angegebenen E-Mail-Adresse sind und mit dem Empfang des Newsletters einverstanden sind. Diese Daten verwenden wir für den Versand der angeforderten Informationen und geben diese nicht an Dritte weiter. Der Versand läuft über unseren E-Mail-Dienstleister Resend (Teil B, Abschnitt 3). Eine Öffnungs- oder Klickmessung findet nicht statt.
            </p>
            <p>
              Die Verarbeitung der in das Newsletteranmeldeformular eingegebenen Daten erfolgt ausschließlich auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Die erteilte Einwilligung zur Speicherung der Daten, der E-Mail-Adresse sowie deren Nutzung zum Versand des Newsletters können Sie jederzeit widerrufen, etwa über den „Austragen“-Link im Newsletter. Die Rechtmäßigkeit der bereits erfolgten Datenverarbeitungsvorgänge bleibt vom Widerruf unberührt.
            </p>
            <p>
              Die von Ihnen zum Zwecke des Newsletter-Bezugs bei uns hinterlegten Daten werden von uns bis zu Ihrer Austragung aus dem Newsletter gespeichert und nach der Abbestellung des Newsletters oder nach Zweckfortfall aus der Newsletterverteilerliste gelöscht. Wir behalten uns vor, E-Mail-Adressen aus unserem Newsletterverteiler nach eigenem Ermessen im Rahmen unseres berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO zu löschen oder zu sperren.
            </p>
            <p>
              Daten, die zu anderen Zwecken bei uns gespeichert wurden, bleiben hiervon unberührt.
            </p>
            <p>
              Nach Ihrer Austragung aus der Newsletterverteilerliste wird Ihre E-Mail-Adresse bei uns ggf. in einer Blacklist gespeichert, sofern dies zur Verhinderung künftiger Mailings erforderlich ist. Die Daten aus der Blacklist werden nur für diesen Zweck verwendet und nicht mit anderen Daten zusammengeführt. Dies dient sowohl Ihrem Interesse als auch unserem Interesse an der Einhaltung der gesetzlichen Vorgaben beim Versand von Newslettern (berechtigtes Interesse im Sinne des Art. 6 Abs. 1 lit. f DSGVO). Die Speicherung in der Blacklist ist zeitlich nicht befristet. Sie können der Speicherung widersprechen, sofern Ihre Interessen unser berechtigtes Interesse überwiegen.
            </p>
            <p>
              Ausführlich beschreiben wir den Newsletter, auch die Anmeldung ohne Konto, in Teil B, Abschnitt 15b.
            </p>
            <p>
              Quelle:{" "}
              <a href="https://www.e-recht24.de" className="underline" target="_blank" rel="noopener noreferrer">
                https://www.e-recht24.de
              </a>
            </p>
          </BulletSection>

          <p className="pt-4 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Teil B · So funktioniert Made2Found
          </p>

          <BulletSection number="1" title="Verantwortlicher">
            <p>Verantwortlich für die Datenverarbeitung bei Made2Found ist:</p>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p>Maria Schulz (Einzelunternehmen)</p>
              <p>Am Juliusturm 89</p>
              <p>13597 Berlin</p>
              <p>Telefon: +49176 76 467099</p>
              <p>E-Mail: hello@cofoundery.de</p>
            </div>
            <p>
              Made2Found ist der neue Name von CoFoundery. Die E-Mail-Adresse
              hello@cofoundery.de gilt weiterhin.
            </p>
            <p>
              Made2Found wird als Einzelunternehmen betrieben und ist derzeit nicht kommerziell:
              Es gibt keine Einnahmen und keine Werbung. Das kann sich künftig ändern, etwa durch
              kostenpflichtige Tarife. Wir passen diese Erklärung dann rechtzeitig an.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Absatz zur Betriebsart am 23.11.2026 auf Wunsch eingefügt. Ob er
              in die Datenschutzerklärung, das Impressum oder die Nutzungsbedingungen gehört, klärt
              die Beratung.
            */}
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
            <p>
              Made2Found richtet sich an Menschen ab 18 Jahren. Wir verarbeiten wissentlich keine
              Daten von Personen unter 18 Jahren. Wird uns bekannt, dass sich eine Person unter 18
              registriert hat, löschen wir das Konto.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Mindestalter 18 am 23.11.2026 eingefügt. Die Nutzungsbedingungen
              mit demselben Satz stehen noch aus; eine Bestätigung bei der Registrierung ist nicht
              gebaut. Art. 8 DSGVO (16 Jahre in Deutschland) und Wirksamkeit der Aussage klären.
            */}
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
                "Resend – Versand von E-Mails aus dem Produkt, z. B. Anmelde-Mails, Einladungen, Benachrichtigungen und der Newsletter. Der Versand läuft über die Region Irland (EU).",
              ]}
            />
            <p>
              Wenn du Mitteilungen aufs Gerät (Push) aktivierst, werden diese über den Push-Dienst
              deines Browser- bzw. Betriebssystemanbieters zugestellt, z. B. Apple, Google, Mozilla
              oder Microsoft (siehe Abschnitt 15).
            </p>
            <p>
              Für Gespräche nutzen wir Zoom (Abschnitt 20b). Weitere externe Dienste, an die im
              laufenden Betrieb Nutzerdaten gehen, setzen wir nicht ein. Schriftarten liefern wir selbst aus; es werden keine Inhalte von
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
              Supabase, die Anmelde-E-Mails verschicken wir über Resend.
            </p>
            <List
              items={[
                "verarbeitet werden deine E-Mail-Adresse, der Anmeldezeitpunkt und technische Sitzungsdaten",
                "die Sprache, in der du Made2Found nutzt, damit die Anmelde-E-Mail in dieser Sprache ankommt",
                "nach der Anmeldung halten Sitzungs-Cookies dich angemeldet (Abschnitt 21)",
                "die E-Mail-Adresse ist für die Registrierung erforderlich; ohne sie können wir kein Konto bereitstellen",
                "wir speichern diese Daten, solange dein Konto besteht; du kannst es jederzeit in deinen Kontoeinstellungen löschen (Abschnitt 24)",
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

          <BulletSection number="6c" title="Werte">
            <p>
              Im Bereich „Werte“ wählst du drei bis fünf Werte, die dir wichtig sind, aus einem
              Katalog oder mit einem eigenen Begriff, in deiner Reihenfolge. Du kannst jedem Wert
              ein paar eigene Worte dazuschreiben und optional kurz notieren, woran du merkst, dass ein Wert verletzt wird.
              Es gibt keine Punkte und keinen Vergleich von Plätzen.
            </p>
            <List
              items={[
                "Gespeichert werden die Werte mit Platz, Begriff, deinen Worten (bis 200 Zeichen), die Notiz (bis 300 Zeichen) und deine Einstellungen zur Freigabe.",
                "Standard: Niemand sieht sie. Zwei getrennte Freigaben: (1) mit einem bestimmten Team teilen, (2) die Begriffe in deinem CONNECT-Profil zeigen. Ein Teambeitritt, ein Programm oder ein CONNECT-Profil gibt nichts frei.",
                "Teilst du mit einem Team, sehen die Mitglieder dieses Teams deine Werte nebeneinander mit denen der anderen, die ebenfalls geteilt haben. Verlässt du das Team, endet die Freigabe für dieses Team.",
                "Advisors und Organisationen sehen Werte nie.",
                "Beim Löschen deines Kontos werden deine Werte und Freigaben gelöscht.",
              ]}
            />
            <p>
              Rechtsgrundlage ist die Bereitstellung des Produkts (Art. 6 Abs. 1 lit. b DSGVO) und,
              soweit du etwas teilst oder im Profil zeigst, deine Entscheidung dazu (Art. 6 Abs. 1
              lit. a DSGVO), die du jederzeit zurücknehmen kannst.
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
            <p>
              Im Teamraum einer Organisation tragen ihre Mitglieder Aufgaben, Seiten, Kommentare, ihre Rolle
              im Team und Abwesenheiten mit Vertretung ein. Das sehen nur die aktiven Mitglieder
              dieser Organisation, nie die Teams im Programm. Eigene Notizen sieht nur, wer sie schreibt – auch nicht die Führung –, bis sie mit dem Team geteilt werden. Hängt eine Aufgabe an einem Team im
              Programm, sehen den Namen des Teams nur Mitglieder, die dieses Team ohnehin betreuen.
              Im Social-Media-Kalender plant das Team Postings und Kampagnen; veröffentlicht wird dort nichts, und Teams im Programm sehen ihn nicht. Im Chat des Teamraums lesen alle aktiven Mitglieder den Teamchat, eigene Gruppen nur deren Mitglieder und Direktchats nur die beiden Beteiligten. Bilder und Dateien (höchstens 10 MB) liegen in einem nicht öffentlichen Speicher und sind nur für die Beteiligten des Chats abrufbar; Reaktionen sehen alle im Chat. Eine eigene Nachricht lässt sich samt Datei zurücknehmen, mit dem Konto gehen die eigenen Nachrichten, Dateien und Reaktionen. Mitteilungen aufs Gerät zum Chat nennen nie den Text. Endet eine Mitgliedschaft, verlieren ihre Aufgaben die Zuständigkeit und ihre Angabe zu
              Rolle und Abwesenheit wird gelöscht; mit dem Konto gehen auch die eigenen Kommentare.
            </p>
            <p>
              Im Bereich Events stehen Termine aus deinem Programm und aus dem Startup-Ökosystem – nur Fakten
              (Titel, Zeit, Ort, Veranstalter, Link zur offiziellen Seite), aus Quellen, die wir nutzen dürfen,
              oder von Mitgliedern einer Organisation eingetragen und von uns vor der Veröffentlichung geprüft.
              Bei einem Vorschlag speichern wir, wer ihn eingereicht hat und für welche Organisation; den Namen
              der Person sieht niemand außer dir und den Plattform-Admins. Was du dir merkst, siehst nur du. Mit
              dem Konto geht das Gemerkte; eingereichte Termine bleiben ohne Bezug zu dir stehen. Termine, die
              länger als 60 Tage vorbei sind, löschen wir automatisch.
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
                "Wenn die Organisation die Funktion „Erfolge“ einschaltet (sie ist freiwillig und standardmäßig aus), können dein Team und die Organisation Ergebnisse eintragen (zum Beispiel „Gesellschaft gegründet“) und dazu je einen kurzen Satz schreiben. Die Organisation bestätigt die Einträge, bestätigte geben Sterne. Die Organisation kann Belohnungen für Sternzahlen festlegen. Alles gehört deinem Team, es gibt keinen Vergleich mit anderen Teams, und es wird gelöscht, sobald dein Team das Programm verlässt.",
                "Dein Team und die Organisation halten Gespräche zum Stand mit Datum, Zusammenfassung und nächstem Termin fest – auch ohne die Funktion „Erfolge“. Sie sehen dein Team, die Bezugspersonen und die Inhaberinnen und Inhaber; gelöscht werden sie, sobald dein Team das Programm verlässt.",
                "Ist die Organisation öffentlich gefördert, kann sie unter „Förderauflagen“ zählen, ob ihr Programm die Auflagen erfüllt – zum Beispiel wie oft dein Team an Veranstaltungen teilgenommen hat oder wie viele Gespräche zum Stand es gab, dazu Nachweise wie Coaching-Stunden. Für den Bericht an den Geldgeber kann die Führung der Organisation diesen Stand festhalten. Ein festgehaltener Stand enthält den Namen deines Teams und diese Zahlen, keine Inhalte aus Gesprächen oder Updates, und bleibt erhalten, auch wenn dein Team das Programm verlässt, bis die Organisation ihn löscht.",
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

          <BulletSection number="11b" title="Danke und Herz in CONNECT">
            <p>
              In CONNECT kannst du Mitgliedern danken, die dir geholfen haben, auch ohne vorheriges
              Gespräch (etwa von einem Profil, einem Gesuch, einem Problem oder einem Unternehmen
              aus). Das Herz ist ein Zeichen, keine Zahl: Es erscheint auf Profilen und Karten, wenn
              eine Person schon mindestens einmal Dank bekommen hat. Wir zählen, listen oder
              sortieren Danksagungen nicht.
            </p>
            <List
              items={[
                "Gespeichert werden: wer wem gedankt hat, wobei geholfen wurde (z. B. Wissen, Feedback, Kontakt, Zeit), was daraus wurde (freiwillig: Treffen, Vermittlung, noch offen), freiwillig ein paar Worte (bis 280 Zeichen), woran sich der Dank knüpft (z. B. ein Profil oder ein Gesuch) und der Zeitpunkt.",
                "Deine Worte sind privat, bis du sie ausdrücklich für das Profil der anderen Person freigibst. Die Person, der gedankt wurde, kann einen freigegebenen Dank jederzeit ausblenden. Auf einem Profil zeigen wir höchstens drei freigegebene Danksagungen, mit dem Vornamen der dankenden Person, für angemeldete Personen.",
                "Die Person, der du dankst, bekommt einen Hinweis in der App ohne deinen Text. Dazu kann eine Mail und eine Mitteilung aufs Gerät kommen, wenn sie diese Art Benachrichtigung eingeschaltet hat; sie nennen deinen Vornamen und nie deine Worte.",
                "Grenzen gegen Missbrauch: Je Person einmal in 90 Tagen, höchstens fünf direkte Danksagungen am Tag, nicht an dich selbst, nicht an Blockierte und nur an Mitglieder mit aktivem Profil.",
                "Löschst du dein Konto oder die andere Person ihres, wird der gemeinsame Dank gelöscht (Abschnitt 24).",
              ]}
            />
            <p>
              Rechtsgrundlage ist die Bereitstellung des Produkts (Art. 6 Abs. 1 lit. b DSGVO); die
              Freigabe deiner Worte für ein Profil beruht auf deiner Einwilligung (Art. 6 Abs. 1
              lit. a DSGVO), die du über das Ausblenden bzw. deine Löschwünsche zurücknehmen kannst.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Die Einwilligung zur Freigabe der Worte fürs Profil wird bei
              der dankenden Person abgefragt (show_on_profile); die Person, der gedankt wird, kann
              ausblenden (helper_hidden). Prüfen, ob die Rollenverteilung im Text so ausreicht.
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
            <p>
              Rechtsgrundlage ist, dass du die Vorschläge an der jeweiligen Stelle ausdrücklich
              anforderst und wir damit deinen Auftrag ausführen (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
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
              Einladungen. Benachrichtigungen per E-Mail, etwa zu Kontaktanfragen, Nachrichten oder
              Vorstellungsanfragen, bekommst du, bis du sie in deinem Konto abbestellst. Mails zu
              neuen Vorschlägen, zu fälligen Check-ins und zu Programm-Updates schicken wir nur,
              wenn du sie ausdrücklich eingeschaltet hast.
              Benachrichtigungen enthalten in der Regel nur, dass etwas passiert ist, und den Namen
              der beteiligten Person – nicht den Inhalt von Nachrichten.
            </p>
            <Sub>Erinnerungen</Sub>
            <p>
              Neben dem Newsletter (Abschnitt 15b) schicken wir drei Arten von Erinnerungen. Sie
              nennen immer nur, dass etwas ansteht, nicht den Inhalt und keine Namen von Teams oder
              Organisationen.
            </p>
            <List
              items={[
                "Erinnerungen nach dem Einstieg: nur mit deiner ausdrücklichen Zustimmung (auf der Willkommensseite „Erinnere mich morgen“ oder die einmalige Frage nach dem ersten Erfolg im Fragebogen; ein „Nein danke“ wird festgehalten, damit wir nicht noch einmal fragen). Höchstens zwei Mails, nach etwa einem und nach etwa drei Tagen, und nur, solange in deinem Profil oder in den von dir gewählten Bereichen noch etwas offen ist. Die Mail führt zum nächsten offenen Schritt. Gespeichert werden deine Zustimmung mit Zeitpunkt, die Quelle und die Zeitpunkte der gesendeten Mails. Abmelden geht mit einem Klick in der Mail, auch ohne Anmeldung.",
                "Erinnerungen an fällige Team-Check-ins: eine Mitteilung aufs Gerät (wenn du Push eingeschaltet hast und die Art nicht abbestellt ist) und eine Mail nur mit deiner ausdrücklichen Zustimmung im Konto. Höchstens eine Erinnerung je Person, Team und Fälligkeit; wir speichern dafür einen Vermerk, dass sie gesendet wurde.",
                "Erinnerungen an Programm-Updates (nur bei aktivem Programm einer Organisation, an dem dein Team teilnimmt): zwei Tage vor Fälligkeit ein Hinweis im Postfach der App; Mitteilung aufs Gerät und Mail nur, wenn du sie eingeschaltet hast.",
              ]}
            />
            <p>
              Rechtsgrundlage für Erinnerungs-Mails und Push ist deine Einwilligung (Art. 6 Abs. 1
              lit. a DSGVO, bei Push zusätzlich § 25 Abs. 1 TDDDG), für Hinweise in der App die
              Bereitstellung des Produkts (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
            <Sub>Mitteilungen aufs Gerät (Push)</Sub>
            <p>
              Push-Mitteilungen sind aus, bis du sie in deinem Konto ausdrücklich einschaltest und
              in deinem Browser erlaubst. Dann speichern wir die Zustelladresse deines Browsers,
              die zugehörigen Schlüssel, eine gekürzte Browserkennung und den Zeitpunkt der letzten
              Nutzung.
              Stellst du Feierabend-Zeiten ein, speichern wir Zeitfenster, Tage, deine Zeitzone und
              einen Schnellschalter; in dieser Zeit schicken wir keine Mitteilung aufs Gerät, Hinweise
              in der App bleiben.
            </p>
            <p>
              Mit dem Rhythmus in deinem Konto legst du fest, wie Hinweise ankommen: gebündelt,
              sofort oder ruhig. Dafür speichern wir diese Einstellung, ob die Zahl am App-Symbol
              angezeigt werden soll, und den Zeitpunkt der letzten Morgenübersicht. Bei „gebündelt“
              zählen wir kurzzeitig mit, wie viele Mitteilungen im laufenden Drei-Stunden-Fenster
              an dich gegangen sind, damit mehrere zu einer werden. Die Morgenübersicht ist eine
              E-Mail mit Art und Anzahl wartender Hinweise, nie mit Namen oder Inhalten. Ohne
              Einstellung gilt „gebündelt“.
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

          <BulletSection number="15b" title="Newsletter">
            <p>
              Wir verschicken einen Newsletter, etwa alle zwei Wochen. Er ist freiwillig und nie
              vorangekreuzt. Du kannst dich auf zwei Wegen anmelden: in der App mit deinem Konto
              oder ohne Konto über den Blog, nur mit deiner E-Mail-Adresse. Die beiden Listen sind
              getrennt. Eine Anmeldung ohne Konto macht dich nicht zum Mitglied und schaltet in
              keinem Konto etwas frei; umgekehrt gilt deine Anmeldung als Mitglied nur für die
              Mitglieder-Liste.
            </p>
            <Sub>Anmeldung mit Konto</Sub>
            <List
              items={[
                "Wir speichern deine Entscheidung (angefragt, bestätigt, abgemeldet), die Zeitpunkte und wo du dich angemeldet hast (Willkommensseite, Einstellungen oder Startseite).",
                "Die Sprache der Mails richtet sich nach der Sprache deines Kontos.",
                "Abmelden kannst du dich in deinen Kontoeinstellungen oder mit einem Klick in jeder Mail.",
                "Löschst du dein Konto, wird auch diese Anmeldung gelöscht (Abschnitt 24).",
              ]}
            />
            <Sub>Anmeldung ohne Konto (Blog)</Sub>
            <List
              items={[
                "Wir speichern deine E-Mail-Adresse (klein geschrieben), die Sprache des Beitrags, auf dem du dich eingetragen hast, die Zeitpunkte von Anfrage, Bestätigung und Abmeldung, den Zeitpunkt der Willkommensmail und die Quelle (Blog).",
                "In unserer Datenbank speichern wir dabei keine IP-Adresse, wir setzen kein Cookie und verknüpfen die Adresse nicht mit einem Konto. Die technisch notwendigen Verbindungsdaten bei den Hosting-Diensten (Abschnitt 22) bleiben davon unberührt.",
                "Double-Opt-in: Nach dem Eintragen schicken wir dir eine Mail mit einem Bestätigungslink. Erst wenn du dort auf den Knopf klickst, gilt die Anmeldung. Das Öffnen des Links allein ändert nichts. Den Zeitpunkt der Bestätigung speichern wir als Nachweis deiner Einwilligung.",
                "Nie bestätigte Anfragen löschen wir nach 14 Tagen automatisch.",
                "Gegen automatische Eintragungen schützen ein verstecktes Formularfeld und eine Begrenzung der Anfragen pro Stunde (insgesamt, nicht pro Person). Dafür werden keine IP-Adressen gespeichert.",
              ]}
            />
            <Sub>Willkommensmail, Abmeldung und Sperre</Sub>
            <p>
              Nach der Bestätigung schicken wir einmal eine Willkommensmail, bei beiden Wegen. Sie
              weist auf die App hin; ein Konto ist freiwillig und für den Newsletter nicht nötig.
              Jede Ausgabe enthält einen Link, mit dem du dich mit einem Klick abmeldest (auch
              ohne Konto). Danach schicken wir dir nichts mehr. Bei der Anmeldung ohne Konto
              bleibt deine Adresse danach als Sperre gespeichert, damit dich niemand ungewollt
              wieder anschreibt. Schreib uns, wenn wir auch diesen Eintrag löschen sollen.
            </p>
            <Sub>Inhalt und Versand</Sub>
            <List
              items={[
                "Der Newsletter enthält Gedanken und Geschichten sowie manchmal Einträge aus dem Netzwerk. Einträge aus CONNECT erscheinen nur, wenn die einstellende Person bei ihrem Eintrag „darf in Mails erscheinen“ gesetzt hat (Standard: aus), und ohne Namen.",
                "Der Versand läuft über Resend (Abschnitt 3). Wir bauen kein Zählpixel und keine Link-Verfolgung in die Mails ein.",
                "Die Sprache einer Ausgabe ist Deutsch oder Englisch; du bekommst die Ausgaben in der Sprache deines Kontos bzw. des Beitrags, auf dem du dich angemeldet hast.",
              ]}
            />
            <p>
              Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 7 Abs. 2 Nr. 3
              UWG). Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen. Die Sperre
              nach einer Abmeldung speichern wir auf Grundlage unseres berechtigten Interesses,
              deinen Widerruf zu beachten (Art. 6 Abs. 1 lit. f DSGVO).
            </p>
            {/*
              LEGAL REVIEW REQUIRED:
              - Resend: Öffnungs- und Klickverfolgung (open/click tracking) ist im Repo nicht
                steuerbar; im Resend-Dashboard für die Absender-Domain ausgeschaltet bestätigen,
                bevor der Satz „kein Zählpixel, keine Link-Verfolgung“ veröffentlicht wird
                (der Code baut weder Pixel noch umgeschriebene Links ein).
              - Einordnung der Sperrliste (Art. 6 Abs. 1 lit. f) und der Speicherung des
                Bestätigungszeitpunkts als Nachweis (Art. 7 Abs. 1 DSGVO).
              - Hinweistext zum Newsletter direkt am Eintragefeld (Blog) auf Vollständigkeit prüfen.
              - Zusage, dass Zitate aus Danke-Nachrichten nur mit Erlaubnis erscheinen: im Code
                nicht erzwungen (Handarbeit im Newsletter-Editor), deshalb nicht im Text.
            */}
          </BulletSection>

          <BulletSection number="15c" title="Der öffentliche Blog">
            <p>
              Der Blog unter /blog ist öffentlich lesbar, ohne Konto und ohne Anmeldung. Er liest
              keine Daten aus Konten, Teams oder Forschung und zeigt keine Mitgliederdaten.
            </p>
            <List
              items={[
                "Der Blog setzt keine Cookies, nutzt keine Analyse- oder Marketing-Dienste und lädt keine Skripte von Dritten. Deshalb gibt es dort keinen Cookie-Banner.",
                "Beim Aufruf entstehen die technisch notwendigen Verbindungsdaten wie bei jeder Seite (Abschnitt 22).",
                "Bilder in Beiträgen und Titelbilder laden aus unserem Dateispeicher bei Supabase (Abschnitt 3). Dabei sieht Supabase deine IP-Adresse und die Adresse des Bildes.",
                "Die Sprache eines Beitrags steht in seiner Adresse bzw. wird vom Beitrag bestimmt; der Blog schreibt dafür nichts in deinen Browser.",
                "Der RSS-Feed des Blogs enthält nur Titel, Kurztext, Datum und Link der Beiträge.",
                "Der Newsletter-Kasten in Beiträgen ist ein Formular für die Anmeldung ohne Konto (Abschnitt 15b). Nur wenn du dort deine E-Mail-Adresse absendest, verarbeiten wir sie.",
              ]}
            />
            {/*
              LEGAL REVIEW REQUIRED: Dass der Blog selbst kein Cookie setzt, ist im Code belegt und
              durch einen Test gesichert. Er liest ein bereits vorhandenes Sprach-Cookie (Abschnitt
              21), um die Standardsprache der Übersicht zu wählen, schreibt aber keines.
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
                "Die aufgerufene Seite speichern wir ohne Kennungen: Statt der Adresse deines Teams steht dort zum Beispiel „/teams/:id“. Adressen mit unbekanntem Anfang speichern wir nicht.",
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
              um dein Anliegen zu bearbeiten. Für unser E-Mail-Postfach nutzen wir IONOS
              (Rechenzentren in Deutschland). Deine Nachricht und die Antwort liegen dort, bis wir
              sie löschen.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Betriebsangabe, im Repo nicht belegbar (Anbieter laut Maria seit
              18.11.2026 IONOS, vorher stand hier Gmail). Vor Veröffentlichung bestätigen.
            */}
          </BulletSection>

          <BulletSection number="20b" title="Zoom (Online-Meetings und Videokonferenzen)">
            <p>
              Wir nutzen das Tool „Zoom“, um Online-Meetings und Videokonferenzen durchzuführen
              (nachfolgend: „Online-Meetings“), zum Beispiel für Gespräche mit Nutzenden, Partnern
              und Advisors. „Zoom“ ist ein Service der Zoom Communications, Inc., die ihren Sitz in
              den USA hat.
            </p>
            <Sub>Verantwortlicher</Sub>
            <p>
              Verantwortlich für die Datenverarbeitung, die im unmittelbaren Zusammenhang mit der
              Durchführung von Online-Meetings steht, sind wir (Abschnitt 1 und Impressum).
              Soweit du die Internetseite von Zoom aufrufst, ist der Anbieter von Zoom für die
              Datenverarbeitung verantwortlich. Ein Aufruf der Internetseite ist für die Nutzung
              von Zoom jedoch nur erforderlich, um dir die Software für die Nutzung von Zoom
              herunterzuladen.
            </p>
            <Sub>Welche Daten werden verarbeitet?</Sub>
            <p>
              Bei der Nutzung von Zoom werden verschiedene Datenarten verarbeitet. Der Umfang der
              Daten hängt dabei auch davon ab, welche Angaben du vor oder bei der Teilnahme an
              einem Online-Meeting machst. Folgende personenbezogene Daten sind Gegenstand der
              Verarbeitung:
            </p>
            <List
              items={[
                "Angaben zum Benutzer: Vorname, Nachname, Telefon (optional), E-Mail-Adresse, Passwort (wenn „Single-Sign-On“ nicht verwendet wird), Profilbild (optional).",
                "Meeting-Metadaten: Thema, Beschreibung (optional), Teilnehmer-IP-Adressen, Geräte- und Hardware-Informationen.",
                "Text-, Audio- und Videodaten: Du hast gegebenenfalls die Möglichkeit, in einem Online-Meeting die Chat-, Fragen- oder Umfragefunktionen zu nutzen. Insoweit werden deine Texteingaben verarbeitet, um sie im Online-Meeting anzuzeigen und gegebenenfalls zu protokollieren. Um die Anzeige von Video und die Wiedergabe von Audio zu ermöglichen, werden während der Dauer des Meetings die Daten vom Mikrofon deines Endgeräts sowie von einer etwaigen Videokamera des Endgeräts verarbeitet. Du kannst die Kamera oder das Mikrofon jederzeit selbst über die Zoom-Anwendungen abschalten bzw. stummstellen.",
                "Bei Aufzeichnungen (optional): MP4-Datei aller Video-, Audio- und Präsentationsaufnahmen, M4A-Datei aller Audioaufnahmen, Textdatei des Chats.",
              ]}
            />
            <Sub>Umfang der Verarbeitung und Aufzeichnungen</Sub>
            <p>
              Wenn wir Online-Meetings aufzeichnen wollen, teilen wir dir das im Vorfeld transparent
              mit und bitten dich – soweit erforderlich – um deine Zustimmung. Die Tatsache der
              Aufzeichnung wird dir zudem in der Zoom-Anwendung angezeigt. Aufzeichnungen erfolgen
              ausschließlich manuell und lokal auf unseren Endgeräten; eine automatische
              Aufzeichnung oder Speicherung in der Cloud findet nicht statt. Eine automatisierte
              Entscheidungsfindung im Sinne des Art. 22 DSGVO kommt nicht zum Einsatz.
            </p>
            <Sub>Rechtsgrundlagen</Sub>
            <p>
              Rechtsgrundlage für die Datenverarbeitung bei der Durchführung von Online-Meetings
              ist Art. 6 Abs. 1 lit. b DSGVO, soweit die Meetings im Rahmen von Vertragsbeziehungen
              (oder zur Anbahnung eines Vertrags) durchgeführt werden. Besteht keine vertragliche
              Beziehung, ist die Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes
              Interesse besteht in diesen Fällen an der effektiven Durchführung von
              Online-Meetings. Wenn wir im Einzelfall deine Einwilligung einholen (z. B. für die
              Aufzeichnung eines Meetings), erfolgt die Verarbeitung auf Grundlage von Art. 6
              Abs. 1 lit. a DSGVO.
            </p>
            <Sub>Empfänger und Weitergabe von Daten</Sub>
            <p>
              Personenbezogene Daten, die im Zusammenhang mit der Teilnahme an Online-Meetings
              verarbeitet werden, geben wir grundsätzlich nicht an Dritte weiter, sofern sie nicht
              gerade zur Weitergabe bestimmt sind. Bitte beachte, dass Inhalte aus Online-Meetings
              wie auch bei persönlichen Besprechungen häufig gerade dazu dienen, Informationen mit
              Kundinnen und Kunden, Interessierten oder Dritten zu kommunizieren, und damit zur
              Weitergabe bestimmt sind.
            </p>
            <p>
              Weiterer Empfänger: Der Anbieter von Zoom erhält notwendigerweise Kenntnis von den
              genannten Daten, soweit dies im Rahmen unseres Auftragsverarbeitungsvertrags (Data
              Processing Addendum) mit Zoom vorgesehen ist.
            </p>
            <Sub>Datenverarbeitung außerhalb der EU</Sub>
            <p>
              Da Zoom ein US-Anbieter ist, erfolgt die Datenverarbeitung teilweise in einem
              Drittland. Dies ist durch einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO, die
              Zertifizierung der Zoom Communications, Inc. unter dem EU-U.S. Data Privacy Framework
              (DPF) sowie die EU-Standardvertragsklauseln abgesichert.
            </p>
            <Sub>Weiterführende Informationen zum Datenschutz bei Zoom</Sub>
            <p>
              Weitere Einzelheiten zur Erhebung und Verarbeitung deiner Daten durch Zoom sowie zu
              deinen Rechten und Einstellungsmöglichkeiten zum Schutz deiner Privatsphäre findest
              du in der Datenschutzerklärung von Zoom unter{" "}
              <a
                href="https://www.zoom.com/de/trust/privacy/privacy-statement/"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.zoom.com/de/trust/privacy/privacy-statement/
              </a>{" "}
              sowie in den speziellen DSGVO-Hinweisen von Zoom unter{" "}
              <a
                href="https://www.zoom.com/de/trust/gdpr/"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.zoom.com/de/trust/gdpr/
              </a>
              .
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Text von Maria am 23.11.2026 eingefügt und in „du“ umgeschrieben;
              Betriebsangaben (nur manuelle, lokale Aufzeichnung; Auftragsverarbeitungsvertrag, DPF
              und Standardvertragsklauseln für ihren Zoom-Tarif) hat sie nach eigener Angabe im
              Zoom-Konto geprüft. Rechtsgrundlagen und Wortlaut von der Beratung prüfen lassen.
              Die Telefon-Einwahl ist bewusst gestrichen (wird nicht genutzt).
            */}
          </BulletSection>

          <BulletSection number="20c" title="LinkedIn-Unternehmensseite">
            <p>
              Wir betreiben eine Unternehmensseite bei LinkedIn. Für Nutzende in der EU ist die
              LinkedIn Ireland Unlimited Company, Dublin, Irland, Anbieter von LinkedIn. Wenn du
              die Seite besuchst oder mit ihr interagierst, verarbeitet LinkedIn Daten über dich,
              auch außerhalb unseres Einflusses.
            </p>
            <p>
              Für die Auswertungen der Seite (Seiten-Insights) sind wir und LinkedIn gemeinsam
              verantwortlich (Art. 26 DSGVO). Grundlage ist das „Page Insights Joint Controller
              Addendum“ von LinkedIn. Wir erhalten nur zusammengefasste Statistiken, keine Daten
              einzelner Besucherinnen und Besucher. Zweck ist Öffentlichkeitsarbeit und die
              Messung der Reichweite. Rechtsgrundlage ist unser berechtigtes Interesse (Art. 6
              Abs. 1 lit. f DSGVO).
            </p>
            <p>
              Informationen zur Verarbeitung durch LinkedIn und zu deinen Rechten findest du in der
              Datenschutzrichtlinie von LinkedIn unter{" "}
              <a
                href="https://www.linkedin.com/legal/privacy-policy"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.linkedin.com/legal/privacy-policy
              </a>
              . Der Besuch unserer eigenen Website setzt keine Verbindung zu LinkedIn voraus.
            </p>
            {/*
              LEGAL REVIEW REQUIRED: Entwurf vom 23.11.2026 nach den Pflichtinhalten aus der Praxis
              (gemeinsame Verantwortlichkeit für Page Insights, Addendum, Zwecke, Rechtsgrundlage,
              Link zur Datenschutzrichtlinie). Nicht geprüft: genaue Anschrift der LinkedIn Ireland
              Unlimited Company, Adresse der Datenschutzrichtlinie, Wortlaut des Addendums
              (legal.linkedin.com leitet auf den Login um), ob die Insights genutzt werden und der
              Impressumslink auf der Unternehmensseite. Instagram erst nach Anlage eintragen.
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
                "Cookie „zuletzt besuchter Bereich“: merkt sich, wo du zuletzt warst, damit du dort weitermachen kannst, gültig 30 Tage.",
                "Anmelde-Hilfe-Cookie: hält deine E-Mail-Adresse zwischen der Eingabe und dem Code fest, gültig eine Stunde.",
                "Kalender-Cookie: merkt sich Bundesland und Ferienwahl im Kalender, gültig ein Jahr.",
                "Oberflächen-Cookies für Advisors: merken das gewählte Programm und eine laufende Einrichtung, nur für die Browsersitzung.",
                "Lokaler Speicher: merkt sich, welche Kurzanleitung du schon gesehen hast und ob die Seitenleiste offen ist; bleibt, bis du die Browserdaten löschst.",
                "Arbeitsbereich-Cookie: merkt sich nur nach einem ausdrücklichen Wechsel, ob du gerade als Founder oder Advisor arbeitest; endet mit der Browsersitzung.",
                "Einladungs-Cookies: halten den Einladungscode während der Anmeldung fest, gültig 15 Minuten.",
                "Event-Cookie: hält deine Event-Teilnahme fest, gültig 7 Tage.",
                "Anmeldung (Sitzungsspeicher): Nach dem Klick auf einen Anmeldelink werden die Anmeldedaten kurz im Sitzungsspeicher des Browsers abgelegt und gleich danach entfernt.",
                "Interview-Entwürfe (lokaler Speicher): Was du in einem Interview tippst, wird bis zum Speichern im Browser zwischengespeichert und nach dem Speichern, beim Absenden, beim Abmelden und bei der Kontolöschung entfernt.",
                "Forschungs-Ablaufkennung (Sitzungsspeicher): nur bei aktiver Forschungsteilnahme eine zufällige Kennung für einen Ablauf; ohne Teilnahme wird sie entfernt.",
                "Service Worker: nur wenn du Push-Mitteilungen einschaltest, um sie anzuzeigen; er speichert keine Seiten zwischen.",
                "Blog und Newsletter-Anmeldung ohne Konto setzen keine Cookies und keinen Browserspeicher (Abschnitte 15b und 15c).",
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
              Betrieb, Fehlersuche und Sicherheit (Art. 6 Abs. 1 lit. f DSGVO). Das gilt auch für
              den öffentlichen Blog. Die Protokolle bei Vercel werden nach kurzer Zeit gelöscht
              (nach Angaben von Vercel im von uns genutzten Tarif derzeit nach etwa einer Stunde).
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
                "Erinnerungs-Vermerke (Check-in) löschen wir nach 365 Tagen. Deine Zustimmung zu den Erinnerungen nach dem Einstieg und deine Werte speichern wir, bis du sie änderst, widerrufst oder dein Konto löschst.",
                "Newsletter ohne Konto: Nie bestätigte Anmeldungen werden nach 14 Tagen automatisch gelöscht. Bestätigte Anmeldungen bleiben bis zu deiner Abmeldung; danach bleibt die Adresse als Sperre gespeichert, bis du uns bittest, sie zu löschen (Abschnitt 15b).",
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
                "deine Werte und Freigaben, deine Zustimmung zu Erinnerungen und Danksagungen, die du gegeben oder bekommen hast (auch für die andere Person, denn ein Dank gehört beiden)",
                "deine Newsletter-Anmeldung als Mitglied (die Anmeldung ohne Konto ist davon getrennt, Abschnitt 15b)",
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
