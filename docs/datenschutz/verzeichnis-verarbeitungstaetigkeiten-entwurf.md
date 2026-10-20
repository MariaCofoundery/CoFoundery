# Verzeichnis von Verarbeitungstätigkeiten (Entwurf)

Art. 30 Abs. 1 DSGVO · Made2Found · Stand: Oktober 2026

> **Status: Arbeitsentwurf, keine Rechtsberatung.** Er ist aus dem Code, den Datenbankmigrationen
> (Stand `20261212120000`), `vercel.json` und den Dokumenten im Repository abgeleitet. Nichts davon
> wurde gegen den laufenden Betrieb, die Supabase-/Vercel-/Resend-Konsolen oder echte Daten geprüft.
> Rechtsgrundlagen sind **Vorschläge**. Die Punkte in Abschnitt 7 braucht eine Entscheidung oder eine
> rechtliche Prüfung, bevor das Verzeichnis als verbindlich gilt.

## 0. Verantwortliche Stelle

Laut der Datenschutzerklärung im Repository: Maria Schulz, Am Juliusturm 89, 13597 Berlin
(E-Mail-Adresse und Rechtsform bitte prüfen). Datenschutzbeauftragte:r: nicht benannt
(**zu klären**: Pflicht erst ab 20 Personen mit ständiger automatisierter Verarbeitung, § 38 BDSG,
aber eine freiwillige Benennung oder externe Beratung ist sinnvoll).

## 1. Systemübersicht und Empfänger

| Baustein | Rolle | Was darüber läuft | Stand der Verträge |
|---|---|---|---|
| **Supabase** (Datenbank, Auth, Storage) | Auftragsverarbeiter | alle Anwendungsdaten, Anmeldung, Fotos und Logos in Storage-Buckets | **AV-Vertrag und Region prüfen** (Region nicht im Repo erkennbar) |
| **Vercel** (Hosting, Cron) | Auftragsverarbeiter | Auslieferung, Server-Funktionen (`regions: ["lhr1"]`, London), tägliche Cron-Läufe | **AV-Vertrag prüfen**; Drittland-Frage seit dem Brexit (Angemessenheitsbeschluss Vereinigtes Königreich) |
| **Resend** (E-Mail) | Auftragsverarbeiter | Magic-Link-/Einladungs-/Benachrichtigungs-Mails mit Empfängeradresse | **AV-Vertrag und Standort prüfen** |
| **Browser-Push-Dienste** (Apple, Google, Mozilla) | eigenständige Empfänger der Push-Endpunkte | Web-Push (VAPID); nur mit Zustimmung | rechtlich einordnen |
| **Lokaler KI-Worker** (Ollama auf einem Rechner des Betreibers) | keine Weitergabe an Dritte, solange der Worker lokal läuft | Vorschläge zu Stärken, Fähigkeiten, Richtung, Ressourcen aus Freitexten | **zu klären**: Der Worker liest Daten, die Personen für die Verarbeitung freigegeben haben, auf einem privaten Gerät. Technische und organisatorische Absicherung beschreiben |
| Schriftarten, Skripte | keine Drittanbieter im Code gefunden (Schriften liegen im Repository) | – | zu bestätigen |
| Analyse-Dienste Dritter | **keine gefunden** (kein Tracker, kein Analytics-SDK im Code) | Produktanalyse läuft in der eigenen Datenbank | – |

## 2. Verarbeitungstätigkeiten

Jede Tätigkeit nennt Zweck, Personen, Datenkategorien (mit den wichtigsten Tabellen), die
vorgeschlagene Rechtsgrundlage, wer die Daten sieht, die Frist und Besonderheiten.

### V1 · Konto und Anmeldung
- **Zweck:** Zugang zum Produkt, Sitzungen.
- **Betroffene:** alle Nutzenden.
- **Daten:** E-Mail-Adresse, Sitzungsdaten (Supabase Auth), Anmeldezeitpunkte.
- **Rechtsgrundlage (Vorschlag):** Art. 6 Abs. 1 lit. b (Nutzungsvertrag).
- **Sieht:** nur die Person; technisch Supabase.
- **Frist:** bis zur Kontolöschung (V17).
- **Besonderheit:** Einladungen enthalten die E-Mail-Adresse **dritter Personen** (V12).

### V2 · Profil und Identität
- **Zweck:** Darstellung der Person, Basis für alle Bereiche.
- **Daten:** `person_core` (Name, Headline, Bio, Region, Remote-Modus, Expertise, Branchen, LinkedIn-URL
  mit Sichtbarkeit „niemand“ oder „Verbundene“, Foto-Sichtbarkeit, **Absicht „Wofür ich hier bin“**),
  `profiles` (Rollen, Schwerpunkt, Absicht, Avatar), Fotos (Storage).
- **Rechtsgrundlage:** lit. b; optionale Angaben und Fotos zusätzlich lit. a (Einwilligung durch Angabe).
- **Sieht:** zunächst nur die Person. Weitergabe nur über getrennte, einzeln widerrufbare Freigaben (V7 bis V10).
- **Frist:** bis zur Kontolöschung; Foto bei Austausch.
- **Besonderheit:** Der Kern ist die alleinige Identitätsquelle (Find und Connect lesen daraus).
  Die Absicht ist ausdrücklich **keine Berechtigung** (Spaltenkommentar, Test vorhanden).

### V3 · Fragebögen und Auswertungen (Align)
- **Zweck:** Selbstauskunft zur Arbeitsweise und zu Vorstellungen vom Gründen; beschreibende Auswertung.
- **Daten:** Antworten (`alignment_answers`, `assessment_answers`, Workstyle-Antworten, Venture-Alignment),
  Zeitpunkte, Zwischenstände, Snapshots (`workstyle_product_snapshots`), geteilte Stände.
- **Rechtsgrundlage:** lit. b; Freigaben an andere auf Einwilligung gestützt (lit. a).
- **Sieht:** die Person; andere nur nach einzelner Freigabe; Teamvergleich nur, wenn **alle** aktuellen Mitglieder abgegeben und geteilt haben.
- **Frist:** bis zur Kontolöschung.
- **Besonderheit:** Kein Score, keine Typen, keine automatisierte Entscheidung über Personen.
  Selbstauskunft kann Hinweise auf Persönlichkeit enthalten, aber keine Daten nach Art. 9 abfragen (**zu bestätigen**, siehe Abschnitt 6).

### V4 · Forschung (freiwillig, getrennt)
- **Zweck:** Validierung der Fragen.
- **Daten:** `workstyle_research_responses`, `research_consent_preferences`, `research_events`.
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. a (eigene Einwilligung), **getrennt** von Produktnutzung.
- **Sieht:** nie Produktansichten, nie Find, nie normale Advisor-Sicht.
- **Frist:** Forschungs-Ereignisse **30 Tage** nach Eingang (täglicher Löschlauf); Forschungsantworten bis zur Kontolöschung oder zum Widerruf (Löschung der Rohdaten steht in der Erklärung, Umsetzung **prüfen**).
- **Besonderheit:** Forschungsfragen zählen nicht zur Produktfertigstellung.

### V5 · Produktanalyse
- **Zweck:** Fehler finden, Fragen verständlich machen (Dauer, Abbruch), Produktverbesserung.
- **Daten:** `product_analytics_events` (technische Ereignisse, Antwortzeiten), tägliche Aggregate
  (`analytics_*_daily`).
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f (berechtigtes Interesse; **Interessenabwägung dokumentieren**).
- **Frist:** Ereignisse **30 Tage**; **Aggregate ohne automatische Frist** (Erklärung nennt das ausdrücklich).
- **Besonderheit:** Es gibt keinen Dienst Dritter. Prüfen, ob Aggregate wirklich nicht zurückführbar sind (kleine Gruppen).

### V6 · Fähigkeiten, Stärken, Richtung, Ressourcen
- **Zweck:** Profil über Können, Stärken, Richtung und Zugänge.
- **Daten:** `person_capability_entries` und -evidence (Freitext-Belege), Interviewantworten, `person_strengths`,
  Vorschläge (`*_proposals`), `direction_statements`, `person_resources`.
- **Rechtsgrundlage:** lit. b; Freigaben lit. a.
- **Besonderheit:** **Freitext** (kann beliebige, auch sensible Angaben enthalten). **KI-Vorschläge** aus Freitexten
  durch lokalen Worker; Vorschläge gelten erst nach Bestätigung durch die Person; Zitatpflicht.
  Nach dem Export-Stand fehlen diese Daten im Datenexport (Abschnitt 5).

### V7 · Teams, Vergleiche, Vereinbarungen
- **Zweck:** gemeinsames Arbeiten von 2 bis 4 Gründenden.
- **Daten:** `founder_teams` (Name, Beschreibung), Mitglieder, Austritte, Freigaben (`assessment_team_shares`,
  `team_shares`), Founder Setup (Themen, Revisionen, Bestätigungen, Diskussionen), Commitment Lab,
  Zusammenarbeitsübungen, Venture-Alignment je Team.
- **Rechtsgrundlage:** lit. b (gemeinsame Nutzung), Freigaben lit. a.
- **Sieht:** aktuelle Teammitglieder; eine frühere Bestätigung gilt nicht für die aktuelle Besetzung.
- **Frist:** Teamdaten bleiben bestehen, wenn eine Person geht (Zuordnung wird umgeschrieben); bis zur Löschung des Teams oder aller Mitglieder (**Regel für verwaiste Teams klären**).

### V8 · Advisor-Begleitung
- **Zweck:** Begleitung von Personen und Teams, Accelerator-Programme.
- **Daten:** Personenfreigaben (`advisor_person_grants`), Organisationen und Mitglieder, Einladungen,
  Team-Reviews, **private Notizen und Wiedervorlagen des Advisors** (`advisor_private_notes`, `advisor_follow_ups`,
  `advisor_section_impulses`), Team-Intake-Runden.
- **Rechtsgrundlage:** Freigaben und Einladung auf Einwilligung (lit. a); Advisor-Notizen lit. f (**Abwägung**).
- **Sieht:** nur freigegebene Bereiche; Forschung und Entwurfsdaten nie; kein automatischer Zugang durch Teamfreigabe.
- **Besonderheit:** **Notizen über Dritte** durch Advisors; Auskunft und Löschung dafür klären (Abschnitt 7).

### V9 · Find (Mitgründer:innen finden)
- **Zweck:** Profile ansehen, kennenlernen, Vorschläge.
- **Daten:** `founder_discovery_profiles`, Suchpräferenzen, gespeicherte Suchen und Treffer, Kennenlern-Anfragen,
  Matching-Metriken (`find_ranking_metrics_daily`), Merklisten.
- **Rechtsgrundlage:** lit. b und Einwilligung zur Sichtbarkeit (lit. a).
- **Besonderheit:** **Profiling** im Sinne von Art. 4 Nr. 4 (Vorschläge nach Passung), keine Entscheidung mit
  rechtlicher Wirkung; keine Match-Prozente. Sichtbare Gründe, Rangfolge-Verzicht und Abschaltung per Flag
  (`MATCHING_FIND_V01_RANKING_ENABLED`) dokumentieren.

### V10 · Connect (Netzwerk)
- **Zweck:** Profile, Angebote und Gesuche, Probleme, Unternehmen, Kontakte, Nachrichten.
- **Daten:** `network_profiles`, Listings (Ablauf nach 60 Tagen), Probleme, Ventures, Kontaktanfragen,
  **Nachrichten** (`network_messages`), Blockierungen, Meldungen, Vorschläge (`connect_suggestions`), öffentliche
  Seiten (nur bei ausdrücklicher Veröffentlichung, ohne Foto und ohne LinkedIn).
- **Rechtsgrundlage:** lit. b; Veröffentlichung lit. a.
- **Besonderheit:** **Inhalte mit Dritten** (Nachrichten, Problembeschreibungen); Moderation und Meldeweg
  (Verantwortung für Inhalte; ggf. Digital Services Act, **prüfen**).

### V11 · Benachrichtigungen und E-Mail
- **Daten:** `in_app_notices`, `push_subscriptions` (Endpunkte), Opt-ins und Opt-outs, versandte Mails über Resend.
- **Rechtsgrundlage:** lit. b für Transaktionsmails; Push und optionale Hinweise lit. a (Einwilligung, widerrufbar).
- **Frist:** Push-Abos bis zum Widerruf oder zur Kontolöschung; **Aufbewahrung von Hinweisen und Mails nicht geklärt**.

### V12 · Einladungen
- **Daten:** `invitations`, Team- und Personeneinladungen, Advisor-Einladungen (E-Mail-Adresse der eingeladenen
  Person, Name der einladenden Person, Ablaufdatum).
- **Rechtsgrundlage:** lit. f (Einladung durch Nutzende), Informationspflicht gegenüber Eingeladenen (Art. 14) **klären**.
- **Frist:** Einladungen laufen ab; **Löschung abgelaufener Einladungen prüfen**.

### V13 · Events (QR-Einstieg)
- **Daten:** `events`, `event_participants`, `event_answers` (Kurzprofil).
- **Frist:** **24 Stunden nach Ende des Events** (täglicher Löschlauf).

### V14 · Rückmeldungen
- **Daten:** `product_feedback`, Benachrichtigungs-Mail an den Betreiber.
- **Rechtsgrundlage:** lit. f. **Frist nicht geklärt.**

### V15 · Moderation und Verwaltung
- **Daten:** `platform_admins`, Meldungen, Moderationsentscheidungen, interne Problem-/Radar-Arbeit.
- **Besonderheit:** Zugriff nur für Administrator:innen; Radar-Quellen und Hypothesen enthalten möglicherweise
  Personenbezug (**prüfen**).

### V16 · Betrieb und Sicherheit
- **Daten:** Server- und Zugriffsprotokolle bei Vercel und Supabase, Rate-Limits, Cron-Läufe (nur Zahlen).
- **Rechtsgrundlage:** lit. f. **Protokollfristen der Anbieter prüfen.**

### V17 · Kontolöschung und Betroffenenrechte
- **Löschung:** Selbstbedienung mit Hinweis für betroffene Dritte (`account_deletion_notices`); gemeinsame
  Teamdaten bleiben, die Urheberschaft wird umgeschrieben; Conversation-Verträge tolerieren die Löschung.
- **Auskunft/Übertragbarkeit:** Export als JSON (`/api/account/export`), siehe Abschnitt 5.
- **Berichtigung:** Selbst im Profil und in den Bereichen.
- **Widerruf:** Freigaben einzeln, Forschung getrennt.

## 3. Fristen im Überblick

| Daten | Frist | Umsetzung |
|---|---|---|
| Forschungs- und Produktanalyse-Ereignisse | 30 Tage nach Eingang | täglicher Löschlauf (`/api/cron/privacy-retention`, 03:00 UTC), Funktion `purge_old_research_events` |
| Event-Daten | 24 Stunden nach Event-Ende | derselbe Löschlauf (`cleanup_expired_event_data`) |
| Connect-Listings | laufen nach 60 Tagen ab (Sichtbarkeit) | Status, **keine Löschung** gefunden |
| Konto | bis zur Löschung durch die Person | Löschfunktion mit Prüfung der Fremdschlüssel (pgTAP-Test) |
| Abgeschlossene KI-Aufgaben (`ai_jobs`) | **90 Tage** nach Abschluss; laufende und wartende nie | täglicher Löschlauf, Funktion `purge_stale_operational_rows` (seit Oktober 2026) |
| Hinweise in der Anwendung (`in_app_notices`) | **180 Tage** nach Entstehen, gelesen oder nicht | derselbe Lauf |
| **Aggregate der Produktanalyse** | keine | laut Erklärung bewusst, **Begründung dokumentieren** |
| Einladungen | laufen nach 14 bzw. 30 Tagen ab; abgelaufene werden **nicht** automatisch gelöscht, spätestens mit dem Konto der einladenden Person | so in der Datenschutzerklärung (Abschnitt 24) beschrieben; Löschregel offen, weil Einladungen an Berichten hängen können |
| **Nachrichten, Feedback, Aggregate** | keine automatische Frist; Nachrichten werden mit dem Konto nur vom Bezug gelöst | Entscheidung offen (Abschnitt 7) |

Der Löschlauf in Production hängt von der Variable `CRON_SECRET` (sonst 503, nichts wird gelöscht) und dem Service-Role-Schlüssel ab. **Prüfen, ob beides in Production gesetzt ist.**

## 4. Technische und organisatorische Maßnahmen (aus dem Code erkennbar)

Zeilensicherheit (RLS) auf den Tabellen; enge `SECURITY DEFINER`-Funktionen für fremde Sichten; Forschung und
Entwurfsdaten aus Produktansichten ausgeschlossen; Freigaben je Zweck getrennt; Konsistenz-Tests (pgTAP,
170 Dateien) für Sichtbarkeit und Zustimmung; Löschlauf mit Zähl-Antworten statt Inhalten; Passwortloser Login;
Service-Role nur serverseitig. **Nicht erfasst:** Zugriffsrechte in den Anbieter-Konsolen, Schlüsselverwaltung,
Backup und Restore (nicht dokumentiert), Protokollierung administrativer Zugriffe.

## 5. Betroffenenrechte (Stand Code)

- **Auskunft/Export:** Die Exportfunktion (`/api/account/export`) liest mit den Rechten der Person: Kern und
  Profil, Antworten der Fragebögen (`alignment_answers`, Workstyle-Sitzungen und -Forschungsantworten),
  Fähigkeiten samt Belegen und Interview, Stärken, Richtung, Ressourcen, Absicht (über `person_core`),
  Freigaben (Team, Advisor), Teamzugehörigkeit und eigene Beiträge im Team, Find, Connect (Profil, Listings,
  Probleme, gesendete Nachrichten, Kontaktanfragen, Blockierungen), Hinweise, Rückmeldungen. Der Dateiname
  lautet jetzt `made2found-export-…`.
  **Weiterhin nicht enthalten:** Nachrichten anderer Menschen, KI-Vorschläge zu Stärken und Richtung (hängen
  zwei Stufen tief), Push-Zustelladressen, Meldungen an die Moderation. Ob jede Tabelle im Betrieb wirklich
  lesbar ist, zeigt das Feld `nichtEnthalten` in der Exportdatei: **einmal mit einem echten Konto prüfen.**
- **Löschung:** vorhanden (V17). **Berichtigung:** durch die Person. **Widerruf:** je Freigabe, Forschung getrennt.
- **Einschränkung/Widerspruch:** kein eigener Weg erkennbar; Kontaktweg in der Erklärung nennen.

## 6. Risikobewertung (Vorprüfung DSFA, Fragen für die Rechtsprüfung)

Hinweise darauf, dass eine DSFA zumindest zu prüfen ist: Bewertung persönlicher Aspekte (Arbeitsweise, Stärken),
Profiling in Find, Freitexte mit möglichen sensiblen Angaben, Notizen über Dritte (Advisor), KI-gestützte
Verarbeitung, Nachrichten zwischen Mitgliedern. Gegenindikatoren: freiwillige Nutzung, kleine Gruppen, keine
automatisierten Entscheidungen, strikte Zweck- und Freigabetrennung, keine Drittanbieter-Analyse.
**Entscheidung:** DSFA-Schwellenwertanalyse nach der Liste der Aufsichtsbehörde durchführen und dokumentieren.

## 7. Offene Punkte (nach Dringlichkeit)

1. **Datenschutzerklärung veröffentlichen.** Die Fassung, die im Branch `feat/founder-profile-phase1` liegt,
   ist veraltet (Scores, Workbook; kein Find, Connect, Advisor, Push, KI). Eine neue, 27 Abschnitte lange
   Fassung liegt **uncommitted** im Hauptordner (Branch `docs/privacy-policy-production-state`). Sie sollte
   committet und nach `main` gebracht werden; dabei die „LEGAL REVIEW REQUIRED“-Kommentare klären.
2. **AV-Verträge, Standorte und Drittlandfragen** für Supabase, Vercel und Resend dokumentieren.
3. **Löschkonzept weiter vervollständigen:** KI-Jobs und Hinweise sind erledigt; offen sind Nachrichten,
   Rückmeldungen, abgelaufene Einladungen und Aggregate (Entscheidung, ob und wann).
4. **Export einmal mit einem echten Konto prüfen** (`nichtEnthalten` lesen).
5. **KI-Worker:** Betriebsweise, Zugriff und Absicherung beschreiben; entscheiden, ob er außerhalb des
   Betreibergeräts laufen soll.
6. **Notizen über Dritte** (Advisor): Rechtsgrundlage, Auskunftsweg, Löschung.
7. **Interessenabwägungen** für lit. f schriftlich festhalten (Analyse, Advisor-Notizen, Einladungen, Betrieb).
8. **Benennung** einer Datenschutzbeauftragten oder externen Beratung klären.
9. **Vorfallplan** (Meldung binnen 72 Stunden) und **Backup/Restore** dokumentieren.
10. **Löschlauf in Production prüfen** (`CRON_SECRET`, Service-Role-Schlüssel, Cron aktiv).
