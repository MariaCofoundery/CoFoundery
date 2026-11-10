-- Eine Liste fuer Partner, Investoren, Speaker, Mentoren und Experten (Wunsch Maria, 10.11.2026).
--
-- Bisher gab es zwei Listen: die Experten-Liste (team_program_experts, nur Inhaber schrieben) und die neue Partnerliste
-- (advisor_org_contacts). Jetzt gibt es nur noch die Partnerliste; "Experte" ist eine Rolle darin. Die Eintraege der alten
-- Liste und ihre Zuordnung zu Veranstaltungen werden uebernommen (gleiche Kennungen), danach fallen die alten Tabellen und
-- Funktionen weg.
--
-- WER DARF WAS (wie bei der Partnerliste): lesen und schreiben nur Mitglieder mit dem Recht `people`; Teams, Gaeste, andere
-- Organisationen und Connect sehen nie etwas davon. (Bisher durften Mitglieder die Experten lesen und nur Inhaber schreiben.)

begin;

-- 1) Neue Felder und die Rolle "Experte".
alter table public.advisor_org_contacts
  add column topic text,
  add column offer_link text,
  add constraint advisor_org_contacts_topic check (topic is null or char_length(topic) <= 200),
  add constraint advisor_org_contacts_offer_link check (offer_link is null or (offer_link ~ '^https://[^ ]+$' and char_length(offer_link) <= 500));

alter table public.advisor_org_contacts drop constraint advisor_org_contacts_kinds;
alter table public.advisor_org_contacts add constraint advisor_org_contacts_kinds
  check (kinds <@ array['partner', 'investor', 'speaker', 'mentor', 'expert', 'other']::text[] and cardinality(kinds) between 1 and 3);

-- 2) Eintraege der alten Experten-Liste uebernehmen. "Archiviert" heisst jetzt Stand "Ruht".
insert into public.advisor_org_contacts (id, org_id, name, kinds, company, email, phone, url, notes, status, topic, offer_link, created_by_user_id, created_at)
select e.id, e.org_id, e.name, array['expert'], e.company, e.email, e.phone, e.website, e.note,
       case when e.archived then 'paused' else 'active' end, e.topic, e.offer_link, e.created_by_user_id, e.created_at
from public.team_program_experts e
on conflict (id) do nothing;

insert into public.advisor_org_contact_events (contact_id, event_id, org_id)
select ee.expert_id, ee.event_id, ev.org_id
from public.team_program_event_experts ee
join public.team_program_events ev on ev.id = ee.event_id
on conflict (contact_id, event_id) do nothing;

-- 3) save_org_contact bekommt die neuen Felder (alte Fassung faellt weg).
drop function public.save_org_contact(uuid, uuid, text, text[], text, text, text, text, text, text, uuid);
create function public.save_org_contact(
  p_contact_id uuid, p_org_id uuid, p_name text, p_kinds text[], p_company text, p_email text, p_phone text,
  p_url text, p_notes text, p_status text, p_owner_user_id uuid, p_topic text, p_offer_link text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := p_org_id;
  v_id uuid;
begin
  if p_contact_id is not null then
    select c.org_id into v_org from public.advisor_org_contacts c where c.id = p_contact_id;
  end if;
  if v_org is null or not public.org_has_right(v_org, 'people') then
    raise exception 'contact_not_yours' using errcode = '42501';
  end if;
  if p_owner_user_id is not null and not exists (select 1 from public.advisor_org_members m where m.org_id = v_org and m.user_id = p_owner_user_id and m.status = 'active') then
    raise exception 'contact_invalid' using errcode = '22023';
  end if;
  if p_contact_id is null then
    insert into public.advisor_org_contacts (org_id, name, kinds, company, email, phone, url, notes, status, owner_user_id, topic, offer_link, created_by_user_id)
    values (v_org, btrim(coalesce(p_name, '')), coalesce(p_kinds, '{}'), nullif(btrim(coalesce(p_company, '')), ''), nullif(btrim(coalesce(p_email, '')), ''),
            nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_url, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''),
            coalesce(p_status, 'asked'), p_owner_user_id, nullif(btrim(coalesce(p_topic, '')), ''), nullif(btrim(coalesce(p_offer_link, '')), ''), auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_contacts
    set name = btrim(coalesce(p_name, '')), kinds = coalesce(p_kinds, '{}'), company = nullif(btrim(coalesce(p_company, '')), ''),
        email = nullif(btrim(coalesce(p_email, '')), ''), phone = nullif(btrim(coalesce(p_phone, '')), ''), url = nullif(btrim(coalesce(p_url, '')), ''),
        notes = nullif(btrim(coalesce(p_notes, '')), ''), status = coalesce(p_status, 'asked'), owner_user_id = p_owner_user_id,
        topic = nullif(btrim(coalesce(p_topic, '')), ''), offer_link = nullif(btrim(coalesce(p_offer_link, '')), ''), updated_at = pg_catalog.now()
    where id = p_contact_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'contact_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_contact(uuid, uuid, text, text[], text, text, text, text, text, text, uuid, text, text) from public, anon;
grant execute on function public.save_org_contact(uuid, uuid, text, text[], text, text, text, text, text, text, uuid, text, text) to authenticated;

-- 4) Wer spricht bei einer Veranstaltung: die Zuordnung eines Termins ersetzen (Rollen bleiben, wo die Person schon dabei war).
create or replace function public.set_event_contacts(p_event_id uuid, p_contact_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select e.org_id into v_org from public.team_program_events e where e.id = p_event_id;
  if v_org is null or not public.org_has_right(v_org, 'people') then
    raise exception 'contact_not_yours' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_contact_ids, '{}'::uuid[])) as wanted(id)
    where not exists (select 1 from public.advisor_org_contacts c where c.id = wanted.id and c.org_id = v_org)
  ) then
    raise exception 'contact_invalid' using errcode = '22023';
  end if;
  delete from public.advisor_org_contact_events where event_id = p_event_id and not (contact_id = any (coalesce(p_contact_ids, '{}'::uuid[])));
  insert into public.advisor_org_contact_events (contact_id, event_id, org_id)
  select w, p_event_id, v_org from (select distinct unnest(coalesce(p_contact_ids, '{}'::uuid[])) as w) s
  on conflict (contact_id, event_id) do nothing;
end;
$$;
revoke all on function public.set_event_contacts(uuid, uuid[]) from public, anon;
grant execute on function public.set_event_contacts(uuid, uuid[]) to authenticated;

-- 5) Die alte Experten-Liste faellt weg (Daten sind uebernommen).
drop function public.list_event_experts(uuid);
drop function public.set_event_experts(uuid, uuid[]);
drop function public.list_program_experts(uuid);
drop function public.save_program_expert(uuid, uuid, text, text, text, text, text, text, text, text);
drop function public.delete_program_expert(uuid);
drop function public.set_program_expert_archived(uuid, boolean);
drop table public.team_program_event_experts;
drop table public.team_program_experts;

commit;
