-- ---------------------------------------------------------------------------
-- Zwei neue Werte fuer assessment_module
-- ---------------------------------------------------------------------------
--
-- `module` traegt bisher `base` und `values` - die beiden Teile des
-- v1-Fragebogens. Ab jetzt traegt dieselbe Spalte den SCOPE: Gehoert dieser
-- Fragebogen zur Person oder zu einem Vorhaben?
--
-- Die alten Werte bleiben. Sie gehoeren zu v1, und v1 laeuft weiter.
--
-- OHNE TRANSAKTION, UND ZWAR ZWINGEND. Ein neuer Enum-Wert laesst sich in
-- derselben Transaktion nicht verwenden, in der er entsteht. Die Migration,
-- die ihn braucht, ist deshalb eine eigene Datei - und diese hier hat kein
-- begin/commit.

alter type public.assessment_module add value if not exists 'founder_profile';
alter type public.assessment_module add value if not exists 'venture_alignment';
