begin;

-- ---------------------------------------------------------------------------
-- Problembrett V0.1
-- ---------------------------------------------------------------------------
--
-- "Ich sehe hier ein Problem" als eigener Gegenstand im Connect-Bereich.
-- Daraus koennen Loesungen und Gruendungen entstehen - oder auch nur die
-- Erkenntnis, dass jemand anderes schon daran arbeitet.
--
-- DREI ENTSCHEIDUNGEN, die dieses Schema traegt:
--
-- 1. Ein Problem ist KEINE Anzeige.
--    Anzeigen laufen nach spaetestens 60 Tagen aus - richtig so, ein Gesuch
--    veraltet. Ein Problem veraltet nicht: Es ist geloest oder nicht. Deshalb
--    kein expires_at, sondern ein Zustand 'resolved', den die einstellende
--    Person setzt.
--
-- 2. Mehrere sammeln sich um eines.
--    Jede andere Flaeche hier ist eins-zu-eins. Das Problembrett ist der erste
--    Gegenstand, um den herum eine Gruppe entstehen kann. Deshalb eine eigene
--    Interessenstabelle statt einer Kontaktanfrage je Paar.
--
-- 3. Kein Feed.
--    Keine Likes, keine Kommentare, keine Rangliste. Ein einziges Signal:
--    "ich wuerde daran arbeiten", mit einer kurzen Begruendung. Die ZAHL ist
--    fuer alle sichtbar, die LISTE nur fuer die einstellende Person - sonst
--    entstuende genau die Popularitaetsmechanik, die dieses Produkt nicht
--    haben will. Sortiert wird ausschliesslich nach Aktualitaet.
-- ---------------------------------------------------------------------------

create table public.network_problems (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  description text not null,

  -- Was die einstellende Person mit dem Problem vorhat. Der Unterschied ist
  -- wesentlich: "ich sehe das" ist eine Beobachtung, "ich will das loesen" ist
  -- eine Mitgruendersuche, und "ich arbeite schon daran" verhindert, dass zwei
  -- Leute dasselbe unabhaengig anfangen.
  author_intent text not null default 'observation',

  locations text[] not null default '{}',
  geographic_scope text not null default 'regional',
  topics text[] not null default '{}',
  industries text[] not null default '{}',

  status text not null default 'draft',
  published_at timestamptz,
  resolved_at timestamptz,

  -- Fuer alle sichtbar; die Namen dahinter nicht. Vom Trigger gepflegt.
  interest_count integer not null default 0,

  -- Dieselbe Suchspalte wie bei Anzeigen, damit dieselbe Suche greift.
  search_text text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint network_problems_title_check
    check (char_length(btrim(title)) between 5 and 120),
  -- Bewusst laenger als bei einer Anzeige: Ein Problem, das in einem Satz
  -- passt, ist meist keine Beobachtung, sondern eine Behauptung.
  constraint network_problems_description_check
    check (char_length(btrim(description)) between 50 and 2000),
  constraint network_problems_intent_check
    check (author_intent in ('observation', 'wants_to_build', 'already_building')),
  constraint network_problems_status_check
    check (status in ('draft', 'active', 'withdrawn', 'resolved')),
  constraint network_problems_scope_check
    check (geographic_scope in ('regional', 'germany', 'europe', 'global')),
  constraint network_problems_locations_check
    check (cardinality(locations) <= 3),
  constraint network_problems_topics_check
    check (cardinality(topics) <= 8),
  constraint network_problems_industries_check
    check (cardinality(industries) <= 5),
  -- Veroeffentlicht heisst veroeffentlicht: ohne Zeitpunkt kein aktiver
  -- Zustand, sonst steht etwas im Brett, das nie publiziert wurde.
  constraint network_problems_published_check
    check (status <> 'active' or published_at is not null),
  constraint network_problems_resolved_check
    check (status <> 'resolved' or resolved_at is not null)
);

comment on table public.network_problems is
  'Beobachtete Probleme im Connect-Bereich. Kein Ablaufdatum wie bei Anzeigen - ein Problem ist geloest oder nicht.';
comment on column public.network_problems.interest_count is
  'Wie viele "ich wuerde daran arbeiten" es gibt. Die Zahl ist oeffentlich, die Namen nicht.';

create index network_problems_browse
  on public.network_problems (status, published_at desc);
create index network_problems_author
  on public.network_problems (author_user_id);
create index network_problems_search_trgm
  on public.network_problems using gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Das eine Signal
-- ---------------------------------------------------------------------------
create table public.network_problem_interests (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.network_problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Eine kurze Begruendung ist Pflicht. Ein Klick ohne Worte waere ein Like,
  -- und Likes sind hier ausdruecklich nicht vorgesehen.
  note text not null,

  created_at timestamptz not null default now(),

  constraint network_problem_interests_unique unique (problem_id, user_id),
  constraint network_problem_interests_note_check
    check (char_length(btrim(note)) between 10 and 500)
);

comment on table public.network_problem_interests is
  'Ich wuerde daran arbeiten. Ein Signal, mit Begruendung, hoechstens eines je Person und Problem.';

create index network_problem_interests_problem
  on public.network_problem_interests (problem_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Pflege
-- ---------------------------------------------------------------------------
create or replace function public.set_network_problem_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text :=
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.topics, ' '), '') || ' ' ||
    coalesce(array_to_string(new.industries, ' '), '') || ' ' ||
    coalesce(array_to_string(new.locations, ' '), '');
  return new;
end;
$$;

create trigger network_problem_search_text
  before insert or update of title, description, topics, industries, locations
  on public.network_problems
  for each row execute function public.set_network_problem_search_text();

create trigger network_problems_updated_at
  before update on public.network_problems
  for each row execute function public.set_network_updated_at();

-- Die Zahl wird gezaehlt, nicht hochgezaehlt: Ein Delta-Trigger laeuft bei
-- jedem verpassten Ereignis aus dem Tritt, und niemand merkt es.
create or replace function public.refresh_network_problem_interest_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.problem_id, old.problem_id);
begin
  update public.network_problems
  set interest_count = (
    select count(*) from public.network_problem_interests where problem_id = target
  )
  where id = target;
  return null;
end;
$$;

comment on function public.refresh_network_problem_interest_count() is
  'Haelt network_problems.interest_count aktuell. security definer, weil der Zaehler auch dann stimmen muss, wenn die eintragende Person das Problem selbst nicht aendern darf.';

revoke all on function public.refresh_network_problem_interest_count() from public;
revoke all on function public.refresh_network_problem_interest_count() from anon;
revoke all on function public.refresh_network_problem_interest_count() from authenticated;

create trigger network_problem_interest_count
  after insert or delete on public.network_problem_interests
  for each row execute function public.refresh_network_problem_interest_count();

-- ---------------------------------------------------------------------------
-- Zugriff
-- ---------------------------------------------------------------------------
alter table public.network_problems enable row level security;
alter table public.network_problem_interests enable row level security;

-- Lesen: veroeffentlichte Probleme fuer Mitglieder, eigene immer.
create policy network_problems_select
on public.network_problems
for select to authenticated
using (
  author_user_id = auth.uid()
  or (status = 'active' and public.is_network_member(auth.uid()))
);

create policy network_problems_insert
on public.network_problems
for insert to authenticated
with check (author_user_id = auth.uid() and public.is_network_member(auth.uid()));

create policy network_problems_update
on public.network_problems
for update to authenticated
using (author_user_id = auth.uid())
with check (author_user_id = auth.uid());

create policy network_problems_delete
on public.network_problems
for delete to authenticated
using (author_user_id = auth.uid());

-- Die Namen sieht nur, wen es angeht: die einstellende Person und die
-- interessierte selbst. Fuer alle anderen bleibt es bei der Zahl - sonst
-- waere das Brett eine Rangliste mit Publikum.
create policy network_problem_interests_select
on public.network_problem_interests
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_interests.problem_id
      and problem.author_user_id = auth.uid()
  )
);

create policy network_problem_interests_insert
on public.network_problem_interests
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_network_member(auth.uid())
  -- Nur bei veroeffentlichten Problemen, und nicht beim eigenen: Interesse am
  -- eigenen Problem waere eine Zahl, die nichts bedeutet.
  and exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_interests.problem_id
      and problem.status = 'active'
      and problem.author_user_id <> auth.uid()
  )
);

-- Zurueckziehen darf man; aendern nicht - dafuer neu eintragen.
create policy network_problem_interests_delete
on public.network_problem_interests
for delete to authenticated
using (user_id = auth.uid());

commit;
