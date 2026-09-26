begin;

-- ---------------------------------------------------------------------------
-- Die Handakte gilt auch ausserhalb von Beziehungen
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 26.09.2026: "[...] mit dem Advisor-Report und den ganzen
-- Dingen, die der Advisor sehen und tun kann."
--
-- Notizen und Wiedervorlagen gibt es seit 20261007120000 - aber nur zu einer
-- `relationship`, also zu zwei Menschen, die sich gegenseitig eingeladen
-- haben. Wer jetzt einzelne Menschen begleitet oder eine gemeinsame
-- Auswertung fuehrt, hat keinen Ort dafuer.
--
-- GEAENDERT WIRD NUR DER ANKER, NICHT DIE ZUSAGE. Alles, was die urspruengliche
-- Migration begruendet, gilt unveraendert weiter:
--
--   ES GEHOERT DEM, DER ES GESCHRIEBEN HAT. Niemand sonst, in keiner
--   Richtung, unter keiner Bedingung. Die vorhandenen Policies pruefen genau
--   das und bleiben deshalb unangetastet - sie kennen nur
--   `advisor_user_id = auth.uid()` und interessieren sich nicht dafuer, woran
--   die Zeile haengt.
--
--   AUCH IN EINER ORGANISATION NICHT GETEILT. Bei einem Accelerator mit
--   mehreren Advisors waere eine gemeinsame Notiz naheliegend - und waere
--   etwas anderes. "Private Notizen" heisst privat; wer Notizen im Team
--   teilen will, braucht eine eigene Sache mit eigenem Namen und eigener
--   Entscheidung, keine stille Ausweitung dieser hier.
--
--   SIE UEBERLEBEN EINEN WIDERRUF. Endet die Freigabe, verliert der Advisor
--   den Zugang zu den Inhalten der Person - seine eigenen Aufzeichnungen sind
--   das nicht. Eine Beraterin behaelt ihre Handakte, wenn das Mandat endet.
--
--   SIE UEBERLEBEN KEINE KONTOLOESCHUNG. Personenbezogene Aufzeichnungen ueber
--   jemanden, der sein Konto geloescht hat, darf niemand behalten. Bei einer
--   Beziehung trug das der Fremdschluessel; bei den neuen Ankern muss es
--   eigens hergestellt werden - siehe unten, das ist die eigentliche Arbeit
--   dieser Migration.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Zwei weitere Anker
-- ---------------------------------------------------------------------------
alter table public.advisor_private_notes
  alter column relationship_id drop not null,
  add column if not exists subject_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists review_id uuid references public.advisor_team_reviews (id) on delete cascade;

alter table public.advisor_follow_ups
  alter column relationship_id drop not null,
  add column if not exists subject_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists review_id uuid references public.advisor_team_reviews (id) on delete cascade;

-- GENAU EINER. Eine Notiz, die an einer Beziehung UND einer Person haengt,
-- waere beim Loeschen nicht eindeutig - und beim Anzeigen auch nicht.
alter table public.advisor_private_notes
  add constraint advisor_private_notes_one_anchor
    check (num_nonnulls(relationship_id, subject_user_id, review_id) = 1);
alter table public.advisor_follow_ups
  add constraint advisor_follow_ups_one_anchor
    check (num_nonnulls(relationship_id, subject_user_id, review_id) = 1);

-- Je Anker eine Notiz je Advisor - dieselbe Regel wie bisher je Beziehung.
-- Die vorhandene `unique (relationship_id, advisor_user_id)` bleibt und
-- greift weiterhin genau fuer Beziehungszeilen: Bei den neuen Ankern ist
-- `relationship_id` null, und null gilt in einem Unique-Index als
-- verschieden.
create unique index if not exists advisor_private_notes_per_subject
  on public.advisor_private_notes (subject_user_id, advisor_user_id)
  where subject_user_id is not null;
create unique index if not exists advisor_private_notes_per_review
  on public.advisor_private_notes (review_id, advisor_user_id)
  where review_id is not null;
create unique index if not exists advisor_follow_ups_per_subject
  on public.advisor_follow_ups (subject_user_id, advisor_user_id)
  where subject_user_id is not null;
create unique index if not exists advisor_follow_ups_per_review
  on public.advisor_follow_ups (review_id, advisor_user_id)
  where review_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Und die Kontoloeschung nimmt sie wirklich mit
-- ---------------------------------------------------------------------------
--
-- DAS IST DIE STELLE, DIE FAST DURCHGERUTSCHT WAERE.
--
-- Bei einer Notiz an einer PERSON traegt der Fremdschluessel das schon:
-- `subject_user_id ... on delete cascade`.
--
-- Bei einer Notiz an einer GEMEINSAMEN AUSWERTUNG nicht. Loescht eine der
-- beteiligten Personen ihr Konto, verschwindet nur ihre Zeile in
-- `advisor_team_review_members` - die Auswertung selbst bleibt stehen, und
-- mit ihr die Notizen darueber. Das waere genau das, was die urspruengliche
-- Migration ausschliesst: Aufzeichnungen ueber jemanden, der geloescht hat.
--
-- Der Ausloeser raeumt das auf. Er ist ohnehin fachlich richtig: Eine
-- gemeinsame Auswertung, an der eine beteiligte Person nicht mehr existiert,
-- ist keine gemeinsame Auswertung mehr - sie beruhte auf der Zustimmung
-- aller.

create or replace function public.delete_team_review_when_member_leaves()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.advisor_team_reviews where id = old.review_id;
  return old;
end;
$$;

revoke all on function public.delete_team_review_when_member_leaves() from public, anon, authenticated;

drop trigger if exists advisor_team_review_members_member_gone
  on public.advisor_team_review_members;
create trigger advisor_team_review_members_member_gone
  after delete on public.advisor_team_review_members
  for each row execute function public.delete_team_review_when_member_leaves();

comment on function public.delete_team_review_when_member_leaves() is
  'Faellt eine beteiligte Person weg - etwa durch Kontoloeschung -, faellt '
  'die gemeinsame Auswertung mit. Sie beruhte auf der Zustimmung aller, und '
  'die Notizen darueber duerfen einen geloeschten Menschen nicht ueberleben.';

comment on column public.advisor_private_notes.subject_user_id is
  'Die begleitete Person, wenn die Notiz zu einem einzelnen Mandat gehoert. '
  'Genau einer der drei Anker ist gesetzt.';
comment on column public.advisor_private_notes.review_id is
  'Die gemeinsame Auswertung, wenn die Notiz zu ihr gehoert.';

-- ---------------------------------------------------------------------------
-- 3. Gab es dieses Mandat ueberhaupt jemals?
-- ---------------------------------------------------------------------------
--
-- DIE SCHREIBREGEL IST EINE ANDERE ALS DIE LESEREGEL, und das ist Absicht -
-- genauso wie im Beziehungsmodell:
--
--   Inhalte einer Person LESEN verlangt eine AKTIVE Freigabe.
--
--   Die eigene Handakte ERGAENZEN verlangt nur, dass es das Mandat einmal
--   gab. Sonst koennte eine Beraterin nach einem Widerruf ihre eigenen
--   Aufzeichnungen nicht mehr zu Ende schreiben, obwohl die Begleitung
--   stattgefunden hat.
--
--   Dass es NIE eines gab, bleibt ausgeschlossen: ohne Zeile kein Schreiben.
--
-- `advisor_team_reviews` ist fuer `authenticated` gar nicht lesbar - deshalb
-- beantwortet eine Funktion die Frage, statt die Anwendung sie aus der
-- Tabelle abzuleiten.

create or replace function public.was_ever_advisor_for_team_review(
  p_review_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_team_reviews review
    left join public.advisor_org_members member
      on member.org_id = review.org_id
     and member.user_id = p_user_id
    where review.id = p_review_id
      -- Jeder Status. Auch eine widerrufene Auswertung hat stattgefunden.
      and (review.advisor_user_id = p_user_id or member.user_id is not null)
  );
$$;

revoke all on function public.was_ever_advisor_for_team_review(uuid, uuid) from public, anon;
grant execute on function public.was_ever_advisor_for_team_review(uuid, uuid) to authenticated;


commit;
