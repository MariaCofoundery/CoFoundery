begin;

-- ---------------------------------------------------------------------------
-- Zwei Schritte am Problembrett: bestaetigen und einen Ansatz schreiben
-- ---------------------------------------------------------------------------
--
-- Bisher gab es ein einziges Signal: "ich wuerde daran arbeiten". Das ist ein
-- grosser Schritt - man meldet sich damit als moeglicher Mitgruender. Davor
-- und danach fehlte etwas.
--
-- DAVOR: "Kenne ich auch."
--   Ein Problem, das vierzehn Menschen wiedererkennen, ist etwas anderes als
--   der Aerger einer Person. Das ist das billigste starke Signal dafuer, ob
--   ein Problem echt ist - und es muss billig bleiben, sonst kommt es nie
--   zustande.
--
--   Aber ein Klick ohne Inhalt waere ein Like, und Likes sind hier
--   ausdruecklich nicht vorgesehen. Deshalb sagt eine Bestaetigung, WOHER man
--   das Problem kennt: selbst betroffen, beruflich damit zu tun, im Umfeld
--   beobachtet. Ein Klick und eine Auswahl - billig genug, dass es passiert,
--   und aussagekraeftig genug, dass es etwas bedeutet. "Drei Menschen, die
--   beruflich damit zu tun haben" ist eine andere Aussage als "dreissig
--   Menschen, die es mal gehoert haben".
--
--   Die Namen sieht NIEMAND - auch die einstellende Person nicht. Das
--   unterscheidet die Bestaetigung vom Interesse: Wer sich als Mitgruender
--   meldet, gibt sich zu erkennen. Wer nur bestaetigt, dass es das Problem
--   gibt, soll das ohne sozialen Einsatz tun koennen. Oeffentlich sind allein
--   die Zahlen je Perspektive.
--
-- DANACH: Der Ansatz.
--   Ein Problem blieb bisher ein Problem. Der Schritt zur Idee passierte
--   unsichtbar in einem Gespraech - und damit auch der Moment, in dem zwei
--   Menschen merken, dass sie Verschiedenes bauen wuerden. Besser, das steht
--   vorher da: mehrere Ansaetze nebeneinander, sichtbar fuer alle.
--
--   Drei Felder, mehr nicht: was man bauen wuerde, fuer wen, was man dafuer
--   braeuchte. Kein Geschaeftsplan - die Frage, ob jemand dafuer zahlt,
--   beantwortet dieses Brett weiterhin nicht.
--
-- WAS BEIDES NICHT AENDERT:
--   Die Sortierung. Das Brett sortiert nach Aktualitaet, nicht nach Zuspruch.
--   Eine Zahl anzuzeigen ist etwas anderes, als nach ihr zu sortieren - das
--   Zweite waere die Rangliste, die dieses Produkt nicht haben will.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Kenne ich auch
-- ---------------------------------------------------------------------------
create table public.network_problem_confirmations (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.network_problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Woher man das Problem kennt. Eine geschlossene Auswahl statt Freitext:
  -- Es soll ein Klick bleiben, und es soll vergleichbar sein.
  perspective text not null,

  created_at timestamptz not null default now(),

  constraint network_problem_confirmations_unique unique (problem_id, user_id),
  constraint network_problem_confirmations_perspective_check
    check (perspective in ('affected', 'professional', 'observed'))
);

comment on table public.network_problem_confirmations is
  'Kenne ich auch. Ein Klick plus Perspektive, hoechstens einer je Person und Problem. Die Namen sieht niemand - oeffentlich sind nur die Zahlen je Perspektive.';

create index network_problem_confirmations_problem
  on public.network_problem_confirmations (problem_id);

alter table public.network_problems
  add column confirmation_count integer not null default 0;

comment on column public.network_problems.confirmation_count is
  'Wie viele das Problem wiedererkennen. Wird angezeigt, aber nicht sortiert.';

-- Gezaehlt, nicht hochgezaehlt - aus demselben Grund wie beim Interesse: Ein
-- Delta-Trigger laeuft bei jedem verpassten Ereignis aus dem Tritt.
create or replace function public.refresh_network_problem_confirmation_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.problem_id, old.problem_id);
begin
  update public.network_problems
  set confirmation_count = (
    select count(*) from public.network_problem_confirmations where problem_id = target
  )
  where id = target;
  return null;
end;
$$;

comment on function public.refresh_network_problem_confirmation_count() is
  'Haelt network_problems.confirmation_count aktuell. security definer, weil der Zaehler auch dann stimmen muss, wenn die bestaetigende Person das Problem selbst nicht aendern darf.';

revoke all on function public.refresh_network_problem_confirmation_count() from public;
revoke all on function public.refresh_network_problem_confirmation_count() from anon;
revoke all on function public.refresh_network_problem_confirmation_count() from authenticated;

create trigger network_problem_confirmation_count
  after insert or delete on public.network_problem_confirmations
  for each row execute function public.refresh_network_problem_confirmation_count();

alter table public.network_problem_confirmations enable row level security;

-- Jede Person sieht ausschliesslich die eigene Bestaetigung - genug, um zu
-- wissen, dass man schon bestaetigt hat, und um es zurueckzunehmen. Die
-- Aufteilung nach Perspektive kommt aus der Funktion weiter unten.
create policy network_problem_confirmations_select
on public.network_problem_confirmations
for select to authenticated
using (user_id = auth.uid());

create policy network_problem_confirmations_insert
on public.network_problem_confirmations
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_network_member(auth.uid())
  -- Nur bei veroeffentlichten Problemen, und nicht beim eigenen: Das eigene
  -- Problem zu bestaetigen waere eine Zahl, die nichts bedeutet.
  and exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_confirmations.problem_id
      and problem.status = 'active'
      and problem.author_user_id <> auth.uid()
  )
);

create policy network_problem_confirmations_delete
on public.network_problem_confirmations
for delete to authenticated
using (user_id = auth.uid());

-- Die oeffentliche Seite der Bestaetigungen: Zahlen je Perspektive, nie Namen.
create or replace function public.get_network_problem_confirmations(p_problem_id uuid)
returns table (perspective text, confirmations bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_network_member(auth.uid()) then
    raise exception 'network_access_denied' using errcode = '42501';
  end if;

  -- Nur zu Problemen, die man ohnehin sehen darf. Sonst waere die Funktion
  -- ein Weg, die Sichtbarkeitsregel der Tabelle zu umgehen.
  if not exists (
    select 1 from public.network_problems problem
    where problem.id = p_problem_id
      and (problem.author_user_id = auth.uid() or problem.status = 'active')
  ) then
    raise exception 'network_problem_not_found' using errcode = 'P0002';
  end if;

  return query
    select confirmation.perspective, count(*)::bigint
    from public.network_problem_confirmations confirmation
    where confirmation.problem_id = p_problem_id
    group by confirmation.perspective;
end;
$$;

comment on function public.get_network_problem_confirmations(uuid) is
  'Bestaetigungen je Perspektive. Gibt Zahlen zurueck, nie Namen - auch nicht an die einstellende Person.';

revoke all on function public.get_network_problem_confirmations(uuid) from public;
revoke all on function public.get_network_problem_confirmations(uuid) from anon;
grant execute on function public.get_network_problem_confirmations(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Der Ansatz
-- ---------------------------------------------------------------------------
create table public.network_problem_approaches (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.network_problems(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,

  -- Was man bauen wuerde.
  summary text not null,
  -- Fuer wen. Die Frage, an der die meisten Ansaetze auseinandergehen.
  audience text not null,
  -- Was man dafuer braeuchte. Steht hier, weil daraus die Mitgruendersuche
  -- entsteht - und weil "ich braeuchte jemanden, der X kann" ehrlicher ist
  -- als eine Rollenbezeichnung.
  needs text not null,

  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ein Ansatz je Person und Problem. Wer seine Meinung aendert, aendert den
  -- Ansatz - statt einen zweiten daneben zu stellen.
  constraint network_problem_approaches_unique unique (problem_id, author_user_id),
  constraint network_problem_approaches_summary_check
    check (char_length(btrim(summary)) between 50 and 1000),
  constraint network_problem_approaches_audience_check
    check (char_length(btrim(audience)) between 10 and 300),
  constraint network_problem_approaches_needs_check
    check (char_length(btrim(needs)) between 10 and 500),
  constraint network_problem_approaches_status_check
    check (status in ('active', 'withdrawn'))
);

comment on table public.network_problem_approaches is
  'So wuerde ich es angehen. Mehrere Ansaetze je Problem, nebeneinander sichtbar - damit zwei Menschen VOR dem gemeinsamen Gruenden merken, ob sie dasselbe bauen wuerden.';

create index network_problem_approaches_problem
  on public.network_problem_approaches (problem_id, created_at desc);
create index network_problem_approaches_author
  on public.network_problem_approaches (author_user_id);

create trigger network_problem_approaches_updated_at
  before update on public.network_problem_approaches
  for each row execute function public.set_network_updated_at();

alter table public.network_problem_approaches enable row level security;

-- Ein Ansatz ist oeffentlich gemeint - das ist sein Zweck. Sichtbar ist er
-- fuer Mitglieder, solange er nicht zurueckgezogen wurde und das Problem
-- selbst sichtbar ist.
create policy network_problem_approaches_select
on public.network_problem_approaches
for select to authenticated
using (
  author_user_id = auth.uid()
  or (
    status = 'active'
    and public.is_network_member(auth.uid())
    and exists (
      select 1 from public.network_problems problem
      where problem.id = network_problem_approaches.problem_id
        and problem.status = 'active'
    )
  )
);

create policy network_problem_approaches_insert
on public.network_problem_approaches
for insert to authenticated
with check (
  author_user_id = auth.uid()
  and public.is_network_member(auth.uid())
  -- Auch am eigenen Problem: Wer schildert, wie er es angehen wuerde, sagt
  -- damit etwas, das andere einordnen koennen.
  and exists (
    select 1 from public.network_problems problem
    where problem.id = network_problem_approaches.problem_id
      and problem.status = 'active'
  )
);

create policy network_problem_approaches_update
on public.network_problem_approaches
for update to authenticated
using (author_user_id = auth.uid())
with check (author_user_id = auth.uid());

create policy network_problem_approaches_delete
on public.network_problem_approaches
for delete to authenticated
using (author_user_id = auth.uid());

commit;
