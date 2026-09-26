begin;

-- ---------------------------------------------------------------------------
-- Eine gemeinsame Auswertung - und wer ihr zustimmt
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 26.09.2026: "Der Accelerator soll [...] dann ggf. auch die
-- Team-Auswertung bekommen." Und: "Einmal, dass der Accelerator oder dann die
-- Advisor unter dem Accelerator oder auch ohne Accelerator auch mit
-- Einzelpersonen arbeiten koennen. Und eben aber auch mit Teams, also beides
-- muss moeglich sein."
--
-- ---------------------------------------------------------------------------
-- WARUM DAS NICHT EINFACH EIN WEITERER UMFANG IST
-- ---------------------------------------------------------------------------
--
-- Bisher hat immer EINE Person ueber IHRE EIGENEN Daten entschieden. Eine
-- gemeinsame Auswertung ist etwas anderes: Sie ist eine Aussage ueber das
-- Verhaeltnis ZWISCHEN Menschen, und sie entsteht erst dadurch, dass mehrere
-- Daten zusammenkommen. Wem gehoert diese Aussage? Allen Beteiligten.
--
-- Ein Umfang "Vergleich mit anderen" in der Liste waere eine Blankozustimmung
-- fuer Vergleiche mit Menschen, die man noch gar nicht kennt. Deshalb ein
-- eigener Vorgang: Wer verglichen werden soll, wird gefragt - jede und jeder
-- einzeln, und die Auswertung entsteht erst, wenn alle zugestimmt haben.
--
-- Das vorhandene Beziehungsmodell loest es genauso (`founder_a_approved` UND
-- `founder_b_approved`). Dies hier ist dieselbe Regel fuer eine Gruppe, die
-- noch kein Team ist.
--
-- ---------------------------------------------------------------------------
-- DREI DINGE, DIE DARAUS FOLGEN
-- ---------------------------------------------------------------------------
--
-- WER GEFRAGT WIRD, ERFAEHRT MIT WEM. Man kann einem Vergleich nicht
-- zustimmen, ohne zu wissen, mit wem verglichen wird. Die Anfrage nennt
-- deshalb die anderen Beteiligten - und das heisst: Schon das FRAGEN gibt der
-- Gruppe preis, wer sonst dabei ist. Die Oberflaeche sagt das dem Fragenden,
-- bevor er fragt.
--
-- NUR UNTER MENSCHEN, DIE MAN SCHON BEGLEITET. Angefragt werden koennen nur
-- Personen, die diesem Halter bereits einzeln `base` freigegeben haben. Sonst
-- waere eine "Anfrage" ein Weg, Fremden mitzuteilen, wen man sonst noch
-- begleitet. Und fachlich ist es ohnehin die Voraussetzung: Vergleichen kann
-- man nur, wen man sehen darf.
--
-- EINE ZURUECKGENOMMENE ZUSTIMMUNG BEENDET DAS GANZE. Nicht nur den eigenen
-- Anteil: Die Auswertung IST die Zusammenstellung: Ohne eine Seite gibt es
-- sie nicht mehr. Wer aussteigt, nimmt sie mit.
-- ---------------------------------------------------------------------------

create table public.advisor_team_reviews (
  id uuid primary key default gen_random_uuid(),

  -- ENTWEDER ODER, NIE BEIDES - wie bei den Einzelzugaengen. Ein Vorgang hat
  -- genau einen Halter, sonst waere beim Widerruf nicht klar, wem er entzogen
  -- wird. Beide Faelle sind ausdruecklich vorgesehen: ein Advisor ohne
  -- Organisation, und eine Organisation mit Advisors darunter.
  advisor_user_id uuid references auth.users (id) on delete cascade,
  org_id uuid references public.advisor_orgs (id) on delete cascade,

  requested_by_user_id uuid not null references auth.users (id) on delete cascade,
  request_note text,

  status text not null default 'requested',
  activated_at timestamptz,
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint advisor_team_reviews_one_holder
    check (num_nonnulls(advisor_user_id, org_id) = 1),
  constraint advisor_team_reviews_status_check
    check (status in ('requested', 'active', 'declined', 'revoked')),
  -- KEINE AEQUIVALENZ. `activated_at` haelt fest, DASS die Auswertung einmal
  -- zustande gekommen ist - das ist Geschichte und kein Zustand. Eine
  -- Gleichsetzung mit `status = 'active'` liess sich nicht widerrufen: Beim
  -- Aussteigen einer Person waere der Zeitpunkt zu loeschen gewesen, und
  -- damit die Tatsache, dass es die Auswertung gab.
  constraint advisor_team_reviews_activated
    check (status <> 'active' or activated_at is not null),
  constraint advisor_team_reviews_closed
    check ((status in ('declined', 'revoked')) = (closed_at is not null)),
  constraint advisor_team_reviews_note_len
    check (request_note is null or char_length(request_note) <= 400)
);

create index advisor_team_reviews_holder_idx
  on public.advisor_team_reviews (advisor_user_id, org_id, status);

create table public.advisor_team_review_members (
  review_id uuid not null references public.advisor_team_reviews (id) on delete cascade,
  subject_user_id uuid not null references auth.users (id) on delete cascade,

  /**
   * `pending` heisst: noch nicht gefragt worden im Sinne von noch nicht
   * beantwortet. `revoked` ist nicht dasselbe wie `declined` - das eine ist
   * ein Nein von Anfang an, das andere ein zurueckgenommenes Ja, und der
   * Unterschied gehoert in den Verlauf.
   */
  decision text not null default 'pending',
  decided_at timestamptz,

  primary key (review_id, subject_user_id),
  constraint advisor_team_review_members_decision_check
    check (decision in ('pending', 'approved', 'declined', 'revoked')),
  constraint advisor_team_review_members_decided
    check ((decision = 'pending') = (decided_at is null))
);

create index advisor_team_review_members_subject_idx
  on public.advisor_team_review_members (subject_user_id);

comment on table public.advisor_team_reviews is
  'Eine gemeinsame Auswertung mehrerer Menschen fuer einen Advisor oder eine '
  'Organisation. Sie entsteht erst, wenn alle Beteiligten zugestimmt haben - '
  'eine Aussage ueber das Verhaeltnis zwischen Menschen gehoert ihnen allen.';

-- ---------------------------------------------------------------------------
-- Die Tabellen bleiben zu
-- ---------------------------------------------------------------------------
-- Gelesen wird ausschliesslich ueber die Funktionen weiter unten. Eine Policy
-- muesste hier ueber zwei Tabellen hinweg pruefen, wer beteiligt ist - und
-- genau daraus entsteht die Rekursion, die anderswo schon `security definer`-
-- Helfer noetig gemacht hat.
alter table public.advisor_team_reviews enable row level security;
alter table public.advisor_team_review_members enable row level security;
revoke all on public.advisor_team_reviews from public, anon, authenticated;
revoke all on public.advisor_team_review_members from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Darf dieser Halter diese Auswertung sehen?
-- ---------------------------------------------------------------------------
create or replace function public.has_advisor_team_review_access(
  p_review_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_team_reviews review
    left join public.advisor_org_members member
      on member.org_id = review.org_id
     and member.user_id = p_user_id
     and member.status = 'active'
    left join public.advisor_orgs org on org.id = review.org_id
    where review.id = p_review_id
      and review.status = 'active'
      and (
        review.advisor_user_id = p_user_id
        or (member.user_id is not null and org.status = 'active')
      )
  );
$$;

revoke all on function public.has_advisor_team_review_access(uuid, uuid) from public, anon;
grant execute on function public.has_advisor_team_review_access(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Anfragen
-- ---------------------------------------------------------------------------
create or replace function public.request_advisor_team_review(
  p_subject_user_ids uuid[],
  p_org_id uuid default null,
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
  v_subject uuid;
  v_subjects uuid[];
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  -- Doppelte raus, und sich selbst kann niemand mitvergleichen.
  select array_agg(distinct s) into v_subjects
  from unnest(coalesce(p_subject_user_ids, '{}'::uuid[])) as s
  where s <> v_advisor;

  if v_subjects is null or array_length(v_subjects, 1) < 2 then
    raise exception 'team_review_needs_two' using errcode = '22023';
  end if;
  -- Acht ist keine technische Grenze, sondern eine fachliche: Was darueber
  -- hinausgeht, ist keine Aufstellung mehr, sondern eine Kohorte.
  if array_length(v_subjects, 1) > 8 then
    raise exception 'team_review_too_many' using errcode = '22023';
  end if;

  if p_org_id is not null then
    if not exists (
      select 1 from public.advisor_org_members member
      where member.org_id = p_org_id
        and member.user_id = v_advisor
        and member.status = 'active'
    ) then
      raise exception 'advisor_org_membership_required' using errcode = '42501';
    end if;
  end if;

  -- NUR UNTER MENSCHEN, DIE MAN SCHON BEGLEITET. Ohne diese Pruefung waere
  -- eine Anfrage ein Weg, Fremden mitzuteilen, wen man sonst noch begleitet -
  -- denn die Anfrage nennt allen Beteiligten die anderen Namen.
  foreach v_subject in array v_subjects loop
    if not exists (
      select 1 from public.advisor_person_grants grant_row
      where grant_row.subject_user_id = v_subject
        and grant_row.scope = 'base'
        and grant_row.status = 'active'
        and grant_row.revoked_at is null
        and (
          case when p_org_id is null
               then grant_row.advisor_user_id = v_advisor
               else grant_row.org_id = p_org_id
          end
        )
    ) then
      raise exception 'team_review_subject_not_accompanied' using errcode = '42501';
    end if;
  end loop;

  insert into public.advisor_team_reviews (
    advisor_user_id, org_id, requested_by_user_id, request_note
  )
  values (
    case when p_org_id is null then v_advisor end,
    p_org_id,
    v_advisor,
    left(nullif(btrim(coalesce(p_note, '')), ''), 400)
  )
  returning id into v_id;

  insert into public.advisor_team_review_members (review_id, subject_user_id)
  select v_id, s from unnest(v_subjects) as s;

  return v_id;
end;
$$;

revoke all on function public.request_advisor_team_review(uuid[], uuid, text) from public, anon;
grant execute on function public.request_advisor_team_review(uuid[], uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Entscheiden
-- ---------------------------------------------------------------------------
create or replace function public.decide_advisor_team_review(
  p_review_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_open integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.advisor_team_review_members
  set decision = case when p_approve then 'approved' else 'declined' end,
      decided_at = pg_catalog.now()
  where review_id = p_review_id
    and subject_user_id = v_user
    and decision = 'pending';

  if not found then
    raise exception 'team_review_not_open_for_you' using errcode = '42501';
  end if;

  if not p_approve then
    -- EIN NEIN BEENDET DAS GANZE. Die Auswertung ist die Zusammenstellung;
    -- ohne eine Seite gibt es sie nicht.
    update public.advisor_team_reviews
    set status = 'declined', closed_at = pg_catalog.now(), updated_at = pg_catalog.now()
    where id = p_review_id and status = 'requested';
    return;
  end if;

  select count(*) into v_open
  from public.advisor_team_review_members
  where review_id = p_review_id and decision = 'pending';

  if v_open = 0 then
    update public.advisor_team_reviews
    set status = 'active', activated_at = pg_catalog.now(), updated_at = pg_catalog.now()
    where id = p_review_id and status = 'requested';
  end if;
end;
$$;

revoke all on function public.decide_advisor_team_review(uuid, boolean) from public, anon;
grant execute on function public.decide_advisor_team_review(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Zurueckziehen
-- ---------------------------------------------------------------------------
--
-- Jede und jeder Beteiligte kann jederzeit aussteigen, auch nach der
-- Zustimmung - und nimmt die Auswertung damit mit. Der Halter kann sie
-- ebenfalls beenden; das ist kein Widerruf, sondern Aufraeumen.
create or replace function public.revoke_advisor_team_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_is_member boolean;
  v_is_holder boolean;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.advisor_team_review_members
    where review_id = p_review_id and subject_user_id = v_user
  ) into v_is_member;

  select exists (
    select 1
    from public.advisor_team_reviews review
    left join public.advisor_org_members member
      on member.org_id = review.org_id
     and member.user_id = v_user
     and member.status = 'active'
    where review.id = p_review_id
      and (review.advisor_user_id = v_user or member.user_id is not null)
  ) into v_is_holder;

  if not (v_is_member or v_is_holder) then
    raise exception 'team_review_not_yours' using errcode = '42501';
  end if;

  if v_is_member then
    update public.advisor_team_review_members
    set decision = 'revoked', decided_at = pg_catalog.now()
    where review_id = p_review_id and subject_user_id = v_user;
  end if;

  update public.advisor_team_reviews
  set status = 'revoked', closed_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where id = p_review_id and status in ('requested', 'active');
end;
$$;

revoke all on function public.revoke_advisor_team_review(uuid) from public, anon;
grant execute on function public.revoke_advisor_team_review(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Was die gefragte Person sieht
-- ---------------------------------------------------------------------------
--
-- MIT DEN NAMEN DER ANDEREN. Man kann einem Vergleich nicht zustimmen, ohne
-- zu wissen, mit wem. Dass die Anfrage damit die Gruppe preisgibt, ist der
-- Preis der Einwilligung - und der Grund, warum nur angefragt werden kann,
-- wer diesen Halter ohnehin schon einzeln begleiten laesst.

create or replace function public.get_my_team_review_requests()
returns table (
  review_id uuid,
  status text,
  my_decision text,
  holder text,
  org_id uuid,
  org_name text,
  asked_by_name text,
  request_note text,
  other_names text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select review.id,
         review.status,
         mine.decision,
         case when review.org_id is not null then 'org' else 'person' end,
         review.org_id,
         org.name,
         asker.display_name,
         review.request_note,
         coalesce(
           (select array_agg(coalesce(other_core.display_name, '?') order by other_core.display_name)
            from public.advisor_team_review_members other
            left join public.person_core other_core on other_core.user_id = other.subject_user_id
            where other.review_id = review.id
              and other.subject_user_id <> auth.uid()),
           '{}'::text[]
         ),
         review.created_at
  from public.advisor_team_review_members mine
  join public.advisor_team_reviews review on review.id = mine.review_id
  left join public.advisor_orgs org on org.id = review.org_id
  left join public.person_core asker on asker.user_id = review.requested_by_user_id
  where mine.subject_user_id = auth.uid()
    and review.status in ('requested', 'active')
  order by review.created_at;
$$;

revoke all on function public.get_my_team_review_requests() from public, anon;
grant execute on function public.get_my_team_review_requests() to authenticated;

-- ---------------------------------------------------------------------------
-- Was der Halter sieht
-- ---------------------------------------------------------------------------
create or replace function public.get_advisor_team_reviews()
returns table (
  review_id uuid,
  status text,
  org_id uuid,
  request_note text,
  created_at timestamptz,
  subject_user_ids uuid[],
  pending_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select review.id,
         review.status,
         review.org_id,
         review.request_note,
         review.created_at,
         (select array_agg(m.subject_user_id order by m.subject_user_id)
          from public.advisor_team_review_members m where m.review_id = review.id),
         (select count(*)::int
          from public.advisor_team_review_members m
          where m.review_id = review.id and m.decision = 'pending')
  from public.advisor_team_reviews review
  left join public.advisor_org_members member
    on member.org_id = review.org_id
   and member.user_id = auth.uid()
   and member.status = 'active'
  where review.status in ('requested', 'active')
    and (review.advisor_user_id = auth.uid() or member.user_id is not null)
  order by review.created_at desc;
$$;

revoke all on function public.get_advisor_team_reviews() from public, anon;
grant execute on function public.get_advisor_team_reviews() to authenticated;

commit;
