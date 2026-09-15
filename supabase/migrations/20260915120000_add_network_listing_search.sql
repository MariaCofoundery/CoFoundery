begin;

-- Freitextsuche fuer Connect-Anzeigen.
--
-- Bis hierher gab es sechs Filter, aber kein Suchfeld. Zwei Filter sahen sogar
-- wie eines aus - "Thema" und "Branche" sind Textfelder, prueften aber auf
-- exakte Uebereinstimmung mit einem Listeneintrag. Wer "sales" tippte, fand
-- "B2B Sales" nicht. Das faellt erst auf, wenn genug Anzeigen da sind, und
-- dann sofort.
--
-- Warum eine Spalte statt einer Suche ueber vier Felder: PostgREST kann `ilike`
-- nur auf Textspalten, nicht auf text[]. Titel und Beschreibung waeren damit
-- durchsuchbar, Themen und Branchen nicht - also genau die Begriffe, nach denen
-- Leute suchen.
--
-- Warum ein Trigger und keine generierte Spalte: array_to_string ist in
-- Postgres als STABLE markiert, nicht IMMUTABLE, und scheidet damit fuer
-- `generated always as` aus. Man koennte das mit einer eigenen, als immutable
-- deklarierten Huelle umgehen - das waere aber eine Behauptung gegenueber dem
-- Planer, die man irgendwann teuer bezahlt. Der Trigger ist ehrlicher, und die
-- Tabelle hat ohnehin schon zwei.
--
-- Warum ilike und keine Volltextsuche: Deutsche Komposita. `ilike '%vertrieb%'`
-- findet "Vertriebserfahrung"; eine tsvector-Suche ohne Kompositazerlegung
-- findet sie nicht. Fuer die Art Begriffe, um die es hier geht, ist die
-- einfachere Technik die bessere.

create extension if not exists pg_trgm;

alter table public.network_listings
  add column if not exists search_text text not null default '';

comment on column public.network_listings.search_text is
  'Titel, Beschreibung, Themen und Branchen in einem Feld, fuer die Freitextsuche. Wird vom Trigger gepflegt, nie von Hand gesetzt.';

create or replace function public.set_network_listing_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text :=
    coalesce(new.title, '') || ' ' ||
    coalesce(new.summary, '') || ' ' ||
    coalesce(array_to_string(new.topics, ' '), '') || ' ' ||
    coalesce(array_to_string(new.industries, ' '), '');
  return new;
end;
$$;

comment on function public.set_network_listing_search_text() is
  'Haelt network_listings.search_text aktuell. Eigener Trigger, weil array_to_string fuer eine generierte Spalte nicht immutable genug ist.';

drop trigger if exists network_listing_search_text on public.network_listings;
create trigger network_listing_search_text
  before insert or update of title, summary, topics, industries
  on public.network_listings
  for each row execute function public.set_network_listing_search_text();

-- Bestand nachziehen. Das Update loest den Trigger nicht aus (er haengt an
-- diesen vier Spalten), deshalb wird der Wert hier direkt berechnet.
update public.network_listings
set search_text =
  coalesce(title, '') || ' ' ||
  coalesce(summary, '') || ' ' ||
  coalesce(array_to_string(topics, ' '), '') || ' ' ||
  coalesce(array_to_string(industries, ' '), '');

-- Ohne Index wird `ilike '%x%'` mit wachsender Tabelle langsam, weil es keinen
-- Praefix hat, an dem ein normaler Index greifen koennte. Trigramme koennen das.
create index if not exists network_listings_search_text_trgm
  on public.network_listings using gin (search_text gin_trgm_ops);

commit;
