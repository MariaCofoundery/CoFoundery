begin;

-- ---------------------------------------------------------------------------
-- Alle Themen regelbar - und ein Wunsch je Thema
-- ---------------------------------------------------------------------------
--
-- Maria am 28.09.2026: "Ich faende das gut, wenn man das zu allen Themen
-- regeln kann. Also nicht nur drei Themen auswaehlen, wo mir die Aehnlichkeit
-- oder Unterschiede wichtig sind, sondern bei allen."
--
-- Zwei Aenderungen: Die Obergrenze von drei faellt, und je Thema kann man sich
-- Aehnlichkeit ODER Unterschied wuenschen.
--
-- ---------------------------------------------------------------------------
-- DAS PROBLEM, DAS DAMIT ENTSTEHT - UND WIE ES GELOEST WIRD
-- ---------------------------------------------------------------------------
--
-- Bei drei Themen kann man die Ergebnisse nebeneinanderstellen. Bei zwoelf
-- braucht die Liste eine Reihenfolge, und die naheliegende waere: "wie viele
-- deiner Wuensche treffen zu". Das ist eine Zahl ueber alle Themen - also
-- genau der Passungswert, den Teil F5 verbietet, nur mit selbst gesetzten
-- Gewichten.
--
-- Und es ist nicht bloss ein formaler Verstoss. Der Grund steht im Gutachten:
-- Ein globaler Wert "koennte eine ausdrueckliche Haftungsgrenze durch mehrere
-- harmlose Gemeinsamkeiten verdecken". Genau das passiert, wenn 8 von 12
-- besser aussieht als 7 von 12 - obwohl der eine Fehltreffer der ist, der
-- zaehlt.
--
-- STATTDESSEN ORDNET DIE PERSON IHRE THEMEN SELBST, und sortiert wird der
-- Reihe nach: erst nach Thema 1, bei Gleichstand nach Thema 2, dann nach
-- Thema 3. Wer bei Thema 1 danebenliegt, wird durch neun Treffer weiter unten
-- NICHT nach oben gehoben. Nichts wird addiert, nichts verrechnet, und ein
-- Fehltreffer bei etwas Wichtigem laesst sich nicht kompensieren.
-- ---------------------------------------------------------------------------

-- Die Obergrenze faellt.
drop trigger discovery_alignment_topics_limit on public.discovery_alignment_topics;
drop function public.enforce_discovery_topic_limit();

alter table public.discovery_alignment_topics
  /**
   * `similar`   - mir ist wichtig, dass wir uns hier aehneln
   * `different` - mir ist wichtig, dass wir uns hier unterscheiden
   *
   * WICHTIG: "different" ist ein WUNSCH, keine These. Dass Unterschiede in
   * einem Bereich guenstig waeren, ist durch nichts belegt - das Gutachten
   * warnt sogar ausdruecklich vor der Annahme "kleinere Differenz = besser"
   * und ihrer Umkehrung. Das Produkt darf das nie als Erkenntnis darstellen,
   * sondern nur als das, was es ist: die Suchvorgabe dieser Person.
   */
  add column wish text not null default 'similar',

  /**
   * Die eigene Reihenfolge. 1 ist das wichtigste Thema.
   *
   * SIE IST KEIN GEWICHT. Aus Rang 1 und Rang 2 entsteht keine Rechnung -
   * sie bestimmen nur, welches Thema zuerst betrachtet wird.
   */
  add column rank integer not null default 1;

alter table public.discovery_alignment_topics
  add constraint discovery_topics_wish_check check (wish in ('similar', 'different')),
  add constraint discovery_topics_rank_check check (rank between 1 and 99);

comment on column public.discovery_alignment_topics.wish is
  'similar oder different - die Suchvorgabe dieser Person, keine Aussage '
  'darueber, was guenstiger waere.';

comment on column public.discovery_alignment_topics.rank is
  'Die eigene Reihenfolge, kein Gewicht. Sortiert wird lexikografisch: erst '
  'nach Rang 1, bei Gleichstand nach Rang 2 - nichts wird addiert.';

-- ---------------------------------------------------------------------------
-- Das Urteil nennt jetzt auch den Wunsch
-- ---------------------------------------------------------------------------

drop function public.discovery_topic_verdicts(uuid);

create function public.discovery_topic_verdicts(p_candidate_user_id uuid)
returns table (
  topic_key text,
  rank integer,
  wish text,
  state text,
  /**
   * `met` | `unmet` | `unknown`
   *
   * UNBEKANNT IST KEIN FEHLTREFFER. Wer eine Frage ausgelassen oder nicht
   * geteilt hat, hat den Wunsch nicht verfehlt - es ist nur nichts darueber
   * bekannt. In der Sortierung steht `unknown` deshalb zwischen den beiden
   * und nicht unten.
   */
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
    join public.discovery_alignment_topic_blocks block using (topic_key)
    where topic.user_id = auth.uid()
  ),
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
      chosen.topic_key, chosen.rank, chosen.wish, chosen.block_id,
      mine.value as mine, theirs.value as theirs, mine.answer_format as format
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
        when pairs.format in ('F','C','importance_rating')
          then abs((pairs.mine ->> 'scale')::numeric - (pairs.theirs ->> 'scale')::numeric) <= 1
        when pairs.format = 'single_choice'
          then (pairs.mine ->> 'optionId') = (pairs.theirs ->> 'optionId')
        when pairs.format = 'multi_choice'
          then (pairs.mine -> 'optionIds') = (pairs.theirs -> 'optionIds')
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
        else null
      end as similar
    from pairs
  ),
  summed as (
    select
      judged.topic_key, judged.rank, judged.wish,
      case
        when count(judged.similar) = 0 then 'not_assessable'
        when bool_and(judged.similar) then 'similar'
        else 'different'
      end as state,
      count(judged.similar)::integer as basis_comparable,
      count(*)::integer as basis_total
    from judged
    group by judged.topic_key, judged.rank, judged.wish
  )
  select
    summed.topic_key, summed.rank, summed.wish, summed.state,
    case
      when summed.state = 'not_assessable' then 'unknown'
      when summed.state = summed.wish then 'met'
      else 'unmet'
    end as fulfilment,
    summed.basis_comparable, summed.basis_total
  from summed
  order by summed.rank, summed.topic_key;
end;
$$;

comment on function public.discovery_topic_verdicts(uuid) is
  'Je Thema: Wunsch, Urteil, Erfuellung und Basis - in der Reihenfolge, die '
  'die Person selbst gesetzt hat. Es entsteht keine Zahl ueber die Themen '
  'hinweg, und es verlaesst keine Antwort diese Funktion.';

revoke all on function public.discovery_topic_verdicts(uuid) from public, anon;
grant execute on function public.discovery_topic_verdicts(uuid) to authenticated;

grant update on public.discovery_alignment_topics to authenticated;
create policy discovery_topics_update on public.discovery_alignment_topics
  for update to authenticated using (user_id = auth.uid());

commit;
