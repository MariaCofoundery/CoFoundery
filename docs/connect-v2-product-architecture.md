# CONNECT v2 — Produktarchitektur (Phase 7, Teil 2)

**Stand:** 02.10.2026 · **Status:** Spezifikation, nichts davon ist gebaut.
Grundlage ist `connect-v2-current-state.md`; was dort steht, gilt als
Ausgangslage, nicht als Annahme.

Wo der Produktname in Oberflächentexten vorkommt, steht `{brand}` — heute
`CoFoundery`, Zielname `Made2Found` (siehe `features/brand.ts`).

---

## 0. Leitlinien

1. **Arbeitsinhalt und öffentliche Darstellung sind zwei Dinge.** Was in
   einem privaten Raum entsteht, wird nie dadurch sichtbar, dass jemand eine
   Einstellung umschaltet. Veröffentlichen heißt: eine Darstellung erzeugen,
   ansehen, freigeben.
2. **Sichtbarkeit ist eine Eigenschaft des Objekts, Status seines
   Lebenszyklus.** Ein Entwurf ist nicht „privat sichtbar", sondern noch nicht
   veröffentlicht. Beides bleibt getrennt — so ist es heute schon gebaut.
3. **Discovery ist nicht Matching.** CONNECT schlägt vor, was gerade relevant
   sein könnte. FIND ordnet Menschen nach einem ausdrücklichen Suchwunsch.
   Zwei Fragen, zwei Modelle, nie ein gemeinsamer Score.
4. **Jede Hervorhebung sagt, warum sie da ist.** Entdeckt, empfohlen,
   Wirkung, Anzeige — vier verschiedene Gründe, vier verschiedene Kennzeichen.
   Bezahlung beeinflusst nie die organische Reihenfolge.
5. **Nichts erfinden, was das Produkt nicht belegt.** Empfehlungen begründen
   sich mit den Angaben, die sie benutzt haben — so wie `matched_terms` es
   heute tut.

---

## 1. Sichtbarkeitsmodell

### Vier Stufen — als Produktsprache, nicht als neuer Enum-Wert

| Stufe | Wer sieht es | Oberflächentext |
|---|---|---|
| **Privat** | nur Besitzer:in | „Nur du" |
| **Eingeladen** | Besitzer:in + konkret eingeladene Personen | „Du und die Personen, die du einlädst" |
| **Mitglieder** | angemeldete {brand}-Connect-Mitglieder | „Mitglieder von {brand}" |
| **Öffentlich** | ohne Anmeldung, auffindbar | „Öffentlich im Web" |

**Warum nicht einfach `visibility` um zwei Werte erweitern:** Für Profile,
Einträge und Probleme bedeutet `visibility` heute nur „auch für Anonyme oder
nicht" — Mitglieder sehen alles Aktive, und alle RLS-Policies, die
Sitemap-Funktion und die öffentlichen RPCs sind darauf gebaut. „Privat" und
„eingeladen" in diese Spalte zu legen, hieße, jede dieser Policies umzubauen
und für Problem-Bestätigungen, Interessen, Vorschläge und gespeicherte Suchen
neu zu entscheiden. Statt dessen:

- **Mitglieder/Öffentlich** bleiben `members_only`/`public` auf den
  bestehenden, veröffentlichbaren Objekten.
- **Privat/Eingeladen** gibt es nur auf dem neuen **Arbeitsraum** (§2) — einem
  eigenen Objekt mit eigener Mitgliedertabelle. Er hat keine Stufe
  „Mitglieder" oder „Öffentlich"; dafür gibt es den Publish-Schritt (§4).

### Erlaubte Stufen je Objekt

| Objekt | Privat | Eingeladen | Mitglieder | Öffentlich | Bemerkung |
|---|---|---|---|---|---|
| Person (Connect-Profil) | — (= Entwurf) | — | ✓ Standard | ✓ mit Bestätigung | Foto öffentlich nie |
| Eintrag | — (= Entwurf) | — | ✓ Standard | ✓ mit Bestätigung | |
| Unternehmen/Projekt | — (= `hidden`) | — | ✓ über Profil | ✓ über öffentliches Profil | eigene Sichtbarkeit: Entscheidungsfrage |
| Problem (Brett) | — (= Entwurf) | — | ✓ Standard | ✓ mit Bestätigung | entsteht neu auch aus einem Arbeitsraum |
| Lösungsansatz auf dem Brett | — | — | ✓ | **nie** | |
| „Kenne ich auch", Interesse | — | — | nur Zahl / nur Gegenüber | **nie** | |
| **Arbeitsraum** | ✓ Standard | ✓ | **nie** | **nie** | Inhalte verlassen ihn nur über Publish |
| Opportunity | ✓ (im Raum) | ✓ (im Raum) | — | — | Teil des Arbeitsraums |
| Ressource | ✓ Standard | — | ✓ nach Freigabe | **nie einzeln** | Freigabe wie `capability_disclosure` |
| Organisation | — | — | ✓ | ✓ | gibt es noch nicht — Entscheidungsfrage |
| Vorschlag, gespeicherte Suche | ✓ immer | — | — | — | |

---

## 2. Problem-Arbeitsraum

### Was er ist

Ein kleiner Raum, in dem eine Person ein beobachtetes Problem mit ausgewählten
anderen durchdenkt. Kein Post, kein Projektmanagement. Der Weg:

```
beobachten → beschreiben → einladen → Perspektiven sammeln
   → Annahmen & offene Fragen → Lösungsansätze → Tests
   → (bewusst) Opportunity festhalten → (bewusst) Vorhaben erstellen
```

### Was davon heute schon existiert

| Schritt | heute | im Arbeitsraum |
|---|---|---|
| Problem beschreiben | `network_problems` (aber nur Mitglieder/öffentlich) | neu, privat |
| Perspektiven | „Kenne ich auch" mit Perspektive — anonym, ohne Text | neu, mit Text und Autor:in |
| Lösungsansätze | `network_problem_approaches` — einer je Person, öffentlich für Mitglieder | neu, mehrere nebeneinander |
| Personen einladen | nichts | neu |
| Annahmen, Tests, Opportunity | nichts | neu |

Die Brett-Objekte sind für eine offene Frage an viele gebaut (anonym zählen,
einer Person ein Interesse zeigen). Ein Arbeitsraum ist das Gegenteil: wenige
Menschen, namentlich, mit Text. **Deshalb ein eigenes Objekt, nicht ein
„privates Problem" auf dem Brett.**

### MVP-Inhalt

**Raum** — Titel · Beschreibung · Warum relevant · Wen betrifft es · Status
(`open` · `archived`) · Besitzer:in · optional verknüpftes Brett-Problem ·
optional verknüpftes Vorhaben.

**Beteiligte** — Person · Rolle (`owner` · `contributor` · `viewer`) ·
Einladungsstatus (`invited` · `active` · `left` · `removed`).

**Einträge** — eine typisierte Liste statt sechs Tabellen:

| Art | Bedeutung |
|---|---|
| `observation` | Beobachtung / Hinweis |
| `perspective` | Sicht einer beteiligten Person |
| `assumption` | Annahme oder offene Frage |
| `approach` | Lösungsansatz — mehrere dürfen nebeneinander stehen |
| `test` | Was müsste geprüft werden? (mit Status `offen` · `geprüft` · `verworfen`) |

Jeder Eintrag: Art · Text · Autor:in · Zeit · optional Bezug auf einen anderen
Eintrag (ein Test prüft eine Annahme). **Keine** Zuweisungen, Fristen,
Aufgabenlisten, Reaktionen.

**Opportunity** — kein eigener Eintrag, sondern ein bewusster Zustand des
Raums: ein Satz „Daraus könnte entstehen: …" plus Zeitpunkt und Person, die
ihn festgehalten hat (§3).

### Rechte

| Aktion | owner | contributor | viewer |
|---|---|---|---|
| Raum und Einträge lesen | ✓ | ✓ | ✓ |
| Einträge schreiben | ✓ | ✓ | — |
| eigene Einträge bearbeiten/löschen | ✓ | ✓ | — |
| fremde Einträge löschen | ✓ | — | — |
| Personen einladen | ✓ | — (Entscheidungsfrage) | — |
| Rollen ändern, Personen entfernen | ✓ | — | — |
| Titel/Beschreibung ändern | ✓ | — | — |
| Opportunity festhalten | ✓ | ✓ vorschlagen, owner bestätigt | — |
| veröffentlichen (§4) | ✓ | — | — |
| Vorhaben erstellen (§3) | ✓ | — | — |
| Raum archivieren/löschen | ✓ | — | — |
| Raum verlassen | — (erst übergeben) | ✓ | ✓ |

Genau eine Person ist `owner`. Übergabe der Besitzrolle ist im MVP ein
expliziter Schritt; verlässt die Besitzerin ihr Konto, wird der Raum mit ihr
gelöscht, es sei denn, sie hat ihn vorher übergeben.

### Einladungen

Wiederverwendet wird das **Muster** von `advisor_org_invites`, nicht die
Tabelle: zufälliger Token, nur der SHA-256-Hash gespeichert, Ablauf 30 Tage,
Annahme über eine SECURITY-DEFINER-Funktion, **an die eingeladene E-Mail
gebunden**, Mitgliedschaftsprüfung über eine Hilfsfunktion
(`is_workspace_member()`), damit Policies nicht rekursiv werden. Wer eine
Einladung annimmt, wird Connect-Mitglied, falls noch nicht (Entscheidungsfrage).

---

## 3. Vom Problem zum Vorhaben

**Kein Automatismus.** Ein Problem ist kein Startup, und ein Raum mit vielen
Lösungsansätzen ist noch keine Geschäftsidee. Zwei bewusste Schritte:

1. **„Als Opportunity festhalten"** — im Raum. Ein Satz, wer ihn festhält,
   wann. Ändert nichts an Sichtbarkeit oder Beteiligten. Rücknehmbar.
2. **„Vorhaben daraus erstellen"** — nur die Besitzerin. Erzeugt ein
   **`founder_teams`**-Vorhaben (das kanonische „Vorhaben" der Anwendung, dort
   hängen Venture-Alignment und Team-Setup) über denselben Weg wie
   `create_solo_venture()`. Der Raum merkt sich die Verknüpfung; das Vorhaben
   kennt seinen Ursprung.
   - **Beteiligte werden nicht automatisch Gründer:innen.** Wer
     mitgründen soll, wird über die bestehende Mitgründungs-Einladung
     eingeladen — `founder_teams` erlaubt höchstens drei Personen, und
     Mitgründen ist eine eigene Zustimmung.
   - **`network_ventures` bleibt, was es ist:** die Schaufenster-Karte am
     Profil. Wer sein neues Vorhaben in Connect zeigen will, legt dort eine
     Karte an; optional zeigt sie auf das `founder_teams`-Vorhaben. **Keine
     zweite Venture-Tabelle in Connect.**

---

## 4. Veröffentlichen aus einem privaten Raum

```
Arbeitsraum (privat/eingeladen)
   │  „Problem teilen"  — nur owner
   ▼
Vorschau: Titel, Beschreibung, Schlagworte, Absicht, Orte, Reichweite
   │  Felder sind KOPIEN, einzeln bearbeitbar, aus dem Raum vorbefüllt
   │  Sichtbarkeit wählen: Mitglieder · öffentlich (mit Bestätigung)
   ▼
Brett-Problem (`network_problems`) mit Verweis auf den Raum
```

- **Nie mitveröffentlicht:** Einträge, Annahmen, Tests, Beteiligte, die
  Opportunity, Namen der Mitwirkenden. Wer genannt werden möchte, entscheidet
  das selbst (Entscheidungsfrage).
- **Keine Live-Kopie.** Ändert sich der Raum, ändert sich das Brett-Problem
  nicht. Erneut veröffentlichen ist wieder ein bewusster Schritt mit Vorschau.
- **Zurückziehen** des Brett-Problems berührt den Raum nicht; den Raum zu
  löschen zieht das Brett-Problem nicht automatisch zurück, sondern fragt.
- Damit ist „Arbeitsinhalt vs. öffentliche Darstellung" im Datenmodell
  sauber getrennt: zwei Zeilen, zwei Tabellen, eine bewusste Brücke.

---

## 5. Empfehlungen

### FIND und CONNECT — zwei Fragen

| | FIND | CONNECT |
|---|---|---|
| Frage | Welche Person passt zu **meinem konkreten** Co-Founder-Suchwunsch? | Welche Person, Organisation, Ressource oder welches Problem könnte für mich **gerade** relevant sein? |
| Art | gerichtetes Matching, Reihenfolge nach erklärten Prioritäten | Discovery, Vorschlag mit Begründung |
| Eingabe | Suchwunsch je Thema, Reihenfolge, Ausschlüsse (`discovery_preferences`) | eigene Angaben, Aktivität, Kontext |
| Ergebnis | geordnete Liste, ein „passt nicht" beim wichtigsten Thema bleibt unten | wenige Karten, jede mit „weil …" |
| Ablehnung | Teil der Logik (Ausschlusskriterien) | folgenlos: ausblenden |
| Score | lexikographische Ordnung, keine Summe | Relevanz innerhalb einer Karte, nie über Personen vergleichbar ausgegeben |

**Sie teilen keinen Score und keine Gewichte.** Sie dürfen Signale teilen
(Branchen, Region), aber jede Seite entscheidet selbst, was ein Signal wert
ist. FIND-Suchwünsche fließen nicht in CONNECT-Vorschläge und umgekehrt.

### Signale

| Signal | vorhanden? | Quelle | Qualität | Sichtbarkeit heute | für Empfehlungen? |
|---|---|---|---|---|---|
| Expertise, Branchen | ja | `person_core` → `network_profiles` | Freitext, uneinheitlich | Mitglieder | ✓ (wird schon genutzt) |
| Interessen/Themen | teilweise | Themen an Einträgen und Problemen | Freitext | Mitglieder | ✓ |
| Region, Remote | ja | `network_profiles.location_region`, `remote_mode` | Region Freitext | Mitglieder | ✓ (grob) |
| Rollen, Offenheit (Formate) | ja | `network_roles`, `open_to_formats` | fest | Mitglieder | ✓ |
| Fähigkeitsbereiche | ja | `person_capability_entries` | gut, fest | nur nach `capability_disclosure` | nur bei Freigabe ≠ `private` |
| Ressourcen | ja | `person_resources` | gut (bestätigt) | **nur die Person** | **nein**, bis es eine Freigabe gibt |
| Angebote / Gesuche | ja | `network_listings.direction` | gut | Mitglieder | ✓ (wird schon genutzt) |
| Probleme | ja | `network_problems` | gut | Mitglieder | ✓ (wird schon genutzt) |
| Arbeitsraum-Inhalte | — | geplant | — | privat/eingeladen | **nie** |
| Unternehmenskontext | ja | `network_ventures` | Freitext, keine Schlagworte | Mitglieder | ✓ (Teilstring) |
| Bestehende Beziehungen | ja | Kontakte, Unterhaltungen, Blockierungen | gut | Beteiligte | nur als **Ausschluss** (Blockierung) und um Bekanntes nicht erneut vorzuschlagen |
| Gespeicherte Suchen | ja | `saved_searches` | gut, ausdrücklich | nur die Person | ✓ für die Person selbst |
| Ausgeblendete Vorschläge | ja | `connect_suggestions.dismissed_at` | gut | nur die Person | ✓ als negatives Signal |
| Klicks, Ansichten | **nein** | — | — | — | erst nach eigener Entscheidung (Datenschutz) |
| Aktualität | ja | `published_at`, `updated_at` | gut | Mitglieder | ✓ |
| `suggestable` | ja | `network_profiles` | Opt-out | — | **bindend**, auch für Highlights |

Für Phase 7 wird kein Score gebaut. Vorbereitet wird nur: Signale haben eine
Herkunft, eine Sichtbarkeitsklasse und ein Nutzungsrecht — und eine
Empfehlung kann immer sagen, welche Signale sie benutzt hat.

---

## 6. Highlights

### Vier Arten, vier Kennzeichen

| Art | Wie ausgewählt | Kennzeichen | Begründung sichtbar |
|---|---|---|---|
| **Entdeckt** | algorithmisch/explorativ: Zufall über alle aktiven Objekte (nicht nur die 30 neuesten), später leicht nach Relevanz gewichtet | „Entdeckt" + „Zufällig ausgewählt" bzw. „Weil du … angegeben hast" | ja |
| **Empfohlen** | redaktionell, von {brand} | „Von {brand} empfohlen" | ein Satz, warum |
| **Impact** | redaktionell, wegen einer benannten Wirkung | „Impact-Auswahl · Nachhaltigkeit" (bzw. soziale Wirkung, Tierwohl, gesellschaftlicher Nutzen) | Kategorie + ein Satz |
| **Gesponsert** | bezahlt | „Anzeige" — immer, gut lesbar, mit Auftraggeber:in | wer bezahlt hat |

### Regeln

- **Gesponsert sieht nie aus wie eine Empfehlung:** eigener Kartenrahmen,
  „Anzeige" vor dem Inhalt, nie in derselben Reihe gemischt ohne
  Kennzeichnung, nie mehr als eine von drei Karten.
- **Gesponsertes fließt nirgends sonst ein:** nicht in Vorschläge, nicht in
  Suchergebnisse, nicht in die Sortierung, nicht in FIND.
- **Impact ist keine bezahlte Kategorie.** Wird für Impact bezahlt, ist es
  „Anzeige".
- **Alle Highlights respektieren** Blockierungen, `suggestable` (für
  Personen) und die Sichtbarkeit des Objekts — redaktionell hervorgehoben wird
  nur, was Mitglieder ohnehin sehen dürfen.
- **Probleme** werden Highlight-fähig (heute ausgeschlossen).

### Minimales Redaktionssystem

Eine Hervorhebung: Objekt (Art + ID) · Art (`editorial` · `impact` ·
`sponsored`) · Kennzeichen-Text · Begründung · Impact-Kategorie · bei Anzeige:
Auftraggeber:in · Start · Ende · Priorität · `active`/`paused` · optional
Kontext (z. B. nur auf `/connect/problems`).

Bedienung: eine Seite „Hervorhebungen" für Plattform-Admins — Objekt suchen,
Art wählen, Zeitraum setzen, pausieren. **Kein Ad-Manager**, keine
Gebotslogik, keine Zielgruppen-Algorithmen. Voraussetzung: eine
Plattform-Admin-Rolle — die gibt es heute nicht.

Die vorhandene Struktur (`HIGHLIGHT_DISCLOSURES`, Texte „Von uns
hervorgehoben" / „Anzeige", der Test „nichts gesponsert") ist der Anfang
davon; die Texte werden auf `{brand}` umgestellt.

---

## 7. Öffentlicher Bereich

| Inhalt | ohne Konto |
|---|---|
| Person | **vollständig**, wenn öffentlich: Name, Headline, Bio, Rollen, Expertise, Branchen, Region, öffentliche Einträge, Unternehmen. **Kein Foto** (Initialen). Nie: Reichweite, Formate, Kontakthinweis, Fähigkeiten, Ressourcen |
| Organisation / Unternehmen | eingebettet in ein öffentliches Profil; eigene öffentliche Seite erst, wenn Organisationen ein eigenes Objekt werden |
| Problem (Brett) | **vollständig**, wenn öffentlich: Text, Schlagworte, Absicht, Autor:in. Als **Teaser** für Nichtmitglieder: „N Personen kennen das" (nur Zahl) und „Mitglieder arbeiten daran" — Entscheidungsfrage |
| Lösungsansätze, Interessen, Bestätigungen | **nur Mitglieder** (Zahlen ggf. als Teaser) |
| Opportunity | **niemals öffentlich** |
| Arbeitsraum | **niemals öffentlich**, keine Route, keine Sitemap |
| Ressourcen | **niemals einzeln öffentlich** |
| Einträge | **vollständig**, wenn öffentlich |
| Highlights | **nur Mitglieder** (eine öffentliche Startseite mit Highlights ist eine eigene Entscheidung) |

### Indexierung

| Klasse | Objekte | Regel |
|---|---|---|
| `index` | öffentliche, aktive Personen, Einträge, Probleme | Sitemap, Canonical, `index, follow` — wie heute |
| `noindex` | jede Mitgliederseite unter `/connect/*` | zusätzlich `robots: noindex` im Layout; `robots.ts` sperrt `/connect/problems`, `/connect/people`, `/connect/ventures`, `/connect/searches`, `/connect/suggestions` mit |
| `authentication required` | Arbeitsräume, Einladungslinks, Nachrichten | keine öffentliche Route, keine Sitemap, `noindex`, `X-Robots-Tag: noindex` auf Bild-Routen |

---

## 8. Monetarisierungsflächen

Keine Preise. Nur: Wo könnte bezahlt werden, und was darf das nie berühren.

| Fläche | Mehrwert | Käufer | Nutzer | Interessenkonflikt | Kennzeichnung |
|---|---|---|---|---|---|
| Gesponserte Highlights | Reichweite für Programme, Partner, Unternehmen | Organisationen, Programme | Mitglieder | Verwechslung mit Empfehlung | „Anzeige" + Auftraggeber:in, Slot-Grenze |
| Organisationsprofile | eigene Seite, mehrere Personen, Einträge im Namen der Organisation | Unternehmen, Hochschulen, Acceleratoren | Organisation und ihre Leute | Organisationen verdrängen Einzelpersonen in Listen | Organisation als Objektart erkennbar; organische Sortierung bleibt gleich |
| Premium-Profil für Personen | mehr Einträge, mehr Unternehmen, Statistiken | Einzelpersonen | dieselben | „mehr Sichtbarkeit" würde Discovery kaufbar machen | **nur Funktionen, keine Reichweite** |
| Zusätzliche Sichtbarkeit | Hervorhebung eigener Einträge | Personen, Organisationen | Mitglieder | dasselbe wie Highlights | „Anzeige" |
| Problem-/Opportunity-Programme | eine Organisation stellt ein Problemfeld bereit und lädt Mitglieder in Arbeitsräume ein | Unternehmen, Stiftungen, Kommunen | Mitglieder | Ergebnisse privater Räume gehören den Beteiligten, nicht dem Sponsor | „Programm von …" an jedem Raum; Rechte vorher erklärt |
| Accelerator-/Partnerflächen | Programme vorstellen, Bewerbungen sammeln | Acceleratoren | Founder | Nähe zu Advisor-Freigaben | getrennt von Advisor-Daten; nie Zugriff auf Profile ohne Freigabe |
| Recruiting/Team-Suche | Einträge „Wir suchen" mit mehr Reichweite | Unternehmen | Mitglieder | Recruiting überlagert das Netzwerk | eigene Kategorie, „Anzeige" bei Reichweite |

**Grundregel:** Geld kauft Funktionen und gekennzeichnete Flächen. Es kauft
keine Position in Vorschlägen, Suche, FIND oder Highlights der Art
„Entdeckt"/„Empfohlen"/„Impact".

---

## 9. Datenschutzrelevante Datenflüsse (neu oder geplant)

| Fluss | Daten | Wer sieht/verarbeitet | Grundlage, die zu klären ist |
|---|---|---|---|
| Einladungen in Arbeitsräume | E-Mail der eingeladenen Person, Token-Hash, Name der Einladenden | Einladende, Eingeladene, Mail-Versand | Verarbeitung der E-Mail einer Nichtnutzerin |
| Gemeinsame Arbeitsräume | Texte, Beobachtungen, ggf. über Dritte | Beteiligte | gemeinsame Verantwortung für Inhalte; Löschung bei Austritt |
| Einträge im Raum (Kommentar-ähnlich) | Texte mit Autor:in | Beteiligte | Verbleib nach Kontolöschung (wie `outlives_account`) |
| Empfehlungssignale | Profilangaben, Fähigkeiten nach Freigabe, Ausblendungen | System | Profiling-Hinweis; Widerspruch über `suggestable` |
| Gespeicherte Interaktionen | Klicks/Ansichten — **heute keine** | — | nur nach eigener Entscheidung |
| Gesponserte Inhalte | Auftraggeber:in, Zeitraum, ggf. Ausspielungszahl | Plattform, Auftraggeber:in | Kennzeichnungspflicht, keine personenbezogene Auswertung für Sponsoren |
| Redaktionelle Auswahl | Objekt, Begründung, Admin | Plattform | Transparenz, wer auswählt |
| Öffentliche Veröffentlichung | kopierte Problemfelder, Name der Autorin | Web, Suchmaschinen | bewusste Einwilligung je Veröffentlichung (wie heute mit Bestätigung) |
