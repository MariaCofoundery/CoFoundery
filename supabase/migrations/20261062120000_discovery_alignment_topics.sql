begin;

-- ---------------------------------------------------------------------------
-- Discovery ohne Gesamtzahl: Themen statt Passungswert
-- ---------------------------------------------------------------------------
--
-- Bisher sortierte Discovery nach einem Gesamtwert. Der faellt weg (Maria,
-- 27.09.2026), und Teil F5 verbietet ihn ausdruecklich: "Keinen
-- Gesamt-Alignment- oder Kompatibilitaetsscore einfuehren."
--
-- AN SEINE STELLE TRITT KEINE ANDERE ZAHL. Man koennte Wichtigkeiten je
-- Dimension vergeben und gewichtet verrechnen - das waere derselbe Wert mit
-- Zwischenschritten, und die Gewichte liessen ihn sogar persoenlicher
-- aussehen, als er ist.
--
-- Stattdessen: Du nennst bis zu drei Themen, bei denen dir Aehnlichkeit
-- wichtig ist. Discovery sagt dir je Thema, ob es passt. Es gibt keine vierte
-- Angabe, die die drei zusammenfasst.
--
-- ---------------------------------------------------------------------------
-- WARUM DER VERGLEICH IN DER DATENBANK STATTFINDET
-- ---------------------------------------------------------------------------
--
-- Niemand darf die Antworten Fremder lesen - das ist der ganze Sinn der
-- Freigabe aus Schritt 6a. Ein Vergleich in der Anwendung muesste beide
-- Seiten laden und wuerde genau das aufweichen.
--
-- Diese Funktion sieht beide Seiten und gibt NUR "passt / passt nicht / nicht
-- beurteilbar" heraus, dazu die Basis. Keine Antwort, kein Wert, kein Text
-- verlaesst sie.
-- ---------------------------------------------------------------------------

-- Welche Bloecke zu welchem Thema gehoeren. Als Tabelle, damit die Funktion
-- sie lesen kann - die Reihenfolge und die Zusammensetzung stehen im Code
-- (`discoveryTopics.ts`), ein Test haelt beide Seiten zusammen.
create table public.discovery_alignment_topic_blocks (
  topic_key text not null,
  block_id text not null,
  primary key (topic_key, block_id),
  constraint discovery_topic_block_shape check (block_id ~ '^[A-Z][0-9]{2}$')
);

insert into public.discovery_alignment_topic_blocks (topic_key, block_id) values
  ('P_A','A01'),('P_A','A02'),
  ('P_I','I01'),('P_I','I03'),
  ('P_E','E01'),('P_E','E03'),
  ('P_U','U01'),('P_U','U04'),
  ('P_K','K01'),('P_K','K02'),
  ('P_T','T03'),('P_T','T06'),
  ('P_D','D01'),('P_D','D04'),
  ('P_X','X01'),('P_X','X06'),
  ('C_goals','S01'),('C_goals','S02'),('C_goals','S03'),
  ('C_commitment','R01'),('C_commitment','R03'),('C_commitment','R04'),
  ('C_risk','B01'),('C_risk','B05'),
  ('C_rules','G01'),('C_rules','G02');

alter table public.discovery_alignment_topic_blocks enable row level security;
revoke all on public.discovery_alignment_topic_blocks from public, anon, authenticated;
grant select on public.discovery_alignment_topic_blocks to authenticated;
create policy discovery_topic_blocks_readable on public.discovery_alignment_topic_blocks
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Was mir wichtig ist
-- ---------------------------------------------------------------------------

create table public.discovery_alignment_topics (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_key)
);

comment on table public.discovery_alignment_topics is
  'Bis zu drei Themen, bei denen dieser Person Aehnlichkeit wichtig ist. '
  'Kein Gewicht und keine Rangfolge - eine Liste, keine Verteilung.';

-- HOECHSTENS DREI. Wer alles wichtig findet, hat nichts ausgewaehlt - und eine
-- lange Liste waere wieder eine Verrechnung, nur mit Handarbeit.
create function public.enforce_discovery_topic_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.discovery_alignment_topics
      where user_id = new.user_id) >= 3 then
    raise exception 'discovery_topic_limit' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger discovery_alignment_topics_limit
  before insert on public.discovery_alignment_topics
  for each row execute function public.enforce_discovery_topic_limit();

alter table public.discovery_alignment_topics enable row level security;
revoke all on public.discovery_alignment_topics from public, anon, authenticated;
grant select, insert, delete on public.discovery_alignment_topics to authenticated;

create policy discovery_topics_own on public.discovery_alignment_topics
  for select to authenticated using (user_id = auth.uid());
create policy discovery_topics_insert on public.discovery_alignment_topics
  for insert to authenticated with check (user_id = auth.uid());
create policy discovery_topics_delete on public.discovery_alignment_topics
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Das Urteil je Thema
-- ---------------------------------------------------------------------------

create function public.discovery_topic_verdicts(p_candidate_user_id uuid)
returns table (
  topic_key text,
  state text,
  basis_comparable integer,
  basis_total integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_candidate_user_id = auth.uid() then
    raise exception 'discovery_self_match' using errcode = '22023';
  end if;

  return query
  with chosen as (
    select topic.topic_key, block.block_id
    from public.discovery_alignment_topics topic
    join public.discovery_alignment_topic_blocks block using (topic_key)
    where topic.user_id = auth.uid()
  ),
  /* Nur ABGEGEBENE Fragebogen derselben Fassung - Teil F2: gleiche Version,
     gleiche Skala. Entwuerfe aendern sich noch. */
  answers as (
    select assessment.user_id, answer.block_id, answer.answer_format, answer.value
    from public.alignment_answers answer
    join public.assessments assessment on assessment.id = answer.assessment_id
    where assessment.instrument_id = 'founder-alignment-v2'
      and assessment.submitted_at is not null
      and assessment.user_id in (auth.uid(), p_candidate_user_id)
      and answer.missing_code is null
  ),
  pairs as (
    select
      chosen.topic_key,
      chosen.block_id,
      mine.value as mine,
      theirs.value as theirs,
      mine.answer_format as format
    from chosen
    left join answers mine
      on mine.block_id = chosen.block_id and mine.user_id = auth.uid()
    left join answers theirs
      on theirs.block_id = chosen.block_id and theirs.user_id = p_candidate_user_id
  ),
  judged as (
    select
      pairs.topic_key,
      pairs.block_id,
      case
        when pairs.mine is null or pairs.theirs is null then null
        /* Fuenferskala: gleich oder eine Stufe daneben. Eine Verabredung,
           keine Erkenntnis - sie steht so auch in der Oberflaeche. */
        when pairs.format in ('F','C','importance_rating')
          then abs((pairs.mine ->> 'scale')::numeric - (pairs.theirs ->> 'scale')::numeric) <= 1
        when pairs.format = 'single_choice'
          then (pairs.mine ->> 'optionId') = (pairs.theirs ->> 'optionId')
        when pairs.format = 'multi_choice'
          then (pairs.mine -> 'optionIds') = (pairs.theirs -> 'optionIds')
        /* Bereiche ueber die UEBERLAPPUNG, nie ueber die Mittelpunkte -
           Teil F3 verbietet den Mittelpunktvergleich ausdruecklich. */
        when pairs.format in ('number_range','money_range')
          then (pairs.mine ->> 'unit') is not distinct from (pairs.theirs ->> 'unit')
           and (pairs.mine ->> 'currency') is not distinct from (pairs.theirs ->> 'currency')
           and (pairs.mine ->> 'min')::numeric
                 <= coalesce((pairs.theirs ->> 'max')::numeric, (pairs.theirs ->> 'min')::numeric)
           and (pairs.theirs ->> 'min')::numeric
                 <= coalesce((pairs.mine ->> 'max')::numeric, (pairs.mine ->> 'min')::numeric)
        when pairs.format = 'date'
          then (pairs.mine ->> 'date') = (pairs.theirs ->> 'date')
        when pairs.format = 'value_case'
          then (pairs.mine ->> 'path') = (pairs.theirs ->> 'path')
        /* Freitext, Zeitfenster und gerichtete Erwartungen lassen sich nicht
           maschinell auf Aehnlichkeit pruefen. NULL heisst "zaehlt nicht mit" -
           false waere die Behauptung, sie seien unterschiedlich, und wuerde
           jemanden aussortieren, ueber den nichts bekannt ist. */
        else null
      end as similar
    from pairs
  )
  select
    judged.topic_key,
    case
      when count(judged.similar) = 0 then 'not_assessable'
      when bool_and(judged.similar) then 'similar'
      else 'different'
    end as state,
    count(judged.similar)::integer as basis_comparable,
    count(*)::integer as basis_total
  from judged
  group by judged.topic_key;
end;
$$;

comment on function public.discovery_topic_verdicts(uuid) is
  'Je gewaehltem Thema: passt / passt nicht / nicht beurteilbar, dazu die '
  'Basis. Es verlaesst keine einzige Antwort diese Funktion, und es entsteht '
  'keine Zahl ueber die Themen hinweg.';

revoke all on function public.discovery_topic_verdicts(uuid) from public, anon;
grant execute on function public.discovery_topic_verdicts(uuid) to authenticated;

commit;
