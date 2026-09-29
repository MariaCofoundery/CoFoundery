begin;

-- ---------------------------------------------------------------------------
-- Die alten Basisfragen stehen noch auf "aktiv"
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 29.09.2026 BEIM DURCHKLICKEN, und es ist die zweite Haelfte des
-- Befunds von Migration 20261067120000.
--
-- Damals wurden die 36 Fragen der aktuellen Registratur nachgetragen
-- (q01_vision_l1 und folgende). Die alten Zeilen D1_Q1 bis D6_Q6 blieben
-- absichtlich unangetastet: An ihnen koennen alte Antworten haengen.
--
-- Unangetastet hiess aber auch: weiterhin `is_active = true`. Und danach
-- fragt `listQuestions()`. In `category = 'basis'` stehen seitdem 72 aktive
-- Fragen - der Fragebogen liefert beide Fassungen hintereinander aus, und
-- `dev-seed.ts` beantwortet beide. Auf dem Dashboard endet das in
-- `founder_base_question_contract_mismatch`, weil die Auswertung die alten
-- Kennungen nicht kennt.
--
-- ---------------------------------------------------------------------------
-- ABGESCHALTET, NICHT GELOESCHT
-- ---------------------------------------------------------------------------
--
-- `is_active = false` heisst: wird nicht mehr vorgelegt. Die Zeile bleibt,
-- der Fremdschluessel haelt, vorhandene Antworten bleiben lesbar und
-- zuordenbar. Loeschen wuerde `on delete restrict` ohnehin verweigern - und
-- das zu Recht.
--
-- Der Filter trifft genau das alte Schema (ein D, eine Ziffer, _Q, eine
-- Ziffer) und nur in 'basis'. Kein `like 'D%'`: Eine spaetere Frage mit einer
-- Kennung, die zufaellig mit D anfaengt, waere sonst mit abgeschaltet.

update public.questions
   set is_active = false
 where category = 'basis'
   and id ~ '^D[0-9]+_Q[0-9]+$'
   and is_active;

commit;
