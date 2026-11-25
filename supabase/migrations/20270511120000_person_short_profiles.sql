-- ---------------------------------------------------------------------------
-- Ich-Kurzprofil (25.11.2026)
--
-- Eine kurze Karte aus dem Stärkenbild: ein Satz, bis zu fünf Stärken (mit
-- Bezeichnung und, wenn die Person will, einem eigenen Zitat), optional "ich
-- suche" und "ich biete".
--
-- EINE EIGENE ZUSTIMMUNG, mit nichts verbunden: `shared_in_network` ist aus,
-- bis die Person es anschaltet. Sie ist unabhaengig von Forschungseinwilligung,
-- Team-Mitgliedschaft, Advisor-Freigaben, FIND und Faehigkeits-Offenlegung -
-- keine davon schaltet sie an, und sie schaltet keine davon an.
--
-- GELESEN WIRD SIE NUR IM NETZWERK: von der Person selbst, und von aktiven
-- Netzwerk-Mitgliedern, solange `shared_in_network` an ist UND die Person ein
-- aktives Netzwerkprofil hat (dieselbe Regel wie network_profiles_select).
-- Nicht anonym, nicht oeffentlich; es gibt keine oeffentliche Projektion.
-- ---------------------------------------------------------------------------

create table public.person_short_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tagline text,
  /** Bis zu fünf Einträge {theme, label, quote?}; die Anwendung prüft die Themen, die Datenbank die Form. */
  strengths jsonb not null default '[]'::jsonb,
  seeks text,
  offers text,
  shared_in_network boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_short_profiles_tagline_length check (tagline is null or char_length(tagline) between 1 and 140),
  constraint person_short_profiles_seeks_length check (seeks is null or char_length(seeks) between 1 and 200),
  constraint person_short_profiles_offers_length check (offers is null or char_length(offers) between 1 and 200),
  constraint person_short_profiles_strengths_shape
    check (jsonb_typeof(strengths) = 'array' and jsonb_array_length(strengths) <= 5)
);

comment on table public.person_short_profiles is
  'Ich-Kurzprofil. shared_in_network ist eine eigene Zustimmung (Voreinstellung aus); gelesen nur von der Person und aktiven Netzwerk-Mitgliedern.';
comment on column public.person_short_profiles.shared_in_network is
  'Zeigt die Karte aktiven Netzwerk-Mitgliedern. Unabhaengig von allen anderen Freigaben.';

alter table public.person_short_profiles enable row level security;
revoke all on public.person_short_profiles from anon, authenticated;
grant select, insert, update, delete on public.person_short_profiles to authenticated;

create policy person_short_profiles_select on public.person_short_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      shared_in_network
      and public.is_network_member()
      and exists (
        select 1 from public.network_profiles profile
        where profile.user_id = person_short_profiles.user_id and profile.status = 'active'
      )
    )
  );
create policy person_short_profiles_insert on public.person_short_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy person_short_profiles_update on public.person_short_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy person_short_profiles_delete on public.person_short_profiles
  for delete to authenticated using (user_id = auth.uid());

create trigger person_short_profiles_updated_at
  before update on public.person_short_profiles
  for each row execute function public.set_capability_updated_at();
