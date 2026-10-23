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
    -- Ueber to_jsonb gelesen: Die Schema-Reparatur (network_schema_drift_repair) kennt Zustaende ohne
    -- diese Spalte, und der Trigger darf dort nicht scheitern.
    coalesce((select string_agg(x, ' ') from jsonb_array_elements_text(to_jsonb(new) -> 'locations') as t(x)), '');
  return new;
end;
$$;
drop trigger if exists network_listing_search_text on public.network_listings;
create trigger network_listing_search_text
  -- Ohne Spaltenliste: Ein Trigger, der "update of locations" nennt, haengt an dieser Spalte und
  -- blockiert sie beim Reparieren von Schema-Abweichungen (siehe network_schema_drift_repair).
  before insert or update
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
