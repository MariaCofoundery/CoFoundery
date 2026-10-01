# CONNECT — Ist-Zustand (Phase 7, Teil 1)

**Stand:** 02.10.2026 · `main` nach Phase 6.1 (`e0112f9`) · **Grundlage:**
aktueller Code, jeweils letzte Fassung jeder Migration, lokale Datenbank.
Keine Specs, keine älteren Konzepte.

Dieses Dokument beschreibt ausschließlich, was heute existiert. Zielbild:
`connect-v2-product-architecture.md`. Lücken und Reihenfolge:
`connect-v2-gap-plan.md`.

**Namen:** Tabellen, Funktionen und der Speicher-Eimer heißen `network_*`, die
URLs `/connect` (`20260906120000_rename_public_network_paths_to_connect`;
`/network/*` leitet weiter). **Zugang:** Fast jeder Schreibweg prüft
`is_network_member()` — eine aktive Zeile in `network_memberships`.

Abkürzungen: `M/` = `supabase/migrations/`, `W/` = `web/src/`.

---

## 1. Objekte

### Übersicht

| Objekt | Tabelle | Besitz | Status | Sichtbarkeit | öffentliche Route | Zeilen lokal |
|---|---|---|---|---|---|---|
| Mitgliedschaft | `network_memberships` | `user_id` | `active` · `suspended` | nur eigene Zeile | — | 4 |
| Person (Connect-Profil) | `network_profiles` | `user_id` (PK) | `draft` · `active` · `paused` | `members_only` · `public` | `/connect/p/[slug]` | 0 |
| Eintrag (Suche/Angebot) | `network_listings` | `owner_user_id` | `draft` · `active` · `paused` · `completed` (+ abgeleitet „abgelaufen") | `members_only` · `public` | `/connect/l/[slug]` | 0 |
| Unternehmen/Projekt | `network_ventures` | `owner_user_id` | `active` · `hidden` | **keine eigene** — folgt dem Profil | nur eingebettet in `/connect/p/[slug]` | 0 |
| Problem | `network_problems` | `author_user_id` (nullable: anonymisiert nach Kontolöschung) | `draft` · `active` · `withdrawn` · `resolved` | `members_only` · `public` | `/connect/pr/[slug]` | 0 |
| Lösungsansatz | `network_problem_approaches` | `author_user_id` | `active` · `withdrawn` | keine — Mitglieder, wenn Problem aktiv | nie | 0 |
| „Kenne ich auch" | `network_problem_confirmations` | `user_id` | — | nur eigene Zeile; Anzahl je Perspektive für Mitglieder | nie | 0 |
| „Ich würde daran arbeiten" | `network_problem_interests` | `user_id` | — | eigene + Gegenüber (Problem- bzw. Ansatz-Autor:in) | nie | 0 |
| Ressource | `person_resources` | `user_id` → `person_core` | `pending` · `confirmed` · `rejected` | **nur eigene Zeile** | nie | 0 |
| Vorschlag | `connect_suggestions` | `recipient_user_id` | offen / `dismissed_at` | nur Empfänger:in | nie | 0 |
| Kontaktanfrage | `network_contact_requests` | Absender:in/Empfänger:in | `pending` · `accepted` · `declined` · `canceled` | Beteiligte | nie | — |
| Unterhaltung, Nachricht | `network_conversations`, `network_messages` | Beteiligte | — | Beteiligte | nie | — |
| Gespeicherte Suche | `saved_searches` (`context='connect'`), `saved_search_hits` | `user_id` | `notify` | nur eigene | nie | — |
| Beta-Einladung | `network_signup_intents` | — | Ablauf ≤ 2 h | nur `service_role` | — | 0 |

**Gibt es nicht:** Organisationen mit mehreren Mitgliedern, Themen- oder
Kategorie-Objekte, Lösungen als eigenes Objekt (nur „Ansätze"),
Opportunities, Arbeitsräume, Kommentare, Notizen.

**Vokabular.** Fest (DB-Constraint und `W/features/connect/connectTypes.ts`):
Richtung `seeking`/`offering`; Kategorie `expertise`, `cooperation`,
`investment`, `sparring`, `succession`; Rollen `founder`, `aspiring_founder`,
`expert`, `advisor_mentor`, `business_angel`, `company_representative`
(max. 4); `remote_mode`; `geographic_scope` `regional`/`germany`/`europe`/
`global`; Vorhabensphase; Problem-Absicht `observation`/`wants_to_build`/
`already_building`; Perspektive `affected`/`professional`/`observed`;
Ressourcenart `network`/`access`/`offer`. **Frei:** Themen, Branchen,
Expertise, Orte — Kommalisten ohne Wertebereich.

### 1.1 Person — `network_profiles`

- **Inhalt:** Name, Headline, Bio, Region, Remote-Modus, Expertise und Branchen
  werden aus `person_core` übernommen (`parseConnectProfile`,
  `connectValidation.ts:46`) — im Connect-Formular nicht editierbar. Eigen sind
  Rollen, `network_reach`, `open_to_formats`, `contact_note`, `suggestable`,
  Foto, Sichtbarkeit.
- **Anlegen/Bearbeiten:** `/connect/profile` → `saveConnectProfileAction`
  (Upsert). **Löschen:** kein Weg in der App (nur über Kontolöschung).
- **Status:** „Veröffentlichen" → `active` (verlangt vollständige Angaben),
  „Entwurf speichern" → `draft` — **und nimmt ein aktives Profil damit vom
  Netz**. `paused` setzt nichts.
- **Sichtbarkeit:** Auswahl `ConnectVisibilityField`; der erste Wechsel auf
  `public` verlangt eine Bestätigung.
- **Mitglieder** sehen jedes aktive Profil (RLS), unabhängig von `visibility`.
- **Öffentlich** über `get_public_network_profile`: Slug, Name, Headline, Bio,
  Rollen, Expertise, Branchen, Region. Dazu die öffentlichen Einträge des
  Profils, seine Unternehmen (`list_public_network_profile_ventures`) und —
  getrennt freigegeben — LinkedIn. **Kein Foto, immer Initialen**
  (`20260907200000`). Reichweite, Formate und Kontakthinweis nie öffentlich.
- **Eingeloggte Routen:** `/connect/people`, `/connect/people/[userId]`,
  `/connect/people/[userId]/contact`.
- **Foto:** `/api/connect/photos/[userId]`, nur Mitglieder, aus dem privaten
  Eimer `network-profile-images` (seit Phase 6 auch als Kopie des Basisfotos).

### 1.2 Eintrag — `network_listings`

- Felder: Richtung, Kategorie, Titel, Kurzbeschreibung, Themen (≤ 8), Branchen
  (≤ 5), Orte (≤ 3), Reichweite, Remote, Zeitraum, Phase; `search_text`.
- **Anlegen** `/connect/listings/new`, **bearbeiten**
  `/connect/listings/[id]/edit` → `saveConnectListingAction`. Beim
  Veröffentlichen: Abgleich mit gespeicherten Suchen und ein KI-Auftrag
  (`connect_resource_extraction`).
- **Lebenszyklus:** `ConnectLifecycleForm` → pausieren, abschließen,
  veröffentlichen/erneuern. Aktiv heißt höchstens 60 Tage; „abgelaufen" ist
  kein Status, sondern `active` mit `expires_at <= now()`. **Löschen:** keine
  App-Funktion (die Policy existiert).
- **Mitglieder** sehen aktive, nicht abgelaufene Einträge mit aktivem
  Besitzerprofil; `visibility` spielt dafür keine Rolle.
- **Öffentlich:** `get_public_network_listing` — Inhalt plus Name und Headline
  der Person; Profil-Slug nur, wenn das Profil selbst öffentlich ist.
- **Eingeloggt:** `/connect` (Liste mit Filtern), `/connect/listings/[id]`,
  `/connect/listings/[id]/contact`, `/connect/my`.

### 1.3 Unternehmen/Projekt — `network_ventures`

- Bis zu 5 je Person (Trigger). Name, Rolle, Was es tut, Für wen, Motivation,
  Website, Logo. **Keine Slug-, keine Sichtbarkeitsspalte, keine Mitglieder.**
- Verwalten `/connect/ventures/mine`; ausblenden/einblenden; **hartes Löschen**
  inklusive Logo.
- Sichtbar für Mitglieder, wenn das Besitzerprofil aktiv ist; öffentlich nur
  eingebettet in ein öffentliches Profil (ohne Logo).
- Eingeloggt: `/connect/ventures`, `/connect/ventures/[id]`. Logo über
  `/api/connect/venture-logos/[id]`.
- **Keine Verbindung zu `founder_teams`** (dem „Vorhaben" in Align) — in
  keine Richtung.

### 1.4 Problem — `network_problems` und Kinder

- Titel (5–120), Beschreibung (50–2000), Absicht, Themen, Branchen, Orte,
  Reichweite; Zähler `interest_count`, `confirmation_count` per Trigger.
- **Anlegen** `/connect/problems/new`, **bearbeiten** `.../[id]/edit`.
  Status-Wechsel auf der Detailseite: Entwurf → veröffentlichen; aktiv →
  gelöst oder zurückgezogen. **Zurückholen** eines zurückgezogenen oder
  gelösten Problems: keine Oberfläche (die Aktion könnte es). Kein Ablauf.
- **Mitglieder** sehen jedes aktive Problem — anders als bei Einträgen ohne
  Prüfung, ob das Profil der Autorin aktiv ist.
- **Öffentlich:** `get_public_network_problem` — nur Problemtext, Schlagworte,
  Name/Headline der Autorin. **Nie** Ansätze, Bestätigungen, Interessen.
- **Kontolöschung:** Problem und Ansätze werden gelöscht oder auf Wunsch
  anonym behalten (`outlives_account`).
- **Ansätze:** ein Ansatz je Person und Problem (Was, Für wen, Was fehlt),
  zurückziehbar. **Bestätigungen:** anonym, nur Zählung je Perspektive, keine
  Benachrichtigung. **Interessen:** mit Notiz an Problem- oder Ansatz-Autorin;
  „Annehmen" öffnet eine Unterhaltung (`accept_network_problem_interest`).

**Einen privaten oder eingeladenen Problemraum gibt es nicht** — ebenso keine
Beteiligtenliste, keine Kommentare, keine Notizen. Das Schema sagt
ausdrücklich „keine Likes, keine Kommentare".

### 1.5 Ressourcen — `person_resources`

- Liegen an der Person (`person_core`), nicht an Connect. Selbst eingetragen
  (`/profile?step=resources`) oder als Vorschlag des KI-Auftrags aus einem
  veröffentlichten Eintrag (`pending`, mit wörtlichem Beleg), bestätigt oder
  verworfen auf `/connect/profile` und `/profile`.
- **Nur die Person selbst sieht sie.** Es gibt keine Freigabe und keine
  Verwendung in Connect.

### 1.6 Rollen- und Einladungsmodelle anderswo in der App

| Modell | Rollen | Token | Ablauf | Annahme |
|---|---|---|---|---|
| `invitations` (Mitgründung) | — | SHA-256, rotierbar | 14 Tage | `/join` → `accept_invitation`, an E-Mail gebunden → Beziehung → Team |
| `advisor_person_invites` | Bereiche (`scopes[]`) | SHA-256 | 30 Tage | `claim_advisor_person_invite`, an E-Mail gebunden; erzeugt erst eine *Anfrage* |
| `advisor_orgs` / `advisor_org_members` / `advisor_org_invites` | `owner` · `advisor`; Status `active` · `revoked` | SHA-256 | 30 Tage | `claim_advisor_org_invite`, an E-Mail gebunden; Hilfsfunktion `is_advisor_org_member()` gegen Policy-Rekursion |
| `founder_teams` / `founder_team_members` | **keine** | — | — | entsteht über Einladung, Matching oder `create_solo_venture()`; **max. 3 Mitglieder** (Trigger), keine Schreibrechte vom Client |

Das „Vorhaben" der Anwendung ist `founder_teams` (`assessments.venture_id`
zeigt darauf, Routen `/founder-alignment/vorhaben/*`).

---

## 2. Sichtbarkeit

| Objekt | anonym | eingeloggte Mitglieder | Kontakte | Eingeladene | nur ich |
|---|---|---|---|---|---|
| Person | wenn `public` + `active` | jedes aktive Profil | — | — | Entwurf |
| Eintrag | wenn `public` + aktiv + nicht abgelaufen | aktiv + nicht abgelaufen | — | — | Entwurf, pausiert, abgeschlossen, abgelaufen |
| Unternehmen | eingebettet in öffentliches Profil | aktiv, Profil aktiv | — | — | `hidden` |
| Problem | wenn `public` + `active` | jedes aktive | — | — | Entwurf, zurückgezogen, gelöst |
| Ansatz | nie | aktiv, auf aktivem Problem | — | — | zurückgezogen |
| Bestätigung | nie | nur Zahl | — | — | eigene Zeile |
| Interesse | nie | — | Gegenüber | — | eigene Zeile |
| Fähigkeitsbereiche | nie | wenn `capability_disclosure` ≠ `private` | Tiefe nur bei `areas_depth_on_contact` **und** angenommenem Kontakt | — | Voreinstellung |
| Ressourcen | nie | nie | nie | nie | immer |
| Vorschläge, gespeicherte Suchen | nie | nie | — | — | immer |

**Wählbar in der Oberfläche:** `members_only` / `public` für Profil, Eintrag
und Problem — mit Bestätigung beim ersten Wechsel auf öffentlich. Alles
andere gilt **implizit** über Status und RLS. Eine Stufe „Kontakte" oder
„eingeladen" gibt es für kein Connect-Objekt.

**Was Mitglieder sehen, hängt nicht an `visibility`.** `members_only` und
`public` unterscheiden sich nur für Anonyme.

**Suchmaschinen:**
- `sitemap.ts` + `list_public_network_sitemap()`: `/connect/p/`, `/connect/l/`,
  `/connect/pr/` — jeweils nur öffentlich und aktiv.
- `robots.ts`: erlaubt diese drei Präfixe; sperrt u. a. `/connect$`,
  `/connect/contacts`, `/connect/messages`, `/connect/my`, `/connect/profile`,
  `/connect/listings/`. **Nicht gesperrt:** `/connect/problems`,
  `/connect/people`, `/connect/ventures`, `/connect/searches`,
  `/connect/suggestions` — dort schützt nur die Weiterleitung auf `/login`.
- Öffentliche Seiten setzen `index, follow` und eine Canonical-URL; nicht
  gefundene `noindex`. Mitgliederseiten tragen kein `noindex`.
- `X-Robots-Tag` nur auf `/api/profile/photo/…`, nicht auf den Connect-Foto-
  und Logo-Routen (die ohnehin eine Sitzung verlangen).

---

## 3. Interaktionen

| Aktion | gibt es? | Weg | Benachrichtigung |
|---|---|---|---|
| Kontaktanfrage zu einem Eintrag | ja | `request_network_contact` | ja (In-App, E-Mail, Push) |
| Kontaktanfrage an eine Person | ja | `request_network_person_contact` | ja |
| Annehmen / ablehnen / zurückziehen | ja | `respond_…`, `cancel_network_contact` | nein |
| Nachrichten | ja | `/messages/[id]`, `send_network_message` | ja (gedrosselt) |
| Blockieren | ja, **nur nach Kontaktanfrage** | `block_network_user` | — |
| Melden | ja, **nur zu einer Kontaktanfrage** | `report_network_interaction` | — |
| „Kenne ich auch" | ja | `network_problem_confirmations` | bewusst nein |
| „Ich würde daran arbeiten" | ja | `network_problem_interests` | ja |
| Lösungsansatz | ja — **schlägt aktuell fehl**, siehe Gap-Plan | `network_problem_approaches` | Interesse daran: ja |
| Suche merken | ja | `saved_searches` | E-Mail |
| Vorschläge ausblenden | ja | `connect_suggestions.dismissed_at` | Push/E-Mail täglich |
| Folgen, Merken/Lesezeichen, Kommentare, Reaktionen, Teilen-Knopf | **nein** | — | — |
| Einladung in Connect | **nein** (`issueConnectSignupIntent` wird nirgends aufgerufen) | — | — |
| Einladung in ein Problem | **nein** | — | — |

Alle Benachrichtigungen laufen über `notifyNetwork`
(`W/features/notifications/networkNotification.ts`): In-App-Hinweis, Claim
(`claim_network_notification`, prüft Opt-out und Mitgliedschaft), dann E-Mail
und Push. **Gemeldete Inhalte** werden gespeichert, aber es gibt keine
Moderationsoberfläche — und keine Plattform-Admin-Rolle überhaupt.

---

## 4. Highlights („Aus dem Netzwerk")

- **Wo:** `/connect` (`page.tsx`) → `getConnectHighlights`
  (`W/features/connect/connectHighlightData.ts`) → `ConnectHighlight.tsx`.
  Hinweis in der Oberfläche: „Zufällig ausgewählt, wechselt bei jedem Aufruf".
- **Objektarten:** Eintrag (sucht), Eintrag (bietet), Unternehmen, Person.
  **Probleme nie.**
- **Auswahl:** drei Abfragen holen je die **30 neuesten** aktiven Zeilen;
  Fisher-Yates mit `Math.random`; danach reihum je Art, bis drei Karten
  stehen. Echt zufällig — **aber nur innerhalb der 30 neuesten je Art**; was
  älter ist, erscheint nie. Kein Gewicht, keine Priorität.
- **Lücken:** `suggestable = false` wird ignoriert, Blockierungen werden
  ignoriert, das eigene Profil kann erscheinen (mit Kennzeichnung).
- **Vorbereitet, nicht benutzt:** `HIGHLIGHT_DISCLOSURES = none · editorial ·
  sponsored` mit den Texten „Von uns hervorgehoben" und „Anzeige"; jede Karte
  ist fest `none`, ein Test sichert, dass nichts gesponsert ist. Ein
  Auswahlfilter (`ConnectHighlightSelection`) existiert, wird nie übergeben —
  und würde mit Themenwahl alle Unternehmen ausschließen.
- **Admin:** keine Felder, keine Oberfläche, keine Rolle.

---

## 5. Empfehlungen

### Vorschläge — `connect_suggestions`

- **Erzeugung:** deterministisches SQL, kein Modell.
  `generate_connect_suggestions_for(user, 3)` — beim Aufruf von `/connect` und
  `/connect/suggestions`, zusätzlich täglich per Vercel-Cron
  (`web/vercel.json`, `0 7 * * *` → `/api/cron/connect-suggestions`).
- **Signale** (`connect_match_terms`): eigene Expertise und Branchen, Themen
  und Branchen der eigenen aktiven *suchenden* Einträge und eigenen aktiven
  Probleme. Kleingeschrieben, ≥ 3 Zeichen.
- **Kandidaten in fester Reihenfolge:** anbietende Einträge → Probleme →
  Unternehmen (Teilstring in `search_text`) → Personen (nur `suggestable`).
  Überschneidung genügt, **keine Bewertung**, innerhalb einer Stufe neueste
  zuerst. Höchstens 3 je 7 Tage. Ausgeschlossen: Eigenes, Nichtmitglieder,
  inaktive Profile, Blockierte, schon Vorgeschlagenes.
- **Begründung** steht in `matched_terms` und wird angezeigt („weil …").
- **Benachrichtigung:** täglich, Push voreingestellt, E-Mail nur mit Opt-in,
  Inhalt nur eine Anzahl.

### Gespeicherte Suchen

Beim Veröffentlichen eines Eintrags oder Problems gegen alle gespeicherten
Suchen mit `notify` anderer Personen: alle gesetzten Kriterien müssen passen
(Text, Themen, Branchen, Orte, Reichweite, Richtung, Kategorie, Remote,
Fähigkeitsbereiche — Letztere nur bei freigegebener `capability_disclosure`).
Prüft weder Blockierungen noch die aktuelle Mitgliedschaft der Suchenden.

### Suche und Sortierung

Überall Filter plus `ilike` auf `search_text`, sortiert nach Aktualität,
Limit 50–60. **Kein Ranking, keine Volltextsuche.** Probleme ausdrücklich
„nie nach Interesse".

### Verhaltensdaten

**Keine.** Es gibt kein Klick-, Ansichts- oder Impressions-Tracking in
Connect. `research_events` verlangt Forschungs-Einwilligung und betrifft nur
Fragebögen.

---

## 6. Datenflüsse, die heute schon bestehen

| Fluss | Wohin | Auslöser |
|---|---|---|
| KI-Ressourcenvorschläge | lokales Modell (`web/scripts/ai-worker.ts`, Ollama), Ergebnis nur an die Person | Veröffentlichen eines Eintrags |
| Benachrichtigungen | Resend (E-Mail), Web Push | Kontakt, Interesse, Nachricht, Vorschläge |
| Gespeicherte Suchen | E-Mail mit Titel und Link an andere Mitglieder | Veröffentlichen — **auch bei `members_only`** |
| Öffentliche Seiten | Web, Suchmaschinen | `visibility = public` |
| Export/Löschung | `accountExport.ts`; `prepare_network_content_for_account_deletion` | Konto |
