begin;

-- ---------------------------------------------------------------------------
-- Eine Organisation, mehrere Advisor
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 23.09.2026: "Es gibt einen Organisationszugang, und darunter
-- kann man dann auch Advisor-Konten anlegen."
--
-- ANGELEGT WERDEN KEINE KONTEN, SONDERN MITGLIEDSCHAFTEN - und das ist der
-- einzige nennenswerte Unterschied zu dem, was sie gesagt hat. Wer Konten fuer
-- andere Menschen anlegt, haelt deren Zugangsdaten; die Person kann dann nicht
-- mehr sicher sein, dass ihr Konto ihr gehoert. Stattdessen laedt die
-- Organisation per Mail ein, jeder meldet sich selbst an, und die
-- Mitgliedschaft verbindet beides. Derselbe Weg wie bei allen anderen
-- Einladungen hier.
--
-- WOZU DIE ORGANISATION UEBERHAUPT: Ohne sie ist ein Accelerator eine Reihe
-- einzelner Advisor-Konten. Wenn dort jemand aufhoert, geht sein Zugang mit
-- ihm - und die Nachfolgerin muss die Person neu fragen. Mit ihr gilt: Ein
-- Founder stimmt dem PROGRAMM zu, nicht Herrn Mueller. Faellt Herr Mueller
-- weg, bleibt die Zustimmung; wird er auf 'revoked' gesetzt, endet SEIN
-- Zugriff sofort, ohne dass jemand gefragt werden muss.
--
-- DER PREIS DIESER ENTSCHEIDUNG, und er gehoert gesagt: Zustimmung zu einer
-- Organisation ist Zustimmung zu MEHREREN, WECHSELNDEN Menschen. Deshalb
-- fuehrt diese Migration `advisor_org_visible_members` ein - die Person kann
-- jederzeit sehen, wer dort gerade Mitglied ist. Ohne diese Liste waere die
-- Einwilligung ein Blankoscheck.
--
-- SITZE BEGRENZEN ANFRAGEN, NICHT ZUGRIFFE. `person_seat_limit` bremst, wie
-- viele Menschen eine Organisation gleichzeitig begleiten darf. Es gibt keinen
-- Weg, ueber Sitze an Daten zu kommen: Der Kauf erzeugt eine Anfrage, nie
-- einen Zugang - dieselbe Zusage wie beim einzelnen Advisor, nur eine Ebene
-- hoeher. `null` heisst unbegrenzt, denn eine Abrechnung gibt es noch nicht.
-- ---------------------------------------------------------------------------

create table public.advisor_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  /** Wie viele Menschen gleichzeitig begleitet werden duerfen. Null = unbegrenzt. */
  person_seat_limit integer,
  /**
   * Wer sie angelegt hat - und `on delete set null`, nicht `restrict`.
   *
   * MIT `restrict` HAETTE EINE KONTOLOESCHUNG AN DIESER ZEILE SCHEITERN
   * KOENNEN: Wer eine Organisation angelegt hat, waere sein Konto nicht mehr
   * losgeworden. Ein bestehender Wachhund hat das gefangen - der, der jeden
   * blockierenden Verweis auf die Nutzertabelle auflistet -, und er hat recht:
   * Das Recht zu gehen steht ueber der Vollstaendigkeit einer Herkunftsangabe.
   *
   * (Der Name der Nutzertabelle steht hier bewusst NICHT ausgeschrieben: Der
   * Wachhund liest Zeile fuer Zeile und haelt jede Zeile, die ihn enthaelt,
   * fuer eine Spaltendefinition - auch eine im Kommentar.)
   */
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint advisor_orgs_name_length check (char_length(btrim(name)) between 2 and 120),
  constraint advisor_orgs_status_check check (status in ('active', 'suspended')),
  constraint advisor_orgs_seats_positive check (person_seat_limit is null or person_seat_limit >= 0)
);

comment on table public.advisor_orgs is
  'Ein Programm oder eine Beratung mit mehreren Advisorinnen. Haelt Zugaenge, damit sie nicht mit einer einzelnen Person verschwinden.';

create table public.advisor_org_members (
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'advisor',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,

  primary key (org_id, user_id),
  constraint advisor_org_members_role_check check (role in ('owner', 'advisor')),
  constraint advisor_org_members_status_check check (status in ('active', 'revoked')),
  constraint advisor_org_members_revoked check ((status = 'revoked') = (revoked_at is not null))
);

create index advisor_org_members_user_idx on public.advisor_org_members (user_id, status);

-- ---------------------------------------------------------------------------
-- Der Zugang kann der Organisation gehoeren
-- ---------------------------------------------------------------------------
alter table public.advisor_person_grants
  add column org_id uuid references public.advisor_orgs (id) on delete cascade;

alter table public.advisor_person_grants
  alter column advisor_user_id drop not null;

-- ENTWEDER ODER, NIE BEIDES. Ein Zugang hat genau einen Halter - sonst waere
-- beim Widerruf nicht klar, wem er entzogen wird.
alter table public.advisor_person_grants
  add constraint advisor_person_grants_one_holder
  check ((org_id is null) <> (advisor_user_id is null));

-- Die Eindeutigkeit gilt je Halter. Zwei Teilindizes statt eines Index ueber
-- beide Spalten: Bei NULL in einer Spalte greift eine gewoehnliche
-- Eindeutigkeit nicht.
drop index public.advisor_person_grants_once;
create unique index advisor_person_grants_once_advisor
  on public.advisor_person_grants (subject_user_id, advisor_user_id, scope)
  where advisor_user_id is not null;
create unique index advisor_person_grants_once_org
  on public.advisor_person_grants (subject_user_id, org_id, scope)
  where org_id is not null;

create index advisor_person_grants_org_idx
  on public.advisor_person_grants (org_id, status);

-- ---------------------------------------------------------------------------
-- Mitgliedschaft pruefen, ohne sich selbst zu fragen
-- ---------------------------------------------------------------------------
/**
 * WARUM ES DIESE FUNKTION GIBT: Eine Zeilenregel auf `advisor_org_members`,
 * die selbst `advisor_org_members` liest ("bin ich in derselben Organisation"),
 * ruft beim Pruefen wieder sich selbst auf - Postgres bricht das mit
 * "infinite recursion detected in policy" ab.
 *
 * `security definer` liest an den Regeln vorbei und beendet damit die
 * Schleife. Sie gibt nur ein Ja oder Nein zurueck und niemals Zeilen - dasselbe
 * Muster wie `is_current_user_collaboration_round_participant`.
 */
create or replace function public.is_advisor_org_member(
  p_org_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id
      and member.user_id = p_user_id
      and member.status = 'active'
  );
$$;

revoke all on function public.is_advisor_org_member(uuid, uuid) from public, anon;
grant execute on function public.is_advisor_org_member(uuid, uuid) to authenticated;

/** Dasselbe fuer die andere Richtung: Werde ich von dieser Organisation begleitet? */
create or replace function public.is_accompanied_by_advisor_org(
  p_org_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_person_grants grant_row
    where grant_row.org_id = p_org_id
      and grant_row.subject_user_id = p_user_id
  );
$$;

revoke all on function public.is_accompanied_by_advisor_org(uuid, uuid) from public, anon;
grant execute on function public.is_accompanied_by_advisor_org(uuid, uuid) to authenticated;

-- Die Sichtbarkeit der Zeile: auch fuer die Mitglieder der haltenden
-- Organisation.
drop policy advisor_person_grants_select_involved on public.advisor_person_grants;
create policy advisor_person_grants_select_involved on public.advisor_person_grants
  for select to authenticated using (
    subject_user_id = auth.uid()
    or advisor_user_id = auth.uid()
    or public.is_advisor_org_member(advisor_person_grants.org_id)
  );

alter table public.advisor_orgs enable row level security;
alter table public.advisor_org_members enable row level security;
revoke all on public.advisor_orgs from anon, authenticated;
revoke all on public.advisor_org_members from anon, authenticated;
grant select on public.advisor_orgs to authenticated;
grant select on public.advisor_org_members to authenticated;

-- Wer Mitglied ist, sieht seine Organisation. Und wer von ihr begleitet wird,
-- sieht sie auch - sonst waere die Zustimmung zu einem Namen ohne Inhalt.
create policy advisor_orgs_select_involved on public.advisor_orgs
  for select to authenticated using (
    public.is_advisor_org_member(advisor_orgs.id)
    or public.is_accompanied_by_advisor_org(advisor_orgs.id)
  );

create policy advisor_org_members_select_involved on public.advisor_org_members
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_advisor_org_member(advisor_org_members.org_id)
    -- WER BEGLEITET WIRD, SIEHT DIE MITGLIEDER. Das ist keine Nettigkeit,
    -- sondern die Bedingung dafuer, dass die Einwilligung eine ist: Zustimmung
    -- zu einer Organisation ist Zustimmung zu mehreren, wechselnden Menschen.
    or public.is_accompanied_by_advisor_org(advisor_org_members.org_id)
  );

create trigger advisor_orgs_updated_at
  before update on public.advisor_orgs
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- Was ein Advisor sehen darf - jetzt auch ueber seine Organisation
-- ---------------------------------------------------------------------------
/**
 * WEITER DIE EINE STELLE, an der die Frage beantwortet wird. Dazugekommen ist
 * der zweite Weg: ueber eine AKTIVE Mitgliedschaft in der haltenden
 * Organisation.
 *
 * Wer dort auf 'revoked' gesetzt wird, verliert den Zugriff im selben Moment -
 * ohne dass die begleitete Person gefragt werden muesste, und ohne dass ihre
 * Zustimmung erlischt. Genau dafuer gibt es die Organisation.
 */
create or replace function public.has_advisor_person_access(
  p_subject_user_id uuid,
  p_scope text,
  p_advisor_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_person_grants grant_row
    left join public.advisor_org_members member
      on member.org_id = grant_row.org_id
     and member.user_id = p_advisor_user_id
     and member.status = 'active'
    left join public.advisor_orgs org on org.id = grant_row.org_id
    where grant_row.subject_user_id = p_subject_user_id
      and grant_row.scope = p_scope
      and grant_row.status = 'active'
      and grant_row.revoked_at is null
      and (grant_row.expires_at is null or grant_row.expires_at > pg_catalog.now())
      and (
        grant_row.advisor_user_id = p_advisor_user_id
        or (member.user_id is not null and org.status = 'active')
      )
  );
$$;

revoke all on function public.has_advisor_person_access(uuid, text, uuid) from public, anon;
grant execute on function public.has_advisor_person_access(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Eine Organisation anlegen und Menschen aufnehmen
-- ---------------------------------------------------------------------------
create or replace function public.create_advisor_org(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.advisor_orgs (name, created_by_user_id)
  values (btrim(p_name), v_user)
  returning id into v_id;

  -- Wer sie anlegt, fuehrt sie. Eine Organisation ohne Verantwortliche waere
  -- eine Zeile, die niemand verwalten kann.
  insert into public.advisor_org_members (org_id, user_id, role)
  values (v_id, v_user, 'owner');

  return v_id;
end;
$$;

revoke all on function public.create_advisor_org(text) from public, anon;
grant execute on function public.create_advisor_org(text) to authenticated;

/**
 * Eine Mitgliedschaft beenden - oder wieder aufnehmen.
 *
 * NUR WER DIE ORGANISATION FUEHRT. Und niemand kann sich selbst
 * hinauswerfen, solange er die letzte Verantwortliche ist: Eine Organisation
 * ohne Fuehrung haelt Zugaenge, die niemand mehr zuruecknehmen kann.
 */
create or replace function public.set_advisor_org_membership(
  p_org_id uuid,
  p_user_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_owners integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_status not in ('active', 'revoked') then
    return false;
  end if;

  if not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = v_user
      and member.role = 'owner' and member.status = 'active'
  ) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;

  if p_status = 'revoked' then
    select count(*) into v_owners from public.advisor_org_members member
    where member.org_id = p_org_id and member.role = 'owner' and member.status = 'active';
    if v_owners <= 1 and exists (
      select 1 from public.advisor_org_members member
      where member.org_id = p_org_id and member.user_id = p_user_id and member.role = 'owner'
    ) then
      raise exception 'advisor_org_needs_an_owner' using errcode = '42501';
    end if;
  end if;

  update public.advisor_org_members
  set status = p_status,
      revoked_at = case when p_status = 'revoked' then pg_catalog.now() end
  where org_id = p_org_id and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.set_advisor_org_membership(uuid, uuid, text) from public, anon;
grant execute on function public.set_advisor_org_membership(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Zwei Funktionen muessen die neue Eindeutigkeit kennen
-- ---------------------------------------------------------------------------
--
-- WARUM SIE HIER STEHEN UND NICHT DORT, WO SIE ENTSTANDEN SIND: Die
-- Migrationen 20261040 und 20261042 sind angewandt. Eine angewandte Migration
-- wird nicht geaendert - sonst hat dieselbe Datei in zwei Datenbanken zwei
-- Bedeutungen. Die Korrektur gehoert deshalb hierher, in die Migration, die
-- die Ursache schafft.
--
-- DIE URSACHE: Die Eindeutigkeit ueber (Person, Advisor, Umfang) ist oben zu
-- einem TEILINDEX geworden - sie gilt je Halter, weil ein Zugang jetzt auch
-- einer Organisation gehoeren kann. Ein `on conflict` ohne die Bedingung
-- findet einen Teilindex nicht und bricht mit "there is no unique or exclusion
-- constraint matching the ON CONFLICT specification" ab.
--
-- Gefunden haben es die pgTAP-Suiten, die es seit gestern gibt. Ohne sie waere
-- es erst der Person aufgefallen, die eine zweite Anfrage bekommt.

create or replace function public.request_advisor_person_access(
  p_subject_user_id uuid,
  p_scope text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
  v_id uuid;
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_advisor = p_subject_user_id then
    raise exception 'advisor_cannot_accompany_self' using errcode = '42501';
  end if;

  -- Eine Blockierung gilt auch hier: Wer jemanden blockiert hat, soll von ihm
  -- keine Anfrage bekommen.
  if public.is_network_interaction_blocked(v_advisor, p_subject_user_id) then
    return null;
  end if;

  insert into public.advisor_person_grants (
    subject_user_id, advisor_user_id, scope, requested_by_user_id, request_note
  )
  values (
    p_subject_user_id, v_advisor, p_scope, v_advisor,
    left(nullif(btrim(coalesce(p_note, '')), ''), 400)
  )
  on conflict (subject_user_id, advisor_user_id, scope) where advisor_user_id is not null do update
    -- Eine erneute Anfrage nach einer Absage ist erlaubt - aber sie macht
    -- aus einem Widerruf keinen Zugang: Sie setzt wieder auf 'requested'.
    set status = 'requested',
        requested_by_user_id = v_advisor,
        request_note = left(nullif(btrim(coalesce(p_note, '')), ''), 400),
        approved_at = null,
        revoked_at = null
    where public.advisor_person_grants.status in ('declined', 'revoked')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.claim_advisor_person_invite(p_token_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_invite public.advisor_person_invites;
  v_scope text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select lower(btrim(coalesce(email, ''))) into v_email from auth.users where id = v_user;

  select * into v_invite from public.advisor_person_invites
  where token_hash = p_token_hash for update;
  if not found then
    raise exception 'invite_unknown' using errcode = '42501';
  end if;
  if v_invite.status <> 'sent' or v_invite.expires_at <= pg_catalog.now() then
    raise exception 'invite_not_open' using errcode = '42501';
  end if;
  if v_invite.invitee_email <> v_email then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;
  if v_invite.advisor_user_id = v_user then
    raise exception 'advisor_cannot_invite_self' using errcode = '42501';
  end if;

  foreach v_scope in array v_invite.scopes loop
    insert into public.advisor_person_grants (
      subject_user_id, advisor_user_id, scope, requested_by_user_id, request_note
    )
    values (v_user, v_invite.advisor_user_id, v_scope, v_invite.advisor_user_id, v_invite.note)
    on conflict (subject_user_id, advisor_user_id, scope) where advisor_user_id is not null do update
      set status = 'requested',
          requested_by_user_id = v_invite.advisor_user_id,
          request_note = v_invite.note,
          approved_at = null,
          revoked_at = null
      -- Ein GELTENDER Zugang wird nicht angetastet: Eine neue Einladung darf
      -- eine Zustimmung nicht in eine Anfrage zurueckverwandeln.
      where public.advisor_person_grants.status in ('declined', 'revoked');
    v_count := v_count + 1;
  end loop;

  update public.advisor_person_invites
  set status = 'claimed', claimed_at = pg_catalog.now(), claimed_by_user_id = v_user
  where id = v_invite.id;

  return v_count;
end;
$$;

commit;
