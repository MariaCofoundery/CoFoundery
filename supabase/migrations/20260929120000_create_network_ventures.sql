begin;

-- ---------------------------------------------------------------------------
-- Was jemand aufgebaut hat
-- ---------------------------------------------------------------------------
--
-- Bis zu fuenf Unternehmen, Projekte oder Taetigkeiten am Profil. Nicht als
-- drittes Inhaltsformat neben Anzeige und Problem, sondern als Anhang an die
-- Person.
--
-- WARUM KEIN EIGENES FORMAT:
--   Anzeige und Problem haben Zustand, Ablauf, Kontaktweg, Suchspalte,
--   gespeicherte Suchen und Benachrichtigungen. Ein drittes Format haette all
--   das verdoppelt - einen vierten Filter am Brett, einen vierten Zweig im
--   Abgleich, eine vierte Sorte in der Sitemap.
--
--   Ein Unternehmen beantwortet aber eine andere Frage: nicht "was biete ich
--   gerade an", sondern "woher komme ich". Das gehoert an die Person.
--
-- WAS DER TEXT LEISTEN MUSS:
--   Nicht "wir sind ein Startup fuer X". Sondern so, dass jemand beim Lesen
--   denkt: "ach - das koennte fuer Y interessant sein." Deshalb ist die
--   ZIELGRUPPE ein eigenes Pflichtfeld und steht nicht im Fliesstext. Und
--   deshalb gibt es ein Feld fuer den Antrieb: Was jemanden daran treibt, sagt
--   mehr ueber die Zusammenarbeit als jede Leistungsbeschreibung.
--
-- SICHTBARKEIT ERBT ES VOM PROFIL.
--   Ein vierter Schalter fuer dieselbe Frage waere eine Zumutung. Wer sein
--   Profil oeffentlich stellt, stellt damit auch, was daran haengt.
--
-- EINE SUCHSPALTE VON ANFANG AN.
--   Die Personensuche kommt als naechstes, und "wir machen X fuer Y" ist
--   genau das, wonach dann jemand sucht. Nachtraeglich waere es eine zweite
--   Migration ueber Bestandsdaten.
-- ---------------------------------------------------------------------------

create table public.network_ventures (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  -- Die eigene Rolle darin. "Gruenderin", "Coachin", "Nebenbei seit 2019" -
  -- bewusst Freitext, weil die Wirklichkeit keine Auswahlliste ist.
  role_label text,

  what_it_does text not null,
  -- Steht als eigenes Feld, nicht im Fliesstext: Wer "fuer wen" nicht lesen
  -- kann, kann auch niemanden weiterempfehlen.
  audience text not null,
  -- Freiwillig, aber der interessanteste Teil.
  motivation text,

  website text,
  logo_path text,

  status text not null default 'active',
  search_text text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint network_ventures_name_check
    check (char_length(btrim(name)) between 2 and 80),
  constraint network_ventures_role_check
    check (role_label is null or char_length(btrim(role_label)) between 2 and 80),
  constraint network_ventures_what_check
    check (char_length(btrim(what_it_does)) between 50 and 800),
  constraint network_ventures_audience_check
    check (char_length(btrim(audience)) between 20 and 300),
  constraint network_ventures_motivation_check
    check (motivation is null or char_length(btrim(motivation)) between 20 and 500),
  -- Nur https. Ein http-Link auf einer Seite, die selbst ueber https laeuft,
  -- ist eine Warnung im Browser und ein schlechtes Bild fuer die Person.
  constraint network_ventures_website_check
    check (website is null or (website ~ '^https://' and char_length(website) <= 200)),
  constraint network_ventures_status_check
    check (status in ('active', 'hidden'))
);

comment on table public.network_ventures is
  'Unternehmen, Projekte und Taetigkeiten am Connect-Profil. Anhang an die Person, kein eigenes Inhaltsformat - kein Ablaufdatum, kein eigener Kontaktweg, keine eigene Sichtbarkeit.';
comment on column public.network_ventures.audience is
  'Fuer wen das gedacht ist. Pflichtfeld und eigenes Feld, damit man jemanden weiterempfehlen kann, ohne den ganzen Text zu lesen.';

create index network_ventures_owner on public.network_ventures (owner_user_id, created_at);
create index network_ventures_search_trgm
  on public.network_ventures using gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Hoechstens fuenf
-- ---------------------------------------------------------------------------
-- Eine Check-Bedingung kann nicht ueber Zeilen hinweg zaehlen. Ohne diesen
-- Trigger waere die Grenze nur eine Bitte in der Oberflaeche.
create or replace function public.enforce_network_venture_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.network_ventures where owner_user_id = new.owner_user_id) >= 5 then
    raise exception 'network_venture_limit_reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_network_venture_limit() from public, anon, authenticated;

create trigger network_venture_limit
  before insert on public.network_ventures
  for each row execute function public.enforce_network_venture_limit();

-- ---------------------------------------------------------------------------
-- Die Suchspalte
-- ---------------------------------------------------------------------------
create or replace function public.set_network_venture_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text :=
    coalesce(new.name, '') || ' ' ||
    coalesce(new.role_label, '') || ' ' ||
    coalesce(new.what_it_does, '') || ' ' ||
    coalesce(new.audience, '') || ' ' ||
    coalesce(new.motivation, '');
  return new;
end;
$$;

create trigger network_venture_search_text
  before insert or update of name, role_label, what_it_does, audience, motivation
  on public.network_ventures
  for each row execute function public.set_network_venture_search_text();

create trigger network_ventures_updated_at
  before update on public.network_ventures
  for each row execute function public.set_network_updated_at();

-- ---------------------------------------------------------------------------
-- Zugriff
-- ---------------------------------------------------------------------------
alter table public.network_ventures enable row level security;

-- Sichtbar wie das Profil, an dem es haengt: fuer Mitglieder, wenn beides
-- aktiv ist. Die eigenen immer.
create policy network_ventures_select
on public.network_ventures
for select to authenticated
using (
  owner_user_id = auth.uid()
  or (
    status = 'active'
    and public.is_network_member(auth.uid())
    and exists (
      select 1 from public.network_profiles profile
      where profile.user_id = network_ventures.owner_user_id
        and profile.status = 'active'
    )
  )
);

create policy network_ventures_insert
on public.network_ventures
for insert to authenticated
with check (owner_user_id = auth.uid() and public.is_network_member(auth.uid()));

create policy network_ventures_update
on public.network_ventures
for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy network_ventures_delete
on public.network_ventures
for delete to authenticated
using (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Das Logo
-- ---------------------------------------------------------------------------
-- Derselbe Bucket, dieselbe Policy, dieselbe Route wie beim Profilbild - ein
-- zweiter Speicher danebenzustellen haette dieselbe Frage ein zweites Mal zu
-- beantworten verlangt.
create or replace function public.can_read_network_profile_photo(p_object_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is not null
    and public.is_network_member(auth.uid())
    and (
      split_part(p_object_name, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.network_profiles profile
        where profile.status = 'active'
          and profile.photo_path = p_object_name
      )
      -- Neu: Logos von Unternehmen, die an einem aktiven Profil haengen.
      or exists (
        select 1
        from public.network_ventures venture
        join public.network_profiles profile
          on profile.user_id = venture.owner_user_id and profile.status = 'active'
        where venture.status = 'active'
          and venture.logo_path = p_object_name
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Die oeffentliche Seite
-- ---------------------------------------------------------------------------
-- Wer sein Profil oeffentlich stellt, stellt damit auch, was daran haengt -
-- genau dafuer ist das Feld gedacht.
create or replace function public.list_public_network_profile_ventures(p_profile_slug text)
returns table (
  name text,
  role_label text,
  what_it_does text,
  audience text,
  motivation text,
  website text,
  logo_available boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select venture.name,
    venture.role_label,
    venture.what_it_does,
    venture.audience,
    venture.motivation,
    venture.website,
    venture.logo_path is not null,
    venture.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  join public.network_ventures venture on venture.owner_user_id = profile.user_id
  where profile.public_slug = p_profile_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active'
    and venture.status = 'active'
  order by venture.created_at;
$$;

comment on function public.list_public_network_profile_ventures(text) is
  'Die Unternehmen eines oeffentlich gestellten Profils. Sichtbarkeit folgt dem Profil - es gibt keinen eigenen Schalter.';

revoke all on function public.list_public_network_profile_ventures(text) from public;
grant execute on function public.list_public_network_profile_ventures(text) to anon, authenticated, service_role;

commit;
