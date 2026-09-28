begin;

-- ---------------------------------------------------------------------------
-- Discovery fuer v2.1
-- ---------------------------------------------------------------------------
--
-- Die Themenwahl und die Urteilsfunktion gab es seit dem 28.09. - beide fest
-- auf `founder-alignment-v2` verdrahtet. Fuer v2.1 waeren sie stillschweigend
-- nutzlos geworden: Die Funktion haette keine Antworten gefunden und fuer
-- jedes Thema "unbekannt" geliefert. Kein Fehler, keine Meldung, nur ein
-- Discovery, das nichts mehr weiss.
--
-- Deshalb tragen Themenwahl und Themenbloecke jetzt ihre Fassung. Zwei
-- Fassungen nebeneinander heisst auch hier: Wer beide ausgefuellt hat, hat je
-- eine Themenwahl, und es wird nie gemischt.
--
-- ---------------------------------------------------------------------------
-- WARUM DER VERGLEICH IN DER DATENBANK STATTFINDET
-- ---------------------------------------------------------------------------
--
-- Niemand darf die Antworten Fremder lesen - das ist der Sinn der Freigabe.
-- Ein Vergleich in der Anwendung muesste beide Seiten laden und wuerde genau
-- das aufweichen. Diese Funktion sieht beide Seiten und gibt NUR
-- "passt / passt nicht / unbekannt" heraus, dazu die Basis. Keine Antwort,
-- kein Wert, kein Text verlaesst sie.

-- ---------------------------------------------------------------------------
-- Die Fassung gehoert an die Themen
-- ---------------------------------------------------------------------------

alter table public.discovery_alignment_topic_blocks
  add column instrument_id text not null default 'founder-alignment-v2'
    references public.instruments (id);

alter table public.discovery_alignment_topic_blocks
  drop constraint discovery_topic_block_shape;

-- G02a und G02b sind aus einer Frage entstanden, die zwei Dinge auf einmal
-- gefragt hat. Ohne den Buchstaben passten sie nicht hinein.
alter table public.discovery_alignment_topic_blocks
  add constraint discovery_topic_block_shape
    check (block_id ~ '^[A-Z][0-9]{2}[a-z]?$');

alter table public.discovery_alignment_topic_blocks
  drop constraint discovery_alignment_topic_blocks_pkey;
alter table public.discovery_alignment_topic_blocks
  add primary key (instrument_id, topic_key, block_id);

alter table public.discovery_alignment_topics
  add column instrument_id text not null default 'founder-alignment-v2'
    references public.instruments (id);

alter table public.discovery_alignment_topics
  drop constraint discovery_alignment_topics_pkey;
alter table public.discovery_alignment_topics
  add primary key (user_id, instrument_id, topic_key);

comment on column public.discovery_alignment_topics.instrument_id is
  'Zu welcher Fassung diese Themenwahl gehoert. Wer beide ausgefuellt hat, hat '
  'je eine - gemischt wird nie.';

-- ---------------------------------------------------------------------------
-- Die Urteilsfunktion fuer v2.1
-- ---------------------------------------------------------------------------
--
-- WIE "EINE STUFE DANEBEN" HIER FUNKTIONIERT. Die Stufe steckt in der
-- Kennung: A01_o3 ist die dritte Option von A01. Das ist keine Spielerei mit
-- Zeichenketten, sondern die Vergabekonvention des Generators - und seit dem
-- Schluesselbund (docs/founder-alignment-option-ids-v2-1.json) ist sie
-- festgehalten: Kennungen duerfen nicht umsortiert werden, ein Test faengt es
-- ab. Ohne diese Zusicherung waere die Rechnung hier falsch.
--
-- UND NUR BEI GEORDNETEN STUFEN. Bei einer Handlungswahl gibt es kein
-- "daneben" - dort zaehlt nur dieselbe Antwort. Die Unterscheidung ist genau
-- die, die die fachliche Durchsicht verlangt.

create function public.discovery_topic_verdicts_v21(p_candidate_user_id uuid)
returns table (
  topic_key text,
  rank integer,
  wish text,
  -- `met` | `unmet` | `unknown`
  --
  -- UNBEKANNT IST KEIN FEHLTREFFER. Wer eine Frage ausgelassen oder nicht
  -- geteilt hat, hat den Wunsch nicht verfehlt - es ist nur nichts darueber
  -- bekannt. In der Sortierung steht `unknown` deshalb zwischen den beiden.
  fulfilment text,
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
    select topic.topic_key, topic.rank, topic.wish, block.block_id
    from public.discovery_alignment_topics topic
    join public.discovery_alignment_topic_blocks block
      on block.topic_key = topic.topic_key
     and block.instrument_id = topic.instrument_id
    where topic.user_id = auth.uid()
      and topic.instrument_id = 'founder-alignment-v2-1'
  ),
  answers as (
    select answer.block_id, answer.answer_format, answer.value, assessment.user_id
    from public.alignment_answers answer
    join public.assessments assessment on assessment.id = answer.assessment_id
    where assessment.instrument_id = 'founder-alignment-v2-1'
      and assessment.submitted_at is not null
      and assessment.user_id in (auth.uid(), p_candidate_user_id)
      -- Ein Auslassungsgrund ist eine Auskunft, aber keine Antwort, die sich
      -- mit einer anderen vergleichen laesst.
      and answer.missing_code is null
  ),
  pairs as (
    select
      chosen.topic_key, chosen.rank, chosen.wish, chosen.block_id,
      mine.answer_format as format,
      mine.value as mine,
      theirs.value as theirs
    from chosen
    left join answers mine
      on mine.block_id = chosen.block_id and mine.user_id = auth.uid()
    left join answers theirs
      on theirs.block_id = chosen.block_id and theirs.user_id = p_candidate_user_id
  ),
  judged as (
    select
      pairs.topic_key, pairs.rank, pairs.wish,
      case
        when pairs.mine is null or pairs.theirs is null then null

        -- Geordnete Stufen: gleich oder eine daneben.
        when pairs.format = 'ordinal_choice'
          then abs(
                 substring(pairs.mine ->> 'optionId' from '_o([0-9]+)$')::int
                 - substring(pairs.theirs ->> 'optionId' from '_o([0-9]+)$')::int
               ) <= 1

        -- Handlungswahl: nur dieselbe. Kein "daneben".
        when pairs.format = 'single_choice'
          then (pairs.mine ->> 'optionId') = (pairs.theirs ->> 'optionId')

        -- Mehrfachwahl: mindestens eine gemeinsame. Identitaet zu verlangen
        -- hiesse, dass zwei Menschen mit vier von fuenf gemeinsamen
        -- Absicherungen als unaehnlich gelten.
        when pairs.format in ('multi_choice', 'multi_choice_priority')
          then exists (
            select 1
            from jsonb_array_elements_text(pairs.mine -> 'optionIds') as m
            join jsonb_array_elements_text(pairs.theirs -> 'optionIds') as t on m = t
          )

        when pairs.format = 'value_case'
          then (pairs.mine ->> 'path') = (pairs.theirs ->> 'path')

        when pairs.format = 'date'
          then (pairs.mine ->> 'date') = (pairs.theirs ->> 'date')

        -- Zahlen: gleiche Einheit bzw. Waehrung, und hoechstens das Doppelte
        -- voneinander entfernt. Die Schwelle ist gesetzt und nicht gemessen -
        -- deshalb steht sie in der Oberflaeche woertlich dabei, damit niemand
        -- sie fuer ein Ergebnis haelt.
        when pairs.format = 'number_range'
          then (pairs.mine ->> 'unit') is not distinct from (pairs.theirs ->> 'unit')
           and public.within_factor_two(
                 (pairs.mine ->> 'number')::numeric, (pairs.theirs ->> 'number')::numeric)

        when pairs.format = 'money_range'
          then (pairs.mine ->> 'currency') is not distinct from (pairs.theirs ->> 'currency')
           and public.within_factor_two(
                 (pairs.mine ->> 'amount')::numeric, (pairs.theirs ->> 'amount')::numeric)

        else null
      end as similar
    from pairs
  )
  select
    judged.topic_key,
    max(judged.rank)::integer,
    max(judged.wish),
    case
      when count(judged.similar) = 0 then 'unknown'
      -- Der Wunsch entscheidet, was ein Treffer ist. Wer Unterschiede sucht,
      -- bekommt bei lauter Uebereinstimmung ein `unmet` - und das ist richtig.
      when max(judged.wish) = 'similar'
        then case when bool_and(judged.similar) then 'met' else 'unmet' end
      else case when bool_or(not judged.similar) then 'met' else 'unmet' end
    end::text,
    count(judged.similar)::integer,
    count(*)::integer
  from judged
  group by judged.topic_key
  order by max(judged.rank), judged.topic_key;
end;
$$;

-- Die Schwelle als eigene Funktion, damit sie an einer Stelle steht und nicht
-- zweimal im selben CASE.
create function public.within_factor_two(a numeric, b numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Zwei Nullen sind gleich; eine Null neben einer Zahl ist es nicht.
  select case
    when a = 0 and b = 0 then true
    when a = 0 or b = 0 then false
    else greatest(abs(a), abs(b)) <= 2 * least(abs(a), abs(b))
  end;
$$;

comment on function public.within_factor_two(numeric, numeric) is
  'Hoechstens das Doppelte voneinander entfernt. Eine gesetzte Schwelle, keine '
  'gemessene - sie steht deshalb in der Oberflaeche woertlich dabei.';

revoke all on function public.discovery_topic_verdicts_v21(uuid) from public, anon;
grant execute on function public.discovery_topic_verdicts_v21(uuid) to authenticated;

commit;
