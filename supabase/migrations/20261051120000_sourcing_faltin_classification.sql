begin;

-- ---------------------------------------------------------------------------
-- Die Faltin-Einordnung, entschieden
-- ---------------------------------------------------------------------------
--
-- ENTSCHIEDEN AM 26.09.2026 von Maria, auf Grundlage von
-- `docs/faltin-sourcing-review.md`: "ok passt alles so, nimm das ohne dass
-- ich was eintragen muss."
--
-- Uebernommen wird damit genau das, was in dem Dokument als Vorschlag stand -
-- nicht mehr. Wo kein Vorschlag stand, bleibt es bei `unclassified`, und das
-- ist ein Ergebnis und keine Luecke: Der vierte Wert existiert seit
-- 20261050120000 gerade dafuer.
--
-- VIER BEREICHE BLEIBEN OFFEN, und zwar aus zwei verschiedenen Gruenden:
--
--   `b2b_sales`, `fundraising`, `investor_relations` - ausdruecklich ohne
--   Vorschlag gestellt. Fuer alle drei gibt es einen Dienstleistungsmarkt,
--   und bei allen dreien sagt die Gruendungslehre, dass es am Anfang die
--   Gruenderin selbst tun muss. Das ist eine Haltung des Produkts und keine
--   Wissensfrage - sie gehoert nicht in eine Migration, die jemand nebenbei
--   schreibt.
--
--   `financial_planning` - schlicht uebersehen, als die Vorschlagsliste
--   entstand. Nachtraeglich einen zu erfinden, waere genau der Fehler, den
--   der vierte Wert behebt: ein Vorschlag ist keine Einordnung. Der Bereich
--   steht in der Liste und wartet.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Gehoert ins Team
-- ---------------------------------------------------------------------------
--
-- `unit_economics` ist Faltins eigenes Beispiel gegen die Buchhaltung, und
-- ausgerechnet das stand bis heute auf der Voreinstellung.
--
-- `product_discovery` ist das Geschwister von `customer_discovery`, das
-- schon drin war; `pricing` gehoert in dieselbe Familie wie Geschaeftsmodell
-- und Positionierung, beide ebenfalls schon drin.
--
-- Und drei Bereiche, die man schlicht nicht einkaufen kann: ein schweres
-- Gespraech fuehrt niemand fuer einen, man kann nicht kaufen, jemandes
-- Chefin zu sein, und wie die Firma geschnitten ist, entscheidet die Firma.
update public.capability_areas set sourcing = 'internal_only'
where area_id in (
  'unit_economics',
  'product_discovery',
  'pricing',
  'difficult_conversations',
  'people_management',
  'org_design'
);

-- ---------------------------------------------------------------------------
-- Einkaufbar
-- ---------------------------------------------------------------------------
--
-- Marktforschung ist eine fertige Leistung, und Gestaltung gibt es als
-- Agentur und freiberuflich - das ist der Normalfall, nicht die Ausnahme.
update public.capability_areas set sourcing = 'component'
where area_id in (
  'market_analysis',
  'ux_design'
);

-- ---------------------------------------------------------------------------
-- Kommt wirklich auf das Vorhaben an
-- ---------------------------------------------------------------------------
--
-- Das ist jetzt eine ENTSCHEIDUNG und nicht mehr die Voreinstellung - der
-- Unterschied ist der ganze Punkt der vorherigen Migration. Bei diesen
-- Bereichen haengt es tatsaechlich davon ab, was gebaut wird: ob Technik das
-- Produkt ist, wie gross das Team schon ist, wessen Netzwerk gebraucht wird.
update public.capability_areas set sourcing = 'depends'
where area_id in (
  'software_engineering', 'technical_architecture', 'ai_ml', 'data_analytics',
  'service_delivery',
  'public_speaking', 'facilitation', 'networking', 'teaching_mentoring',
  'product_management',
  'b2c_growth', 'marketing_brand', 'partnerships', 'customer_success', 'community',
  'operations', 'process_design', 'recruiting',
  'user_research', 'target_segments', 'industry_domain',
  'other'
);

commit;
