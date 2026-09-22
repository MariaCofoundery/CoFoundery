# CoFoundery Einzelprofil und Advisor-Zugang - Technical Brief

## Status
- Anlass: Ein Accelerator hat nach dem Einzeltest gefragt. Gebraucht wird eine
  Auswertung fuer EINE Person, nicht nur die Kompatibilitaet zweier Founder.
- Zweck: Architektur festlegen fuer (a) das Einzelprofil und (b) den Zugang von
  Advisors und Acceleratoren auf Personen und Teams.
- Grundlage: der tatsaechliche Repository-Stand, in der lokalen Datenbank
  nachgesehen.
- Schwesterdokument: `direction-interview-technical-brief.md` - dort steht die
  vierte Saeule des Profils.
- Nicht enthalten: Implementierung. Absichtlich.
- Letzte Aktualisierung: 2026-09-21

---

## 1. Was heute schon existiert

Der wichtigste Befund: **Drei der vier Saeulen sind gebaut.** Was fehlt, ist
nicht die Substanz, sondern die Zusammenstellung.

| Saeule | Wo | Zustand |
| --- | --- | --- |
| **Base** - wer die Person ist | `person_core` (`display_name`, `headline`, `bio`, `location_region`, `remote_mode`, `expertise`, `industries`, `linkedin_url` + `linkedin_visibility`) | vorhanden |
| **HOW WE WORK** - Selbstbild aus dem Fragebogen | `/me/report`, `getLatestSelfAlignmentReport`, `IndividualReportPageContent`, Radar, Druckknopf | vorhanden, eigene Seite |
| **Werte** | `/me/values`, `values-instrument-v1.json`, `SelfValuesProfileSection` | vorhanden, eigene Seite |
| **WHAT WE BRING** - Capability | `/profile`, `person_capability_entries` + `person_capability_evidence`, Interview, 48 Bereiche in 10 Familien | vorhanden, eigene Seite |
| **WHAT MATTERS TO US** - Direction | - | nicht gebaut, siehe Schwesterdokument |
| **Lebenslauf einlesen** | nur `person_core.linkedin_url` | **nicht gebaut** |

Vier Seiten, kein gemeinsames Bild. Wer heute gefragt wird "schick mir mal dein
Founderprofil", schickt drei Links.

### Der Lebenslauf

"Mit dem CV auslesen" ist im Repository nicht vorhanden - es gibt keine
Datei-Ablage fuer Lebenslaeufe, keine Extraktion, keine Tabelle. Vorhanden ist
die LinkedIn-Adresse mit eigener Sichtbarkeit
(`get_public_network_profile_linkedin` verlangt zusaetzlich zur oeffentlichen
Seite ausdruecklich `linkedin_visibility = 'public'`).

Ein CV-Import ist damit ein eigenes Vorhaben: Datei-Ablage, PDF-Extraktion,
Modell zum Strukturieren, Loeschfristen, und die Entscheidung, was mit der
Rohdatei passiert. Er ist NICHT die Voraussetzung fuer das Einzelprofil - die
Capability-Daten kommen aus dem Interview und sind belegt, ein CV waere
zusaetzlicher Kontext. Er gehoert deshalb nach hinten.

---

## 2. Das Einzelprofil ist eine Zusammenstellung, kein neuer Speicher

Die Architekturentscheidung in einem Satz:

> Das Founderprofil bekommt **keine eigene Tabelle**. Es ist eine Seite, die
> vier bestaetigte Quellen zusammenstellt, jede mit ihrer eigenen
> Sichtbarkeit.

Warum das wichtig ist: Eine eigene Profiltabelle waere eine **Kopie** von
Angaben, die es schon gibt. Kopien laufen auseinander - und zwar genau dann,
wenn jemand eine Angabe zurueckzieht. Wer seine Capability-Tiefe auf "privat"
stellt, aber in einer Profiltabelle steht sie noch, hat nicht widerrufen,
sondern nur den einen Ort geaendert, den er kannte.

```
/me/profile  (neue Seite, liest zusammen)
   |
   +-- person_core                      (Base)
   +-- self_alignment_report (letzter)  (HOW WE WORK)
   +-- Werteprofil                      (Werte)
   +-- person_capability_entries/evidence (WHAT WE BRING)
   +-- direction_statements             (WHAT MATTERS - spaeter)
```

Jede Saeule bringt ihre Sichtbarkeitsregel mit. Das Profil erfindet keine neue.
Wo eine Saeule fehlt oder auf privat steht, steht das im Profil - nicht eine
Luecke, sondern ein Satz, der sagt, was fehlt und wie es entsteht.

### Was ein Accelerator bekommt

Vier Dinge, die CoFoundery belegen kann:

1. **Selbstbild in den Dimensionen** des Fragebogens - mit der ausdruecklichen
   Angabe, dass es ein Selbstbericht ist.
2. **Faehigkeiten mit Beleg** - je Bereich eine Stufe UND eine erzaehlte
   Situation, die die Person selbst bestaetigt hat. Das ist der Teil, der
   CoFoundery von einer Skill-Liste unterscheidet: Hinter jedem Haken steht
   ein Ereignis.
3. **Verantwortungswuensche** - was jemand uebernehmen und was er abgeben will.
   Fuer einen Accelerator, der Teams zusammensetzt, ist das die nuetzlichste
   Angabe ueberhaupt.
4. **Direction** - sobald gebaut: wiederkehrende Themen, Probleme, gewuenschte
   Veraenderungen, mit Zitat und selbst bestaetigt.

### Was ein Accelerator NICHT bekommt

Keinen Gesamtscore, keine Rangliste, keine Eignungsaussage, keine
Erfolgsprognose.

Das ist keine Vorsicht, sondern die Konsequenz des Modells (siehe
`web/docs/capability-model-technical-brief.md` und
`founder-compatibility-model-critical-review.md`): Ein Instrument ohne
Validierung, das eine Zahl je Person ausgibt, wird als Auswahlkriterium
benutzt, sobald es existiert - und dann entscheidet eine unvalidierte Zahl
darueber, wer in ein Programm kommt. Der Schaden traegt die Person, nicht wir.

Dieselbe Grenze gilt fuer die Kompatibilitaet und ist dort schon gezogen: keine
Prozentzahl, kein Match-Score. Das Einzelprofil darf sie nicht unterlaufen.

**Was wir stattdessen anbieten koennen**, und was fuer einen Accelerator sogar
brauchbarer ist: eine strukturierte, belegte, von der Person bestaetigte
Selbstauskunft, plus - bei einem Team - die Deckungskarte aus
`capabilityTeamReadout.ts` mit den Zustaenden `contested`, `gap`,
`openPosition`, `handoverPath`. Das beantwortet die Frage, die ein Accelerator
wirklich hat ("wo fehlt diesem Team etwas"), ohne Menschen zu bewerten.

---

## 3. Advisor-Zugang heute

Nachgesehen, nicht erinnert. Es gibt neun Tabellen mit Advisor-Bezug; die vier,
die den Zugang regeln:

| Tabelle | Was sie regelt |
| --- | --- |
| `relationship_advisors` | Advisor an einer **Beziehung** (zwei Founder). Mit `founder_a_approved`, `founder_b_approved`, `approved_at`, `revoked_at`, `invite_token_hash`, `invite_expires_at`. |
| `advisor_team_invites` | Der Einladungsweg: Advisor laedt zwei Founder per Mail ein, je Founder ein `token_hash`, `claimed_at`, Versandstatus. |
| `founder_team_advisor_setup_grants` | Advisor an einem **Team**, mit `scope`, `status`, `activated_at`, `revoked_at`, `requested_by_advisor_at`. |
| `founder_team_advisor_setup_consents` | Je Founder eine Zeile mit `approved_at` - die Einwilligung zum obigen Grant. |

Die Architektur dahinter ist bereits richtig und soll erhalten bleiben:

- **Zugang entsteht durch Einwilligung, nicht durch Einladung.** Ein Advisor
  kann fragen; sichtbar wird etwas erst, wenn die betroffenen Menschen
  zustimmen - und bei einem Paar BEIDE.
- **Zugang ist widerrufbar** (`revoked_at`), und der Widerruf ist eine
  Spaltenaenderung, nicht eine Loeschung, damit nachvollziehbar bleibt, was
  wann galt.
- **Zugang hat einen Umfang** (`scope`).

Was es NICHT gibt:

- Keine **Organisation**. Ein Advisor ist ein einzelnes Benutzerkonto.
- Keine **Sitze**, kein Kontingent, keine Abrechnungseinheit.
- Kein Zugang auf eine **einzelne Person** - nur auf Beziehung oder Team.
  Genau das braucht der Accelerator-Fall.

---

## 4. Zielbild: Organisation, Sitze, Personenzugang

### 4.1 Die Organisation

```sql
advisor_orgs (
  id uuid pk,
  name text not null,
  status text not null,              -- 'active' | 'suspended'
  person_seat_limit int not null default 0,
  team_seat_limit int not null default 0,
  created_by_user_id uuid not null,
  created_at, updated_at
)

advisor_org_members (
  org_id uuid not null references advisor_orgs on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null,                -- 'owner' | 'advisor'
  status text not null,              -- 'active' | 'revoked'
  primary key (org_id, user_id)
)
```

Ein Accelerator ist damit eine Organisation mit mehreren Advisor-Konten. Ein
einzelner Advisor ohne Firma bleibt, was er ist - die Organisation ist
optional, nicht Voraussetzung.

### 4.2 Die eine Entscheidung, die alles andere bestimmt

**Wem wird der Zugang gewaehrt: der Person oder der Organisation?**

Empfehlung: **der Organisation**, ausgeuebt durch ihre aktiven Mitglieder.

Begruendung: Ein Founder stimmt dem Accelerator zu, nicht Herrn Mueller
persoenlich. Wenn Herr Mueller den Accelerator verlaesst, darf sein Zugang
nicht mitgehen - und wenn eine Kollegin uebernimmt, soll der Founder nicht neu
zustimmen muessen. Umgekehrt: Wird ein Mitglied auf `revoked` gesetzt, endet
sein Zugang sofort, ohne dass der Grant angetastet wird.

Der Preis dieser Entscheidung, und er muss der Person gezeigt werden: Zustimmung
zu einer Organisation heisst Zustimmung zu **mehreren, wechselnden Menschen**.
Das Einwilligungsformular muss das sagen und die Mitgliederzahl nennen - nicht
"Accelerator X moechte Zugang", sondern "Accelerator X (derzeit 4 Personen)".
Und die Person muss die Liste sehen koennen.

### 4.3 Der Personenzugang

```sql
advisor_person_grants (
  id uuid pk,
  subject_user_id uuid not null references auth.users on delete cascade,
  org_id uuid null references advisor_orgs on delete cascade,
  advisor_user_id uuid null references auth.users on delete cascade,
  scope text not null,               -- siehe unten, EINE Zeile je Umfang
  status text not null,              -- 'requested' | 'active' | 'revoked' | 'expired'
  requested_by_user_id uuid not null,
  invite_token_hash text null,
  approved_at timestamptz null,
  revoked_at timestamptz null,
  expires_at timestamptz null,
  created_at, updated_at,
  -- Entweder eine Organisation oder ein einzelner Advisor, nie beides:
  constraint one_holder check ((org_id is null) <> (advisor_user_id is null)),
  constraint status_approved check ((status = 'active') = (approved_at is not null))
)
```

`scope` als Werteliste, je Saeule ein Wert:
`base`, `alignment_report`, `values`, `capability`, `capability_depth`,
`direction`.

**Je Umfang eine eigene Zeile, kein Bitfeld und kein Array.** Der Grund ist der
Widerruf: Wer nur die Direction-Freigabe zurueckziehen will, aendert eine Zeile
auf `revoked`. Bei einem Array waere derselbe Vorgang ein Schreibzugriff auf
die Freigabe, die bestehen bleibt - und ein Fehler dort nimmt zu viel oder zu
wenig weg.

`capability` und `capability_depth` sind getrennt, weil die vorhandene
Sichtbarkeitsleiter das schon so trennt (`areas` gegen
`areas_depth_on_contact` in `get_disclosed_capability`). Ein Advisor-Zugang darf
diese Leiter nicht ueberspringen.

### 4.4 Sitze

Ein Sitz ist eine **Erlaubnis zu fragen**, kein Datenzugriff. Konkret:
`person_seat_limit` begrenzt die Anzahl gleichzeitig `active` Grants je
Organisation. Wird das Limit erreicht, kann die Organisation keine neuen Anfragen
stellen - vorhandene bleiben.

Die Zaehlung gehoert in eine `SECURITY DEFINER`-Funktion und nicht in die
Anwendung: Sonst umgeht ein zweiter Aufruf zur selben Zeit das Limit, und ein
Kontingent, das man durch schnelles Klicken erhoehen kann, ist keines.

**Was ein Sitz nie tut:** Daten freigeben. Der Kauf erzeugt
`status='requested'`, nie `'active'`. Zwischen Bezahlung und Sichtbarkeit steht
immer ein Mensch, der zustimmt. Dieser Satz gehoert als pgTAP-Test in die
Datenbank, nicht als Absichtserklaerung in ein Dokument.

### 4.5 Teamzugang

Existiert (`founder_team_advisor_setup_grants` + `_consents`) und wird nicht
ersetzt. Zwei Ergaenzungen:

- `org_id` daneben, damit ein Accelerator als Organisation Halter sein kann.
- Der `scope` bekommt dieselbe Werteliste wie oben - heute deckt der Grant den
  Setup-Bereich ab, ein Accelerator will auch die Deckungskarte sehen.

Die Regel "alle Founder des Teams muessen zustimmen" bleibt. Bei einem Team von
zwei sind das zwei Einwilligungen, bei drei drei.

---

## 5. Die Zusagen, die nicht verhandelbar sind

Sie stehen hier, damit sie spaeter als Tests dastehen und nicht als Erinnerung:

1. **Kein Zugang ohne Zustimmung der betroffenen Person.** Bei einem Team: aller
   Personen.
2. **Jederzeit widerrufbar, sofort wirksam.** Ein Widerruf ist eine Zeile, nicht
   eine Bitte.
3. **Kauf gewaehrt keinen Zugang.** Sitze erzeugen Anfragen.
4. **Erzaehlungen werden nie geteilt** - nicht die Interviewantworten
   (`capability_interview_turns.answer`), nicht die Direction-Erzaehlungen. Ein
   Advisor sieht bestaetigte Ergebnisse, nie den Rohtext. Das gilt heute schon
   und darf mit dem Advisor-Zugang nicht aufweichen.
5. **Die Person sieht, wer Zugang hat**, seit wann, mit welchem Umfang, und bei
   einer Organisation: welche Menschen dort derzeit Mitglied sind.
6. **Kein Score, keine Rangliste, kein Export, der eines von beiden bastelbar
   macht.** Ein CSV mit einer Zeile je Person und Zahlen darin ist eine
   Rangliste, auch wenn es keine sein will.

---

## 6. Schrittfolge

Nach Nutzen fuer die Anfrage des Accelerators sortiert, nicht nach Bauaufwand.

**P1 - Das Einzelprofil aus dem, was da ist** *(keine Migration)*
Eine Seite `/me/profile`, die Base, Alignment, Werte und Capability
zusammenstellt, mit Druckknopf (`PrintReportButton` existiert). Damit hat Maria
etwas zu zeigen, bevor Direction oder Advisor-Zugang gebaut sind. Das ist die
kuerzeste Strecke zur Frage des Accelerators.

**P2 - Direction** *(Schwesterdokument, Schritte S1-S3)*
Danach hat das Profil seine vierte Saeule und ist das, was es sein soll.

**P3 - Personenzugang fuer einzelne Advisors** *(1 Migration)*
`advisor_person_grants` mit `advisor_user_id`, Anfrage, Einwilligung, Widerruf,
Uebersicht "wer sieht mich". Ohne Organisation, ohne Sitze. Ein Advisor kann
damit eine Einzelperson begleiten - der haeufigste Fall.

**P4 - Organisation und Sitze** *(1 Migration)*
`advisor_orgs`, `advisor_org_members`, `org_id` in den Grants, Limitpruefung in
der Datenbank, Einwilligungsformular mit Mitgliederliste.

**P5 - Accelerator-Arbeitsflaeche**
Eine Uebersicht fuer die Organisation: begleitete Personen und Teams, je mit dem
Umfang, den sie freigegeben haben. Erst hier, weil sie ohne P3/P4 nichts
anzuzeigen hat.

**Spaeter** - CV-Import (Ablage, Extraktion, Fristen), Abrechnung, mehrere
Advisors je Team.

---

## 7. Offene Entscheidungen

1. **Sitzsemantik.** Zaehlt ein Sitz eine Person oder ein Programm-Kohorte? Ein
   Accelerator mit 20 Teilnehmern je Batch will vermutlich nicht 20 Sitze
   einzeln kaufen.
2. **Laufzeit.** Endet ein Zugang mit dem Programm? `expires_at` ist
   vorgesehen, aber wer setzt es - die Organisation oder die Person?
3. **Sichtbarkeit in die andere Richtung.** Sieht ein Founder, welche anderen
   Personen dieselbe Organisation begleitet? Empfehlung: nein.
4. **Der Name.** "Advisor" traegt heute zwei Rollen: der einzelne Mensch, der
   ein Paar begleitet, und die Institution, die ein Programm faehrt. Wenn das
   dasselbe Wort bleibt, wird die Einwilligung unklar.
5. **Preis und Produktgrenze** - nicht meine Entscheidung, aber sie bestimmt
   P4.
