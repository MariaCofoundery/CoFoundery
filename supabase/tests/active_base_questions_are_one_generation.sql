\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

-- ---------------------------------------------------------------------------
-- Es darf immer nur EINE Fassung der Basisfragen aktiv sein
-- ---------------------------------------------------------------------------
--
-- Sonst legt der Fragebogen zwei Fassungen hintereinander vor, und die
-- Auswertung bekommt Kennungen, die sie nicht kennt. Genau das war am
-- 29.09.2026 der Serverfehler auf dem Dashboard.

select extensions.is(
  (select count(*)::int from public.questions
    where category = 'basis' and is_active and id ~ '^D[0-9]+_Q[0-9]+$'),
  0,
  'keine Frage des alten Kennungsschemas ist noch aktiv'
);

select extensions.is(
  (select count(*)::int from public.questions
    where category = 'basis' and is_active),
  36,
  'genau die 36 Fragen der aktuellen Registratur sind aktiv'
);

-- Und sie sind nicht verschwunden: Antworten haengen an ihnen.
select extensions.is(
  (select count(*)::int from public.questions
    where category = 'basis' and id ~ '^D[0-9]+_Q[0-9]+$'),
  36,
  'die alten Fragen sind abgeschaltet, nicht geloescht'
);

select extensions.finish();

rollback;
