begin;

-- ---------------------------------------------------------------------------
-- Gespeicherte Suchen
-- ---------------------------------------------------------------------------
--
-- "Sag mir Bescheid, wenn jemand Neues auftaucht, der dazu passt."
--
-- Der Gegenstand ist bewusst die SUCHE der Person, nicht ein Urteil des
-- Systems. Was passt, legt sie selbst fest; das System vergleicht und nennt
-- die Gruende. Damit bleibt gueltig, was in Kapitel 23 der Roadmap steht:
-- keine Blackbox, keine Erfolgswahrscheinlichkeit, keine versteckte Bewertung
-- von Menschen.
--
-- Auch die Alignment-Dimensionen erscheinen hier nur als selbst gesetzter
-- Filter - "gleiche Tendenz bei Entscheidungslogik" - und nie als berechnete
-- Passung. Der Unterschied ist nicht sprachlich: Im einen Fall waehlt ein
-- Mensch ein Kriterium, im anderen behauptet eine Maschine eine Eignung.
--
-- KEIN Zeitplan. Geprueft wird, wenn etwas Neues erscheint - beim
-- Veroeffentlichen. Das braucht keine Infrastruktur, wirkt sofort und
-- erreicht auch Menschen, die gerade nicht eingeloggt sind.

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Wo gesucht wird. Getrennt, weil die Gegenstaende verschieden sind:
  -- In Connect sind es Eintraege und Probleme, in Discovery Menschen.
  context text not null,

  label text not null,

  -- Freitext, wie in der Connect-Suche. Leer heisst: keine Einschraenkung.
  query text not null default '',

  topics text[] not null default '{}',
  industries text[] not null default '{}',
  locations text[] not null default '{}',
  geographic_scope text,
  remote_mode text,

  -- Ausdruecklich gesuchte Faehigkeiten, aus demselben Vokabular wie der
  -- Capability-Snapshot. Das ist die Verbindung zwischen den Modulen: Wer
  -- "Programmierfaehigkeiten" sucht, sucht software_engineering - und nicht
  -- ein Wort, das jemand zufaellig in seinen Text geschrieben hat.
  capability_area_ids text[] not null default '{}',

  -- Nur fuer Connect.
  connect_direction text,
  connect_category text,
  include_listings boolean not null default true,
  include_problems boolean not null default true,

  -- Nur fuer Discovery, und nur als selbst gesetzter Filter. Leer heisst:
  -- Alignment spielt fuer diese Suche keine Rolle.
  alignment_dimensions text[] not null default '{}',

  notify boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saved_searches_context_check
    check (context in ('connect', 'discovery')),
  constraint saved_searches_label_check
    check (char_length(btrim(label)) between 2 and 80),
  constraint saved_searches_query_check
    check (char_length(query) <= 200),
  constraint saved_searches_scope_check
    check (geographic_scope is null or geographic_scope in ('regional', 'germany', 'europe', 'global')),
  constraint saved_searches_remote_check
    check (remote_mode is null or remote_mode in ('onsite', 'hybrid', 'remote', 'flexible')),
  constraint saved_searches_direction_check
    check (connect_direction is null or connect_direction in ('seeking', 'offering')),
  constraint saved_searches_category_check
    check (connect_category is null or connect_category in
      ('expertise', 'cooperation', 'investment', 'sparring', 'succession')),
  constraint saved_searches_lists_check
    check (
      cardinality(topics) <= 8
      and cardinality(industries) <= 5
      and cardinality(locations) <= 3
      and cardinality(capability_area_ids) <= 8
      and cardinality(alignment_dimensions) <= 6
    ),
  -- Eine Suche, die nichts einschraenkt, meldet jeden neuen Eintrag. Das ist
  -- keine Suche, das ist ein Abonnement auf alles.
  constraint saved_searches_not_empty_check
    check (
      char_length(btrim(query)) > 0
      or cardinality(topics) > 0
      or cardinality(industries) > 0
      or cardinality(locations) > 0
      or cardinality(capability_area_ids) > 0
      or cardinality(alignment_dimensions) > 0
      or geographic_scope is not null
      or remote_mode is not null
      or connect_direction is not null
      or connect_category is not null
    ),
  -- In Connect muss wenigstens eine der beiden Arten gesucht werden.
  constraint saved_searches_connect_target_check
    check (context <> 'connect' or include_listings or include_problems)
);

comment on table public.saved_searches is
  'Was eine Person sucht, damit sie es nicht wiederholt eingeben muss - und damit das System bei neuen Eintraegen Bescheid sagen kann. Die Kriterien setzt die Person, nicht das System.';
comment on column public.saved_searches.capability_area_ids is
  'Faehigkeiten aus dem Capability-Vokabular. Die Verbindung zwischen Capability-Modell und Connect.';
comment on column public.saved_searches.alignment_dimensions is
  'Selbst gesetzter Filter auf gleiche Tendenz. Nie eine berechnete Passung.';

create index saved_searches_owner on public.saved_searches (user_id, context);
create index saved_searches_notify on public.saved_searches (context, notify) where notify;

-- ---------------------------------------------------------------------------
-- Hoechstens einmal je Treffer
-- ---------------------------------------------------------------------------
-- Dieselbe Bauform wie bei den Benachrichtigungen: Der Primaerschluessel ist
-- die Garantie. Ein zweiter Veroeffentlichungsvorgang desselben Eintrags -
-- etwa nach dem Verlaengern - loest keine zweite Meldung aus.
create table public.saved_search_hits (
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  subject_kind text not null,
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (saved_search_id, subject_kind, subject_id),
  constraint saved_search_hits_kind_check
    check (subject_kind in ('listing', 'problem', 'profile'))
);

comment on table public.saved_search_hits is
  'Worueber eine gespeicherte Suche schon gemeldet hat. Verhindert eine zweite Meldung beim Verlaengern oder Bearbeiten.';

alter table public.saved_search_hits enable row level security;
revoke all on public.saved_search_hits from anon, authenticated;

/**
 * Nimmt sich das Recht, ueber genau diesen Treffer zu melden.
 *
 * security definer, weil der Vergleich beim Veroeffentlichen laeuft - also im
 * Namen der einstellenden Person, die die fremde Suche weder sehen noch
 * beschreiben darf.
 */
create or replace function public.claim_saved_search_hit(
  p_saved_search_id uuid,
  p_subject_kind text,
  p_subject_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.saved_search_hits(saved_search_id, subject_kind, subject_id)
  values (p_saved_search_id, p_subject_kind, p_subject_id)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.claim_saved_search_hit(uuid, text, uuid) from public, anon;
grant execute on function public.claim_saved_search_hit(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Zugriff
-- ---------------------------------------------------------------------------
alter table public.saved_searches enable row level security;

-- Die eigene Suche gehoert einem selbst. Niemand sonst sieht, wonach jemand
-- sucht - das waere eine Aussage ueber Absichten.
create policy saved_searches_owner_all
on public.saved_searches
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

/**
 * Die Suchen, die beim Veroeffentlichen zu pruefen sind.
 *
 * Gibt nur zurueck, was fuer den Vergleich gebraucht wird, und niemals die
 * Bezeichnung - die ist privat und ginge die einstellende Person nichts an.
 * Die eigenen Suchen bleiben aussen vor: Niemand soll ueber seinen eigenen
 * Eintrag benachrichtigt werden.
 */
create or replace function public.list_saved_searches_for_matching(
  p_context text,
  p_author_user_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  query text,
  topics text[],
  industries text[],
  locations text[],
  geographic_scope text,
  remote_mode text,
  capability_area_ids text[],
  connect_direction text,
  connect_category text,
  include_listings boolean,
  include_problems boolean,
  alignment_dimensions text[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select search.id, search.user_id, search.query, search.topics, search.industries,
    search.locations, search.geographic_scope, search.remote_mode,
    search.capability_area_ids, search.connect_direction, search.connect_category,
    search.include_listings, search.include_problems, search.alignment_dimensions
  from public.saved_searches search
  where search.context = p_context
    and search.notify
    and search.user_id <> p_author_user_id;
$$;

revoke all on function public.list_saved_searches_for_matching(text, uuid) from public, anon;
grant execute on function public.list_saved_searches_for_matching(text, uuid) to authenticated;

create trigger saved_searches_updated_at
  before update on public.saved_searches
  for each row execute function public.set_network_updated_at();

commit;
