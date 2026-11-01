-- Experten und Speaker der Organisation: eine interne Liste (Name, Thema,
-- Firma, Kontakt, Link zur Ablage fuer Angebote und Rechnungen, Notiz).
--
-- Diese Personen haben KEIN Konto bei Made2Found. Es sind Dritte, deren
-- Kontaktdaten die Organisation fuer sich fuehrt; die Organisation ist dafuer
-- verantwortlich (Datenschutzerklaerung, Auskunft und Loeschung auf Wunsch).
-- Made2Found stellt nur das Feld bereit.
--
-- Grenzen:
--   - Die Liste gehoert der Organisation. Teams im Programm und andere
--     Organisationen sehen nichts davon.
--   - Nur Inhaber legen an, aendern, archivieren und loeschen; Mitglieder der
--     Organisation lesen.
--   - Keine Preise, keine Betraege, keine Dateien: nur ein https-Link zur
--     Ablage der Organisation.
--   - Mit der Organisation verschwindet die Liste (on delete cascade).

begin;

create table public.team_program_experts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  name text not null,
  topic text,
  company text,
  email text,
  phone text,
  website text,
  offer_link text,
  note text,
  archived boolean not null default false,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_program_experts_name check (char_length(btrim(name)) between 1 and 120),
  constraint team_program_experts_topic check (topic is null or char_length(topic) <= 200),
  constraint team_program_experts_company check (company is null or char_length(company) <= 120),
  constraint team_program_experts_email check (email is null or (char_length(email) <= 200 and position('@' in email) > 1)),
  constraint team_program_experts_phone check (phone is null or char_length(phone) <= 50),
  constraint team_program_experts_website check (website is null or (char_length(website) <= 300 and website ~* '^https://[^[:space:]]+$')),
  constraint team_program_experts_offer_link check (offer_link is null or (char_length(offer_link) <= 500 and offer_link ~* '^https://[^[:space:]]+$')),
  constraint team_program_experts_note check (note is null or char_length(note) <= 1000)
);
create index team_program_experts_org_idx on public.team_program_experts (org_id, name);

alter table public.team_program_experts enable row level security;
revoke all on public.team_program_experts from anon, authenticated;

create or replace function public.save_program_expert(
  p_org_id uuid, p_expert_id uuid, p_name text, p_topic text, p_company text,
  p_email text, p_phone text, p_website text, p_offer_link text, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_expert_id is null then
    insert into public.team_program_experts (org_id, name, topic, company, email, phone, website, offer_link, note, created_by_user_id)
    values (
      p_org_id, btrim(p_name),
      nullif(btrim(coalesce(p_topic, '')), ''), nullif(btrim(coalesce(p_company, '')), ''),
      nullif(lower(btrim(coalesce(p_email, ''))), ''), nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(btrim(coalesce(p_website, '')), ''), nullif(btrim(coalesce(p_offer_link, '')), ''),
      nullif(btrim(coalesce(p_note, '')), ''), auth.uid()
    )
    returning id into v_id;
  else
    update public.team_program_experts
    set name = btrim(p_name),
        topic = nullif(btrim(coalesce(p_topic, '')), ''),
        company = nullif(btrim(coalesce(p_company, '')), ''),
        email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        website = nullif(btrim(coalesce(p_website, '')), ''),
        offer_link = nullif(btrim(coalesce(p_offer_link, '')), ''),
        note = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_expert_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'program_expert_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_expert(uuid, uuid, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_program_expert(uuid, uuid, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.set_program_expert_archived(p_expert_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_experts where id = p_expert_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_experts set archived = coalesce(p_archived, false) where id = p_expert_id;
end;
$$;
revoke all on function public.set_program_expert_archived(uuid, boolean) from public, anon;
grant execute on function public.set_program_expert_archived(uuid, boolean) to authenticated;

create or replace function public.delete_program_expert(p_expert_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_experts where id = p_expert_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_experts where id = p_expert_id;
end;
$$;
revoke all on function public.delete_program_expert(uuid) from public, anon;
grant execute on function public.delete_program_expert(uuid) to authenticated;

-- Inhaber und Mitglieder der Organisation lesen.
create or replace function public.list_program_experts(p_org_id uuid)
returns table (expert_id uuid, name text, topic text, company text, email text, phone text,
               website text, offer_link text, note text, archived boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, e.topic, e.company, e.email, e.phone, e.website, e.offer_link, e.note, e.archived
  from public.team_program_experts e
  where e.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by e.archived, lower(e.name), e.id;
$$;
revoke all on function public.list_program_experts(uuid) from public, anon;
grant execute on function public.list_program_experts(uuid) to authenticated;

commit;
