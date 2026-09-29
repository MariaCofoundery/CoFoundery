begin;

-- ---------------------------------------------------------------------------
-- Discovery auf Basis des Arbeitsprofils
-- ---------------------------------------------------------------------------
--
-- Discovery zeigt Menschen, die man noch nicht kennt. Mit ihnen gibt es kein
-- gemeinsames Vorhaben - also auch keine gemeinsamen Zusagen, keine
-- Teamregeln und keine Risikogrenzen fuer etwas, das es nicht gibt.
--
-- Was portabel ist, ist das Arbeitsprofil: wie jemand entscheidet,
-- Unterschiede anspricht und mit offenen Fragen umgeht. Das gilt unabhaengig
-- davon, mit wem.
--
-- Die Themen sind erzeugt aus discoveryTopics.ts. Ein Test haelt beide Seiten
-- zusammen - die Urteilsfunktion laeuft in der Datenbank und kann den Code
-- nicht lesen.

insert into public.discovery_alignment_topic_blocks (instrument_id, topic_key, block_id) values
  ('founder-profile-v1', 'P01', 'A01'),
  ('founder-profile-v1', 'P01', 'A02'),
  ('founder-profile-v1', 'P02', 'I01'),
  ('founder-profile-v1', 'P02', 'I02'),
  ('founder-profile-v1', 'P02', 'I03'),
  ('founder-profile-v1', 'P03', 'E01'),
  ('founder-profile-v1', 'P03', 'E02'),
  ('founder-profile-v1', 'P03', 'E03'),
  ('founder-profile-v1', 'P04', 'T01'),
  ('founder-profile-v1', 'P04', 'T02'),
  ('founder-profile-v1', 'P04', 'D01'),
  ('founder-profile-v1', 'P04', 'D02'),
  ('founder-profile-v1', 'P05', 'X01'),
  ('founder-profile-v1', 'P05', 'X02'),
  ('founder-profile-v1', 'P05', 'X03'),
  ('founder-profile-v1', 'P05', 'X04')
;

-- ---------------------------------------------------------------------------
-- Die Urteilsfunktion
-- ---------------------------------------------------------------------------
--
-- Sie sieht beide Seiten und gibt NUR "passt / passt nicht / unbekannt"
-- heraus, dazu die Basis. Keine Antwort verlaesst sie. Ohne das muesste die
-- Seite fremde Antworten laden - und genau das soll die Freigabe verhindern.
--
-- Kein Vorhaben, keine venture_id: Das Arbeitsprofil gehoert zur Person.

create function public.discovery_topic_verdicts_profile(p_candidate_user_id uuid)
returns table (
  topic_key text,
  rank integer,
  wish text,
  -- `met` | `unmet` | `unknown`
  --
  -- UNBEKANNT IST KEIN FEHLTREFFER. Wer eine Frage ausgelassen hat, hat den
  -- Wunsch nicht verfehlt - es ist nur nichts darueber bekannt.
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
      and topic.instrument_id = 'founder-profile-v1'
  ),
  answers as (
    select answer.block_id, answer.answer_format, answer.value, assessment.user_id
    from public.alignment_answers answer
    join public.assessments assessment on assessment.id = answer.assessment_id
    where assessment.instrument_id = 'founder-profile-v1'
      and assessment.submitted_at is not null
      and assessment.user_id in (auth.uid(), p_candidate_user_id)
      -- Ein Auslassungsgrund ist eine Auskunft, aber keine Antwort, die sich
      -- mit einer anderen vergleichen laesst.
      and answer.missing_code is null
  ),
  pairs as (
    select
      chosen.topic_key, chosen.rank, chosen.wish, chosen.block_id,
      mine.answer_format as format, mine.value as mine, theirs.value as theirs
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

        -- Geordnete Stufen: gleich oder eine daneben. Die Stufe steckt in der
        -- Kennung (A01_o3 ist die dritte Option) - das ist die
        -- Vergabekonvention des Generators, nicht eine Spielerei mit
        -- Zeichenketten.
        when pairs.format = 'ordinal_choice'
          then abs(
                 substring(pairs.mine ->> 'optionId' from '_o([0-9]+)$')::int
                 - substring(pairs.theirs ->> 'optionId' from '_o([0-9]+)$')::int
               ) <= 1

        -- Handlungswahl: nur dieselbe. Kein "daneben" - eine nominale
        -- Kategorie hat keinen Abstand.
        when pairs.format = 'single_choice'
          then (pairs.mine ->> 'optionId') = (pairs.theirs ->> 'optionId')

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

revoke all on function public.discovery_topic_verdicts_profile(uuid) from public, anon;
grant execute on function public.discovery_topic_verdicts_profile(uuid) to authenticated;

commit;
