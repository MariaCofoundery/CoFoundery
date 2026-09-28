begin;

-- ---------------------------------------------------------------------------
-- Das alte Abbild traegt v2 nicht - und soll es auch nicht versuchen
-- ---------------------------------------------------------------------------
--
-- `person_alignment_snapshots` ist um das Modell v1 herum gebaut: `scores`
-- jsonb NOT NULL, `values_profile`, `values_status`. Das sind abgeleitete
-- Zahlen.
--
-- V2 ERZEUGT KEINE. Teil F1 des Gutachtens erlaubt in Stufe 0 ausdruecklich
-- "keine latenten Dimensionswerte, Normraenge, Ampeln oder
-- Kompatibilitaetsprozentwerte", und die Mittelwertformel ist fuer das MVP
-- "nicht freigegeben". Eine v2-Zeile in dieser Tabelle muesste also ein
-- `scores`-Objekt erfinden, um die NOT-NULL-Bedingung zu erfuellen.
--
-- DAS WAERE DER TEUERSTE FEHLER DES GANZEN UMBAUS. Nicht weil es abstuerzt -
-- es stuerzt gerade nicht ab. Ein Advisor saehe Zahlen unter einer
-- Ueberschrift, die Zahlen verspricht, und haette keinen Anlass zu fragen,
-- woher sie kommen. Genau die Sorte Wert, deren Abschaffung der Anlass fuer
-- diese ganze Neufassung war.
--
-- Was ein Advisor in v2 sehen darf, sind ANTWORTEN, keine abgeleiteten Werte -
-- mit der Vorschau und den Ausblendmoeglichkeiten aus Teil F7. Das bekommt
-- eine eigene Form in Schritt 7 und nicht diese hier.

alter table public.person_alignment_snapshots
  add constraint person_alignment_snapshots_v1_only
  check (instrument_id = 'founder-compatibility-v1');

comment on constraint person_alignment_snapshots_v1_only on public.person_alignment_snapshots is
  'Diese Tabelle haelt abgeleitete Zahlen. v2 erzeugt keine - eine Zeile hier '
  'muesste sie erfinden. v2 bekommt in Schritt 7 eine eigene Form.';

commit;
