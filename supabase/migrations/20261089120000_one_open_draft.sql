begin;

-- ---------------------------------------------------------------------------
-- Ein offener Entwurf je Person, Bogen und Vorhaben
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 30.09.2026 beim Durchklicken: "Die Frage S06 konnte nicht
-- gespeichert werden, aber ich konnte trotzdem weitermachen."
--
-- DIE URSACHE IST EIN WETTLAUF. `draftFor` sucht einen offenen Entwurf und
-- legt einen an, wenn keiner da ist. Der Autospeicher feuert aber je Frage
-- einzeln: Wer zwei Fragen kurz hintereinander beantwortet, loest zwei
-- Aufrufe aus, beide finden nichts und beide legen einen Entwurf an.
--
-- Die Folge ist schlimmer als die Fehlermeldung, die sie ausgeloest hat: Die
-- Antworten verteilen sich auf zwei Entwuerfe. Die Seite liest den neuesten -
-- und zeigt damit die Haelfte. Beim Abgeben fehlt dann etwas, das jemand
-- beantwortet hat.
--
-- Nachweis: In dieser Datenbank lagen zeitweise DREI offene Entwuerfe
-- desselben Menschen fuer denselben Bogen.
--
-- ---------------------------------------------------------------------------
-- ERST ZUSAMMENFUEHREN, DANN SPERREN
-- ---------------------------------------------------------------------------
--
-- Ein eindeutiger Index allein wuerde an den vorhandenen Doppelten
-- scheitern. Vorher wandern deshalb alle Antworten in EINEN Entwurf - und
-- zwar in den mit den meisten, damit moeglichst wenig umzieht. Gibt es zu
-- einer Frage in beiden eine Antwort, gewinnt die zuletzt gegebene.
--
-- Geloescht werden nur Entwuerfe, aus denen alles umgezogen ist - keine
-- Antwort geht dabei verloren.

with gruppen as (
  select
    id, user_id, module, instrument_id, venture_id, created_at,
    (select count(*) from public.alignment_answers a where a.assessment_id = s.id) as antworten
  from public.assessments s
  where submitted_at is null
),
bleibt as (
  select distinct on (user_id, module, instrument_id, coalesce(venture_id, '00000000-0000-0000-0000-000000000000'::uuid))
    id, user_id, module, instrument_id, venture_id
  from gruppen
  order by
    user_id, module, instrument_id,
    coalesce(venture_id, '00000000-0000-0000-0000-000000000000'::uuid),
    antworten desc, created_at
),
umzug as (
  select g.id as von, b.id as nach
  from gruppen g
  join bleibt b
    on b.user_id = g.user_id
   and b.module = g.module
   and b.instrument_id = g.instrument_id
   and coalesce(b.venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
     = coalesce(g.venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
  where g.id <> b.id
)
-- Was im Ziel noch fehlt, zieht um.
update public.alignment_answers a
set assessment_id = u.nach
from umzug u
where a.assessment_id = u.von
  and not exists (
    select 1 from public.alignment_answers ziel
    where ziel.assessment_id = u.nach and ziel.block_id = a.block_id
  );

-- Was im Ziel schon steht, bleibt dort - es sei denn, die andere Antwort ist
-- juenger. Dann gilt die juengere: Sie ist die letzte Auskunft der Person.
with gruppen as (
  select id, user_id, module, instrument_id, venture_id, created_at,
    (select count(*) from public.alignment_answers a where a.assessment_id = s.id) as antworten
  from public.assessments s where submitted_at is null
),
bleibt as (
  select distinct on (user_id, module, instrument_id, coalesce(venture_id, '00000000-0000-0000-0000-000000000000'::uuid))
    id, user_id, module, instrument_id, venture_id
  from gruppen
  order by user_id, module, instrument_id,
    coalesce(venture_id, '00000000-0000-0000-0000-000000000000'::uuid),
    antworten desc, created_at
),
umzug as (
  select g.id as von, b.id as nach
  from gruppen g
  join bleibt b
    on b.user_id = g.user_id and b.module = g.module
   and b.instrument_id = g.instrument_id
   and coalesce(b.venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
     = coalesce(g.venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
  where g.id <> b.id
)
update public.alignment_answers ziel
set value = alt.value,
    missing_code = alt.missing_code,
    answer_format = alt.answer_format,
    answered_at = alt.answered_at
from public.alignment_answers alt
join umzug u on u.von = alt.assessment_id
where ziel.assessment_id = u.nach
  and ziel.block_id = alt.block_id
  and alt.answered_at > ziel.answered_at;

-- Jetzt sind die anderen Entwuerfe leer.
delete from public.assessments s
where s.submitted_at is null
  and not exists (select 1 from public.alignment_answers a where a.assessment_id = s.id)
  and exists (
    select 1 from public.assessments andere
    where andere.submitted_at is null
      and andere.user_id = s.user_id
      and andere.module = s.module
      and andere.instrument_id = s.instrument_id
      and coalesce(andere.venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(s.venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and andere.id <> s.id
  );

-- ---------------------------------------------------------------------------
-- Und ab jetzt gibt es nur einen
-- ---------------------------------------------------------------------------
--
-- Abgegebene Boegen sind ausgenommen: Wer eine neue Fassung ausfuellt, hat
-- neben dem alten abgegebenen wieder einen offenen - das ist richtig so.
create unique index if not exists assessments_one_open_draft_uidx
  on public.assessments (
    user_id, module, instrument_id,
    coalesce(venture_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where submitted_at is null;

comment on index public.assessments_one_open_draft_uidx is
  'Ein offener Entwurf je Person, Bogen und Vorhaben. Ohne ihn legten zwei '
  'gleichzeitige Autospeicher-Aufrufe zwei Entwuerfe an, und die Antworten '
  'verteilten sich auf beide.';

commit;
