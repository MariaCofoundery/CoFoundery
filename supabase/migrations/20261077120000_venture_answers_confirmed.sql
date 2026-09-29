begin;

-- ---------------------------------------------------------------------------
-- "Ich habe draufgeschaut" - und wann erneut gefragt wird
-- ---------------------------------------------------------------------------
--
-- Wer allein anfaengt und spaeter jemanden dazubekommt, soll seine Angaben
-- einmal ansehen, bevor sie im Vergleich stehen. Stunden pro Woche aendern
-- sich; "wie sprichst du Einwaende an" nicht, weil ein Quartal vergeht.
--
-- EIN ZEITSTEMPEL, KEINE ZWEITE TABELLE. Die Frage lautet nicht "hat Person A
-- gegenueber Person B bestaetigt", sondern "hat A ihre Angaben zu DIESEM
-- Vorhaben angesehen, seit sich die Lage geaendert hat". Das haengt am
-- Fragebogen, und der haengt schon am Vorhaben.
--
-- WANN ERNEUT GEFRAGT WIRD: wenn jemand dem Vorhaben beigetreten ist, NACHDEM
-- zuletzt bestaetigt wurde. Der Vergleich laeuft ueber
-- founder_team_members.created_at - dafuer braucht es keine weitere Spalte und
-- keinen Zaehler, der auseinanderlaufen kann.
--
-- Bestaetigen ist ausdruecklich KEINE Bedingung. Wer es nie tut, dessen
-- Antworten gelten trotzdem. Deshalb auch keine Pflichtspalte: `null` heisst
-- "noch nicht angesehen" und nicht "ungueltig".

alter table public.assessments
  add column answers_confirmed_at timestamptz;

comment on column public.assessments.answers_confirmed_at is
  'Wann die Person ihre Angaben zu diesem Vorhaben zuletzt angesehen und '
  'bestaetigt hat. Leer heisst "noch nicht angesehen", nicht "ungueltig" - '
  'die Antworten gelten auch ohne diesen Schritt.';

-- Nur wo es ein Vorhaben gibt. Ein Arbeitsprofil gehoert zur Person; dort gibt
-- es niemanden, der dazukommt, und damit nichts zu bestaetigen.
alter table public.assessments
  add constraint assessments_confirmation_needs_venture
    check (answers_confirmed_at is null or venture_id is not null);

commit;
