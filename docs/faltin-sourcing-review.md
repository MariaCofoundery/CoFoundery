# Faltin: Wie die 54 Fähigkeitsbereiche eingeordnet sind

**Für: Maria, zum Entscheiden.** Stand 26.09.2026, erzeugt aus der Datenbank.

## Worum es geht

An jedem Bereich hängt ein Feld `sourcing` nach Günter Faltins Komponentenmodell.
Wenn im Teambild oder in einer gemeinsamen Auswertung eine **Lücke** auftaucht,
steht daneben ein Schildchen. Ohne das heißt jede Lücke „euch fehlt Finance",
und das erzeugt Panik. Mit Faltin heißt sie: „Buchhaltung ist eine Komponente —
die kauft man. Unit Economics nicht."

Vier Werte:

| Wert | Anzeige | Bedeutung |
|---|---|---|
| `internal_only` | gehört ins Team | Wer das abgibt, gibt das Unternehmen ab. |
| `component` | einkaufbar | Gibt es als fertige Leistung, oft besser als nebenbei selbst. |
| `depends` | kommt auf das Vorhaben an | Eine echte Einschätzung: es hängt davon ab, was gebaut wird. |
| `unclassified` | *(nichts)* | Noch nicht eingeordnet. **Zeigt kein Schildchen.** |

`unclassified` ist seit dem 26.09.2026 die Voreinstellung. Vorher war es `depends` —
damit behauptete das Produkt bei 34 von 54 Bereichen etwas, das nie entschieden
worden war. Diese 34 stehen jetzt auf `unclassified` und sind unten leer.

## So gehst du vor

Trag in der letzten Spalte ein, was gelten soll: **T** (gehört ins Team),
**E** (einkaufbar), **D** (kommt drauf an). Leer lassen heißt: bleibt vorerst
unentschieden, und es wird nichts angezeigt — das ist ein gültiges Ergebnis.

Danach setze ich es in eine Migration um.



## Kunden & Markt

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Customer Discovery & Kundeninterviews <br>`customer_discovery` | gehört ins Team |  |  | |
| User Research <br>`user_research` | — | **D** kommt drauf an | selbst machen lehrt am meisten, einkaufbar ist es trotzdem | |
| Markt- & Wettbewerbsanalyse <br>`market_analysis` | — | **E** einkaufbar | Marktforschung ist eine fertige Leistung | |
| Zielgruppen & Segmentierung <br>`target_segments` | — | **D** kommt drauf an | hängt am Vorhaben | |
| Branchen- & Domänenwissen <br>`industry_domain` | — | **D** kommt drauf an | entweder man bringt es mit oder man holt es dazu | |

## Produkt & Nutzenversprechen

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Product Discovery <br>`product_discovery` | — | **T** gehört ins Team | Geschwister von Kundenentdeckung, die schon drin ist | |
| Product Management <br>`product_management` | — | **D** kommt drauf an | hängt an der Größe | |
| Product Strategy & Roadmap <br>`product_strategy` | gehört ins Team |  |  | |
| UX & Interface Design <br>`ux_design` | — | **E** einkaufbar | Agenturen und Freiberufliche, Standardfall | |
| Prototyping <br>`prototyping` | einkaufbar |  |  | |

## Strategie & Geschäftsmodell

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Geschäftsmodell <br>`business_model` | gehört ins Team |  |  | |
| Pricing & Monetarisierung <br>`pricing` | — | **T** gehört ins Team | eine Strategieentscheidung, wie Geschäftsmodell und Positionierung | |
| Positionierung <br>`positioning` | gehört ins Team |  |  | |
| Strategische Planung <br>`strategic_planning` | gehört ins Team |  |  | |

## Technologie & Umsetzung

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Software-Entwicklung <br>`software_engineering` | — | **D** kommt drauf an | hängt davon ab, ob Technik das Produkt ist | |
| Technische Architektur <br>`technical_architecture` | — | **D** kommt drauf an | dito | |
| Data & Analytics <br>`data_analytics` | — | **D** kommt drauf an | dito | |
| AI & Machine Learning <br>`ai_ml` | — | **D** kommt drauf an | dito | |
| Hardware & Produktion <br>`hardware_production` | einkaufbar |  |  | |
| Service Delivery <br>`service_delivery` | — | **D** kommt drauf an | hängt am Geschäftsmodell | |

## Vertrieb & Wachstum

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| B2B Sales <br>`b2b_sales` | — | **offen** | STRITTIG: founder-led sales am Anfang - oder einkaufbar? | |
| B2C Wachstum & Akquise <br>`b2c_growth` | — | **D** kommt drauf an | hängt am Kanal | |
| Marketing & Brand <br>`marketing_brand` | — | **D** kommt drauf an | Markenarbeit kauft man, Haltung nicht | |
| Performance Marketing <br>`performance_marketing` | einkaufbar |  |  | |
| Partnerships & Business Development <br>`partnerships` | — | **D** kommt drauf an | hängt davon ab, wessen Netzwerk gebraucht wird | |
| Customer Success <br>`customer_success` | — | **D** kommt drauf an | hängt an der Größe | |
| Community <br>`community` | — | **D** kommt drauf an | hängt am Vorhaben | |

## Finanzen & Finanzierung

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Finanzplanung & Forecast <br>`financial_planning` | — |  |  | |
| Unit Economics <br>`unit_economics` | — | **T** gehört ins Team | Faltins eigenes Beispiel gegen die Buchhaltung | |
| Buchhaltung & Controlling <br>`accounting_controlling` | einkaufbar |  |  | |
| Fundraising <br>`fundraising` | — | **offen** | STRITTIG: es gibt Berater, aber investiert wird in Gründer | |
| Investor Relations <br>`investor_relations` | — | **offen** | STRITTIG: dasselbe | |

## Operations, People & Organisation

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Operations <br>`operations` | — | **D** kommt drauf an | hängt am Vorhaben | |
| Prozesse & Tooling <br>`process_design` | — | **D** kommt drauf an | hängt am Vorhaben | |
| Recruiting & Hiring <br>`recruiting` | — | **D** kommt drauf an | am Anfang Chefsache, später eine Rolle | |
| Führung & People Management <br>`people_management` | — | **T** gehört ins Team | man kann nicht einkaufen, jemandes Chefin zu sein | |
| Organisationsaufbau <br>`org_design` | — | **T** gehört ins Team | wie die Firma geschnitten ist, entscheidet die Firma | |

## Recht, Governance & Compliance

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Gesellschaftsrecht & Verträge <br>`corporate_legal` | einkaufbar |  |  | |
| IP & Marken <br>`ip` | einkaufbar |  |  | |
| Datenschutz <br>`data_protection` | einkaufbar |  |  | |
| Compliance & Regulatorik <br>`compliance_regulatory` | einkaufbar |  |  | |
| Security <br>`security` | einkaufbar |  |  | |

## Außenauftritt & Moderation

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Vor Gruppen sprechen & Pitchen <br>`public_speaking` | — | **D** kommt drauf an | eine Sprecherin kann man holen, Glaubwürdigkeit nicht | |
| Moderation & Gespräche führen <br>`facilitation` | — | **D** kommt drauf an | einkaufbar, aber oft besser intern | |
| Netzwerk aufbauen & halten <br>`networking` | — | **D** kommt drauf an | hängt davon ab, wessen Netzwerk zählt | |
| Unangenehmes ansprechen <br>`difficult_conversations` | — | **T** gehört ins Team | ein schweres Gespräch kann niemand für dich führen | |
| Anleiten & befähigen <br>`teaching_mentoring` | — | **D** kommt drauf an | hängt am Vorhaben | |

## Zusammenarbeit & Verantwortung

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Etwas bis zum Ergebnis verantworten <br>`owning_outcomes` | gehört ins Team |  |  | |
| Entscheiden, wenn Informationen fehlen <br>`deciding_under_uncertainty` | gehört ins Team |  |  | |
| Festlegen, was zuerst passiert <br>`prioritising` | gehört ins Team |  |  | |
| Arbeit so ordnen, dass andere andocken <br>`structuring_work` | gehört ins Team |  |  | |
| Abgeben und übergeben <br>`handing_over` | gehört ins Team |  |  | |
| Nach einem Rückschlag auswerten <br>`reviewing_setbacks` | gehört ins Team |  |  | |

## Anderer Schwerpunkt

| Bereich | heute | mein Vorschlag | warum | **deine Entscheidung** |
|---|---|---|---|---|
| Etwas anderes <br>`other` | — | **D** kommt drauf an | Sammelposten | |

## Die drei, bei denen ich keinen Vorschlag habe

**Vertrieb B2B**, **Fundraising**, **Investorenbeziehungen**. Bei allen dreien
gibt es einen Markt für Dienstleistung — und bei allen dreien sagt die
Gründungslehre, dass es am Anfang die Gründerin selbst tun muss. Das ist keine
Wissensfrage, sondern eine Haltung des Produkts. Deshalb deine Entscheidung.

## Was ich nicht getan habe

Ich habe die 34 unentschiedenen **nicht** einfach mit meinem Vorschlag
überschrieben. Ein Vorschlag von mir ist keine Einordnung von euch — und genau
der Unterschied war der Fehler, den der vierte Wert jetzt behebt.

