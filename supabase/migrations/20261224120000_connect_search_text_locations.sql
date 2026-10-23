begin;

-- Orte in die Freitextsuche: Wer in Connect nach "Hamburg" oder "Bayern" filtert,
-- soll Eintraege finden, die diesen Ort in ihren Ortsangaben nennen. Bisher stand
-- nur Titel, Beschreibung, Themen und Branchen im Suchfeld; die Orte lagen in einem
-- Array, das sich nicht mit "enthaelt dieses Stueck Text" durchsuchen laesst.

create or replace function public.set_network_listing_search_text()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_text :=
    coalesce(new.title, '') || ' ' ||
    coalesce(new.summary, '') || ' ' ||
    coalesce(array_to_string(new.topics, ' '), '') || ' ' ||
    coalesce(array_to_string(new.industries, ' '), '') || ' ' ||
    coalesce(array_to_string(new.locations, ' '), '');
  return new;
end;
$$;
drop trigger if exists network_listing_search_text on public.network_listings;
create trigger network_listing_search_text
  before insert or update of title, summary, topics, industries, locations
  on public.network_listings
  for each row execute function public.set_network_listing_search_text();
update public.network_listings
set search_text =
  coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' ||
  coalesce(array_to_string(topics, ' '), '') || ' ' ||
  coalesce(array_to_string(industries, ' '), '') || ' ' ||
  coalesce(array_to_string(locations, ' '), '');

notify pgrst, 'reload schema';
commit;
