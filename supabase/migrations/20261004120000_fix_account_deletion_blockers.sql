begin;

-- ---------------------------------------------------------------------------
-- Die Kontoloeschung schlug fehl, und zwar fuer jeden, der das Produkt benutzt
-- ---------------------------------------------------------------------------
--
-- "Dein Account konnte gerade nicht vollstaendig geloescht werden."
--
-- Der Grund war kein Fehler im Loeschcode, sondern acht Fremdschluessel auf
-- auth.users, die seit dem Schreiben der Loeschung dazugekommen sind und die
-- ein Loeschen VERBIETEN (on delete restrict, beziehungsweise der Default no
-- action). Wer je ein Setup-Thema geoeffnet, im Commitment Lab geschrieben
-- oder eine Lab-Runde gespielt hat, konnte sein Konto nicht mehr loeschen:
--
-- VOLLSTAENDIGE LISTE aller Verweise auf auth.users, die eine Loeschung
-- blockieren, und wie jeder davon aufgeloest wird. Ein Test verlangt, dass
-- jeder blockierende Verweis hier steht - eine neue Tabelle faellt damit auf,
-- bevor sie jemandem das Loeschen verbietet.
--
--   VERKNUEPFUNG LOESEN (diese Migration, Abschnitt 1):
--     founder_team_setup_items.updated_by_user_id
--     founder_team_setup_revisions.proposed_by_user_id
--     founder_team_advisor_setup_grants.created_by_user_id
--     founder_team_setup_discussion_entries.author_user_id
--     commitment_lab_discussion_entries.author_user_id
--
--   ZEILE GEHT MIT (diese Migration, Abschnitt 2 - Loeschen der Runde):
--     collaboration_experience_rounds.created_by_user_id
--     collaboration_experience_round_participants.founder_user_id
--     collaboration_experience_prompt_assignments.target_user_id
--
--   SCHON VORHER GELOESCHT (delete_founder_account_data raeumt die Zeilen ab,
--   bevor die Identitaet verschwindet):
--     founder_alignment_workbooks.created_by
--     founder_alignment_workbooks.updated_by
--     founder_alignment_workbook_advisors.requested_by
--
-- Das ist die unangenehmste Sorte Fehler: Jede neue Tabelle mit einem Verweis
-- auf auth.users kann ihn zurueckbringen, ohne dass irgendetwas auffaellt -
-- bis jemand loeschen will. Der pgTAP-Test dazu zaehlt deshalb nicht die acht
-- bekannten Faelle auf, sondern verlangt, dass es GAR KEINEN blockierenden
-- Verweis mehr gibt.
--
-- ZWEI ARTEN VON INHALT, ZWEI ANTWORTEN:
--
--   Was dem TEAM gehoert und ohne die Person weiterlebt - ein Setup-Thema, ein
--   Diskussionsbeitrag, eine Freigabe - bleibt stehen und verliert nur die
--   Verknuepfung. Dieselbe Linie wie bei den Connect-Gespraechen: Die andere
--   Person soll ihren Gespraechsfaden behalten.
--
--   Eine Lab-Runde gehoert dagegen den beiden GEMEINSAM und besteht aus den
--   Antworten beider. Ohne eine Seite hat sie keinen Sinn, und die Antworten
--   der gehenden Person duerfen nicht stehen bleiben. Sie wird geloescht.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Was bleibt, verliert nur die Verknuepfung
-- ---------------------------------------------------------------------------
-- Die Constraint-Namen werden nachgeschlagen statt geraten: Sie sind
-- automatisch vergeben, und ein falsch geratener Name haette die Migration
-- mitten im Lauf abgebrochen.
do $$
declare
  target record;
  constraint_name text;
begin
  for target in
    select * from (values
      ('founder_team_setup_items', 'updated_by_user_id'),
      ('founder_team_setup_revisions', 'proposed_by_user_id'),
      ('founder_team_advisor_setup_grants', 'created_by_user_id'),
      ('founder_team_setup_discussion_entries', 'author_user_id'),
      ('commitment_lab_discussion_entries', 'author_user_id')
    ) as t(table_name, column_name)
  loop
    select constraint_column.constraint_name into constraint_name
    from information_schema.key_column_usage constraint_column
    join information_schema.table_constraints table_constraint
      on table_constraint.constraint_name = constraint_column.constraint_name
     and table_constraint.constraint_schema = constraint_column.constraint_schema
    where constraint_column.table_schema = 'public'
      and constraint_column.table_name = target.table_name
      and constraint_column.column_name = target.column_name
      and table_constraint.constraint_type = 'FOREIGN KEY';

    if constraint_name is not null then
      execute format('alter table public.%I drop constraint %I', target.table_name, constraint_name);
    end if;

    execute format('alter table public.%I alter column %I drop not null', target.table_name, target.column_name);
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references auth.users(id) on delete set null',
      target.table_name, target.table_name || '_' || target.column_name || '_fkey', target.column_name
    );
  end loop;
end;
$$;

comment on column public.founder_team_setup_discussion_entries.author_user_id is
  'Wer den Beitrag geschrieben hat. Null nach einer Kontoloeschung - der Beitrag bleibt, damit die andere Person ihren Gespraechsfaden behaelt.';
comment on column public.commitment_lab_discussion_entries.author_user_id is
  'Wer den Beitrag geschrieben hat. Null nach einer Kontoloeschung, aus demselben Grund wie im Founder Setup.';


-- ---------------------------------------------------------------------------
-- 2. Lab-Runden gehen mit
-- ---------------------------------------------------------------------------
-- Eine Runde besteht aus den Antworten beider. Sie zu anonymisieren hiesse,
-- die Antworten der gehenden Person stehen zu lassen - und die sind das
-- Persoenlichste, was diese Labs erheben.
--
-- Das Loeschen der Runde raeumt Teilnehmer, Prompts, Zuordnungen, Antworten,
-- Quittungen und Marker mit ab; alle haengen per cascade daran.
--
-- Im BEFORE-DELETE-Trigger auf auth.users, wo schon die anderen
-- personenbezogenen Reste weggeraeumt werden.
create or replace function public.delete_unlinked_personal_data_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.event_participants participant
  where old.email is not null
    and lower(btrim(participant.email)) = lower(btrim(old.email));

  delete from public.advisor_team_invites team_invite
  where team_invite.founder_a_user_id = old.id
     or team_invite.founder_b_user_id = old.id
     or (
       old.email is not null
       and lower(btrim(old.email)) in (
         lower(btrim(team_invite.founder_a_email)),
         lower(btrim(team_invite.founder_b_email))
       )
     );

  delete from public.relationship_advisors advisor_access
  where advisor_access.advisor_user_id = old.id;

  -- Neu am 18.09.2026: Ohne das blockierte jede gespielte Lab-Runde die
  -- Loeschung des Kontos.
  delete from public.collaboration_experience_rounds round_row
  where round_row.created_by_user_id = old.id
     or exists (
       select 1 from public.collaboration_experience_round_participants participant
       where participant.round_id = round_row.id and participant.founder_user_id = old.id
     );

  return old;
end;
$$;

comment on function public.delete_unlinked_personal_data_for_auth_user() is
  'Raeumt personenbezogene Reste weg, bevor eine Identitaet verschwindet: zurechenbare Event- und Advisor-Eintraege sowie die gemeinsamen Lab-Runden, die ohne diese Person keinen Sinn haben und ihre Antworten enthalten.';

commit;
