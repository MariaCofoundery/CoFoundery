begin;

-- ---------------------------------------------------------------------------
-- Wer fragt da eigentlich?
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 25.09.2026: "Ich habe als Advisor quasi den Accelerator angelegt,
-- aber ich bin noch nicht ganz so zufrieden damit, wie das dann so aussieht."
--
-- Beim Nachsehen war es schlimmer als vermutet. Eine Founderin, die um
-- Freigabe ihres Profils gebeten wird, sah bisher: den UMFANG ("Faehigkeiten")
-- und eine freiwillige Notiz. Sonst nichts. Nicht den Namen der Person, nicht
-- die Organisation, in deren Auftrag gefragt wird.
--
-- Und sie KONNTE es auch nicht sehen: `person_core` ist owner-only, die
-- Anwendung kommt an den Namen des Fragenden gar nicht heran. Herausgegeben
-- wurde deshalb nur `advisor_user_id` - eine Kennung, die niemandem etwas
-- sagt.
--
-- DAS IST KEIN SCHOENHEITSFEHLER, SONDERN EINE LUECKE IN DER EINWILLIGUNG.
-- Eine Zustimmung, bei der man nicht weiss, WEM man zustimmt, ist keine
-- Zustimmung. Sie ist ein Klick.
--
-- Diese Migration schliesst beides: Die Organisation bekommt ein Profil, und
-- wer gefragt wird, erfaehrt, wer fragt und in wessen Auftrag.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Die Organisation bekommt ein Gesicht
-- ---------------------------------------------------------------------------
--
-- Bisher hatte sie einen Namen, einen Status und eine Sitzanzahl. Das reicht
-- fuer die Verwaltung und nicht fuer die Entscheidung, der sie gegenuebersteht.

alter table public.advisor_orgs
  add column if not exists description text,
  add column if not exists website_url text,
  add column if not exists focus text[],
  add column if not exists location_region text;

alter table public.advisor_orgs
  drop constraint if exists advisor_orgs_description_len;
alter table public.advisor_orgs
  add constraint advisor_orgs_description_len
    check (description is null or char_length(btrim(description)) between 20 and 1200);

-- Zwanzig Zeichen als Untergrenze, nicht eins: "Accelerator" als ganze
-- Beschreibung ist dasselbe wie keine, kostet die Leserin aber einen Klick.

alter table public.advisor_orgs
  drop constraint if exists advisor_orgs_website_url_shape;
alter table public.advisor_orgs
  add constraint advisor_orgs_website_url_shape
    check (
      website_url is null
      or (
        char_length(website_url) <= 300
        -- Nur http(s). Ohne diese Schranke stuende `javascript:` in einem
        -- Link, den eine Founderin anklickt, weil sie wissen will, wer sie
        -- da fragt.
        and website_url ~ '^https?://[A-Za-z0-9]'
      )
    );

alter table public.advisor_orgs
  drop constraint if exists advisor_orgs_location_region_len;
alter table public.advisor_orgs
  add constraint advisor_orgs_location_region_len
    check (location_region is null or char_length(btrim(location_region)) <= 120);

alter table public.advisor_orgs
  drop constraint if exists advisor_orgs_focus_shape;
alter table public.advisor_orgs
  add constraint advisor_orgs_focus_shape
    check (
      focus is null
      or (array_length(focus, 1) <= 8 and array_length(focus, 1) >= 1)
    );

comment on column public.advisor_orgs.description is
  'Wofuer diese Organisation da ist - in eigenen Worten. Sichtbar fuer jede '
  'Person, die um eine Freigabe gebeten wird: Ohne sie waere die Zustimmung '
  'eine Zustimmung gegenueber einem Namen.';

-- ---------------------------------------------------------------------------
-- 2. Und die Organisation darf sich beschreiben
-- ---------------------------------------------------------------------------
--
-- Auf `advisor_orgs` gibt es nur `select` fuer `authenticated` - geaendert
-- wird ueber Funktionen. Das bleibt so: Eine Schreibpolicy muesste die
-- Fuehrungsrolle in der Policy selbst pruefen, und genau daraus entstand
-- vorher die Rekursion, die die `security definer`-Helfer aufloesen.

create or replace function public.update_advisor_org_profile(
  p_org_id uuid,
  p_name text,
  p_description text,
  p_website_url text,
  p_focus text[],
  p_location_region text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  -- NUR DIE FUEHRUNG. Ein Advisor, der der Organisation angehoert, arbeitet in
  -- ihrem Namen - er bestimmt aber nicht, was sie ueber sich sagt.
  if not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id
      and member.user_id = v_user
      and member.role = 'owner'
      and member.status = 'active'
  ) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;

  update public.advisor_orgs
  set name = coalesce(nullif(btrim(p_name), ''), name),
      -- Leerer Text loescht: Wer die Beschreibung entfernen will, soll das
      -- koennen, ohne dass eine Laengenpruefung ihn daran hindert.
      description = nullif(btrim(coalesce(p_description, '')), ''),
      website_url = nullif(btrim(coalesce(p_website_url, '')), ''),
      focus = case
                when p_focus is null then null
                when array_length(p_focus, 1) is null then null
                else p_focus
              end,
      location_region = nullif(btrim(coalesce(p_location_region, '')), ''),
      updated_at = pg_catalog.now()
  where id = p_org_id;
end;
$$;

revoke all on function public.update_advisor_org_profile(uuid, text, text, text, text[], text) from public, anon;
grant execute on function public.update_advisor_org_profile(uuid, text, text, text, text[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Wer gefragt wird, erfaehrt, wer fragt
-- ---------------------------------------------------------------------------
--
-- Diese Funktion ersetzt die direkte Abfrage auf `advisor_person_grants` in
-- `personAccessData.ts`. Sie gibt dasselbe heraus wie bisher - und dazu die
-- Auskunft, die fehlte.
--
-- SIE ANTWORTET IMMER NUR UEBER DIE AUFRUFENDE PERSON. `subject_user_id =
-- auth.uid()` ist die ganze Regel und steht in der Abfrage selbst, nicht in
-- einem Parameter: Eine Funktion mit einem `p_user_id` waere eine Funktion,
-- die man nach fremden Zeilen fragen kann.
--
-- WAS SIE VOM FRAGENDEN ZEIGT: Name und Kurzbeschreibung aus `person_core`.
-- Nicht die Lebensgeschichte, nicht die Faehigkeiten, nicht die Mailadresse -
-- genug, um zu wissen, wem man gegenuebersteht, und keine Zeile mehr. Die
-- Richtung stimmt damit: Diese Person bittet um Einblick, sie gewaehrt keinen.
--
-- ZWEI VERSCHIEDENE FRAGEN, ZWEI ANTWORTEN:
--
--   WER FRAGT ist immer eine Person - `requested_by_user_id`, und die Spalte
--   ist `not null`. Auch wenn eine Organisation den Zugang bekommt, hat ein
--   Mensch die Anfrage gestellt.
--
--   WER IHN HAELT ist entweder diese Person oder die Organisation, nie beides
--   (`advisor_person_grants_one_holder`). Der Unterschied ist nicht
--   akademisch: Er entscheidet, wem der Zugang beim Widerruf entzogen wird,
--   und wer ihn behaelt, wenn die fragende Person die Organisation verlaesst.
--
-- Beides steht deshalb getrennt in der Antwort. Eine Anzeige, die daraus "Pia
-- fragt" macht, waere in dem Fall falsch, in dem Pia geht und der Accelerator
-- bleibt.

-- Erst weg, dann neu: `create or replace` kann die Form der Antwort nicht
-- aendern, und diese Funktion hat waehrend ihrer Entstehung die Form
-- gewechselt. Auf einer frischen Datenbank tut die Zeile nichts.
drop function if exists public.get_person_access_requests();

create function public.get_person_access_requests()
returns table (
  id uuid,
  /** 'person' oder 'org' - wer den Zugang behaelt. */
  holder text,
  advisor_user_id uuid,
  org_id uuid,
  asked_by_name text,
  asked_by_headline text,
  org_name text,
  org_description text,
  org_website_url text,
  org_focus text[],
  org_location_region text,
  scope text,
  status text,
  request_note text,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select grant_row.id,
         case when grant_row.org_id is not null then 'org' else 'person' end,
         grant_row.advisor_user_id,
         grant_row.org_id,
         asker.display_name,
         asker.headline,
         org.name,
         org.description,
         org.website_url,
         org.focus,
         org.location_region,
         grant_row.scope,
         grant_row.status,
         grant_row.request_note,
         grant_row.approved_at
  from public.advisor_person_grants grant_row
  left join public.person_core asker on asker.user_id = grant_row.requested_by_user_id
  left join public.advisor_orgs org on org.id = grant_row.org_id
  where grant_row.subject_user_id = auth.uid()
    and grant_row.status in ('requested', 'active')
  order by grant_row.created_at;
$$;

revoke all on function public.get_person_access_requests() from public, anon;
grant execute on function public.get_person_access_requests() to authenticated;

comment on function public.get_person_access_requests() is
  'Die offenen und geltenden Freigaben der aufrufenden Person, samt der '
  'Auskunft, wer fragt und wer den Zugang haelt. Ohne diese Auskunft ist eine '
  'Zustimmung keine Zustimmung, sondern ein Klick.';

commit;
