# CoFoundery Capability Model - Technical Brief

## Status
- Modelltyp: beleggestuetztes Inventar-, Ownership- und Deckungsmodell
- Validierung: keine. Dieses Dokument ist eine Arbeitsstruktur, kein validiertes Instrument.
- Zweck: Produktkonzept, Vokabular und Grenzen festlegen, bevor Schema und Screens entstehen
- Verhaeltnis zum Alignment-Modell: ergaenzend, ausdruecklich nicht integriert
- Ersetzt: den ersten Entwurf vom 06.09.2026 sowie den Masterrahmen aus der Produktdiskussion
- Letzte Aktualisierung: 2026-09-07

---

## 1. Zweck und Einordnung

### Die zwei Perspektiven

Das Alignment-Modell beantwortet **HOW WE WORK** - wie wollen wir miteinander arbeiten. Dazu gehoeren Commitment, Entscheidungslogik, Zusammenarbeit, Konflikte, Risikoorientierung, Unternehmenslogik und Werte.

Das Capability-Modell beantwortet **WHAT WE BRING** - was bringen wir als Personen und als potenzielles Team fuer dieses konkrete Venture mit.

Gemeinsam mit dem Venture-Kontext entsteht langfristig ein Teambild:

> How we work + What we bring + What our venture currently needs

### Die Luecke ist bereits benannt

Das bestehende Modell benennt diese Luecke selbst. In `founder-matching-logic.md:1007-1013` steht unter "Es erfasst **nicht** zuverlaessig":

> Skill-Fit / Kompetenzkomplementaritaet

Das ist die einzige Stelle im gesamten Dokumentbestand, an der der Begriff vorkommt. Das Capability-Modell fuellt also keinen neuen Anspruch, sondern einen bewusst offen gelassenen Platz.

Die Abgrenzung ist damit schon geschrieben und muss nur nach aussen gewendet werden. Die Konstruktdefinitionen grenzen an sechs Stellen explizit gegen Kompetenz ab:

- `construct-definitions.md:561` - "Es misst keine Kompetenz, keine Charakterqualitaet und keine moralische Eignung."
- `:40-41` - "allgemeine Intelligenz oder strategische Kompetenz / Branchenwissen oder Markterfahrung"
- `:134-135` - "kognitive Faehigkeit oder allgemeine Intelligenz / Fachkompetenz oder Entscheidungserfahrung"
- `:229-231` - "Kommunikationskompetenz / Empathie oder Vertrauensfaehigkeit"
- `:412-416` - "Branchenwissen oder Erfahrung mit Krisen"
- `:501-507` - "tatsaechliche Konfliktloesungskompetenz"

Kurzform der Arbeitsteilung:

> Alignment fragt, **wie** zwei Menschen zusammenarbeiten.
> Capability fragt, **was** ein Team fachlich abdeckt.

Beide beschreiben denselben Menschen, aber nicht dieselbe Sache. Sie duerfen sich nicht gegenseitig erklaeren und nicht zu einem gemeinsamen Wert verrechnet werden.

### Das Kernproblem

Bei der Wahl eines Co-Founders reicht es nicht zu wissen, ob man sich sympathisch findet, ob die Werte aehnlich sind oder ob eine Person "Business" und die andere "Tech" macht. Founder muessen irgendwann verstehen:

- Was koennen wir tatsaechlich, und wo haben wir es praktisch angewandt?
- Wo ueberschneiden wir uns, wo ergaenzen wir uns?
- Welche fuer unser Venture relevanten Bereiche sind noch wenig sichtbar?
- Wer moechte wofuer Verantwortung uebernehmen - und wer ausdruecklich nicht?
- Was lernen wir, was stellen wir ein, was kaufen wir extern, und brauchen wir dafuer wirklich eine weitere Gruendungsperson?

### Was das Modell nicht leisten soll

- keine Rollenzuweisung ("A sollte CTO sein")
- keine Eignungsaussage ueber Personen
- keine Erfolgsprognose fuer das Venture
- keine Bewertung von Kompetenzhoehe oder Qualitaet einer Leistung
- keine Aussage darueber, ob ein Team "vollstaendig" ist
- kein Ersatz fuer Referenzen, Arbeitsproben oder Zusammenarbeit auf Zeit

Der zentrale Satz des Modells:

> **Ein fehlender Beleg ist nicht dasselbe wie eine fehlende Faehigkeit.**

Jede Aussage ueber eine Luecke muss diesen Vorbehalt mittragen. Das Modell sieht nur, was jemand eingetragen hat.

---

## 2. Modelluebersicht

### Produktlogik

```text
A. WHAT I BRING              Funktionale Capabilities, Erfahrung,
   │                          Ownership-Wunsch, Entwicklungsinteresse,
   │                          Branchenwissen, Contribution Patterns
   ▼
B. WHAT THIS VENTURE NEEDS   relevante Bereiche, Phase, Venture-Kontext
   │                          - vom Team gesetzt, nicht vom Modell behauptet
   ▼
C. WHAT WE COVER TOGETHER    Beleglage, Ergaenzung, Ueberschneidung,
                              Ownership, Handlungsoptionen
```

Daraus entsteht die Kette **Capability -> Need -> Action -> Resource**.

### Datenschichten

```text
L1  Personen-Inventar     = person_core plus Inventartabellen
     │                      geteilte Datenbasis mit Connect und Discovery
     ▼
L2  Team-Deckung           reine Ableitung, kein eigener Speicher
     ▼
L3  Relevanzrahmen         welche Bereiche zaehlen fuer dieses Venture
     ▼
L4  Handlungsoptionen      entwickeln, uebernehmen, hiren, extern, Advisor
```

**L1 ist identisch mit Profile V2.** Das ist die wichtigste Architekturaussage dieses Dokuments. Connect fragt "was bringt diese Person mit", Capability fragt "was davon deckt das Team ab" - beides liest dieselben Daten durch eine andere Linse. Werden sie getrennt modelliert, entsteht dieselbe Doppelung, die bei den Rollenvokabularen bereits eingetreten ist.

Der kanonische Personen-Kern existiert seit `20260907120000_create_person_core_v01.sql`. Die Inventartabellen haengen an `person_core.user_id`.

---

## 3. Vokabular: vier Begriffe, die auseinandergehalten werden muessen

Ohne diese Trennung entstehen mehrere Skill-Systeme nebeneinander.

### 3.1 Funktion

Ein Arbeitsbereich, den ein Venture abdecken muss.

- Eigenschaft des **Ventures**, nicht der Person
- strukturell und endlich: eine ueberschaubare, geschlossene Liste
- wertfrei: keine Funktion ist wichtiger als eine andere

### 3.2 Erfahrung

Eine belegte Anwendung: Kontext, Rolle, Zeitraum, Haeufigkeit, Selbstaendigkeit.

- Eigenschaft der **Person**
- die einzige direkt erhobene Groesse des Modells
- pruefbar im Gespraech, importierbar aus Lebenslauf oder Export
- traegt immer ihren Kontext mit: drei Jahre B2B-Sales im Konzern ist etwas anderes als drei Jahre B2B-Sales im Pre-Seed-Startup

### 3.3 Faehigkeit

Was eine Person in einem Funktionsbereich tun kann.

- **abgeleitet aus Erfahrung, nicht frei selbst bewertet**
- nie als abstrakte Skala ("Experte", 7 von 10)
- immer mit ihrem Beleg zusammen dargestellt

Das ist die zentrale Designentscheidung. Eine Selbsteinschaetzung ist genau dort am unzuverlaessigsten, wo das Modell am meisten davon abhaengt: Eine zu grosszuegige Selbstbewertung **versteckt eine echte Luecke**, und vor der soll das Modell warnen. Die bestehenden Validierungsdokumente benennen dieses Risiko fuer das Alignment-Modell bereits ausfuehrlich (`validation-plan.md:184-196`, soziale Erwuenschtheit und Selbstbild statt Verhalten). Im Capability-Kontext ist die Anreizlage eindeutiger und das Risiko damit groesser.

### 3.4 Ownership

Wer im Team aktuell fuer einen Funktionsbereich verantwortlich ist.

- Eigenschaft des **Teams zu einem Zeitpunkt**, nicht der Person
- **wird ausschliesslich vom Team gesetzt, nie vom System vorgeschlagen**
- veraenderlich, ohne dass sich Erfahrung veraendert

Ownership ist der Punkt, an dem das Produkt seine eigene Linie ueberschreiten koennte. Wer eine Funktion uebernimmt, haengt an Dingen, die keine Datenstruktur sieht: wer wohin wachsen will, wer Fuehrung sucht, wie Equity verhandelt wurde, wer gerade Kapazitaet hat. Eine Systemempfehlung waere hier oft falsch und wuerde trotzdem ernst genommen, weil sie analytisch aussieht.

### 3.5 Abgrenzungsformel

Analog zu den Trennfragen in `construct-definitions.md:80-83`:

- **Funktion** fragt: welcher Arbeitsbereich?
- **Erfahrung** fragt: was wurde wo, wie oft und wie selbstaendig getan?
- **Faehigkeit** fragt: was folgt daraus plausibel?
- **Ownership** fragt: wer macht es hier gerade, und wer will es?
- **Alignment** fragt: wie arbeitet ihr dabei zusammen?

---

## 4. Das Funktionsvokabular

### 4.1 Zwei Achsen, nicht drei Listen

Heute existieren drei Vokabulare, die scheinbar dasselbe beschreiben. Zwei davon tun es wirklich, das dritte nicht:

| Achse | Frage | Bisher |
|---|---|---|
| **Funktion** | In welchem Arbeitsbereich? | Discovery (12 Rollen), `profiles.focus_skill` (8 Werte) |
| **Beitragsmodus** | Wie engagiert sich die Person? | `CONNECT_ROLES` (6 Werte) |

`CONNECT_ROLES` - `founder`, `aspiring_founder`, `expert`, `advisor_mentor`, `business_angel`, `company_representative` - beschreibt keinen Arbeitsbereich, sondern die Beziehung zum Startup und die Art des Beitrags. Ein Business Angel ist keine Funktion. Diese Achse bleibt eigenstaendig und ist inhaltlich der Contribution Mode.

### 4.2 Eine Achse, zwei Granularitaeten

Die Funktionsachse bekommt acht Familien als obere Ebene und feinere Bereiche darunter. Deckung rollt nach oben auf, Suche und Selbstbeschreibung greifen nach unten durch. Acht Zeilen sind als Deckungsansicht lesbar, fuenfzehn nicht mehr.

Die acht Familien mit ihren IDs:

| ID | DE | EN |
|---|---|---|
| `customer_market` | Kunden & Markt | Customer & Market |
| `product_value` | Produkt & Nutzenversprechen | Product & Value Proposition |
| `strategy_business_model` | Strategie & Geschaeftsmodell | Strategy & Business Model |
| `technology_delivery` | Technologie & Umsetzung | Technology & Delivery |
| `commercial_growth` | Vertrieb & Wachstum | Commercial & Growth |
| `finance_funding` | Finanzen & Finanzierung | Finance & Funding |
| `operations_people` | Operations, People & Organisation | Operations, People & Organisation |
| `legal_governance` | Recht, Governance & Compliance | Legal, Governance & Compliance |

### 4.3 Kuratierte Bereichsliste

42 Bereiche, vier bis sieben pro Familie. Die Groesse ist bewusst gewaehlt: Der Snapshot fragt zuerst die Familien, danach erscheinen nur die Bereiche der gewaehlten Familien. Wer zwei bis drei Familien waehlt, sieht rund zehn bis zwanzig Bereiche - eine Menge, die man tatsaechlich durchklickt.

**`customer_market`**

| ID | DE | EN |
|---|---|---|
| `customer_discovery` | Customer Discovery & Kundeninterviews | Customer Discovery |
| `user_research` | User Research | User Research |
| `market_analysis` | Markt- & Wettbewerbsanalyse | Market & Competitive Analysis |
| `target_segments` | Zielgruppen & Segmentierung | Segmentation |
| `industry_domain` | Branchen- & Domaenenwissen | Industry & Domain Knowledge |

**`product_value`**

| ID | DE | EN |
|---|---|---|
| `product_discovery` | Product Discovery | Product Discovery |
| `product_management` | Product Management | Product Management |
| `product_strategy` | Product Strategy & Roadmap | Product Strategy & Roadmap |
| `ux_design` | UX & Interface Design | UX & Interface Design |
| `prototyping` | Prototyping | Prototyping |

**`strategy_business_model`**

| ID | DE | EN |
|---|---|---|
| `business_model` | Geschaeftsmodell | Business Model |
| `pricing` | Pricing & Monetarisierung | Pricing & Monetisation |
| `positioning` | Positionierung | Positioning |
| `strategic_planning` | Strategische Planung | Strategic Planning |

**`technology_delivery`**

| ID | DE | EN |
|---|---|---|
| `software_engineering` | Software-Entwicklung | Software Engineering |
| `technical_architecture` | Technische Architektur | Technical Architecture |
| `data_analytics` | Data & Analytics | Data & Analytics |
| `ai_ml` | AI & Machine Learning | AI & Machine Learning |
| `hardware_production` | Hardware & Produktion | Hardware & Production |
| `service_delivery` | Service Delivery | Service Delivery |

**`commercial_growth`**

| ID | DE | EN |
|---|---|---|
| `b2b_sales` | B2B Sales | B2B Sales |
| `b2c_growth` | B2C Wachstum & Akquise | B2C Growth & Acquisition |
| `marketing_brand` | Marketing & Brand | Marketing & Brand |
| `performance_marketing` | Performance Marketing | Performance Marketing |
| `partnerships` | Partnerships & Business Development | Partnerships & Business Development |
| `customer_success` | Customer Success | Customer Success |
| `community` | Community | Community |

**`finance_funding`**

| ID | DE | EN |
|---|---|---|
| `financial_planning` | Finanzplanung & Forecast | Financial Planning & Forecasting |
| `unit_economics` | Unit Economics | Unit Economics |
| `accounting_controlling` | Buchhaltung & Controlling | Accounting & Controlling |
| `fundraising` | Fundraising | Fundraising |
| `investor_relations` | Investor Relations | Investor Relations |

**`operations_people`**

| ID | DE | EN |
|---|---|---|
| `operations` | Operations | Operations |
| `process_design` | Prozesse & Tooling | Process Design & Tooling |
| `recruiting` | Recruiting & Hiring | Recruiting & Hiring |
| `people_management` | Fuehrung & People Management | Leadership & People Management |
| `org_design` | Organisationsaufbau | Organisational Design |

**`legal_governance`**

| ID | DE | EN |
|---|---|---|
| `corporate_legal` | Gesellschaftsrecht & Vertraege | Corporate Law & Contracts |
| `ip` | IP & Marken | IP & Trademarks |
| `data_protection` | Datenschutz | Data Protection |
| `compliance_regulatory` | Compliance & Regulatorik | Compliance & Regulation |
| `security` | Security | Security |

**Auffangwert**

| ID | DE | EN |
|---|---|---|
| `other` | Anderer Schwerpunkt | Other |

Ein globaler Auffangwert mit Freitextfeld, nicht einer pro Familie. Haeufen sich dort Eintraege, ist das das Signal fuer die naechste Ueberarbeitung der Liste.

### 4.4 Drei bewusste Unschaerfen dieser Liste

1. **`commercial_growth` ist die groesste Familie** mit sieben Bereichen, weil sie vier der zwoelf Discovery-Rollen aufnimmt. Falls sie die Deckungsansicht spaeter dominiert, ist sie der erste Kandidat fuer eine Teilung in Sales und Marketing/Growth.
2. **Die Grenze zwischen `product_strategy` und `strategy_business_model` ist die weichste.** Produktstrategie liegt bewusst bei Produkt, weil Founder sie dort suchen; Geschaeftsmodellfragen liegen in der Strategiefamilie. Bei Nutzertests ist das die Stelle, an der Fehlzuordnungen zu erwarten sind.
3. **`legal_governance` hat heute null Bestandsdaten.** Diese Familie wird bei jedem bestehenden Profil zunaechst `nicht_erhoben` anzeigen. Das ist korrekt und kein Fehler - aber es ist der Grund, warum die Deckungsansicht erst nach dem Snapshot Sinn ergibt.

### 4.5 Mapping der Bestandslisten

| Bestandswert | Quelle | Familie | vorgeschlagener Bereich |
|---|---|---|---|
| `tech` | Discovery | `technology_delivery` | `software_engineering` |
| `product` | Discovery | `product_value` | `product_management` |
| `design` | Discovery | `product_value` | `ux_design` |
| `sales` | Discovery | `commercial_growth` | `b2b_sales` |
| `growth` | Discovery | `commercial_growth` | `b2c_growth` |
| `marketing` | Discovery | `commercial_growth` | `marketing_brand` |
| `community` | Discovery | `commercial_growth` | `community` |
| `operations` | Discovery | `operations_people` | `operations` |
| `finance` | Discovery | `finance_funding` | `financial_planning` |
| `strategy` | Discovery | `strategy_business_model` | `strategic_planning` |
| `research` | Discovery | `customer_market` | `user_research` |
| `other` | Discovery | - | `other` |
| Tech | `focus_skill` | `technology_delivery` | `software_engineering` |
| Product | `focus_skill` | `product_value` | `product_management` |
| Sales | `focus_skill` | `commercial_growth` | `b2b_sales` |
| Marketing | `focus_skill` | `commercial_growth` | `marketing_brand` |
| Operations | `focus_skill` | `operations_people` | `operations` |
| Finance | `focus_skill` | `finance_funding` | `financial_planning` |
| Sonstiges | `focus_skill` | - | `other` |
| Allrounder | `focus_skill` | - | - |

**Die Familie wird uebernommen, der Bereich nur vorgeschlagen.** Eine Rolle ist breiter als ein Bereich: Wer bei Discovery `tech` angegeben hat, macht vielleicht Architektur und nicht Software-Entwicklung. Die Familie ist damit belastbar, der Bereich ist eine Vermutung. Der Snapshot zeigt sie als Vorauswahl, die die Person bestaetigt oder aendert - eine stille Zuordnung waere genau die Art unbelegter Behauptung, die dieses Modell vermeiden soll.

Zwei Bestandswerte gehen nicht in die Funktionsachse ueber:

- **`Allrounder`** ist keine Funktion, sondern eine Aussage ueber Breite. Das ergibt sich kuenftig von selbst, wenn jemand mehrere Familien belegt hat.
- **`legal_governance`** hat umgekehrt keine Entsprechung in den Bestandslisten. Fuer ein Pre-Seed-Team ist das folgenlos, ab Seed sind Arbeitsrecht, IP und Vertraege echte Bereiche.

Die Migrationskosten dieser Umstellung sind derzeit praktisch null: Es existieren zwei Discovery-Profile und ein Connect-Profil. Stand 07.09.2026 haben 17 von 19 Nutzern einen `focus_skill`-Wert oder gar keine Fachangabe.

---

## 5. Ebenen der Personendaten

Das Modell darf nicht zu einer Hard-Skill-Liste werden. Es enthaelt drei moegliche Ebenen, die unterschiedlich belastbar sind - und deshalb unterschiedlich verwendet werden.

### 5.1 Funktionale Capabilities - der Kern

Konkrete Arbeit, die fuer ein Venture erforderlich sein kann, nach der Funktionsachse aus Kapitel 4. Diese Ebene traegt Deckung, Ownership und Handlungsoptionen. Sie ist die einzige Ebene, die in Ableitungen einfliesst.

### 5.2 Contribution Patterns - Profiltextur, eingehegt

Typische Arten, wie jemand beitraegt. Nicht "welcher Typ bist du", sondern "was gelingt dir haeufig besonders gut". Beispiele: Klarheit in unuebersichtliche Themen bringen, Muster erkennen, gute Fragen stellen, aus einer Idee etwas Konkretes machen, komplexe Dinge verstaendlich erklaeren, Vertrauen aufbauen, Menschen verbinden, Risiken und blinde Flecken erkennen, Prioritaeten schaffen, Dinge ins Tun bringen.

Diese Faehigkeiten koennen aus Beruf, Side Projects, Ehrenamt, Care-Arbeit, Community-Arbeit, privaten Projekten oder wiederholtem Feedback stammen. Das ist ausdruecklich gewollt, damit nichtlineare Lebenslaeufe nicht benachteiligt werden.

**Einhegung:** Drei aus vierzehn positiven Selbstaussagen zu waehlen ist soziale Erwuenschtheit in Reinform - es gibt keine Antwort, die schlecht aussieht. Die Ebene hat echten Produktwert als Profiltextur und Gespraechseinstieg, aber keine Messqualitaet.

Deshalb gilt: Contribution Patterns erscheinen **nur** in der Selbstbeschreibung des Profils. Sie fliessen **nie** in Deckungsableitungen und **nie** in ein Empfehlungs- oder Matching-Signal ein. Andernfalls entsteht Persoenlichkeits-Matching unter anderem Namen.

### 5.3 Transferable Capabilities - vertagt

Der Masterrahmen sah eine sechste Ebene uebertragbarer Kompetenzen vor, gegliedert in Understand & Think, Explore & Learn, Communicate & Influence, Connect & Mobilise, Organise & Execute, Lead & Enable.

Diese Ebene wird **nicht** gebaut. Begruendung:

Ihre eigenen Beispiele fallen mit den bestehenden Alignment-Dimensionen zusammen. "Schwierige Themen ansprechen" und "Feedback geben" sind Konfliktstil. "Priorisieren", "Arbeit strukturieren" und "Erwartungen formulieren" sind Arbeitsstruktur. "Probleme strukturieren" und "Hypothesen entwickeln" sind Entscheidungslogik.

Die theoretische Grenze - Praeferenz gegen Faehigkeit, also "ich gehe Konflikten aus dem Weg" gegen "ich kann schwieriges Feedback respektvoll formulieren" - ist fachlich real, bricht in der Selbstauskunft aber zusammen. Wer Konflikten ausweicht, kreuzt selten an, gut in hartem Feedback zu sein.

Entscheidend ist der bestehende Befund: `founder-compatibility-discriminant-purity-audit.md:416-418` haelt fest, dass die sechs vorhandenen Dimensionen **nicht diskriminant sauber genug** fuer eine ernsthafte psychometrische Pruefung sind. Eine parallele Ebene, die dieselben Konstrukte anders benennt, verschlechtert das messbar und gefaehrdet das Alignment-Modell mit.

Falls diese Ebene spaeter kommt, dann als Erweiterung des Alignment-Modells, nicht als Capability-Ebene.

---

## 6. Erfahrung und Evidence

Capability und Erfahrung sind verschiedene Informationen:

> "Ich kann Beziehungen zu B2B-Kunden aufbauen." ist eine Faehigkeit.
> "Ich habe vier Jahre B2B-Vertrieb gemacht." ist Erfahrung.

Erhoben werden soll deshalb: Was kann jemand, wo wurde es angewandt, wie haeufig, wie selbstaendig, wie anspruchsvoll war der Kontext, wie aktuell ist es.

Moegliche Erfahrungsquellen: berufliche Taetigkeit, eigenes Startup, Side Project, Studium oder Ausbildung, Ehrenamt, Community-Arbeit, privates Projekt, Hobby, andere praktische Anwendung. **Die Herkunft einer Faehigkeit bestimmt nicht ihre Qualitaet.**

### Zwei Granularitaeten, die sich ergaenzen

**Anwendungsstufen** - fuer den Snapshot, statt einer abstrakten Skala:

1. noch nicht praktisch angewandt
2. mit Unterstuetzung ausprobiert
3. selbstaendig angewandt
4. wiederholt angewandt
5. auch in anspruchsvolleren Situationen angewandt, kann andere unterstuetzen

Diese Stufen sind zu testen und keine validierten Kompetenzgrenzen.

**Stationen** - fuer die Deep Analysis: Rolle, Organisation oder Kontext, Zeitraum, Funktionsbezug. Die Station ist der Beleg, die Stufe ist die Granularitaet darauf. Beides zusammen ist belastbarer als jedes einzeln, und Stationen sind das, was ein Lebenslauf-Import ueberhaupt fuellen kann.

Bei wichtigen Bereichen koennen spaeter Verhaltensanker ergaenzt werden, etwa fuer B2B Sales: "Ich kann einen Verkaufsprozess von der ersten Ansprache bis zu einer belastbaren Kaufentscheidung strukturieren."

---

## 7. Ownership

### CAN ist nicht WANT TO OWN

Nur weil jemand etwas kann, moechte die Person nicht automatisch dauerhaft dafuer verantwortlich sein. Eine Gruenderin mit fuenf Jahren Sales-Erfahrung, die im eigenen Unternehmen nicht langfristig Sales verantworten will, darf nicht zu "Sales vollstaendig abgedeckt" fuehren, sondern zu "Sales-Erfahrung vorhanden, Ownership noch ungeklaert".

Moegliche Ownership-Zustaende:

- moechte verantwortlich uebernehmen
- moechte aktiv beitragen
- moechte sich in die Verantwortung hinein entwickeln
- wuerde lieber eine andere Person als Owner sehen
- wuerde den Bereich bevorzugt extern abdecken
- noch unklar

Aus dem individuellen Wunsch kann spaeter eine vereinbarte Team-Ownership entstehen. Die Vereinbarung dokumentiert das Founder Setup, nicht das Capability-Modell: Capability zeigt, wer was uebernehmen koennte und moechte; Founder Setup haelt fest, wer es tatsaechlich tut.

### Entwicklungsinteresse

Founder sollen nicht nur zeigen, was sie koennen, sondern auch, was sie lernen oder entwickeln moechten. Nicht jede Kompetenz muss am ersten Tag vorhanden sein - fuer fruehe Teams ist das der Normalfall.

---

## 8. Relevanz: was dieses Venture braucht

Die Frage lautet nicht "welche Skills braucht jeder Founder", sondern "welche Bereiche erscheinen fuer dieses konkrete Venture in seiner aktuellen Situation relevant".

Das ist die wissenschaftlich schwaechste Stelle des Modells und braucht die groesste Zurueckhaltung. Eine Aussage der Form "laut Theorie sollte ein Startup in Phase Z den Bereich X abdecken" ist ein staerkerer Anspruch als alles, was das Alignment-Modell erhebt. Dort gilt ausdruecklich (`technical-brief.md:24-30`): keine klinische Diagnostik, keine harte Vorhersage von Unternehmenserfolg, keine automatische Wahrheit ueber Personen. Die Empirie zur Zusammensetzung von Gruendungsteams ist umstritten, stark kontextabhaengig und ueberwiegend an Ueberlebenden erhoben.

### Fuer v0.1: Relevanz kommt vom Team

Das Team markiert selbst, welche Familien fuer sein Venture gerade relevant sind. Das Modell zeigt Deckung gegen diese **selbst gesetzte** Liste. Damit entfaellt die schwaechste Behauptung, und der Nutzen bleibt fast vollstaendig erhalten: Der Wert liegt darin, dass ein Team systematisch hinschaut, nicht darin, dass eine externe Instanz die Liste vorgibt.

### Wenn spaeter ein Relevanzrahmen ergaenzt wird

Kontextgroessen waeren Venture-Typ (B2B, B2C, SaaS, Plattform, Marketplace, E-Commerce, Dienstleistung, Hardware, DeepTech, AI, MedTech, Impact, reguliert) und Phase (Explore/Discovery, Build/Validate, Go to Market, Grow/Organise).

Dann mit denselben Auflagen wie beim Alignment-Modell:

- Formulierung als **"haeufig genannte Muster"**, nie als "laut Theorie"
- explizite Phasenabhaengigkeit
- Quellenangabe und Kennzeichnung der Umstrittenheit je Aussage
- keine Vollstaendigkeitsbehauptung
- Vorschlaege sind vom Founder aenderbar und als nicht relevant markierbar
- ein eigenes Validierungsdokument analog `founder-compatibility-validation-plan.md`

Niemals: "Fuer SaaS brauchst Du exakt diese zwoelf Faehigkeiten." Sondern: "Fuer euer Venture koennten diese Bereiche derzeit besonders relevant sein. Prueft, ob das zutrifft."

---

## 9. Deckung: zwei Achsen statt einer Zustandsliste

Deckung ist kein Score. Keine Prozentwerte, kein Founder Capability Score, keine Tech-87-Prozent.

Statt einer flachen Liste gemischter Zustaende werden zwei **orthogonale** Achsen gefuehrt. Alle interessanten Aussagen sind Kombinationen daraus, und die Zustandsmenge bleibt damit vollstaendig und erklaerbar.

**Achse 1 - Beleglage**

| Status | Bedeutung | Anzeige DE | Anzeige EN |
|---|---|---|---|
| `belegt` | mehrere Personen oder mehrere Anwendungen | Belegt | Covered |
| `teilweise_belegt` | eine Anwendung oder geringe Stufe | Teilweise belegt | Partly covered |
| `kein_beleg` | Angaben vorhanden, aber keine zu diesem Bereich | Kein Beleg in euren Angaben | No evidence in your entries |
| `nicht_erhoben` | Bereich nie abgefragt oder Profil unvollstaendig | Noch nicht erfasst | Not captured yet |

**Achse 2 - Ownership**

| Status | Anzeige DE |
|---|---|
| `uebernommen` | Verantwortung uebernommen |
| `im_aufbau` | Verantwortung im Aufbau |
| `offen` | Ownership offen |
| `extern` | extern abgedeckt |
| `nicht_relevant` | derzeit nicht relevant |

Die Kombination erzeugt die aussagekraeftigen Faelle von selbst: `belegt` x `offen` ist "Capability vorhanden, Ownership offen"; `kein_beleg` x `uebernommen` ist "Ownership uebernommen, Capability im Aufbau".

Die Trennung von `kein_beleg` und `nicht_erhoben` ist nicht kosmetisch. Sie entspricht dem bestehenden `insufficientData`-Muster (`reportContent.de.ts:141-142`: "Fuer diese Dimension liegen noch nicht genug Daten fuer eine belastbare gemeinsame Einordnung vor") und verhindert, dass Unvollstaendigkeit als Befund gelesen wird.

Zwei harte Regeln:

1. **`kein_beleg` darf nie als "euch fehlt X" formuliert werden.**
2. **Ein Bereich kann nur dann als Luecke bezeichnet werden, wenn er als relevant markiert ist.**

---

## 10. Von der Deckung zur Handlung

Das Modell endet nicht bei der Analyse. Pro nicht oder teilweise belegtem und als relevant markiertem Bereich werden **Optionen** gezeigt, nicht Empfehlungen:

- **entwickeln** - eine Person im Team baut den Bereich auf
- **uebernehmen** - eine Person uebernimmt bewusst Verantwortung
- **hiren** - eine Anstellung
- **extern** - Freelance, Agentur, Steuerberatung, Kanzlei, Fractional Expert
- **Advisor** - Erfahrungswissen, Sparring, Netzwerk
- **weitere Gruendungsperson** - nur wenn eine langfristig zentrale Founder-Level-Funktion weder intern aufgebaut noch sinnvoll angestellt noch extern abgedeckt werden kann

Die letzte Option ist ausdruecklich die letzte. Das System schlaegt niemals von sich aus eine weitere Gruendungsperson vor.

### Die Bruecke ins Connect

Die Option "im Connect suchen" zeigt Menschen, die **kein** Angebot veroeffentlicht haben. Damit ist sie identisch mit dem profilbasierten Kontaktvertrag, der in der Public-Visibility-Spec (Abschnitt 17) bewusst vertagt wurde. Sie braucht ein eigenes Einverstaendnis - sinngemaess "ich moechte ueber mein Profil gefunden und angefragt werden".

**Dieses Feld gehoert von Anfang an in Profile V2.** Nachtraeglich eingezogen bedeutet es, dass alle Bestandsprofile ohne Einwilligung vorliegen und die Bruecke leer bleibt, bis jede Person einzeln zustimmt. Von Anfang an mitgedacht ist es ein Haekchen im ersten Formular.

---

## 11. Zwei Produkttiefen

### Stufe 1: Capability Snapshot

Kurze Version, Ziel etwa **drei bis fuenf Minuten**. Dient Founder-Profil, Co-Founder-Suche, Events, erstem Kennenlernen und erstem Teamvergleich. Ausdruecklich keine Kompetenzdiagnostik.

Aufbau v0.1:

1. **Funktionsfamilien waehlen**, darunter konkrete Bereiche. Bewusst nur die wichtigsten, nicht vierzig Haken.
2. **Anwendungsstufe** je gewaehltem Bereich.
3. **Ownership-Wunsch** je gewaehltem Bereich.
4. **Entwicklungsinteresse**, optional.
5. **Contribution Patterns**, optional - Profiltextur, kein Pflichtfeld.

Die Reduktion auf diese Schritte ist der Grund, warum die Zeitzusage haelt. Mit vier Taxonomie-Ebenen waere der Snapshot realistisch bei zwoelf bis fuenfzehn Minuten gelandet.

### Der Snapshot muss sofort Nutzen erzeugen

Nach Abschluss darf nicht nur "Profil gespeichert" stehen. Der Founder bekommt unmittelbar eine Ansicht **Was Du mitbringst** mit praktischer Erfahrung, gewuenschter Verantwortung und Entwicklungsinteressen.

Das ist wichtig, weil der Nutzen nicht davon abhaengen darf, dass sofort ein Match verfuegbar ist.

### Stufe 2: Deep Capability Analysis

Beginnt erst, wenn zwei oder drei Personen ernsthaft pruefen, gemeinsam zu gruenden, oder bereits zusammenarbeiten. Erfasst zusaetzlich Stationen, Branchenwissen, Startup-Erfahrung, Verhaltensanker, vereinbarte Ownership, Entwicklungsfelder, Venture-Anforderungen und externe Ressourcen.

Sie ist **adaptiv**: Venture-Kontext, daraus relevante Bereiche, Founder bestaetigt diese, nur bestaetigte Bereiche werden vertieft. Erste Annahme: zwoelf bis zwanzig Minuten pro Person.

### Explainable Comparison

Kein Blackbox-Match, keine Prozentzahl. Sondern nachvollziehbar, warum eine Person gezeigt wird: welche Bereiche sie ergaenzt, welche sich ueberschneiden, wo in beiden Profilen wenig sichtbar ist, wo Ownership offen ist - und ein Gespraechsimpuls daraus. Zunaechst regelbasiert und transparent, nicht algorithmisch.

---

## 12. Sprachregelung

Es gilt das bestehende Sprachprinzip aus `founder-compatibility-report-mapping-spec-v1.md:26-51` unveraendert weiter. Bevorzugt: `deutet darauf hin`, `spricht dafuer`, `kann im Alltag relevant werden`, `legt nahe`. Zu vermeiden: `ihr seid`, `objektiv`, `beweist`, `zeigt eindeutig`.

Fuer Capability kommen vier Regeln hinzu:

1. **Beleglage statt Faehigkeitsurteil.** Nicht "A kann kein Sales", sondern "zu Sales liegen in euren Angaben keine Anwendungen vor".
2. **Unvollstaendigkeit immer mitsagen.** Jede Deckungsaussage traegt den Vorbehalt, dass das Modell nur sieht, was eingetragen wurde.
3. **Keine Zuweisung.** Nie "A sollte den Bereich uebernehmen". Deckung zeigen, Verteilung dem Team lassen.
4. **Keine Vollstaendigkeitsaussage.** Nie "euer Team ist vollstaendig aufgestellt" oder "euch fehlt noch X zum vollstaendigen Team".

### Formulierungsmuster

Gut:

> "In euren Angaben finden sich mehrere Anwendungen in Product und Operations. Zu Commercial liegt bisher keine vor - das kann bedeuten, dass der Bereich noch offen ist, oder dass er im Profil noch nicht erfasst wurde."

> "Ihr bringt gemeinsam starke Product- und Tech-Faehigkeiten mit. Wer von euch haette Interesse, erste Kundengewinnung verantwortlich aufzubauen - oder moechtet ihr diesen Bereich zunaechst anders ergaenzen?"

> "Finance ist in eurem aktuellen Profil derzeit weniger sichtbar. Prueft, wie relevant dieser Bereich in eurer naechsten Phase ist und wie ihr ihn abdecken moechtet."

Nicht:

> "Eurem Team fehlt B2B Sales."
> "Euer Team ist schwach in Finance."
> "A ist eure Product-Person, B euer Tech-Lead."
> "Ihr deckt 4 von 6 kritischen Funktionen ab."
> "Anna passt zu 87 Prozent auf eure Luecke."

### Maschinelle Absicherung

`web/src/features/reporting/content/reportCopyGuards.ts` prueft heute gegen `FORBIDDEN_ENGLISH_PHRASES` und ein Prozentanspruchs-Pattern. Capability-Texte sollten in dieselbe Pruefung aufgenommen werden, erweitert um deutsche Begriffe: `euch fehlt`, `ungeeignet`, `vollstaendig aufgestellt`, `sollte uebernehmen`, `schwach in`, sowie `ist eure` oder `ist euer` in Verbindung mit einem Funktionsnamen.

---

## 13. Sichtbarkeit und Datenschutz

Capability-Daten haben vier Sichtbarkeitsebenen. Sie werden **nicht** im Personen-Kern gefuehrt, sondern in den kontextspezifischen Publikationszeilen - damit bleibt die Grenze aus der Public-Visibility-Spec strukturell erzwungen: Ein neues Kernfeld ist nicht automatisch sichtbar, weil Veroeffentlichung eine eigene Zeile mit eigener Whitelist ist.

| Ebene | Beispielinhalte |
|---|---|
| fuer Suche freigebbar | ausgewaehlte Familien und Bereiche, grobe Erfahrung, Ownership-Interessen, Contribution Patterns, Branchenwissen |
| nach Connection teilbar | detailliertere Bereichsangaben, tiefere Erfahrungsangaben, mehr Ownership-Information |
| team-privat | Deep Analysis, Team-Deckung, Entwicklungsfelder, vereinbarte Ownership, externe Ressourcenplanung |
| nur fuer mich | konkrete Beispiele, persoenliche Belege, sensible biografische Angaben, private Selbsteinschaetzungen |

Jede Freigabe ist eine bewusste Owner-Entscheidung mit Default auf der geschlossenen Seite.

**Alignment-Antworten fliessen nicht in Capability-Suche oder -Matching ein.** Das ist keine Bequemlichkeitsregel, sondern folgt aus der Trennung der beiden Modelle.

---

## 14. Abgrenzung zum Alignment-Modell

Die Trennung wird an Beispielpaaren operationalisiert. Damit wird verhindert, dass dasselbe Konstrukt zweimal abgefragt wird.

| Alignment | Capability |
|---|---|
| "Bei wichtigen Entscheidungen moechte ich moeglichst gemeinsam entscheiden." | "Ich kann komplexe Informationen strukturieren und daraus Entscheidungsoptionen entwickeln." |
| "Ich gehe Konflikten zunaechst eher aus dem Weg." | "Ich kann schwieriges Feedback konkret und respektvoll formulieren." |
| "Ich bin bereit, fuer das Unternehmen finanziell hohe Risiken einzugehen." | "Ich kann finanzielle Risiken analysieren und Szenarien modellieren." |
| "Ich moechte sehr eng mit meinem Co-Founder zusammenarbeiten." | "Ich kann Aufgaben koordinieren und klare Verantwortlichkeiten organisieren." |

Wichtig: Diese Beispielpaare zeigen die Grenze, sie garantieren sie nicht. Genau an dieser Naht liegt der Grund, warum die Transferable-Ebene (Kapitel 5.3) vertagt ist - dort waere die Grenze nicht mehr haltbar.

Praezedenzfall fuer die Nichtverrechnung: Das Werte-Modul fliesst laut `founder-matching-logic.md:860-869` bewusst **nicht** in `overallFit` oder die Aggregatmetriken ein. Capability folgt demselben Muster. In Discovery erscheint es rein **beschreibend**, ohne Passungswert und ohne Einfluss auf die Reihung.

---

## 15. Was das Modell ausdruecklich nicht ist

**Keine Persoenlichkeitsdiagnostik.** Nicht: "Du bist ein Visionary Founder", "Du bist kein guter Sales-Typ", "Dir fehlt Founder-Mindset".

**Kein Eignungstest.** Nicht: "Du bist geeignet, ein Startup zu gruenden", "Founder A ist besser als Founder B".

**Keine Erfolgsprognose.** Nicht: "Dieses Team hat 82 Prozent Erfolgschance", "Eure Skill-Verteilung ist optimal".

**Kein Skill-Verzeichnis.** Nicht: fuenfzig Skills anklicken und fertig.

**Kein Defizit-Scanner.** Nicht: "Euer Team ist schwach in Finance."

Vorerst nicht gebaut: Capability Score, Founder Readiness Score, Match-Prozent, KI-Beurteilung von Persoenlichkeit, automatisierte Erfolgsvorhersagen, riesige Skill-Datenbank, psychometrische Tests, verpflichtende Peer Ratings, Zertifizierung von Faehigkeiten, automatisches "Ihr braucht einen dritten Founder".

---

## 16. Methodische Grenzen

- **Selbstauskunft mit Anreiz.** Anders als beim Alignment-Modell gibt es eine klare Richtung, in die Uebertreibung nuetzt. Belegverankerung daempft das, hebt es aber nicht auf.
- **Beleg ist nicht Qualitaet.** Vier Jahre in einer Funktion sagen nichts darueber, wie gut sie ausgefuellt wurde.
- **Kontextverlust.** Dieselbe Bezeichnung bedeutet im Konzern und im Zwei-Personen-Startup Verschiedenes.
- **Lueckenhafte Erfassung sieht aus wie eine Luecke.** Der haeufigste Fehlschluss des Modells, daher Regel 2 der Sprachregelung.
- **Kein Referenzstandard.** Ohne validierten Relevanzrahmen ist "relevant" eine Setzung des Teams, keine Aussage ueber das Venture.
- **Funktionslisten sind kulturell gepraegt.** Die acht Familien sind im westlichen Tech-Startup-Kontext ueblich und nicht universell.
- **Keine Laengsschnittbasis.** Es gibt keine Daten darueber, ob Teams mit besserer Deckung anders abschneiden.
- **Contribution Patterns sind nicht messscharf.** Deshalb sind sie von jeder Ableitung ausgeschlossen (Kapitel 5.2).

---

## 17. Entscheidungen vom 07.09.2026

Diese drei Punkte waren Abwaegungen, keine Sachzwaenge. Sie sind hier festgehalten, damit spaetere Leser sie als Entscheidungen erkennen und begruendet revidieren koennen.

1. **Transferable Capabilities werden nicht gebaut** (Kapitel 5.3). Grund: Ueberlappung mit den Alignment-Dimensionen bei bereits belegter mangelnder Trennschaerfe. Revidierbar, wenn die diskriminante Validitaet des Alignment-Modells geklaert ist.
2. **Contribution Patterns bleiben aus allen Ableitungen ausgeschlossen** (Kapitel 5.2). Grund: soziale Erwuenschtheit ohne Gegengewicht. Revidierbar, wenn eine belastbarere Erhebungsform gefunden wird.
3. **Der Snapshot umfasst nur Funktionsfamilien, Anwendungsstufe, Ownership und optional Entwicklungsinteresse und Patterns** (Kapitel 11). Grund: die Zeitzusage von drei bis fuenf Minuten. Revidierbar nach Nutzertests.

---

## 18. Offene Fragen

1. **Granularitaet der Stationen.** Freitext, strukturiert, oder strukturiert mit Freitextfeld? Davon haengt ab, was ein Lebenslauf-Import ueberhaupt fuellen kann.
2. **Was passiert mit `focus_skill`?** Einfachauswahl aus acht Werten, fliesst mit Gewicht 20 in `profileCompletion` ein. Abloesen bedeutet, dass sich sichtbare Vollstaendigkeitsprozente aller Bestandsnutzer aendern.
3. **Sichtbarkeitsgrenze fuer Lebenslaufdaten.** Ausbildung, Zertifikate und Stationen mit Arbeitgeber und Zeitraum sind Profiling-relevant. Die Public-Visibility-Spec haelt fest, dass neue Profilfelder nicht automatisch oeffentlich werden - fuer diese Felder braucht es eine ausdrueckliche Entscheidung.
4. **Team-Ebene ohne Team.** Gilt die Deckungsansicht nur fuer bestehende Founder-Teams, oder auch fuer ein Duo in der Discovery-Pruefphase?
5. **Bereichsliste im Nutzertest.** Die Liste in Kapitel 4.3 steht, aber ungetestet. Die drei bekannten Unschaerfen sind in 4.4 notiert; zu pruefen ist vor allem, ob `commercial_growth` mit sieben Bereichen zu dominant wirkt und ob die Grenze zwischen `product_strategy` und der Strategiefamilie verstanden wird.

---

## 19. Baureihenfolge

1. ~~**Funktionsvokabular final**~~ - erledigt am 07.09.2026: acht Familien, 42 Bereiche, Mapping der Bestandswerte (Kapitel 4). Als Code entsteht die Liste erst mit Schritt 3, damit keine ungenutzte Konstante im Repo liegt.
2. **person_core Phase 2** - Leser auf den Kern umstellen
3. **Snapshot v0.1 als der eine Profil-Ort** - Phase 3 des Profilzusammenzugs und der Capability-Snapshot sind dieselbe Arbeit, nicht zwei Schritte
4. **person_core Phase 4** - Doppelspalten und tote Spalten loeschen
5. **Danach:** Relevanzrahmen, Deep Analysis, Stationen, Team-Deckung, Explainable Comparison
6. **Spaeter, bei echtem Bedarf:** Peer Feedback, Arbeitsproben, Advisor-Input, Learning-Empfehlungen, Hiring-Empfehlungen, Branchenmodule, longitudinaler Check

Deckungsansicht, Relevanzlogik und Vergleich sollten **nicht** gebaut werden, bevor L1 mit echten Profilen gefuellt ist. Stand 07.09.2026 enthalten 15 von 19 Kernzeilen ausschliesslich einen Namen - jede Deckungsansicht wuerde heute nur `nicht_erhoben` anzeigen.

---

## 20. Qualitaetskriterium

Das Modul ist gut, wenn Founder nach der Nutzung sagen:

> "Das hat mir geholfen, klarer zu sehen, was ich wirklich einbringe."
> "Jetzt verstehe ich besser, was die andere Person ergaenzt."
> "Ich haette sonst gar nicht darueber gesprochen, wer diesen Bereich eigentlich uebernehmen soll."
> "Wir wissen nicht nur, was uns fehlt, sondern koennen bewusst entscheiden, ob wir es lernen, einstellen oder extern ergaenzen."

Nicht: "Cool, ich habe 78 Punkte."

---

## 21. Einordnung dieses Dokuments

Ein Entwurf zur Diskussion, kein beschlossenes Modell. Es legt Vokabular, Grenzen und Sprache fest, damit ein spaeteres Schema nicht nachtraeglich repariert werden muss.

Analog zur Selbsteinordnung der Konstruktdefinitionen (`construct-definitions.md:578`): nicht Abschluss, sondern Ausgangspunkt.

Die belastbarste Kurzbeschreibung:

> Ein beleggestuetztes Inventar dessen, was Menschen in einem Team fachlich nachweislich getan haben, plus getrennt gefuehrte Ownership-Wuensche und eine Deckungsansicht gegen selbst gesetzte Relevanz. Es bewertet keine Faehigkeiten, verteilt keine Rollen und trifft keine Aussage darueber, ob ein Team vollstaendig ist.

Als Produktlogik:

> WHAT I BRING x WHAT YOU BRING x WHAT OUR VENTURE NEEDS = WHAT WE CAN BUILD TOGETHER
