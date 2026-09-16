begin;

-- ---------------------------------------------------------------------------
-- Sich bei einem Ansatz melden
-- ---------------------------------------------------------------------------
--
-- Mit 20260918120000 kann jemand beschreiben, wie er ein Problem angehen
-- wuerde. Was fehlte: ein Weg, diese Person zu erreichen. Man las einen
-- ueberzeugenden Ansatz und stand vor einem Namen.
--
-- DER WEG, DEN ICH NICHT GEGANGEN BIN:
--   Ein dritter Gespraechsursprung neben Anfrage und Interesse. Das haette
--   sechs Stellen beruehrt - die Ursprungsbedingung, den Gespraechsvertrag,
--   den Nachrichtenvertrag, die Zugriffsregel, die Liste und eine neue
--   Annahmefunktion.
--
-- DER WEG HIER:
--   Das Interesse bekommt einen optionalen Bezug auf einen Ansatz. Damit
--   bleibt alles, was ein Gespraech ausmacht, unveraendert: Der Ursprung
--   heisst weiterhin problem_interest_id, der Nachrichtenvertrag und die
--   Zugriffsregel pruefen weiterhin nur, DASS ein Interesse dahintersteht.
--
--   Was sich aendert, ist allein die Frage, WEN es erreicht: ohne Bezug die
--   einstellende Person, mit Bezug die Person, die den Ansatz geschrieben
--   hat. Das ist eine Ableitung an zwei Stellen, keine zweite Mechanik.
--
--   Und es macht den wichtigsten Fall moeglich, der vorher verboten war: Die
--   einstellende Person darf sich bei einem Ansatz auf ihrem EIGENEN Problem
--   melden. Genau das will sie ja - jemand hat aufgeschrieben, wie er ihr
--   Problem loesen wuerde.
-- ---------------------------------------------------------------------------

alter table public.network_problem_interests
  add column approach_id uuid
    references public.network_problem_approaches(id) on delete cascade;

comment on column public.network_problem_interests.approach_id is
  'Leer: die Meldung gilt dem Problem und erreicht die einstellende Person. Gesetzt: sie gilt diesem Ansatz und erreicht die Person, die ihn geschrieben hat.';

-- Ein Bezug muss zum selben Problem gehoeren. Sonst haenge ein Interesse an
-- Problem A und zeige auf einen Ansatz zu Problem B - und die Ableitung der
-- Beteiligten haette zwei verschiedene Wahrheiten.
create or replace function public.enforce_network_problem_interest_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.approach_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.network_problem_approaches approach
    where approach.id = new.approach_id
      and approach.problem_id = new.problem_id
  ) then
    raise exception 'network_problem_interest_target_invalid' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_network_problem_interest_target() from public, anon, authenticated;

create trigger network_problem_interest_target
  before insert or update of problem_id, approach_id
  on public.network_problem_interests
  for each row execute function public.enforce_network_problem_interest_target();

-- ---------------------------------------------------------------------------
-- Einmal je Gegenstand, nicht einmal je Problem
-- ---------------------------------------------------------------------------
-- Wer sich beim Problem gemeldet hat, darf sich trotzdem bei einem Ansatz
-- melden - das sind zwei verschiedene Menschen am anderen Ende.
alter table public.network_problem_interests
  drop constraint network_problem_interests_unique;

create unique index network_problem_interests_one_per_problem
  on public.network_problem_interests (problem_id, user_id)
  where approach_id is null;

create unique index network_problem_interests_one_per_approach
  on public.network_problem_interests (approach_id, user_id)
  where approach_id is not null;

-- ---------------------------------------------------------------------------
-- Die Zahl am Problem bleibt die Zahl am Problem
-- ---------------------------------------------------------------------------
-- Ohne diese Aenderung zaehlte jede Rueckmeldung zu einem Ansatz als
-- Interesse am Problem. Die Zahl waere still falsch geworden - und still
-- falsche Zahlen sind schlimmer als fehlende.
create or replace function public.refresh_network_problem_interest_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.problem_id, old.problem_id);
begin
  update public.network_problems
  set interest_count = (
    select count(*) from public.network_problem_interests
    where problem_id = target and approach_id is null
  )
  where id = target;
  return null;
end;
$$;

comment on column public.network_problems.interest_count is
  'Wie viele "ich wuerde daran arbeiten" es zum PROBLEM gibt. Rueckmeldungen zu einzelnen Ansaetzen zaehlen hier nicht mit.';

-- Bestandsdaten gibt es noch keine mit Bezug, aber die Zahl einmal neu zu
-- rechnen kostet nichts und macht die Migration wiederholbar richtig.
update public.network_problems problem
set interest_count = (
  select count(*) from public.network_problem_interests interest
  where interest.problem_id = problem.id and interest.approach_id is null
);

-- ---------------------------------------------------------------------------
-- Wer die Meldung sieht
-- ---------------------------------------------------------------------------
drop policy network_problem_interests_select on public.network_problem_interests;

create policy network_problem_interests_select
on public.network_problem_interests
for select to authenticated
using (
  user_id = auth.uid()
  or (
    approach_id is null
    and exists (
      select 1 from public.network_problems problem
      where problem.id = network_problem_interests.problem_id
        and problem.author_user_id = auth.uid()
    )
  )
  or (
    approach_id is not null
    and exists (
      select 1 from public.network_problem_approaches approach
      where approach.id = network_problem_interests.approach_id
        and approach.author_user_id = auth.uid()
    )
  )
);

drop policy network_problem_interests_insert on public.network_problem_interests;

create policy network_problem_interests_insert
on public.network_problem_interests
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_network_member(auth.uid())
  and exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_interests.problem_id
      and problem.status = 'active'
      -- Beim Problem selbst gilt weiter: nicht beim eigenen.
      and (approach_id is not null or problem.author_user_id <> auth.uid())
  )
  and (
    approach_id is null
    or exists (
      select 1 from public.network_problem_approaches approach
      where approach.id = network_problem_interests.approach_id
        and approach.status = 'active'
        -- Beim Ansatz gilt dasselbe, nur bezogen auf den Ansatz: sich beim
        -- eigenen zu melden ergibt nichts. Beim Ansatz auf dem eigenen
        -- Problem sehr wohl.
        and approach.author_user_id <> auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------------
-- Wen das Gespraech verbindet
-- ---------------------------------------------------------------------------
-- Die einzige echte Aenderung an der Gespraechsmechanik: b ist nicht mehr
-- zwingend die einstellende Person.
create or replace function public.enforce_network_conversation_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
  v_interest public.network_problem_interests%rowtype;
  v_problem public.network_problems%rowtype;
  v_recipient uuid;
begin
  if new.contact_request_id is not null then
    select * into v_request
    from public.network_contact_requests request
    where request.id = new.contact_request_id;

    if not found or v_request.status <> 'accepted' then
      raise exception 'network_conversation_requires_accepted_request' using errcode = '23514';
    end if;
    if new.participant_a_user_id <> v_request.sender_user_id
      or new.participant_b_user_id <> v_request.recipient_user_id then
      raise exception 'network_conversation_participants_invalid' using errcode = '23514';
    end if;
    return new;
  end if;

  select * into v_interest
  from public.network_problem_interests interest
  where interest.id = new.problem_interest_id;
  if not found then
    raise exception 'network_conversation_requires_interest' using errcode = '23514';
  end if;

  select * into v_problem
  from public.network_problems problem
  where problem.id = v_interest.problem_id;
  if not found then
    raise exception 'network_conversation_requires_interest' using errcode = '23514';
  end if;

  if v_interest.approach_id is null then
    v_recipient := v_problem.author_user_id;
  else
    select approach.author_user_id into v_recipient
    from public.network_problem_approaches approach
    where approach.id = v_interest.approach_id;
    if v_recipient is null then
      raise exception 'network_conversation_requires_interest' using errcode = '23514';
    end if;
  end if;

  -- Die Teilnehmenden ergeben sich aus dem Gegenstand, nicht aus der Eingabe:
  -- a ist die meldende Person, b die, der die Meldung gilt.
  if new.participant_a_user_id <> v_interest.user_id
    or new.participant_b_user_id <> v_recipient then
    raise exception 'network_conversation_participants_invalid' using errcode = '23514';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wer annehmen darf
-- ---------------------------------------------------------------------------
create or replace function public.accept_network_problem_interest(p_interest_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_interest public.network_problem_interests%rowtype;
  v_problem public.network_problems%rowtype;
  v_recipient uuid;
  v_conversation_id uuid;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  select * into v_interest
  from public.network_problem_interests interest
  where interest.id = p_interest_id;
  if not found then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  select * into v_problem
  from public.network_problems problem
  where problem.id = v_interest.problem_id;
  if not found then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  -- Wem die Meldung gilt, der entscheidet ueber das Gespraech - und niemand
  -- sonst. Bei einem Ansatz ist das nicht die einstellende Person.
  if v_interest.approach_id is null then
    v_recipient := v_problem.author_user_id;
  else
    select approach.author_user_id into v_recipient
    from public.network_problem_approaches approach
    where approach.id = v_interest.approach_id
      and approach.status = 'active';
    if v_recipient is null then
      raise exception 'network_problem_interest_unavailable' using errcode = '42501';
    end if;
  end if;

  if v_recipient <> v_user_id then
    raise exception 'network_problem_interest_unavailable' using errcode = '42501';
  end if;

  if v_problem.status <> 'active' then
    raise exception 'network_problem_unavailable' using errcode = '42501';
  end if;

  if public.is_network_interaction_blocked(v_user_id, v_interest.user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.network_profiles profile
    where profile.user_id = v_interest.user_id and profile.status = 'active'
  ) or not exists (
    select 1 from public.network_profiles profile
    where profile.user_id = v_user_id and profile.status = 'active'
  ) then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;

  select conversation.id into v_conversation_id
  from public.network_conversations conversation
  where conversation.problem_interest_id = p_interest_id;
  if found then
    return v_conversation_id;
  end if;

  insert into public.network_conversations (
    problem_interest_id, participant_a_user_id, participant_b_user_id
  )
  values (p_interest_id, v_interest.user_id, v_recipient)
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

commit;

begin;

-- ---------------------------------------------------------------------------
-- Eine vierte Art von Meldung
-- ---------------------------------------------------------------------------
-- "wuerde an deinem Problem arbeiten" waere falsch bei jemandem, der nicht das
-- Problem geschildert, sondern einen Ansatz geschrieben hat. Die Mail heisst
-- deshalb anders - und die Anspruchsvergabe muss die neue Art kennen, sonst
-- faellt jede solche Mail still weg.
alter table public.network_notification_claims
  drop constraint network_notification_claims_kind_check;

alter table public.network_notification_claims
  add constraint network_notification_claims_kind_check
    check (kind in ('contact_request', 'problem_interest', 'approach_interest', 'message'));

commit;
