begin;

-- ---------------------------------------------------------------------------
-- Einladen - von innen, nicht von aussen
-- ---------------------------------------------------------------------------
--
-- ENTSCHIEDEN AM 23.09.2026: "Sie koennen eine Einladungs-E-Mail rausschicken,
-- aber die kommt von innen. Also ich bin eingeloggt bei CoFoundery und dann
-- schicke ich dem Founder einen Token oder eine E-Mail. Es ist nicht von
-- aussen, dass da irgendwie was gemacht wird - so wie wir das ja auch mit dem
-- Co-Founder haben oder mit der Advisor-Einladung."
--
-- DAMIT IST DIE OFFENE FRAGE BEANTWORTET, und zwar richtig: Eine Suche nach
-- einer E-Mail-Adresse haette verraten, ob es zu ihr ein Konto gibt - das ist
-- eine Auskunft ueber einen Menschen, die niemand geben sollte. Eine Einladung
-- verraet nichts: Sie geht an eine Adresse, die der Advisor ohnehin kennt.
--
-- DIESELBE BAUWEISE WIE BEI DEN VORHANDENEN EINLADUNGEN: Die Anwendung erzeugt
-- den Token und schickt ihn per Mail; die Datenbank bekommt nur seinen
-- SHA-256-Hash. Wer die Datenbank liest, kann damit keine Einladung annehmen.
--
-- UND EINE EINLADUNG IST KEIN ZUGANG. Das Annehmen erzeugt ANFRAGEN
-- (`advisor_person_grants` mit Status 'requested'), keine Zugaenge - die
-- Person entscheidet danach im Konto, Bereich fuer Bereich. Der Token belegt,
-- dass jemand die Adresse erreicht hat; er belegt keine Einwilligung.
--
-- DIE UMFAENGE STEHEN HIER ALS LISTE, bei den Zugaengen dagegen je Zeile
-- einzeln. Das ist kein Widerspruch: Eine Einladung ist EINE Frage ("darf ich
-- das und das sehen"), eine Zustimmung sind mehrere Antworten. Und nur die
-- Antworten muessen einzeln zuruecknehmbar sein.
-- ---------------------------------------------------------------------------

create table public.advisor_person_invites (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references auth.users (id) on delete cascade,

  /** Kleingeschrieben und getrimmt - sonst laedt man dieselbe Person zweimal ein. */
  invitee_email text not null,
  /** Nur der Hash. Der Token selbst steht in genau einer Mail. */
  token_hash text not null,

  /** Worum gebeten wird. Dieselbe Werteliste wie bei den Zugaengen. */
  scopes text[] not null,
  note text,

  status text not null default 'sent',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users (id) on delete set null,

  constraint advisor_person_invites_token_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint advisor_person_invites_token_unique unique (token_hash),
  constraint advisor_person_invites_email_format
    check (position('@' in invitee_email) > 1 and invitee_email = lower(btrim(invitee_email))),
  constraint advisor_person_invites_status_check
    check (status in ('sent', 'claimed', 'revoked', 'expired')),
  constraint advisor_person_invites_claimed
    check ((status = 'claimed') = (claimed_at is not null)),
  -- Ohne Umfang ist die Einladung eine Frage ohne Inhalt.
  constraint advisor_person_invites_scopes_present
    check (array_length(scopes, 1) between 1 and 6),
  constraint advisor_person_invites_scopes_known check (
    scopes <@ array['base', 'alignment_report', 'capability', 'capability_depth',
                    'strengths', 'direction']::text[]
  )
);

create index advisor_person_invites_advisor_idx
  on public.advisor_person_invites (advisor_user_id, status, created_at desc);

comment on table public.advisor_person_invites is
  'Einladung eines Advisors an eine E-Mail-Adresse. Das Annehmen erzeugt Anfragen, keine Zugaenge - die Zustimmung faellt danach im Konto.';

alter table public.advisor_person_invites enable row level security;
revoke all on public.advisor_person_invites from anon, authenticated;
grant select on public.advisor_person_invites to authenticated;

-- NUR DER EINLADENDE SIEHT SEINE EINLADUNGEN. Die eingeladene Person sieht sie
-- NICHT - sie hat den Token, und der reicht zum Annehmen. Wuerde sie die Zeile
-- lesen duerfen, muesste die Regel dafuer die E-Mail-Adresse vergleichen, und
-- damit koennte man ueber Umwege pruefen, welche Adressen eingeladen wurden.
create policy advisor_person_invites_select_own on public.advisor_person_invites
  for select to authenticated using (advisor_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Einladen
-- ---------------------------------------------------------------------------
create or replace function public.create_advisor_person_invite(
  p_email text,
  p_token_hash text,
  p_scopes text[],
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = '22023';
  end if;
  if p_scopes is null or array_length(p_scopes, 1) is null then
    raise exception 'scopes_required' using errcode = '22023';
  end if;

  -- Sich selbst einzuladen ergibt keinen Sinn und wuerde eine Zeile erzeugen,
  -- die niemand annehmen kann.
  if v_email = (select lower(btrim(coalesce(email, ''))) from auth.users where id = v_advisor) then
    raise exception 'advisor_cannot_invite_self' using errcode = '22023';
  end if;

  insert into public.advisor_person_invites (
    advisor_user_id, invitee_email, token_hash, scopes, note
  )
  values (
    v_advisor, v_email, p_token_hash, p_scopes,
    left(nullif(btrim(coalesce(p_note, '')), ''), 400)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_advisor_person_invite(text, text, text[], text)
  from public, anon;
grant execute on function public.create_advisor_person_invite(text, text, text[], text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Annehmen
-- ---------------------------------------------------------------------------
/**
 * DER TOKEN BELEGT, DASS JEMAND DIE ADRESSE ERREICHT HAT - nicht, dass er
 * einverstanden ist. Deshalb entstehen hier ANFRAGEN und keine Zugaenge.
 *
 * UND DIE ADRESSE MUSS PASSEN. Ein Token ist ein Inhaberpapier: Wer den Link
 * weiterleitet, gibt ihn weiter. Die zusaetzliche Bedingung, dass die
 * angemeldete Person dieselbe Adresse hat, macht aus dem weitergeleiteten Link
 * ein Stueck Text ohne Wirkung. Dieselbe Regel gilt bei den vorhandenen
 * Advisor-Einladungen (`advisor_claim_email_matches`).
 */
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
    on conflict (subject_user_id, advisor_user_id, scope) do update
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

revoke all on function public.claim_advisor_person_invite(text) from public, anon;
grant execute on function public.claim_advisor_person_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Zuruecknehmen
-- ---------------------------------------------------------------------------
create or replace function public.revoke_advisor_person_invite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.advisor_person_invites
  set status = 'revoked'
  where id = p_invite_id and advisor_user_id = v_advisor and status = 'sent';

  return found;
end;
$$;

revoke all on function public.revoke_advisor_person_invite(uuid) from public, anon;
grant execute on function public.revoke_advisor_person_invite(uuid) to authenticated;

commit;
