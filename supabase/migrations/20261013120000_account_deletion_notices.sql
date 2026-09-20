begin;

-- ---------------------------------------------------------------------------
-- Wenn jemand geht, verschwindet nicht alles wortlos
-- ---------------------------------------------------------------------------
--
-- BESPROCHEN AM 20.09.2026. Bis hierher galt: Loescht sich ein Mensch, sind
-- Einladung, Beziehung, gemeinsamer Report und Workbook weg - bei BEIDEN. Das
-- ist richtig so, ein Report besteht zur Haelfte aus den Antworten der anderen
-- Person. Falsch war nur, dass die zurueckbleibende Seite kein Wort dazu bekam:
--
--   Der Co-Founder sieht ein Team, in dem er ploetzlich allein ist, und einen
--   Report, der nicht mehr da ist.
--   Der Advisor sieht beim naechsten Oeffnen einen Eintrag weniger.
--   Die Founder sehen ihren Advisor-Eintrag verschwinden.
--
-- In Connect gibt es den Hinweis laengst ("Diese Person hat ihr Konto
-- geloescht"), weil dort das Gespraech stehen bleibt und ihn tragen kann. In
-- Align gibt es nichts mehr, woran er haengen koennte - die Zeile ist ja
-- gerade das, was geloescht wird. Deshalb diese Tabelle.
--
-- WAS HIER NICHT DRINSTEHT - UND ZWAR ABSICHTLICH:
--   Kein Name, keine Adresse, keine Kennung der Person, die gegangen ist.
--   Nicht einmal, um welches Team es ging. Ein Hinweis, der jemanden
--   benennt, waere ein Datensatz ueber einen Menschen, der genau darum
--   gebeten hat, keiner mehr zu sein. Die zurueckbleibende Person weiss
--   ohnehin, mit wem sie verbunden war; was ihr fehlte, war die AUSKUNFT,
--   dass jemand gegangen ist - nicht die Information, wer.
--
--   Diese Zeile sagt also nur: an diesem Tag, in dieser Rolle, hat sich jemand
--   geloescht. Mehr braucht es nicht, und mehr steht uns nicht zu.
--
-- WEGGEKLICKT HEISST GELOESCHT: Es gibt keine Spalte "gelesen". Wer den
-- Hinweis nicht mehr braucht, loescht die Zeile - und dann ist auch der letzte
-- Rest weg.
-- ---------------------------------------------------------------------------

create table public.account_deletion_notices (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  context text not null,
  created_at timestamptz not null default now(),
  constraint account_deletion_notices_context_check check (context in (
    -- Ein Mensch, mit dem du in Align verbunden warst.
    'founder_connection',
    -- Ein Founder aus einem Team, das du als Advisor begleitet hast.
    'advisor_team',
    -- Die Person, die euer Team als Advisor begleitet hat.
    'founder_advisor'
  ))
);

comment on table public.account_deletion_notices is
  'Hinweise an Zurueckbleibende, dass sich jemand geloescht hat. Enthaelt bewusst nichts ueber die gegangene Person - nur Empfaenger, Rolle und Zeitpunkt.';

create index account_deletion_notices_recipient_idx
  on public.account_deletion_notices (recipient_user_id, created_at desc);

alter table public.account_deletion_notices enable row level security;

create policy account_deletion_notices_select_own on public.account_deletion_notices
  for select to authenticated
  using (recipient_user_id = auth.uid());

create policy account_deletion_notices_delete_own on public.account_deletion_notices
  for delete to authenticated
  using (recipient_user_id = auth.uid());

-- Kein insert und kein update: Geschrieben wird ausschliesslich beim Loeschen
-- eines Kontos, durch die beiden Trigger unten.

-- ---------------------------------------------------------------------------
-- 1. Ein Founder geht
-- ---------------------------------------------------------------------------
/**
 * Haengt am Loeschen der BEZIEHUNG, nicht an der Loeschfunktion.
 *
 * `delete_founder_account_data` ist zweihundert Zeilen lang; sie dafuer neu zu
 * schreiben hiesse, sie zu kopieren - und die naechste Aenderung an ihr muesste
 * zwei Fassungen zusammenhalten. Der Trigger kommt ohne das aus.
 *
 * Er wirkt NUR waehrend einer Kontoloeschung: `app.allow_account_cleanup`
 * setzt die Loeschfunktion fuer ihre Transaktion. Ohne diese Bedingung wuerde
 * jedes andere Entfernen einer Beziehung faelschlich melden, jemand habe sein
 * Konto geloescht.
 */
create or replace function public.record_account_deletion_notice_for_relationship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.allow_account_cleanup', true), '') <> 'on' then
    return old;
  end if;

  -- BEIDE Seiten bekommen eine Zeile. Die der gehenden Person verschwindet
  -- gleich darauf mit ihrem Konto (on delete cascade) - deshalb muss hier
  -- nicht entschieden werden, wer von beiden geht, und die Entscheidung kann
  -- auch nicht falsch ausfallen.
  insert into public.account_deletion_notices (recipient_user_id, context)
  select participant.user_id, 'founder_connection'
  from (values (old.user_a_id), (old.user_b_id)) as participant(user_id)
  where participant.user_id is not null;

  -- Und die begleitende Person, die das Team damit verliert.
  insert into public.account_deletion_notices (recipient_user_id, context)
  select advisor.advisor_user_id, 'advisor_team'
  from public.relationship_advisors advisor
  where advisor.relationship_id = old.id
    and advisor.advisor_user_id is not null
    and advisor.status <> 'revoked';

  return old;
end;
$$;

revoke all on function public.record_account_deletion_notice_for_relationship()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_relationships_account_deletion_notice on public.relationships;
create trigger trg_relationships_account_deletion_notice
before delete on public.relationships
for each row execute function public.record_account_deletion_notice_for_relationship();

-- ---------------------------------------------------------------------------
-- 2. Der Advisor geht
-- ---------------------------------------------------------------------------
/**
 * Beim Loeschen eines Advisor-Kontos raeumt
 * `delete_unlinked_personal_data_for_auth_user` dessen Zeilen in
 * `relationship_advisors` weg. Dieser Trigger schreibt vorher den Hinweis fuer
 * die beiden Founder.
 *
 * DIE BEDINGUNG "die Beziehung steht noch" IST DER GANZE TRICK:
 *   Dieselben Zeilen verschwinden auch, wenn ein FOUNDER geht - dann per
 *   Fremdschluessel an der Beziehung. Postgres loescht die Elternzeile zuerst,
 *   die Beziehung ist in diesem Fall also schon weg, und der Hinweis dafuer
 *   ist oben bereits geschrieben. Ohne diese Bedingung bekaemen die Founder
 *   zwei Hinweise fuer ein Ereignis, davon einen falschen.
 *
 *   Das ist zuverlaessiger als sich auf die Reihenfolge zweier Trigger auf
 *   auth.users zu verlassen - die haengt am Namen, und Namen aendert man.
 */
create or replace function public.record_account_deletion_notice_for_advisor_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.allow_account_cleanup', true), '') <> 'on' then
    return old;
  end if;

  -- Eine schon widerrufene Freigabe endet nicht noch einmal.
  if old.advisor_user_id is null or old.status = 'revoked' then
    return old;
  end if;

  insert into public.account_deletion_notices (recipient_user_id, context)
  select participant.user_id, 'founder_advisor'
  from public.relationships relationship
  cross join lateral (values (relationship.user_a_id), (relationship.user_b_id))
    as participant(user_id)
  where relationship.id = old.relationship_id
    and participant.user_id is not null;

  return old;
end;
$$;

revoke all on function public.record_account_deletion_notice_for_advisor_link()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_relationship_advisors_account_deletion_notice
  on public.relationship_advisors;
create trigger trg_relationship_advisors_account_deletion_notice
before delete on public.relationship_advisors
for each row execute function public.record_account_deletion_notice_for_advisor_link();

commit;
