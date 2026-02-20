import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-[0.06em] text-slate-900">Datenschutzerklärung</h1>
        <Link
          href="/"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück
        </Link>
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 text-sm leading-7 text-slate-700">
        <div>
          <h2 className="text-base font-semibold text-slate-900">1. Verantwortliche Stelle</h2>
          <p className="mt-2">
            Verantwortlich für die Verarbeitung personenbezogener Daten ist:
          </p>
          <p className="mt-2">
            Maria Schulz
            <br />
            Am Juliusturm 89,
            <br />
            13597 Berlin, Deutschland
            <br />
            E-Mail: Business.mariaschulz@gmail.com
            <br />
            Privates Projekt: CoFoundery Align
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">2. Zweck der Verarbeitung</h2>
          <p className="mt-2">
            Wir verarbeiten personenbezogene Daten ausschließlich zur Bereitstellung der Plattform, zur Durchführung
            der Profil-, Analyse- und Matching-Funktionen sowie zur technischen Sicherheit und Weiterentwicklung des
            Dienstes.
          </p>
          <p className="mt-2">
            Die Verarbeitung umfasst die algorithmische Auswertung der bereitgestellten Angaben zur Erstellung
            individueller Analyse- und Vergleichsreports.
          </p>
          <p className="mt-2">
            Eine automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO findet nicht statt.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">3. Rechtsgrundlagen</h2>
          <p className="mt-2">Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage folgender Rechtsgrundlagen:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung und Nutzung der Plattform)</li>
            <li>Art. 6 Abs. 1 lit. a DSGVO (freiwillige Einwilligung, z. B. bei Einladungen)</li>
            <li>Art. 6 Abs. 1 lit. f DSGVO (technischer Betrieb, Stabilität und Sicherheit)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">4. Verarbeitete Daten</h2>
          <p className="mt-2">
            Im Rahmen der Nutzung der Plattform können insbesondere folgende Daten verarbeitet werden:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account-Daten (z. B. E-Mail-Adresse, interne User-ID)</li>
            <li>Profilangaben (z. B. Anzeigename, Fokus-Skill, Intention)</li>
            <li>Antwortdaten aus Fragebögen (Basisfragebogen und optionales Werte-Add-on)</li>
            <li>Analyse- und Vergleichsergebnisse</li>
            <li>Technische Nutzungsdaten zur Gewährleistung von Stabilität und Sicherheit</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">5. Einladungen und E-Mail-Adressen</h2>
          <p className="mt-2">
            E-Mail-Adressen für Einladungen werden zweckgebunden zur Zuordnung von Sessions und eingeladenen Personen verarbeitet.
            Die Nutzung erfolgt nur nach dokumentierter Einwilligung der einladenden Person.
          </p>
          <p className="mt-2">
            Der Versand von E-Mails erfolgt ausschließlich transaktionsbezogen und nicht zu Marketing- oder Werbezwecken.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">6. Vergleichsauswertungen</h2>
          <p className="mt-2">
            Vergleichsauswertungen werden ausschließlich auf Grundlage freiwillig bereitgestellter Angaben
            beider beteiligter Personen erstellt.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">7. Empfänger und Auftragsverarbeiter</h2>
          <p className="mt-2">
            Zur Bereitstellung des Dienstes setzen wir folgende Auftragsverarbeiter ein:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Vercel Inc. (Hosting und technische Infrastruktur)</li>
            <li>Supabase Inc. (Datenbank- und Authentifizierungsdienste)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">8. Drittlandübermittlung</h2>
          <p className="mt-2">
            Eine Verarbeitung von Daten in Drittländern (z. B. USA) kann nicht ausgeschlossen werden.
            In diesen Fällen erfolgt die Verarbeitung auf Grundlage geeigneter Garantien, insbesondere
            der von der EU-Kommission genehmigten Standardvertragsklauseln.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">9. Speicherdauer</h2>
          <p className="mt-2">
            Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke
            erforderlich ist oder bis eine Löschung verlangt wird. Gesetzliche Aufbewahrungspflichten
            bleiben unberührt.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">10. Deine Rechte</h2>
          <p className="mt-2">
            Du hast im Rahmen der gesetzlichen Bestimmungen das Recht auf:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Auskunft</li>
            <li>Berichtigung</li>
            <li>Löschung</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Datenübertragbarkeit</li>
            <li>Widerspruch gegen die Verarbeitung</li>
          </ul>
          <p className="mt-2">
            Die Löschung personenbezogener Daten kann jederzeit per E-Mail an die oben genannte Kontaktadresse verlangt werden.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">11. Beschwerderecht</h2>
          <p className="mt-2">
            Du hast zudem das Recht, dich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">12. Hinweis zur Testphase</h2>
          <p className="mt-2">
            Das Angebot befindet sich aktuell in einer privaten, nicht-kommerziellen Testphase (MVP).
          </p>
        </div>
      </section>
    </main>
  );
}
