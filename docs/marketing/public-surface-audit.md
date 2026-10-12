# Made2Found: Public Surface Audit

Stand: 09.10.2026, vor der Homepage-Implementierung. Basis: `701fab75`.

## Isolation und Zusammenführung

- Hauptbaum: `chore/made2found-domain-rebrand`, 70 geänderte Dateien und ein ungetrackter Handoff. Dieser Stand bleibt unberührt.
- Separater Worktree: `/private/tmp/made2found-homepage`, Branch `feat/made2found-homepage`, vom letzten Commit abgeleitet. Keine Übernahme, kein Stash des Rebrand-Diffs.
- Keine AGENTS.md im Repo gefunden. Keine Commits, Pushes oder Deployments.
- Nach dem separaten Rebrand-Review muss die Homepage bewusst zusammengeführt werden. Gemeinsame Datei: `web/src/app/(marketing)/page.tsx`. Die Homepage erhält eigene Inhalte, statt `src/data/marketing.ts` oder globale Branding-Konstanten zu ändern.
- Lokale Dependencies und `.env.local` werden nur per ignoriertem Symlink wiederverwendet. Build-Ausgaben liegen ausschließlich im neuen Worktree.

## Routen und Entscheidung

| Route | Ist-Zustand | Entscheidung |
| --- | --- | --- |
| `/` | Umfangreiche ALIGN-/Co-Founder-Landingpage mit Hero, Zielgruppen, Problemen, Features, Ansatz, Ablauf, Dimensionen, Evidenz, FAQ | **Überarbeiten**: FIND, CONNECT, ALIGN, Menschen ohne Gründungsabsicht, klare Beta-Grenzen |
| `/informierte-entscheidungen` | Haltung, Forschungs-/Reflexionsansatz, Quellen; bisher stark ALIGN-bezogen | **Zusammenführen**: Kernaussage auf Homepage; bestehende URL vorerst erhalten. Später separat fachlich prüfen, bevor ein Redirect beschlossen wird |
| `/impressum` | Bestehende Anbieterangaben, Kontakt | **Behalten**, unverändert |
| `/datenschutz` | Bestehende Datenschutzerklärung | **Behalten**, unverändert; Rebrand erfolgt im anderen Pass |
| `/find` | Fehlt | **Fehlt**, aber für geschlossene Beta genügt zunächst `/#find` |
| `/connect` | Bereits geschützte Produkt-Browse-Seite, Member-Layout, noindex | **Behalten** als Produkt. Keine parallele Marketingroute unter derselben URL anlegen |
| öffentliche CONNECT-Erklärung | Fehlt | **Fehlt**, zunächst `/#connect`; bei späterem Ausbau z. B. `/connect-entdecken`, oder gesondert autorisierte Routing-Migration |
| `/align` | Fehlt; Produkt läuft unter `/founder-alignment`, `/me`, `/teams/.../workstyle` | **Fehlt**, zunächst `/#align` |
| `/teams` | Keine öffentliche Übersichtsseite; `/teams/[teamId]/...` sind Produktfunktionen | **Nicht nötig** für Beta: Team Workstyle Report, Capability, Venture/Vorhaben und Founder Setup auf Homepage erläutern |
| `/accelerators`, `/partners` | Fehlen | **Nicht nötig** im aktuellen Umfang |

Weitere öffentlich erreichbare Einstiege sind **keine Marketingseiten**: `/start`, `/login`, `/auth/*`, `/join`, `/join/welcome`, `/welcome`, Einladungs- und Reportlinks, `/event/[eventSlug]` mit Check/Compare/Me/Scan. CONNECT-Slugseiten `/connect/p/[publicSlug]`, `/connect/l/[publicSlug]`, `/connect/pr/[publicSlug]` haben eigene Zugangsprüfung; sie sind in der geschlossenen Beta nicht als offenes Verzeichnis zu bewerben. `/beispiel-auswertung` liegt im Produktbereich. `/dev-login` ist ein Entwicklungshelfer. Keine dieser Routen wird umgebaut.

**Empfohlene Beta-IA:** eine Homepage, drei direkt verlinkbare Bereichsabschnitte, Ablauf, Zielgruppen, Teamhinweis, Beta-CTA, Impressum und Datenschutz. Bestehende Haltungsseite bleibt erreichbar. Separate Detailseiten erst bei ausreichend eigenständigem Inhalt.

## Oberfläche und Technik

- Next.js App Router 15, React 19, Tailwind 4, next-intl; DE/EN über Cookie/Accept-Language, keine Sprachpräfixe.
- Root-Layout lädt globale Schriften und ProductShell. `isProductChromePath('/')` ist false. Installierte PWA wechselt über `InstalledAppEntry` nach `/start`; Verhalten erhalten.
- Vorheriger Header: sticky Glaspanel, alte SVG-Wortmarke, Produkt/Ablauf/FAQ, Sprachwahl, `/login` und `/start`. Mobile-Menü ab unter 768 px; zugeklappter Inhalt nur per Höhe/Opacity verborgen, bleibt potenziell per Tab erreichbar.
- Footer bisher innerhalb des Main-Landmarks: Copyright, Rechtliches, Haltung. Neue Homepage erhält eigenständigen Footer.
- Schriften lokal: Spectral 400/500/600, Unbounded 400/500/700. Bestehende Basis nutzt Serifentext und breite Displayschrift. Homepage verwendet diese lokalen Dateien und eine System-Sans für Lesetext, ohne weitere Downloads.
- Globale Tokens: Hintergrund `#eef3f9`, Ink `#101a2a`, Muted `#41576d`, Cyan-300, Violett `#7c3aed`, breite Schatten und Gradients. Neue Farben ausschließlich in einer Homepage-CSS-Module-Datei: Creme, dunkle Pflaume, Flieder, sanftes Grün.
- Vorherige Homepage: max-width 1152 px, 20/32 px Seitenabstand, überwiegend dreispaltige Karten ab 768 px, viele dekorative Verläufe. Neue Homepage: mobile-first, große redaktionelle Zeilen statt Feature-Kachelwand.
- SEO: globale Metadata beschreibt Co-Founder-Matching; `metadataBase` kommt aus bestehender Origin-Konfiguration. Keine bisherigen eigenen Homepage-OG-/Twitter-Angaben, keine Social-Bilddatei. Sitemap enthält Homepage, Rechtliches und Haltung sowie RPC-basiert freigegebene Slugs. Robots sperrt CONNECT-/Produktpfade. Homepage erhält lokale DE/EN-Metadata, Canonical und textbasierte OG/Twitter-Angaben; keine Änderung an Origin, Sitemap-RPC, Robots oder Root-Layout.

## Logo-Inventar: vor Änderungen

| Asset/Verwendung | Befund |
| --- | --- |
| `assets/Logo.PNG` | Alte Wortmarke, nicht automatisch öffentlich ausgeliefert |
| `web/public/cofoundery-align-logo.svg` | Alte Wortmarke; SVG enthält Rasterdaten, kein freigegebenes Made2Found-Asset |
| `LandingTopNav.tsx` | Homepage-Header verwendet altes SVG |
| `(marketing)/informierte-entscheidungen/page.tsx` | Altes SVG per object mit Textfallback |
| `features/navigation/ProductShell.tsx` | Produktkopf verwendet altes SVG |
| `src/app/icon.png`, `apple-icon.png` | Bestehende Browser-/Apple-Icons |
| `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | PWA-Icons, eingebunden über `manifest.ts` |
| `lib/email/sendAdvisorInviteEmail.ts`, `sendAdvisorTeamFounderInviteEmail.ts`, `sendCoFounderInviteEmail.ts`, `sendNetworkNotificationEmail.ts`, `sendSavedSearchEmail.ts`, `sendDiscoverySavedSearchEmail.ts`, `sendReadMyMindStartedEmail.ts`, `sendFounderInTheWildHandoffEmail.ts` | Logo-URL in App-Mails; Domainanpassung liegt im anderen Pass |
| `features/email/emailMessages.ts`, `supabase/templates/*.html` | Textbranding/Absendertexte; Supabase-Vorlagen haben keine separate neue Bildmarke |

Das angehängte Sammelbild ist nur visuelle Referenz. Es wird weder kopiert noch zugeschnitten. Kein neues Logo wird gezeichnet. Header vorerst mit `BRAND_NAME` als normalem Text, ohne kleinen Claim und ohne erfundenes Symbol.

## Benötigte finale Lieferdateien

| Zweck | Benötigte Variante/Format |
| --- | --- |
| Desktop-Header | Symbol + Made2Found ohne Claim, transparentes echtes SVG mit viewBox, beschnittener Zeichenfläche, möglichst Pfade statt externer Schriften; dunkle Wortmarke für hellen Grund. Optional helle Negativfassung für dunklen Grund. PNG-Fallback mindestens 800 px breit |
| Mobile | Dieselbe kompakte claimlose Kombination, lesbar bei ca. 150–175 px Breite; zusätzlich Symbol allein als transparentes SVG/PNG, falls später notwendig |
| Markenclaim | „From People to Impact“ als separater Text; optional eigene freigegebene Logo-Kombination für größere Anwendungen |
| Ergänzende Markenlinie | „People • Ideas • Ventures“ separat; optional eigener freigegebener Lockup. Niemals „Connecting Co-Founders“ |
| Favicon | Vereinfachtes freigegebenes Symbol, SVG sowie PNG 32×32 und 48×48; optional ICO mit 16/32/48 px |
| Apple/PWA | Apple PNG 180×180; PNG 192×192 und 512×512; separate maskable PNG 512×512 mit sicherem zentralem Motiv, deckender Hintergrund |
| OG/Social | Freigegebenes PNG 1200×630, deckend, Symbol/Wortmarke mit ausreichend Rand; optional Claim. Bis dahin nur Text-Metadata ohne kaputten Bildpfad |
| E-Mail | Transparente PNG-Wortmarke mindestens 600 px breit für ca. 176–220 CSS-px; gut auf hellem Grund, keine kleinen Claims. Später dauerhaft erreichbare HTTPS-URL, altes SVG für versendete Mails erhalten |

Keine dieser noch nicht gelieferten Dateien wird referenziert oder die bestehenden Icons/Produkt-/Mail-Assets ersetzt.

## Accessibility vorab

- Bestehendes mobiles Marketingmenü: versteckte Links sind nicht semantisch verborgen, kein aria-controls, keine Escape-Behandlung.
- Bisher kein Skip-Link; Footer im Main; einige dekorative SVGs ohne explizites aria-hidden.
- Sprachumschalter hat aria-pressed, aber kein Group-Role; kompakte Schaltflächen unter 44 px. Für Homepage per Wrapper und lokalem CSS verbessern.
- Haltungsseite: großes Blockquote vor H1, object-Logo, teils sehr kleiner CTA-Text. Bleibt als gesonderter Follow-up bestehen.
- Rechtliche Seiten aktuell deutsch, auch bei englischer Locale. Keine rechtlichen Übersetzungen oder Inhaltsänderungen in diesem Pass.
