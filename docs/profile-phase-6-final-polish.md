# Phase 6 — Finaler UX-, Content- und Print-Polish

**Stand:** 01.10.2026 · **Branch:** `feat/phase-6-polish` (zweigt von
`feat/profilfoto` ab, enthält Phase 5.1 also mit) · **Grundlage:** laufender
Code und laufende lokale Datenbank · Vorgänger:
`docs/profile-phase-5-1-avatar-and-polish-audit.md`

**Eine Migration:** `20261095120000_connect_base_photo_copy.sql` — siehe
Abschnitt 3. Vor dem Code: `npx supabase db push`.

---

## 1. Kurzfassung

| # | Auftrag | Ergebnis |
|---|---|---|
| 1 | Profilfoto in Connect | eigenes Basisfoto wird als **Kopie** in `network-profile-images` übernommen, beim Ersetzen nachgezogen, beim Entfernen gelöscht; ein eigenes Connect-Bild bleibt unberührt |
| 2 | „Über dich" entwirren | Station heißt auf Karte **und** Schrittseite „Du & dein Hintergrund"; das Feld heißt „Kurzvorstellung" |
| 3 | Methodische Hinweise | „Punktzahl" stand viermal untereinander — jetzt je Aussage einmal; zwei Überschriften „— und was nicht" auf eine reduziert |
| 4 | Advisor | aktuelles Arbeitsprofil zuerst; ohne Freigabe ein neutraler Satz; v1 zugeklappt als „Frühere Auswertung – Stand TT.MM.JJJJ" ganz unten |
| 5 | Sprungnavigation | bei 768 / 820 px **eine** Zeile statt drei (48 statt 148 px) |
| 6 | Ressourcen-Beispiel | folgt der gewählten Art (kleine Client-Komponente) |
| 7 | WorkMap im Druck | 976 → **494 px** (0,97 → 0,49 A4), dieselben Daten |
| 8 | Kurz-PDF Stressprofil | 9 → **8 Seiten**; Rest dokumentiert, nichts gestrichen |
| 9 | Rollen-Tonalität | „Erfahrung vorhanden – Verantwortung lieber abgeben" und vier weitere Sätze sachlich |
| 10 | Branding | zentral angebunden, sichtbar unverändert; Rebranding-Liste in Abschnitt 7 |

---

## 2. Gelöste UX-Probleme

### Sprungnavigation auf „Das bist du"

Gemessen, nicht geschätzt — neun Sprungmarken, im Browser:

| Breite | vorher | nachher |
|---|---|---|
| 320 | 1 Zeile, schiebbar | unverändert |
| 375 | 1 Zeile, schiebbar | unverändert |
| **768** | **3 Zeilen, 148 px** | **1 Zeile, 48 px**, schiebbar |
| **820** | **3 Zeilen, 148 px** | **1 Zeile, 48 px**, schiebbar |
| 1024 | 2 Zeilen, 96 px | unverändert |
| 1280 | 2 Zeilen, 96 px | unverändert |

Die neun Marken brauchen zusammen rund 1 490 px. Eine Zeile mit Umbruch gibt
es deshalb bei keiner Breite — die Frage war nur, ab wann zwei Zeilen
vertretbar sind. Antwort: ab 1024 px, wo die Spalte 848 px breit ist. Darunter
dieselbe schiebbare Zeile wie am Telefon (`sm:` → `lg:`). Keine Seite wird
dadurch breiter (geprüft: Seitenbreite = Fensterbreite bei allen sechs).

### Beispieltext im Ressourcenformular

`ResourceKindFields.tsx`, eine Client-Komponente mit einem `useState`. Wer
die Art wechselt, sieht das passende Beispiel:

```
Netzwerk  → „Kontakte zu Kliniken im Raum Berlin"
Zugang    → „Zugang zu einer Founder-Community"
Angebot   → „Erfahrung mit Social-Media-Strategie"
```

Dieselben Feldnamen wie vorher, gespeichert wird weiter über das Formular
drumherum. Kein Ressourcenumbau.

### Nebenbei gefunden: Der Forschungshinweis wurde mitgedruckt

`ResearchConsentNotice` liegt als feste Ebene über der Seite und hatte kein
`print:hidden`. Wer den Hinweis noch nicht beantwortet hatte und das Profil
druckte, bekam ihn ins PDF — und Chrome druckt feste Ebenen auf **jede**
Seite. Eine Klasse.

---

## 3. Connect-Foto-Lösung

### Was vorher galt

Connect konnte das Basisfoto nur übernehmen, wenn es eine Illustration war.
Ein eigenes Bild wurde mit `photo_reuse` abgewiesen.

### Ein Befund vorweg: Öffentliche Seiten zeigen gar kein Bild

Der Auftrag spricht von einer „öffentlichen Kontextkopie". Im Code gilt seit
dem **07.09.2026** eine ausdrückliche Produktentscheidung (Migration
`20260907200000_remove_public_photo_delivery`): Anonyme Connect-Seiten zeigen
**nie** ein Bild, auch keins mit Zustimmung — wegen Rückwärts-Bildsuche und
Gesichtserkennung nach einer Indexierung. Die Seiten rendern
`PublicConnectAvatar src={null}`, also Initialen.

Daran ändert diese Phase nichts. „Öffentlich" heißt hier also: **für
Connect-Mitglieder**, ausgeliefert über `/api/connect/photos/[userId]`
(Sitzung, Mitgliedschaft, aktives Profil). Der Text in der
Sichtbarkeitsvorschau, der noch „und – nur bei separater Freigabe – dein
Foto" versprach, ist korrigiert: „Kein Foto – öffentliche Seiten zeigen
immer deine Initialen."

### Wie es jetzt läuft

```
privates Basisfoto                    bewusste Connect-Freigabe
avatars/<id>/<zeit>.jpg   ──Kopie──▶  network-profile-images/<id>/<zeit>.jpg
(nur mit photo_visible_to_members)    (nur für Connect-Mitglieder)
```

Alles in `features/connect/connectBasePhoto.ts`, benutzt von drei Stellen:

| Wo | was passiert |
|---|---|
| Connect-Formular, „Mein vorhandenes Profilfoto verwenden" | Illustration → Kennung; eigenes Bild → serverseitige Kopie |
| „Über dich" → Foto ändern / entfernen | Nachzug, **nur** wo `photo_source = 'profile_avatar'` |
| Einstieg (`ProfileBasicsForm`) | derselbe Nachzug — vorher zog der Einstieg gar nicht nach |

Die Zeile in `network_profiles`:

```
Illustration      profile_avatar · avatar-07 · —
Kontextkopie      profile_avatar · —         · <id>/<zeit>.jpg     ← neu
eigenes Bild      network_upload · —         · <id>/<zeit>.jpg
keins             —              · —         · —
```

**Die Kopie bleibt als Basisfoto erkennbar** — und daran hängt alles: Der
Nachzug fasst nur `profile_avatar` an, ein `network_upload` nie.

Regeln, die der Code selbst prüft (nicht nur die Zeilensicherheit):
Kopiert wird nur ein Original unter dem eigenen Präfix; gelöscht wird nur
unter dem eigenen Präfix; misslingt das Schreiben der Zeile, wird die gerade
angelegte Kopie wieder entfernt; misslingt die Kopie beim Ersetzen, wird
Connect geleert statt das alte Bild weiterzuzeigen. Das private Original wird
nie verwiesen, nie öffentlich und nie signiert. Kontolöschung räumt den
Connect-Eimer ohnehin nach Präfix (`deleteFounderAccount`).

### Die Migration — und warum es ohne nicht ging

Der Datenbankvertrag `network_profiles_photo_contract_check` erlaubte
`profile_avatar` **nur** mit Illustration und ohne Pfad. Ohne Änderung hätte
die Kopie als `network_upload` gespeichert werden müssen — dann wäre sie von
einem eigenen Connect-Bild nicht zu unterscheiden, und der Nachzug dürfte sie
nicht anfassen. Aufgefallen ist das erst im Browser: Der Unit-Test mit
nachgebautem Client kennt die Datenbank nicht.

`20261095120000_connect_base_photo_copy.sql` lässt **eine** weitere Form zu:
`profile_avatar`, keine Kennung, Pfad unter der eigenen `user_id`. Keine neue
Spalte, keine Tabelle, kein Eimer.

**Dabei eine alte Lücke geschlossen.** `null ~ '^avatar-…$'` ist `NULL`, und
ein CHECK lässt `NULL` durch. `profile_avatar` ohne Illustration und ohne
Datei ging deshalb schon immer durch. Jetzt steht `photo_avatar_id is not
null` ausdrücklich da; solche Zeilen (lokal: keine) setzt die Migration
vorher auf „kein Bild" — sie zeigten ohnehin keins.

### Im Browser durchgespielt

Eigene Anmeldung, echter Dateidialog (`DOM.setFileInputFiles`), Zustand nach
jedem Schritt aus der Datenbank gelesen:

| Schritt | `profiles` | Connect-Zeile | Connect-Eimer |
|---|---|---|---|
| Basisfoto A hochladen | `avatars/…A` | — | leer |
| Connect: vorhandenes Profilfoto | | `profile_avatar · — · …kopie1` | kopie1 · Auslieferung **200** |
| Basisfoto B ersetzen | `avatars/…B` | `profile_avatar · — · …kopie2` | **nur** kopie2 |
| Basisfoto entfernen | — | — · — · — | **leer** |
| eigenes Connect-Bild C | — | `network_upload · — · …C` | C |
| Basisfoto neu, dann entfernen | `…` / — | **unverändert** `network_upload …C` | **unverändert** C |

Danach: beide Eimer leer, Connect-Zeile entfernt, Testdaten weg.

**FIND** (direkt an `list_member_photos`, Ben fragt nach Nora): Haken an → 1
Bild, Haken aus → 0, das eigene immer. Unverändert — FIND liest live und
speichert nichts.

---

## 4. Advisor-v1-Lösung

### Vorher

Bei Ben und Carla (v1-Bericht freigegeben, Arbeitsprofil nicht) stand direkt
unter „Wer sie ist":

```
Selbstbild aus dem Fragebogen
So funktioniert dein Profil gerade
Dein aktueller Stand in 6 Dimensionen
```

— in der zweiten Person, also an den Advisor gerichtet, und als Erstes. Das
aktuelle Arbeitsprofil stand, wenn freigegeben, ganz unten.

### Nachher

```
Wer sie ist
Founder-Arbeitsprofil          ← freigegeben: Karte, Beschreibung, Antworten
                                  nicht freigegeben + v1 vorhanden:
                                  „Für das aktuelle Founder-Arbeitsprofil
                                   liegt dir keine Freigabe vor."
Was sie mitbringt · Wie sie arbeitet · Was ihr wichtig ist
Was das hier ist — und was nicht
▸ Frühere Auswertung – Stand 01.10.2026      ← zugeklappt
    „Aus dem früheren Fragebogen, so wie diese Person ihn damals gerechnet
     hat — nicht unbedingt ihr heutiger Stand. … Die Texte sind an die
     Person selbst gerichtet."
    Was die frühere Auswertung beschrieben hat
    6 Dimensionen – Stand der früheren Auswertung
Deine Handakte
```

**Der neutrale Satz steht nur neben dem Altbestand.** Die Seite hat eine
dokumentierte Regel: Was nicht freigegeben ist, erscheint gar nicht — kein
leerer Block, kein Schloss, keine Aussage über den Menschen. Die bleibt.
Ausnahme ist genau der Fall aus dem Auftrag: Ohne den Satz wäre der frühere
Bericht das Einzige, was nach „wie sie arbeitet" aussieht. Der Satz sagt
nicht, ob das Profil ausgefüllt ist, und fordert zu nichts auf. Nora (weder
v1 noch Freigabe) sieht weiterhin keinen solchen Block.

**`SelfReportView` kennt jetzt `legacy`.** Damit heißen die beiden
Überschriften überall, wo v1 als Altbestand steht, nicht mehr „gerade" und
„aktuell" — auch auf „Das bist du" und im Lang-PDF, wo sie bisher unter
„Deine frühere Auswertung" weiter „So funktioniert dein Profil gerade"
sagten. Der Inhalt bleibt, wie er gerechnet wurde. Nichts wird ohne Freigabe
abgeleitet.

---

## 5. Gelöste Content-Probleme

### „Über dich" bedeutete dreierlei

Auf `/profile?step=identity` stand: H1 „Über dich" (die Seite), H2 „Wer du
bist" (die Station, die auf ihrer Karte „Du & dein Hintergrund" heißt) und ein
Feld „Über dich" (die Bio).

| | vorher | nachher |
|---|---|---|
| Seite `/profile` | Über dich | Über dich |
| Station: Karte | Du & dein Hintergrund | Du & dein Hintergrund |
| Station: Schrittseite | Wer du bist | **Du & dein Hintergrund** |
| Feld (Bio) | Über dich | **Kurzvorstellung** |
| Lückenhinweis | „Ein Text über dich …" | „Eine Kurzvorstellung …" |
| `/me/profile`, Abschnitt 1 | Über dich | Über dich |

„Kurzvorstellung" ist das Wort, das die Stationskarte schon benutzte.
Mitgezogen: die Texte in FIND und auf dem Dashboard, die das Feld beim Namen
nennen. Englisch entsprechend („You & your background", „Short
introduction"). Links und Zurück-Wege („← Zurück zu „Über dich"") zeigen auf
die Seite und bleiben richtig.

### Methodische Hinweise — Redundanz raus, Inhalt bleibt

Im Abschnitt „Wie du arbeitest" stand „keine Punktzahl" viermal hintereinander:
Karte, Einleitung der Beschreibung, Satz unter der Beschreibung, Kasten am
Ende.

| Stelle | nachher |
|---|---|
| beim Arbeitsprofil | „Selbstauskunft, kein Testergebnis." — unverändert |
| Karte „Auf einen Blick" | „… ohne Abschnittswert." („keine Punktzahl" entfällt) |
| Einleitung der Beschreibung | „… Frage für Frage." („ohne Punktzahl und ohne Vergleich mit anderen" entfällt) |
| unter der Beschreibung | „Die Beschreibungen fassen deine Antworten zusammen; sie sind keine Diagnose, kein Normvergleich und keine Punktzahl." — unverändert |
| „Was diese Seite zeigt — und was nicht" | „Was diese Seite zeigt" — direkt darunter folgt „Was das hier ist — und was nicht" |
| `InstrumentNote` am Ende | vollständig, alle vier Sätze — er ist allgemeiner Kontext, wird mitgedruckt und steht auch auf `/me/report` |

Gestrichen wurde nur, was unmittelbar daneben ein zweites Mal steht. Jede
Aussage (kein Abschnittswert, keine Punktzahl, kein Normvergleich, keine
Diagnose, keine Eignungsaussage) steht weiterhin auf der Seite.

### Rollen-Tonalität

| vorher | nachher |
|---|---|
| Das kannst du – behalten willst du es nicht · „Ihr könnt auf dich zählen, wenn es brennt, aber es ist nicht dein Platz." | **Erfahrung vorhanden – Verantwortung lieber abgeben** · „In diesen Bereichen bringst du praktische Erfahrung mit, möchtest sie aber nicht dauerhaft verantworten. Das ist kein Widerspruch, sondern eine wichtige Angabe für die Rollenverteilung: Du kannst hier unterstützen, die Zuständigkeit sollte aber bei jemand anderem liegen." |
| Hier willst du die Verantwortung tragen · „… ist das dein Anspruch." | Verantwortung, die du übernehmen willst · „… der Ausgangspunkt der Rollenverteilung." |
| Hier willst du hineinwachsen | Verantwortung, in die du hineinwachsen willst |
| Hier arbeitest du mit, ohne es zu führen | Mitarbeit ohne Zuständigkeit |
| Hier ist noch offen, was du willst | Noch offen |
| Als Team seid ihr an dieser Stelle dünn. | Als Team habt ihr an dieser Stelle wenig Erfahrung. |
| Wir sagen nur: besetzt ist es nicht. | Festhalten lässt sich nur: Zuständig ist hier noch niemand. |
| … oder bewusst lassen und sagen, dass es liegt. | … oder bewusst offen lassen und das festhalten. |
| Das ist der angenehmste Fall: ein Weg, den man planen kann. | Das ist ein Übergang, den man planen kann. |

Englisch jeweils entsprechend. Der erste Satz steht auch auf „Das bist du"
und in beiden PDFs — also in dem, was an Advisor weitergeht.

---

## 6. WorkMap im Druck und Seitenzahlen

### Die Änderung

`WorkMap` hat eine zweite Dichte: `density="print"`, benutzt von beiden
Druckfassungen. Die Bildschirmseite bleibt, wie sie war.

| bleibt gleich | wird dichter |
|---|---|
| alle 13 geordneten Antworten | Zeilenabstand 10 → 4 px |
| T01, T02, D01 außerhalb der Karte | Beschriftung direkt über der Punktreihe |
| Kurzlabels | Antwort in `text-xs` |
| Punktreihe, gewählte Stufe als Wort | Themen **zweispaltig**; ein Thema bricht nie über zwei Spalten |
| keine Zahl, kein Mittelwert, kein Abschnittswert | |

Unter 640 px (die Druckansicht auf dem Telefon) einspaltig. Im Bild geprüft:
lesbar, nichts abgeschnitten. Die Spalten teilen sich 8 : 5 Zeilen — bei der
festen Themenreihenfolge (2 · 3 · 3 · 1 · 4) das Bestmögliche.

### Gemessen

Echte PDFs über `Page.printToPDF`, A4; Höhen unter `print`-Medium bei
A4-Inhaltsbreite (673 px), eine A4-Seite ≈ 1 003 px.

**WorkMap allein:**

| | vorher | nachher |
|---|---|---|
| Stressprofil, 16 Antworten, DE | 976 px · 0,97 A4 | **494 px · 0,49 A4** |
| Stressprofil, EN | 956 px · 0,95 A4 | **474 px · 0,47 A4** |
| Seed-Profil, 9 Antworten, DE | 700 px · 0,70 A4 | **358 px · 0,36 A4** |

**Seitenzahlen:**

| Profil | kurz vorher | kurz nachher | lang vorher | lang nachher |
|---|---|---|---|---|
| Stressprofil, DE | 9 | **8** | 18 | 18 |
| Stressprofil, EN | 8 | **8** | 18 | **17** |
| Seed-Profil, DE | 5 | 5 | 8 | 8 |
| Seed-Profil, EN | — | 5 | — | 7 |

(Seed-Profil EN wurde vorher nicht gemessen. Stressprofil wie in Phase 4/5:
54 Fähigkeitsbereiche, 20 Stärken, 40 Richtungsaussagen, 20 Ressourcen, dazu
alle 16 Fragen des Arbeitsprofils.)

### Das Kurz-PDF als Ganzes (Auftrag 8)

Nach der Kompaktierung, Stressprofil DE, Höhe je Abschnitt:

```
Wie du arbeitest                 1 398 px   davon Karte 494, Beschreibung ≈ 770
Was dich antreibt                1 080 px   10 Facetten × 2 Aussagen
Was du verantworten willst         960 px
Deine Fähigkeiten                  836 px
Netzwerk, Zugänge & Ressourcen     612 px
Deine Stärken                      482 px
Was diese Seite zeigt + Hinweis    467 px
Wohin du wachsen willst            296 px
Über dich                          276 px
Erfahrung & Tiefe                  236 px
```

**Die Kompaktierung genügt nicht für „3–6 Seiten"** — sie spart eine Seite,
von 9 auf 8. Kein Abschnitt ist unverhältnismäßig; es sind zehn volle
Abschnitte. „Was dich antreibt" ist mit gut einer Seite der längste, gefolgt
von „Was du verantworten willst". **Gestrichen wurde nichts**, wie
beauftragt. Ein gewöhnliches Profil bleibt bei 5 Seiten.

Wenn das Stress-Kurzprofil kürzer werden soll, wären das Entscheidungen über
Inhalt, nicht über Abstände — etwa eine Aussage je Facette statt zwei in der
Kurzfassung, oder „Was du verantworten willst" dort nur mit den Gruppen ohne
Einzelbereiche. Beides steht hier zur Entscheidung, nicht als Umsetzung.

---

## 7. Branding-Stand

### Was jetzt gilt

`features/brand.ts` hält beide Namen und sagt, warum:

```ts
BRAND_NAME        = "Made2Found"       // Zielname; PDFs: Fußzeile, Dateiname
PRODUCT_NAME      = "CoFoundery"       // wie die Anwendung heute heißt
PRODUCT_FULL_NAME = "CoFoundery Align"
```

**Angebunden** (zeigt sichtbar dasselbe wie vorher, hängt aber an einer
Stelle): Seitentitel, Beschreibung, `applicationName` und Startbildschirmname
(`app/layout.tsx`), Manifest (`app/manifest.ts`), Alternativtexte der Logos
(App-Kopf, Landing, öffentliche Connect-Seiten), Titel der öffentlichen
Connect-Seiten (`/connect/p`, `/connect/pr`, `/connect/l`), Kopf des
Workbook-Drucks. Ein Test hält fest, dass dort kein Name mehr von Hand steht.

**Nicht umgestellt — und warum.** `PRODUCT_NAME` heute auf `Made2Found` zu
setzen hieße: Tab-Titel „Made2Found" neben einem Logo, dessen Wortmarke
„CoFoundery Align" ist, neben E-Mails von `hello@cofoundery.de`. Dieselbe
Uneinheitlichkeit, andersherum. Die vollständige Umstellung ist ein eigenes
Vorhaben:

### Rebranding-Liste

| # | Bereich | Fundstellen | Abhängigkeit |
|---|---|---|---|
| 1 | **Domain** `cofoundery.de` | `DEFAULT_PUBLIC_APP_ORIGIN`, 30 Stellen, Datenschutz-Links in jeder Mail | DNS, Vercel-Domain, Supabase Auth: Site URL und Redirect-URLs, Weiterleitung der alten Domain (Einladungslinks in alten Mails) |
| 2 | **Absender/Kontakt** `hello@cofoundery.de` | Impressum, Datenschutz, Dashboard-Support, `RESEND_REPLY_TO_EMAIL`-Fallback | Postfach, Resend-Domain-Verifizierung (SPF/DKIM) |
| 3 | **Logo** | `public/cofoundery-align-logo.svg` (die Wortmarke ist das Bild), `icon.png`, `apple-icon.png`; Mails laden das Logo von `https://cofoundery.de/…svg` | neue Datei; alte URL muss erreichbar bleiben, solange alte Mails im Postfach liegen |
| 4 | **E-Mail-Texte** | `features/email/emailMessages.ts` (15), acht `lib/email/send*Email.ts` (Logo-Alt „Cofoundery Align") | Betreffzeilen sind Wiedererkennung — einmal umstellen, nicht schrittweise |
| 5 | **Supabase-Mailvorlagen** | `supabase/templates/magic-link.html`, `confirm-signup.html`, `supabase/config.toml` | gehen mit `db push` nicht mit — im Supabase-Dashboard bzw. per CLI-Konfiguration |
| 6 | **Sprachbundles** | 86 × „CoFoundery", 20 × „Cofoundery" in `messages/*` | **kein Suchen-und-Ersetzen**: Platzhalter `{brand}` einführen und je Satz prüfen (Grammatik: „in CoFoundery" / „bei Made2Found") |
| 7 | **Rechtstexte** | Impressum, Datenschutzerklärung (Produktname, Verantwortlicher) | rechtlich prüfen lassen |
| 8 | **Marketing** | `data/marketing.ts` (11), Landingpage | Texte, nicht nur Name |
| 9 | **PWA** | Name und Kurzname hängen schon an `PRODUCT_*` | installierte Apps zeigen den neuen Namen erst nach Update des Manifests; `id: "/"` bleibt |
| 10 | **Öffentliche Connect-Titel** | hängen schon an `PRODUCT_NAME` | Suchmaschinen-Snippets ändern sich — gewollt, aber zeitlich mit der Domain abstimmen |
| 11 | **Technische Kennungen — NICHT umbenennen** | Cookies `cofoundery_locale`, `cofoundery_pending_email`, `cofoundery_check`; Speicherschlüssel `cofoundery.auth.callback.tokens`, `cofoundery.interview.*`; Exportpräfix `cofoundery-export-`; `*.cofoundery.local`, Seed-Passwort, Repository-/Verzeichnisname | Umbenennen hieße: Spracheinstellung weg, laufende Anmeldungen und Interview-Entwürfe verloren. Unsichtbar für Nutzer — dort lassen. |
| 12 | Migrationskommentare | 12 Stellen in `supabase/migrations` | historisch, unverändert lassen |

Wenn das Rebranding kommt: `PRODUCT_NAME` in `brand.ts` ändern, dann 1–8 in
einem Zug.

---

## 8. Bewusst verbleibende Altlasten

Aus der Liste von Phase 5.1, **nicht** in diesem Auftrag:

* **„Dein Foto" und der Sichtbarkeitshaken stehen in zwei Kästen** (A1) —
  zwei Tabellen, kein Formular im Formular.
* **Kurz-PDF des Stressprofils: 8 Seiten** (A3/A4) — siehe Abschnitt 6.
* **Deutsche Instrumenttexte in der englischen Fassung** (B10) — im
  Lang-PDF sichtbar als „A – Analytische Prüfung" usw.
* **Einsame Überschriften am Seitenende ungeprüft** (C11), **keine
  Seitenzahlen** (C12), **Browser-Kopf-/Fußzeilen** (C14).
* **`focus_skill`, `intention`** (D15), **`profiles.display_name` als Kopie**
  (D17), **zwei Sichtbarkeitsmodelle** für dasselbe Bild (D19) — Absicht.
* **v1 auf „Das bist du" in fünf Aufklappern** (D18) — die Überschriften sagen
  jetzt „früher", die Verschachtelung bleibt.

Neu aufgefallen:

* **Advisor: „Antworten aus der neuen Fassung"** über dem v2.1-Block. v2.1
  ist nicht mehr die neueste Fassung; die Überschrift stimmt nur noch relativ
  zu v1. Nicht angefasst (v1-Auftrag).
* **„… ungeklärte Zuständigkeit wirkt sich messbar schlecht aus"**
  (Vergleich, „Beide wollen es verantworten") ist eine empirische Behauptung
  in einem Produkt, das sagt, es messe nichts. Keine Tonfrage — zur
  fachlichen Prüfung.
* **Der Nachzug läuft mit den Rechten der Person.** Ruht die
  Connect-Mitgliedschaft, verweigern Zeilensicherheit und Eimer das
  Aktualisieren; die alte Kopie bliebe dann liegen, bis die Person Connect
  wieder nutzt oder ihr Konto löscht. Ausgeliefert wird sie in dieser Zeit
  ohnehin nur an Mitglieder und nur bei aktivem Profil.

Ausdrücklich nicht angefasst (Auftrag 11): keine neuen Fragen, keine Scores,
keine Typologie, kein Capability- oder Matching-Umbau, kein Werteprofil, keine
neue Datenarchitektur für `person_core`, `display_name`, `focus_skill`,
`intention`, v1-Migration und Übersetzung der Registratur.

---

## 9. Tests

```
npm run ci:check     tsc --noEmit · 2 609 Tests · next build      grün
npx supabase test db 126 Dateien · 1 319 DB-Tests                   grün
```

**Neu:**

* `features/connect/__tests__/connectBasePhoto.test.ts` — 8 Fälle an einem
  nachgebauten Client: Illustration ohne Datei · Kopie, Original bleibt ·
  fremdes Original nie · ersetzen: neue Kopie, alte weg · eigenes Bild →
  Illustration · entfernen · **eigenes Connect-Bild unberührt, Zeile und
  Datei** · misslungene Zeile hinterlässt keine Kopie.
* `supabase/tests/connect_base_photo_copy.sql` — 8 Fälle am echten Vertrag,
  darunter: fremder Präfix, Illustration und Datei zugleich, Verweis auf das
  private Original, und die geschlossene `NULL`-Lücke.
* `features/reporting/__tests__/phase6Polish.test.ts` — 7 Zusagen:
  WorkMap-Dichte mit denselben Daten · v1 nirgends „aktuell" · Hinweise je
  einmal · Station heißt wie ihre Karte · Rollentext sachlich · Namen zentral ·
  Forschungshinweis nicht im Druck.

**Angepasst** (alte Zusage durch den Auftrag überholt, nicht gelöscht):
`profilfoto.test.ts`, `connectSafetyPhoto.test.ts` („nur Illustrationen
übernehmbar" → „nur als Kopie, nie das Original"), `advisorSelfReport.test.ts`,
`eigeneRessourcen.test.ts`, `dasBistDu.test.ts` (`sm:` → `lg:`).

**Im Browser** (Chrome 154 headless, echte Anmeldung, eigener Dev-Server):

| geprüft | Ergebnis |
|---|---|
| Foto → Connect → ersetzen → entfernen → eigenes Connect-Bild | wie Abschnitt 3, Eimer danach leer |
| FIND an `list_member_photos` | an → 1, aus → 0, eigenes immer |
| Advisor: Ben, Carla (v1, keine Freigabe), Nora (nichts) · DE/EN | wie Abschnitt 4 |
| Ressourcen-Beispiel je Art · DE/EN | passt |
| Sprungnavigation 320 / 375 / 768 / 820 / 1024 / 1280 | Abschnitt 2 |
| `/profile`, Identität, Ressourcen, `/me/profile`, Kurz-PDF, Lang-PDF, `/connect/profile`, `/connect`, FIND (`/discovery`), drei Advisor-Seiten — je 320 / 375 / 768 / 1024, DE und EN | **kein Überlauf, keine rohen Schlüssel** |
| Kurz-/Lang-PDF, schlank und Stress, DE und EN | Abschnitt 6 |

**Nicht geprüft:** eine **veröffentlichte** öffentliche Connect-Seite mit
Kontextkopie — das Seed-Konto ist nicht veröffentlichungsfähig, und die Seite
rendert unabhängig vom Profil `src={null}` (im Code geprüft). FIND mit echtem
Suchtreffer — wie in Phase 5.1 an der Funktion statt an der Oberfläche.

**Testdaten entfernt:** Stressprofil und 16 Antworten zurück auf den
gesicherten Stand (9 Bereiche, 4 Stärken, 5 Aussagen, 9 Antworten), Foto,
Haken, Connect-Zeile, beide Eimer leer, Sicherungsschema gelöscht.

---

## 10. Reihenfolge

1. `npx supabase db push` — bringt `20261095120000_connect_base_photo_copy`
   (und `20261094120000_person_section_marks` aus Phase 3, falls noch nicht
   auf Produktion).
2. Dann der Code: `feat/phase-6-polish` enthält `feat/profilfoto` (Phase 5.1)
   mit — ein ff-only-Merge bringt beides.

**Warum zuerst die Datenbank:** Der neue Code schreibt beim Übernehmen eines
eigenen Basisfotos `profile_avatar` mit Pfad. Gegen den alten Vertrag schlägt
das fehl — die Person sähe „Speichern war nicht möglich", ohne dass etwas
kaputtginge, aber eben ohne Foto.

Nicht deployt.
