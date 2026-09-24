begin;

-- ---------------------------------------------------------------------------
-- Was ein Advisor wirklich sieht
-- ---------------------------------------------------------------------------
--
-- Bis hierher gab es Zugaenge, aber keine Ansicht. Diese vier Funktionen sind
-- die Ansicht - und sie sind der heikelste Teil des ganzen Bereichs, weil hier
-- zum ersten Mal Daten eines Menschen an jemand anderen gehen.
--
-- JE ABSCHNITT EINE PRUEFUNG, nicht eine am Seitenanfang. Jeder Bereich ist
-- eine eigene Zustimmung; eine Pruefung "darf dieser Advisor diese Person
-- sehen" gibt es deshalb gar nicht - die Frage ist immer "diesen Bereich
-- dieser Person".
--
-- UND SIE STEHEN IN DER DATENBANK, nicht in der Anwendung. Eine Seite, die
-- erst alles laedt und dann entscheidet, was sie davon anzeigt, hat die Daten
-- bereits geholt - ein Fehler in der Anzeige waere dann eine Offenlegung. Hier
-- kommt nichts heraus, wofuer keine Zustimmung vorliegt.
--
-- WAS ES HIER NIE GEBEN WIRD: die Erzaehlungen aus den Gespraechen. Weder die
-- Interviewantworten noch die Belege an den Faehigkeiten noch die Vorschlaege,
-- ueber die noch niemand entschieden hat. Ein Advisor sieht bestaetigte
-- Ergebnisse. Frage 3 des Faehigkeits-Interviews fragt nach dem Leben
-- ausserhalb der Erwerbsarbeit - dort stehen Pflege, Ehrenamt, Familie.
-- ---------------------------------------------------------------------------

create or replace function public.get_advisor_person_base(p_subject_user_id uuid)
returns table (
  display_name text,
  headline text,
  bio text,
  location_region text,
  remote_mode text,
  expertise text[],
  industries text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_advisor_person_access(p_subject_user_id, 'base') then
    raise exception 'advisor_scope_not_granted' using errcode = '42501';
  end if;

  return query
  select core.display_name, core.headline, core.bio, core.location_region,
         core.remote_mode, core.expertise, core.industries
  from public.person_core core
  where core.user_id = p_subject_user_id;
end;
$$;

/**
 * Faehigkeiten - und die Tiefe nur, wenn auch sie freigegeben ist.
 *
 * DIE LEITER BLEIBT: `capability` zeigt, WELCHE Bereiche jemand eingetragen
 * hat; erst `capability_depth` zeigt Stufe und Verantwortungswunsch. Genau so
 * trennt es die vorhandene Sichtbarkeit fuer Netzwerk und Team
 * (`get_disclosed_capability`), und ein Advisor-Zugang darf sie nicht
 * ueberspringen.
 *
 * Die BELEGE kommen nicht mit. Sie sind die Erzaehlung.
 */
create or replace function public.get_advisor_person_capability(p_subject_user_id uuid)
returns table (
  area_id text,
  family_id text,
  application_level smallint,
  ownership_wish text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_depth boolean;
begin
  if not public.has_advisor_person_access(p_subject_user_id, 'capability') then
    raise exception 'advisor_scope_not_granted' using errcode = '42501';
  end if;
  v_depth := public.has_advisor_person_access(p_subject_user_id, 'capability_depth');

  return query
  select entry.area_id,
         area.family_id,
         case when v_depth then entry.application_level end,
         case when v_depth then entry.ownership_wish end
  from public.person_capability_entries entry
  join public.capability_areas area on area.area_id = entry.area_id
  where entry.user_id = p_subject_user_id
  order by area.sort_order;
end;
$$;

create or replace function public.get_advisor_person_strengths(p_subject_user_id uuid)
returns table (
  statement text,
  self_frequency text,
  reflected_frequency text,
  reflected_who text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_advisor_person_access(p_subject_user_id, 'strengths') then
    raise exception 'advisor_scope_not_granted' using errcode = '42501';
  end if;

  return query
  select strength.statement, strength.self_frequency,
         strength.reflected_frequency, strength.reflected_who
  from public.person_strengths strength
  where strength.user_id = p_subject_user_id
  order by strength.created_at;
end;
$$;

/**
 * Richtung - und ausschliesslich BESTAETIGTE Aussagen.
 *
 * `direction_statements` ist die Tabelle der bestaetigten Aussagen;
 * `direction_statement_proposals` wird hier nicht einmal erwaehnt. Das ist der
 * Grund, warum es zwei Tabellen gibt: Ein Vorschlag ist keine Aussage ueber
 * einen Menschen, solange der Mensch ihn nicht bestaetigt hat - und was
 * niemand lesen darf, wird am besten gar nicht erst gelesen.
 */
create or replace function public.get_advisor_person_direction(p_subject_user_id uuid)
returns table (facet text, statement text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_advisor_person_access(p_subject_user_id, 'direction') then
    raise exception 'advisor_scope_not_granted' using errcode = '42501';
  end if;

  return query
  select direction.facet, direction.statement
  from public.direction_statements direction
  where direction.user_id = p_subject_user_id
  order by direction.created_at;
end;
$$;

revoke all on function public.get_advisor_person_base(uuid) from public, anon;
revoke all on function public.get_advisor_person_capability(uuid) from public, anon;
revoke all on function public.get_advisor_person_strengths(uuid) from public, anon;
revoke all on function public.get_advisor_person_direction(uuid) from public, anon;
grant execute on function public.get_advisor_person_base(uuid) to authenticated;
grant execute on function public.get_advisor_person_capability(uuid) to authenticated;
grant execute on function public.get_advisor_person_strengths(uuid) to authenticated;
grant execute on function public.get_advisor_person_direction(uuid) to authenticated;

commit;
