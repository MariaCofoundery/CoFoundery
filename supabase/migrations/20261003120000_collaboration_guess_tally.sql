begin;

-- ---------------------------------------------------------------------------
-- Die Trefferbilanz
-- ---------------------------------------------------------------------------
--
-- Beide Labs lassen raten, wie der andere antwortet, und beide vergleichen das
-- pro Situation. Was fehlte, war die Summe: "Ihr habt euch bei 3 von 5 richtig
-- eingeschaetzt" - und das, was sich ueber mehrere Runden aufbaut.
--
-- WARUM ALS FUNKTION UND NICHT IN DER SEITE:
--   Die Antworten der anderen Person sind absichtlich nicht frei lesbar. Sie
--   kommen einzeln ueber den Reveal heraus, und erst nachdem beide fertig sind
--   und die Karte geoeffnet wurde. Eine Bilanz in der Seite zu rechnen haette
--   bedeutet, alle Antworten des anderen dorthin zu holen.
--
--   Diese Funktion gibt deshalb NUR ZAHLEN zurueck. Keine Schluessel, keine
--   Texte, nichts, woraus sich eine einzelne Antwort ableiten liesse - ausser
--   im trivialen Fall einer Runde mit einer einzigen Situation, und die gibt
--   es nicht.
--
-- WAS EIN TREFFER IST:
--   Mein Tipp ist genau die Antwort, die der andere gegeben hat. Verglichen
--   werden die Schluesselmengen; sie liegen sortiert vor (lock_* legt sie mit
--   array_agg(... order by key) ab), ein Gleichheitsvergleich reicht also auch
--   bei Mehrfachauswahl.
--
-- WELCHE ANTWORT DER TIPP MEINT:
--   Read My Mind raet auf 'self', Founder in the Wild auf 'move'. Das steht
--   hier einmal und nicht in zwei Seiten.
-- ---------------------------------------------------------------------------

create or replace function public.get_collaboration_guess_tally(p_founder_team_id uuid)
returns table (
  round_id uuid,
  experience_key text,
  pack_key text,
  completed_at timestamptz,
  prompt_count integer,
  own_hits integer,
  partner_hits integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (select auth.uid() as user_id),
  -- Nur Runden dieses Teams, in denen die aufrufende Person mitspielt und in
  -- denen beide fertig sind. Vorher gibt es nichts zu bilanzieren, und ein
  -- Zwischenstand waere ein Blick in die Antworten des anderen.
  rounds as (
    select round_row.id, round_row.experience_key, round_row.pack_key, round_row.completed_at,
           partner.founder_user_id as partner_user_id
    from public.collaboration_experience_rounds round_row
    join public.collaboration_experience_round_participants own
      on own.round_id = round_row.id and own.founder_user_id = (select user_id from viewer) and own.state = 'joined'
    join public.collaboration_experience_round_participants partner
      on partner.round_id = round_row.id and partner.founder_user_id <> (select user_id from viewer) and partner.state = 'joined'
    where round_row.founder_team_id = p_founder_team_id
      and (select user_id from viewer) is not null
      and round_row.status in ('active', 'completed')
      and public.is_current_user_collaboration_round_participant(round_row.id, true)
      and not exists (
        select 1
        from public.collaboration_experience_prompt_assignments assignment
        join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id
        join public.collaboration_experience_prompt_response_contracts contract
          on contract.experience_key = prompt.experience_key and contract.pack_key = prompt.pack_key
         and contract.pack_version = prompt.pack_version and contract.prompt_key = prompt.prompt_key
         and contract.prompt_version = prompt.prompt_version
        where assignment.round_id = round_row.id
          and not exists (
            select 1 from public.collaboration_experience_responses response
            where response.prompt_assignment_id = assignment.id
              and response.respondent_user_id = assignment.target_user_id
              and response.response_type = contract.response_type
              and response.locked_at is not null
          )
      )
  ),
  -- Zwei Angaben je Erlebnis, und die zweite ist die, an der man sich
  -- verrechnet:
  --
  --   response_type   Worauf geraten wird - 'self' bei Read My Mind,
  --                   'move' bei Founder in the Wild.
  --
  --   guess_on_target WO der Tipp liegt. Read My Mind legt ihn auf die
  --                   Zuordnung der GERATENEN Person (dort raet B ueber A,
  --                   und A hat auf derselben Zuordnung geantwortet).
  --                   Founder in the Wild legt ihn auf die EIGENE Zuordnung -
  --                   dort beantwortet jeder alle vier Felder selbst.
  --
  --                   Ohne diese Unterscheidung stuenden ueberall null
  --                   Treffer, ohne dass irgendetwas fehlschlaegt.
  answer_type as (
    select 'read_my_mind'::text as experience_key, 'self'::text as response_type, true as guess_on_target
    union all
    select 'founder_in_the_wild', 'move', false
  ),
  paired as (
    select round_info.id as round_id,
      round_info.experience_key,
      prompt.id as round_prompt_id,
      own_guess.choice_keys as own_guess,
      partner_answer.choice_keys as partner_answer,
      partner_guess.choice_keys as partner_guess,
      own_answer.choice_keys as own_answer
    from rounds round_info
    join answer_type on answer_type.experience_key = round_info.experience_key
    join public.collaboration_experience_round_prompts prompt on prompt.round_id = round_info.id
    join public.collaboration_experience_prompt_assignments own_assignment
      on own_assignment.round_prompt_id = prompt.id and own_assignment.target_user_id = (select user_id from viewer)
    join public.collaboration_experience_prompt_assignments partner_assignment
      on partner_assignment.round_prompt_id = prompt.id and partner_assignment.target_user_id = round_info.partner_user_id
    -- Die eigene Antwort und die des anderen liegen immer auf der jeweils
    -- eigenen Zuordnung.
    left join public.collaboration_experience_responses own_answer
      on own_answer.prompt_assignment_id = own_assignment.id
     and own_answer.respondent_user_id = (select user_id from viewer)
     and own_answer.response_type = answer_type.response_type
    left join public.collaboration_experience_responses partner_answer
      on partner_answer.prompt_assignment_id = partner_assignment.id
     and partner_answer.respondent_user_id = round_info.partner_user_id
     and partner_answer.response_type = answer_type.response_type
    -- Die Tipps je nach Erlebnis auf der einen oder der anderen Zuordnung.
    left join public.collaboration_experience_responses own_guess
      on own_guess.respondent_user_id = (select user_id from viewer)
     and own_guess.response_type = 'guess'
     and own_guess.prompt_assignment_id =
         case when answer_type.guess_on_target then partner_assignment.id else own_assignment.id end
    left join public.collaboration_experience_responses partner_guess
      on partner_guess.respondent_user_id = round_info.partner_user_id
     and partner_guess.response_type = 'guess'
     and partner_guess.prompt_assignment_id =
         case when answer_type.guess_on_target then own_assignment.id else partner_assignment.id end
  )
  select paired.round_id,
    paired.experience_key,
    max(rounds.pack_key) as pack_key,
    max(rounds.completed_at) as completed_at,
    count(*)::integer as prompt_count,
    count(*) filter (where paired.own_guess is not null and paired.own_guess = paired.partner_answer)::integer as own_hits,
    count(*) filter (where paired.partner_guess is not null and paired.partner_guess = paired.own_answer)::integer as partner_hits
  from paired
  join rounds on rounds.id = paired.round_id
  group by paired.round_id, paired.experience_key
  -- Packs ohne Raten liefern ueberall null und damit null Treffer. Sie zaehlen
  -- nicht mit: Eine Bilanz "0 von 5" waere dort eine Aussage, die niemand
  -- gemacht hat.
  having count(*) filter (where paired.own_guess is not null) > 0;
$$;

comment on function public.get_collaboration_guess_tally(uuid) is
  'Wie oft sich zwei Founder in den Lab-Runden dieses Teams richtig eingeschaetzt haben. Gibt ausschliesslich Zahlen zurueck - keine Antworten, keine Schluessel. Nur Runden, in denen beide fertig sind, und nur Packs, in denen ueberhaupt geraten wird.';

revoke all on function public.get_collaboration_guess_tally(uuid) from public, anon;
grant execute on function public.get_collaboration_guess_tally(uuid) to authenticated;

commit;
