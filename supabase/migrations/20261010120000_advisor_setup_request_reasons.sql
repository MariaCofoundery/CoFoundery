begin;

-- ---------------------------------------------------------------------------
-- Die Anfrage sagt, WARUM sie nicht geht
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 20.09.2026, direkt nach dem Einspielen: "Freigabe erbitten"
-- endete mit "Die Anfrage konnte gerade nicht gestellt werden. Moeglicherweise
-- ist deine Freigabe fuer dieses Team nicht mehr aktiv."
--
-- Die Meldung war falsch, und der Fehler ist mein eigener: Die Funktion aus
-- 20261009120000 sucht die Quelle mit `relationship.founder_team_id is not
-- null` in derselben Abfrage. Findet sie nichts, wirft sie
-- `advisor_ineligible` - egal ob die begleitende Person nicht berechtigt ist
-- ODER die Beziehung einfach noch kein Founder-Team hat.
--
-- Und der zweite Fall ist der haeufige: `founder_team_id` bleibt NULL, bis die
-- Founder ihr Team-Homebase anlegen. Vorher gibt es gar kein Founder Setup, das
-- man freigeben koennte. Die Anfrage kann dann nicht gehen - aber nicht, weil
-- mit der Freigabe der begleitenden Person etwas waere.
--
-- Eine Meldung, die eine Ursache BEHAUPTET, die sie nicht kennt, schickt
-- Menschen an die falsche Stelle. Deshalb trennt die Funktion jetzt beides.
-- ---------------------------------------------------------------------------

create or replace function public.request_founder_team_advisor_setup_grant(p_relationship_id uuid)
returns table (
  grant_id uuid,
  consent_count integer,
  member_count integer,
  active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_source_id uuid;
  v_grant public.founder_team_advisor_setup_grants%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_advisor_setup_auth_required' using errcode = '42501';
  end if;

  -- SCHRITT 1: Ist die aufrufende Person begleitende Person DIESER Beziehung?
  -- Ohne die Team-Bedingung, damit sich die beiden Faelle unterscheiden lassen.
  -- Die Quelle wird weiterhin gesucht und nicht uebergeben.
  select advisor_access.id, relationship.founder_team_id
    into v_source_id, v_team_id
  from public.relationship_advisors advisor_access
  join public.relationships relationship
    on relationship.id = advisor_access.relationship_id
  where advisor_access.relationship_id = p_relationship_id
    and advisor_access.advisor_user_id = v_user_id
    and advisor_access.status = 'linked'
    and advisor_access.founder_a_approved = true
    and advisor_access.founder_b_approved = true
    and advisor_access.revoked_at is null
  order by advisor_access.updated_at desc, advisor_access.id
  limit 1;

  if v_source_id is null then
    raise exception 'founder_team_advisor_setup_advisor_ineligible' using errcode = '42501';
  end if;

  -- SCHRITT 2: Gibt es ueberhaupt ein Founder-Team? Wenn nicht, ist das kein
  -- Berechtigungsproblem, sondern eine Sache, die die Founder noch nicht
  -- angelegt haben.
  if v_team_id is null then
    raise exception 'founder_team_advisor_setup_team_missing' using errcode = 'P0002';
  end if;

  perform 1 from public.founder_teams team where team.id = v_team_id for update;
  if not found then
    raise exception 'founder_team_advisor_setup_team_missing' using errcode = 'P0002';
  end if;

  select * into v_grant
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.team_id = v_team_id
    and grant_row.advisor_user_id = v_user_id
    and grant_row.revoked_at is null
  for update;

  -- Zweimal fragen legt keine zweite Anfrage an. Eine bestehende Anfrage wird
  -- zurueckgegeben, eine bereits aktive Freigabe bleibt unberuehrt.
  if not found then
    insert into public.founder_team_advisor_setup_grants (
      team_id,
      advisor_user_id,
      source_relationship_advisor_id,
      scope,
      status,
      created_by_user_id,
      requested_by_advisor_at
    ) values (
      v_team_id,
      v_user_id,
      v_source_id,
      'confirmed_only',
      'pending',
      v_user_id,
      now()
    )
    returning * into v_grant;
  elsif v_grant.requested_by_advisor_at is null then
    update public.founder_team_advisor_setup_grants
    set requested_by_advisor_at = now()
    where id = v_grant.id
    returning * into v_grant;
  end if;

  -- KEINE Zustimmung. Der Advisor kann fuer niemanden zustimmen.
  active := public.refresh_founder_team_advisor_setup_grant(v_grant.id);
  grant_id := v_grant.id;

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = v_team_id;
  select count(*)::integer into consent_count
  from public.founder_team_advisor_setup_consents consent
  join public.founder_team_members member
    on member.team_id = v_team_id and member.user_id = consent.founder_user_id
  where consent.grant_id = v_grant.id;
  return next;
end;
$$;

comment on function public.request_founder_team_advisor_setup_grant(uuid) is
  'Die begleitende Person bittet um Freigabe des Founder Setup. Legt eine Anfrage mit Status pending und OHNE Zustimmung an. Unterscheidet zwei Faelle, die sich nicht gleich anfuehlen duerfen: nicht berechtigt (42501) und noch kein Founder-Team (P0002).';

-- ---------------------------------------------------------------------------
-- Und die Oberflaeche soll wissen, ob es ein Team gibt
-- ---------------------------------------------------------------------------
-- Damit der Knopf dort nicht erst erscheint.
--
-- BEWUSST EINE EIGENE, SCHMALE FUNKTION und keine Erweiterung von
-- `get_advisor_founder_setup_access_status`: Die traegt rund hundert Zeilen
-- Statusherleitung, an der nichts fehlt. Sie nur fuer ein zusaetzliches Bit
-- neu zu schreiben, waere Risiko ohne Gegenwert - und ein Rueckgabetyp laesst
-- sich nicht aendern, ohne sie vorher zu loeschen.
--
-- Die Antwort ist absichtlich nur "ja/nein" und keine Team-Kennung: Der
-- Advisor braucht die Kennung nicht, und was man nicht herausgibt, kann auch
-- nicht weiterverwendet werden.
create or replace function public.advisor_relationship_has_founder_team(p_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.relationship_advisors request_access
    join public.relationships relationship
      on relationship.id = request_access.relationship_id
    where request_access.relationship_id = p_relationship_id
      and request_access.advisor_user_id = auth.uid()
      and request_access.status = 'linked'
      and request_access.founder_a_approved = true
      and request_access.founder_b_approved = true
      and request_access.revoked_at is null
      and relationship.founder_team_id is not null
  );
$$;

revoke all on function public.advisor_relationship_has_founder_team(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.advisor_relationship_has_founder_team(uuid) to authenticated;

comment on function public.advisor_relationship_has_founder_team(uuid) is
  'Hat diese Beziehung schon ein Founder-Team? Nur fuer die begleitende Person dieser Beziehung, und nur ja/nein - die Team-Kennung braucht sie nicht.';

commit;
