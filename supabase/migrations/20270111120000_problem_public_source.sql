begin;

-- ---------------------------------------------------------------------------
-- Probleme aus oeffentlichen Quellen
-- ---------------------------------------------------------------------------
--
-- Das Problembrett soll nicht leer anfangen. Die Startinhalte stammen aus
-- Statistiken und Verbandsumfragen und stehen als das da, was sie sind: nicht
-- unter dem Namen einer Person, sondern mit Quelle, Jahr und Link.
--
-- WARUM KEIN BLOSSES "KEIN VERFASSER": Ein Problem ohne `author_user_id` heisst
-- bisher "die Person hat ihr Konto geloescht und den Text anonym stehen
-- lassen". Die Oberflaeche zeigt dafuer "ehemaliges Mitglied" und sagt, dass
-- eine Meldung niemanden mehr erreicht. Fuer Eintraege aus Quellen waere das
-- falsch. Darum gibt es eine eigene Herkunft.
--
-- WAS GILT FUER SOLCHE EINTRAEGE (ohne neue Regel, aus dem Bestand):
--   - Sichtbar fuer aktive Mitglieder (Select-Regel: Verfasser leer ist sichtbar).
--   - "Kenne ich auch" geht (Bestaetigungs-Regel erlaubt Verfasser leer).
--   - Ansaetze gehen.
--   - "Ich wuerde daran arbeiten" geht NICHT: Die Regel fuer Interesse verlangt
--     einen Verfasser, der antworten kann. Das bleibt so und ist getestet.
--   - Niemand ausser dem Dienst (service_role) kann sie anlegen, aendern oder
--     loeschen: Die Regeln fuer Mitglieder verlangen `author_user_id = auth.uid()`.
-- ---------------------------------------------------------------------------

alter table public.network_problems
  add column origin text not null default 'member',
  -- Stabiler Schluessel je Eintrag, damit das Einspielen wiederholbar ist.
  add column seed_key text,
  add column source_name text,
  add column source_url text,
  add column source_year text,
  -- Art der Quelle und Stichprobe, in einem Satz ("Verbandsumfrage, 1.005 Personen").
  add column source_note text;

alter table public.network_problems
  add constraint network_problems_origin_check
    check (origin in ('member', 'public_source')),
  add constraint network_problems_source_check
    check (
      (
        origin = 'member'
        and seed_key is null
        and source_name is null
        and source_url is null
        and source_year is null
        and source_note is null
      )
      or (
        origin = 'public_source'
        and author_user_id is null
        -- Jede Angabe ausdruecklich auf "nicht leer" geprueft: Ein Vergleich mit
        -- NULL ist in einer CHECK-Bedingung weder wahr noch falsch und liesse
        -- die Zeile sonst durch.
        and coalesce(char_length(btrim(seed_key)) between 3 and 120, false)
        and coalesce(char_length(btrim(source_name)) between 3 and 200, false)
        and coalesce(source_url ~ '^https://[^[:space:]]+$', false)
        and coalesce(char_length(btrim(source_year)) between 4 and 20, false)
        and (source_note is null or char_length(btrim(source_note)) <= 300)
      )
    );

create unique index network_problems_seed_key_key
  on public.network_problems (seed_key)
  where seed_key is not null;

comment on column public.network_problems.origin is
  'member = von einer Person eingestellt; public_source = aus einer oeffentlichen Quelle zusammengestellt (kein Verfasser, Quelle steht dabei).';
comment on column public.network_problems.seed_key is
  'Stabiler Schluessel eines Eintrags aus einer oeffentlichen Quelle; macht das Einspielen wiederholbar.';

-- Die Ansicht fuer das Brett bekommt die Herkunft und die Quelle am Ende.
create or replace view public.connect_discovery_problems with (security_invoker = true) as
 select p.id,
    p.author_user_id,
    p.title,
    p.description,
    p.author_intent,
    p.locations,
    p.geographic_scope,
    p.topics,
    p.industries,
    p.status,
    p.published_at,
    p.resolved_at,
    p.interest_count,
    p.search_text,
    p.created_at,
    p.updated_at,
    p.confirmation_count,
    p.visibility,
    p.public_slug,
    p.outlives_account,
    p.moderation_blocked,
    p.origin,
    p.source_name,
    p.source_url,
    p.source_year,
    p.source_note
   from public.network_problems p
  where public.is_network_member() and p.status = 'active' and not p.moderation_blocked
    and (p.author_user_id is null or public.connect_owner_visible(p.author_user_id));

revoke all on public.connect_discovery_problems from public, anon, authenticated;
grant select on public.connect_discovery_problems to authenticated;

commit;
