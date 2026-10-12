# Made2Found Homepage – Übergabe

Stand: 09.10.2026. Branch: `feat/made2found-homepage`.
Worktree: `/private/tmp/made2found-homepage`, Basis `701fab75`.

## Ergebnis und Umfang

Neue deutsch-/englischsprachige Homepage mit Hero, FIND/CONNECT/ALIGN, Haltung, drei Schritten, Zielgruppen, Teamhinweis und geschlossener Beta. Warme Cremeflächen, Pflaumentext, lokale Spectral-Schrift für Überschriften, ruhige Flieder-/Grünakzente, leicht versetzte Notizzettel als dekorative Illustration. Keine Rasterbilder oder neuen Schriften geladen, keine neuen Dependencies. Keine Produktdaten oder Beispiel-Matchwerte in der Illustration.

Header ohne kleinen Claim: vorläufig einfacher Made2Found-Text aus bestehendem `BRAND_NAME`, bis ein freigegebenes Logo geliefert wird. „People • Ideas • Ventures“ als ergänzende Linie im Hero, „From People to Impact“ im Markenstreifen und Footer. Das Sammelbild wurde weder übernommen noch zugeschnitten. Keine alten Logo-/Icondateien ersetzt, keine nicht vorhandenen Assetpfade referenziert.

FIND beschreibt mögliche Co-Founder. CONNECT umfasst Beiträge, Fähigkeiten, Ressourcen, Angebote, Bedarfe und Vorhaben – ausdrücklich auch ohne eigene Gründungsabsicht. ALIGN beschreibt Gesprächsgrundlagen und sichtbare Arbeitsweisen, ohne Typologie, Fit-/Kompatibilitätsscore oder Prognose. Problem-/Opportunity-Matching und automatische Problem-Analyse sind ausdrücklich als geplant und noch nicht als Beta-Angebot verfügbar gekennzeichnet.

## Informationsarchitektur

Siehe [Public-Route-Audit](public-surface-audit.md) für vollständige Klassifikation, ursprüngliche Oberfläche, Assets und Logo-Lieferformate.

Für die geschlossene Beta genügt `/` mit `/#find`, `/#connect`, `/#align`, `/#ablauf`, plus bestehendem Impressum und Datenschutz. `/informierte-entscheidungen` bleibt erreichbar, die Kernhaltung steht bereits auf der Homepage. Eine spätere Zusammenführung/Weiterleitung benötigt eine eigene inhaltliche Prüfung. `/find` und `/align` vorerst zurückstellen; `/teams`, `/partners` und `/accelerators` aktuell nicht erforderlich.

**Routingkonflikt:** `/connect` ist bereits eine geschützte Produktseite. Eine öffentliche Erklärseite unter derselben URL kann nicht ohne weitere Routingarbeit angelegt werden. Dieser Pass lässt den Produktpfad unangetastet und nutzt `/#connect`.

## Geänderte Dateien

- `web/src/app/(marketing)/page.tsx`: neue Homepage, lokale DE/EN-Metadata, Canonical, Open Graph und Twitter ohne Bildpfad.
- `web/src/components/marketing/HomepageNav.tsx`: neuer kleiner Homepage-Header, Desktop-/Mobile-Navigation, Escape/Fokus, semantisch verstecktes Menü.
- `web/src/components/marketing/homepage.module.css`: ausschließlich Homepage-Stile, Breakpoints 640/960 px, Fokusdarstellung, reduzierte Bewegung.
- `web/src/data/homepage.ts`: getrennte DE-/EN-Inhalte, um den Rebrand-Diff in `data/marketing.ts` nicht anzufassen.
- `web/src/features/i18n/PublicLanguageSwitcher.tsx`: bestehendes öffentliches Sprachwahl-Element erhält `role="group"` für sein vorhandenes aria-label. Keine Änderung an Cookie, Router oder Sprachauswahl.
- `docs/marketing/public-surface-audit.md`: Audit, IA, Assetinventar und Lieferformate.
- `docs/marketing/homepage-handoff.md`: diese Übergabe.
- `docs/marketing/desktop-1280.png`, `mobile-390.png`, `mobile-390-hero.png`, `mobile-390-connect.png`, `mobile-390-visual.png`: lokale Prüfscreens, keine Produktionsassets.

Die alten Marketingkomponenten bleiben unberührt und werden von der neuen Homepage nicht mehr importiert. Keine zusätzliche Design-System-Abstraktion. `InstalledAppEntry` bleibt erhalten. Änderungen an Supabase, Schema, RPCs, Auth-Flows, Matching, Notifications, Migrationen, globalen Markenwerten, Produktlayout und Domainkonfiguration: keine.

## Visuelle Prüfung

- Desktop: Chromium 1280×900, vollständiger Screenshot [desktop-1280.png](desktop-1280.png). Zweispaltiger Hero, drei redaktionelle Bereichszeilen, dunkler Haltungsabschnitt, offene Ablauf-/Zielgruppenlayouts und heller Beta-Abschluss.
- Mobile: Chromium 390×844, [Gesamtseite](mobile-390.png), [Hero](mobile-390-hero.png), [CONNECT/ALIGN](mobile-390-connect.png), [Hero-Illustration](mobile-390-visual.png). Einspaltig, kein horizontaler Überlauf, Know-how bleibt als Wort zusammen. Menü hat eigenen Scrollbereich bei geringer Höhe.
- Keine Prüfung auf einem physischen Mobilgerät oder in Safari.

## Accessibility und Funktion

- Skip-Link, genau eine H1, bezeichnete Bereiche, eigenständiger Footer und Navigationslandmarks.
- Geschlossenes Menü ist per `hidden`/CSS nicht fokussierbar. Button mit aria-expanded/aria-controls; Escape schließt und bringt den Fokus zurück. Anker schließen das Menü. CONNECT-Titel liegt nach Klick bei ca. 115 px unter einem 89-px-Header.
- Menü-, Sprachwahl-, CTA- und Footerbedienflächen mindestens 44 px hoch. Sichtbare Fokusumrandung; keine Information hängt von Animation oder Farbe ab. Hero-Illustration ist dekorativ und aria-hidden.
- Bestehende Probleme außerhalb dieses Passes: alte Haltungsseite verwendet object-Logo und teilweise sehr kleinen CTA-Text; alte ungenutzte Marketingnavigation verbirgt Menüpunkte nur visuell. Rechtstexte bleiben deutsch auch bei englischer Locale.
- Der öffentliche Sprachumschalter hatte aria-label auf einem div ohne Role; das ist korrigiert. Die interne Produkt-Sprachwahl ist davon unabhängig.

## Verbleibende Aufgaben

1. Separate Logo-Dateien gemäß Lieferliste im Audit bereitstellen: primär echtes transparentes SVG, Symbol + Made2Found ohne Claim; PNG-Fallback, Symbol-/Favicon-/Apple-/PWA- und Social-/Mailvarianten anschließend separat integrieren. Keine Logoerfindung nötig.
2. Nach Claudes Rebrand-Review die beiden Arbeitsstände bewusst zusammenführen. Nur `web/src/app/(marketing)/page.tsx` überschneidet sich; der neue vollständige Homepage-Inhalt muss beim Merge erhalten bleiben. Rebrand-Inhalte, Origin, E-Mail-Konfiguration, Manifest und Icons werden hier nicht dupliziert.
3. Nach Zusammenführung Metadata auf der späteren Zieldomain prüfen. Canonical/OG-URL erben aktuell die bestehende Origin-Konfiguration; lokal ist diese `http://localhost:3000`, während der isolierte Preview auf Port 3011 läuft. Kein Produktionsdomain-Wechsel in diesem Branch.
4. Haltungsseite inhaltlich/visuell angleichen oder nach Prüfung zusammenführen; keine automatische Entfernung in diesem Pass.
5. Separater Beta-Abnahmetest auf echten Geräten und bei verfügbarem lokalen DB-Stack; kein Auth-Submit oder Mailversand für diese Marketingprüfung.

Keine Commits, Pushes oder Deployments. Kein Stash und keine Übernahme uncommitteter Rebrand-Änderungen. Vorher-/Nachher-Vergleich des Hauptbaum-Diffs und `git status` war identisch.

## Abschließende Prüfungen

- `npm run ci:check`: **Exit 0** auf dem finalen Code. TypeScript erfolgreich, **2.913/2.913 Tests bestanden**, Next.js-Produktionsbuild erfolgreich. Die zusätzliche Rebrand-Teständerung liegt bewusst nicht in diesem Branch. Build-Warnungen betreffen unveränderte Produktdateien, Workspace-Lockfiles und bestehende Modul-Typangaben.
- DB-Schritt: vom bestehenden Skript übersprungen. Zusätzlich außerhalb der Sandbox lesend bestätigt: Docker-Daemon ist nicht erreichbar. Keine DB gestartet, keine Migration ausgeführt. Keine Aussage über grüne pgTAP-Suiten.
- Gezieltes ESLint auf Homepage, Navigation, Inhalten und öffentlichem Sprachumschalter: Exit 0, keine Befunde.
- Lokaler Produktionspreview: `http://127.0.0.1:3011`. Nur lokal, kein Deploy.
- Browser: Desktop 1280×900 und Mobile 390×844 geprüft. Mobile Dokumentbreite exakt 390 px, eine H1, keine kaputten Bilder. Finale mobile Notizzettel ohne verdeckten Text visuell geprüft.
- axe-core 4.12.1, WCAG 2 A/AA: **0 bestätigte Verstöße** auf Desktop und Mobile, jeweils 22 bestandene Regeln. Eine Kontrastregel bleibt automatisch unvollständig: dekorative Pfeile und überlagerte Illustration. Kein vollständiger WCAG-Konformitätsnachweis; diese Elemente wurden visuell geprüft.
- Mobile-Menü: Öffnen/Schließen, Escape mit Fokusrückgabe, Ankerklick und Entfernung geschlossener Links aus der Accessibility-Navigation geprüft. Sprachwechsel DE→EN→DE funktioniert; HTML lang, H1, Dokumenttitel und OG-Titel wechseln mit.
- CTA-/Footer-Ziele: `/start`, `/login`, `/impressum`, `/datenschutz`, `/informierte-entscheidungen` antworten lokal mit **HTTP 200**. Start und Login enthalten die bestehenden Formulare. Keine Formulare abgesendet, keine E-Mails ausgelöst, kein vollständiger Auth-End-to-End-Test.
- Browserfehler: keine JavaScript-Fehler gemeldet.
- `git diff --check`: erfolgreich; neue Textdateien zusätzlich ohne Staging auf Whitespace-Fehler geprüft.
- Hauptbaum-Diff und Status erneut mit der Eingangssicherung verglichen: identisch. Kein Commit, Push oder Deploy.
- Ausführung mit vorhandenem Node **25.6.0**; Projektziel bleibt unverändert **24.x**.
