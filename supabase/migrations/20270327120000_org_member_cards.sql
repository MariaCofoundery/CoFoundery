-- "Wer ist wer": die Menschen einer Organisation - fuer die Startups im Programm und fuer die Organisation.
--
-- Wunsch von Maria (06.11.2026): Eine Uebersicht der Teammitglieder der Organisation, einmal fuer die Startups
-- (damit sie sie kontaktieren koennen) und einmal fuer die Organisation. Beim Einrichten beschreibt man die Leute und
-- klickt an, was die Startups im Programm sehen duerfen.
--
-- Eine Karte je Mitglied (organisation, person): Kurzzeile, ein paar Saetze, Kontakt - und ob sie fuer die Startups
-- im Programm sichtbar ist. Regeln:
--   - Standard ist NICHT sichtbar. Die Freigabe fuer Startups ist eine eigene Einwilligung und folgt weder aus der
--     Mitgliedschaft noch aus einer Ansprechperson-Rolle.
--   - Die Inhaberin darf Kurzzeile, Text und Sichtbarkeit fuer andere eintragen (Einrichten); die Person selbst kann
--     jederzeit zuruecknehmen. Hat sie zurueckgenommen (self_hidden), kann die Inhaberin sie nicht wieder zeigen -
--     nur die Person selbst.
--   - Den Kontakt (E-Mail, Telefon, Link) traegt nur die Person selbst ein.
--   - Startups sehen nur Karten, die sichtbar sind, von aktiven Mitgliedern, in einem Programm, das fuer sie aktiv ist
--     (get_my_program_people) - nichts weiter, keine Rolle in der Organisation ausser Inhaberin/Advisor, keine Zahlen.
--   - Mitglieder der Organisation sehen alle Karten ihrer Organisation (Zeilensicherheit).
-- Wer das Konto loescht oder die Organisation verlaesst, dessen Karte verschwindet fuer die Startups: sie wird nur fuer
-- aktive Mitglieder geliefert; das Konto loeschen nimmt sie mit (cascade).

begin;

create table public.advisor_org_member_cards (
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  shown boolean not null default false,
  self_hidden boolean not null default false,
  headline text,
  about text,
  contact text,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint advisor_org_member_cards_headline check (headline is null or char_length(headline) <= 120),
  constraint advisor_org_member_cards_about check (about is null or char_length(about) <= 600),
  constraint advisor_org_member_cards_contact check (contact is null or char_length(contact) <= 200),
  constraint advisor_org_member_cards_hidden check (not (shown and self_hidden))
);
create index advisor_org_member_cards_user_idx on public.advisor_org_member_cards (user_id);
create index advisor_org_member_cards_updated_by_idx on public.advisor_org_member_cards (updated_by_user_id) where updated_by_user_id is not null;

alter table public.advisor_org_member_cards enable row level security;
revoke all on public.advisor_org_member_cards from anon, authenticated;
grant select on public.advisor_org_member_cards to authenticated;
create policy advisor_org_member_cards_members_read on public.advisor_org_member_cards
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Eintragen: die Person fuer sich (alles, auch Kontakt und Sichtbarkeit) oder die Inhaberin fuer andere aktive Mitglieder
-- (Kurzzeile, Text, Sichtbarkeit - nie den Kontakt, nie gegen eine Zuruecknahme).
create or replace function public.save_org_member_card(
  p_org_id uuid,
  p_user_id uuid,
  p_headline text,
  p_about text,
  p_contact text,
  p_shown boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_self boolean := p_user_id = auth.uid();
  v_old public.advisor_org_member_cards%rowtype;
  v_headline text := nullif(btrim(coalesce(p_headline, '')), '');
  v_about text := nullif(btrim(coalesce(p_about, '')), '');
begin
  if auth.uid() is null or not public.can_work_in_org(p_org_id) then
    raise exception 'org_card_not_yours' using errcode = '42501';
  end if;
  if not exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active') then
    raise exception 'org_card_not_member' using errcode = '22023';
  end if;
  if not v_self and not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'org_card_not_yours' using errcode = '42501';
  end if;
  if char_length(coalesce(v_headline, '')) > 120 or char_length(coalesce(v_about, '')) > 600 or char_length(coalesce(p_contact, '')) > 200 then
    raise exception 'org_card_invalid' using errcode = '22023';
  end if;
  select * into v_old from public.advisor_org_member_cards c where c.org_id = p_org_id and c.user_id = p_user_id;
  if not v_self and coalesce(p_shown, false) and coalesce(v_old.self_hidden, false) then
    raise exception 'org_card_self_hidden' using errcode = '42501';
  end if;

  insert into public.advisor_org_member_cards (org_id, user_id, shown, self_hidden, headline, about, contact, updated_by_user_id, updated_at)
  values (
    p_org_id, p_user_id, coalesce(p_shown, false),
    v_self and not coalesce(p_shown, false) and (coalesce(v_old.shown, false) or coalesce(v_old.self_hidden, false)),
    v_headline, v_about,
    case when v_self then nullif(btrim(coalesce(p_contact, '')), '') end,
    auth.uid(), pg_catalog.now()
  )
  on conflict (org_id, user_id) do update
  set shown = excluded.shown,
      self_hidden = case
        when v_self then (not excluded.shown) and (public.advisor_org_member_cards.shown or public.advisor_org_member_cards.self_hidden)
        else public.advisor_org_member_cards.self_hidden
      end,
      headline = excluded.headline,
      about = excluded.about,
      contact = case when v_self then excluded.contact else public.advisor_org_member_cards.contact end,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.save_org_member_card(uuid, uuid, text, text, text, boolean) from public, anon;
grant execute on function public.save_org_member_card(uuid, uuid, text, text, text, boolean) to authenticated;

-- Fuer die Startups: die sichtbaren Karten der Organisationen, in deren Programm das eigene Team aktiv ist.
create or replace function public.get_my_program_people()
returns table (
  program_id uuid,
  org_id uuid,
  org_name text,
  user_id uuid,
  display_name text,
  role text,
  team_role text,
  headline text,
  about text,
  contact text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, o.id, o.name, m.user_id,
         coalesce(nullif(btrim(core.display_name), ''), ''),
         m.role, nullif(btrim(pr.team_role), ''), c.headline, c.about, c.contact
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id and o.status = 'active'
  join public.advisor_org_members m on m.org_id = p.org_id and m.status = 'active'
  join public.advisor_org_member_cards c on c.org_id = m.org_id and c.user_id = m.user_id and c.shown
  left join public.person_core core on core.user_id = m.user_id
  left join public.advisor_org_member_presence pr on pr.org_id = m.org_id and pr.user_id = m.user_id
  where auth.uid() is not null
    and p.status <> 'ended'
    and public.team_program_is_active(p.id)
    and exists (select 1 from public.founder_team_members f where f.team_id = p.team_id and f.user_id = auth.uid())
  order by o.name, (m.role = 'owner') desc, core.display_name;
$$;
revoke all on function public.get_my_program_people() from public, anon;
grant execute on function public.get_my_program_people() to authenticated;

commit;
