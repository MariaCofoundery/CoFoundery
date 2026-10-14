begin;

-- ---------------------------------------------------------------------------
-- Advisor-Impulse gehen mit dem Konto des Advisors
-- ---------------------------------------------------------------------------
--
-- BEFUND (Privacy-Audit 14.10.2026): `advisor_section_impulses.advisor_user_id`
-- hat als einzige personenbezogene Spalte in public keinen Fremdschluessel
-- (Migration 20260420163000). Loeschte ein Advisor sein Konto, blieben seine
-- Impulse - frei geschriebener Text, ihm zurechenbar - mit seiner alten
-- user_id stehen, und die Founder der Beziehung sahen sie weiter
-- (founderAlignmentWorkbookData.ts liest alle Impulse der Beziehung).
--
-- EINORDNUNG: Impulse sind Beitraege des Advisors fuer die Founder - dieselbe
-- Art Inhalt wie `advisorNotes` und `advisorClosing` im Workbook-Payload. Fuer
-- diese hat das Datenmodell schon entschieden: Beim Loeschen des Advisor-
-- Kontos werden sie entfernt, nicht anonymisiert
-- (scrub_deleted_advisor_from_workbook_payload, geprueft durch
-- workbook_payload_has_advisor_personal_data in delete_founder_account_data).
-- Die Impulse folgen dieser Entscheidung.
--
-- WO: im BEFORE-DELETE-Trigger auf auth.users, wo schon die uebrigen
-- personenbezogenen Reste ohne Fremdschluessel weggeraeumt werden. Kein
-- nachtraeglicher Fremdschluessel mit cascade: Der Trigger greift bei jedem
-- Loeschweg (Anwendung und Dashboard) und ist die Stelle, an der diese Faelle
-- gesammelt stehen.
--
-- Loescht ein FOUNDER sein Konto, verschwinden die Impulse wie bisher mit der
-- Beziehung (relationship_id ... on delete cascade).
--
-- Die Funktion ist sonst wortgleich mit 20261004120000; neu ist nur der
-- Abschnitt zu den Impulsen.

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

  -- Neu am 14.10.2026: Impulse des Advisors haben keinen Fremdschluessel auf
  -- auth.users und blieben sonst mit der alten user_id stehen.
  delete from public.advisor_section_impulses impulse
  where impulse.advisor_user_id = old.id;

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

revoke all on function public.delete_unlinked_personal_data_for_auth_user()
from public, anon, authenticated, service_role;

comment on function public.delete_unlinked_personal_data_for_auth_user() is
  'Raeumt personenbezogene Reste weg, bevor eine Identitaet verschwindet: zurechenbare Event- und Advisor-Eintraege einschliesslich der Advisor-Impulse sowie die gemeinsamen Lab-Runden, die ohne diese Person keinen Sinn haben und ihre Antworten enthalten.';

-- Altbestand: Impulse von Advisors, deren Konto bereits geloescht ist. Sie
-- sind genau die verwaisten Daten, um die es geht.
delete from public.advisor_section_impulses impulse
where not exists (
  select 1 from auth.users account where account.id = impulse.advisor_user_id
);

commit;
