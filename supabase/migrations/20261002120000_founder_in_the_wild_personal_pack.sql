begin;

-- ---------------------------------------------------------------------------
-- Ein zweites Pack fuer Founder in the Wild - und das Raten
-- ---------------------------------------------------------------------------
--
-- Founder in the Wild hatte ein Pack mit fuenf Szenen. Einmal gespielt, gab es
-- keinen Grund wiederzukommen.
--
-- "Wenn es persoenlich wird" nimmt die Faelle, in denen nicht das Geschaeft
-- auf dem Spiel steht, sondern die beiden: ungleicher Einsatz, ein Angebot von
-- aussen, ein Anteil der sich falsch anfuehlt, eine Entscheidung ohne den
-- anderen, ein Tiefpunkt.
--
-- DAS RATEN.
--   Read My Mind hat es von Anfang an: Man antwortet fuer sich und raet dann,
--   wie der andere antwortet. Das ist der Moment, in dem etwas passiert.
--   Dieses Pack bekommt es als vierten Antworttyp ('guess'), auf denselben
--   Zuegen wie 'move' - sonst liessen sich Tipp und Antwort nicht vergleichen.
--
--   WARUM NICHT AUCH IN 'under_pressure_v1':
--     Die Vollstaendigkeit einer Runde ergibt sich aus den Antwortvertraegen
--     des Packs (is_founder_in_the_wild_round_answer_complete joint darauf).
--     Ein vierter Vertrag im bestehenden Pack haette JEDE laufende und jede
--     bereits abgeschlossene Runde schlagartig unvollstaendig gemacht - die
--     Menschen haetten eine fertige Runde wieder offen vorgefunden.
--
--     Das alte Pack bleibt deshalb unveraendert. Wer das Raten will, spielt
--     das neue.
-- ---------------------------------------------------------------------------

insert into public.collaboration_experience_pack_versions
  (experience_key, pack_key, pack_version, prompt_count)
values ('founder_in_the_wild', 'when_it_gets_personal_v1', 1, 5);

insert into public.collaboration_experience_prompt_versions
  (experience_key, pack_key, pack_version, prompt_key, prompt_version, position, need_mode)
values
  ('founder_in_the_wild','when_it_gets_personal_v1',1,'uneven_effort',1,0,'required'),
  ('founder_in_the_wild','when_it_gets_personal_v1',1,'outside_offer',1,1,'required'),
  ('founder_in_the_wild','when_it_gets_personal_v1',1,'equity_feels_wrong',1,2,'required'),
  ('founder_in_the_wild','when_it_gets_personal_v1',1,'decided_without_me',1,3,'required'),
  ('founder_in_the_wild','when_it_gets_personal_v1',1,'the_low_point',1,4,'required');

with contracts(prompt_key, move_keys, matters_keys, need_keys) as (
  values
    ('uneven_effort',
      array['name_it_directly','wait_and_see','rebalance_tasks','ask_whats_going_on'],
      array['fairness','not_hurting','clarity','sustainability','understanding_first'],
      array['say_it_early','hear_it_without_defense','propose_a_fix','admit_limits','check_in_regularly']),
    ('outside_offer',
      array['ask_what_appeals','make_the_case','clarify_timeline','give_space'],
      array['honesty_about_doubt','planning_security','his_freedom','shared_future','no_pressure'],
      array['tell_me_honestly','decide_in_time','not_decide_alone','respect_my_planning','stay_open']),
    ('equity_feels_wrong',
      array['reopen_the_split','stand_by_agreement','separate_now_from_then','bring_in_third_party'],
      array['keeping_agreements','current_fairness','not_losing_trust','saying_it_out_loud','clear_rules'],
      array['raise_it_not_swallow','listen_without_deal','stay_factual','accept_a_no','write_it_down']),
    ('decided_without_me',
      array['say_it_now','fix_outward_first','ask_why_alone','define_boundaries'],
      array['being_included','speed_matters_too','outward_unity','trust','clear_mandate'],
      array['ask_me_first','admit_the_miss','not_make_it_big','agree_on_rules','trust_my_judgement']),
    ('the_low_point',
      array['take_it_seriously','steady_the_ship','get_concrete','name_my_own_doubt'],
      array['honesty_in_crisis','not_giving_up','feeling_carried','realistic_view','decide_together'],
      array['say_it_out_loud','not_be_alone','hold_the_line','plan_a_next_step','give_it_time'])
)
insert into public.collaboration_experience_prompt_response_contracts (
  experience_key, pack_key, pack_version, prompt_key, prompt_version,
  response_type, response_format, allowed_choice_keys, min_selections, max_selections
)
select 'founder_in_the_wild', 'when_it_gets_personal_v1', 1, contract.prompt_key, 1,
       slot.response_type,
       case when slot.response_type = 'matters' then 'multi_choice' else 'single_choice' end,
       case slot.response_type
         -- 'guess' laeuft bewusst auf denselben Zuegen wie 'move'.
         when 'move' then contract.move_keys
         when 'guess' then contract.move_keys
         when 'matters' then contract.matters_keys
         else contract.need_keys
       end,
       1,
       case when slot.response_type = 'matters' then 2 else 1 end
from contracts contract
cross join (values ('move'::text), ('guess'::text), ('matters'::text), ('need'::text)) slot(response_type);

-- ---------------------------------------------------------------------------
-- Die Sperr-Funktion kennt den vierten Typ
-- ---------------------------------------------------------------------------
-- Sie wies alles ab, was nicht 'move', 'matters' oder 'need' war - ein Tipp
-- waere also gar nicht erst gespeichert worden. Unveraendert bleibt alles
-- andere: Der Vertrag entscheidet weiter ueber erlaubte Schluessel und Anzahl,
-- und eine einmal gesetzte Antwort bleibt gesperrt.
--
-- Der Reveal (get_founder_in_the_wild_prompt_reveal) braucht nichts: Er gibt
-- die Antworten ohne Ruecksicht auf ihren Typ zurueck.
create or replace function public.lock_founder_in_the_wild_response(
  p_prompt_assignment_id uuid,
  p_response_type text,
  p_choice_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_assignment public.collaboration_experience_prompt_assignments%rowtype;
  v_prompt public.collaboration_experience_round_prompts%rowtype;
  v_round public.collaboration_experience_rounds%rowtype;
  v_contract public.collaboration_experience_prompt_response_contracts%rowtype;
  v_existing public.collaboration_experience_responses%rowtype;
  v_choices text[];
  v_response_id uuid;
begin
  if v_user_id is null then raise exception 'founder_in_the_wild_auth_required' using errcode = '42501'; end if;
  if p_response_type not in ('move','matters','need','guess') then raise exception 'founder_in_the_wild_response_invalid' using errcode = '22023'; end if;
  select * into v_assignment from public.collaboration_experience_prompt_assignments where id = p_prompt_assignment_id;
  select * into v_prompt from public.collaboration_experience_round_prompts where id = v_assignment.round_prompt_id and round_id = v_assignment.round_id;
  select * into v_round from public.collaboration_experience_rounds where id = v_assignment.round_id;
  if not found or v_round.experience_key <> 'founder_in_the_wild' or v_round.status <> 'active'
     or v_assignment.target_user_id <> v_user_id
     or not public.is_current_user_collaboration_round_participant(v_round.id, true) then
    raise exception 'founder_in_the_wild_response_unavailable' using errcode = '42501';
  end if;
  perform 1 from public.founder_teams where id = v_round.founder_team_id for update;
  perform 1 from public.collaboration_experience_rounds where id = v_round.id for update;
  if not exists (
    select 1
    from public.collaboration_experience_rounds round_row
    join public.founder_team_members member
      on member.team_id = round_row.founder_team_id
     and member.user_id = v_user_id
    where round_row.id = v_round.id
      and round_row.experience_key = 'founder_in_the_wild'
      and round_row.status = 'active'
  ) then
    raise exception 'founder_in_the_wild_response_unavailable' using errcode = '42501';
  end if;
  select * into v_contract from public.collaboration_experience_prompt_response_contracts
  where experience_key = v_prompt.experience_key and pack_key = v_prompt.pack_key and pack_version = v_prompt.pack_version
    and prompt_key = v_prompt.prompt_key and prompt_version = v_prompt.prompt_version and response_type = p_response_type;
  if not found then raise exception 'founder_in_the_wild_response_unavailable' using errcode = '42501'; end if;
  select coalesce(array_agg(key order by key), '{}'::text[]) into v_choices
  from (select distinct unnest(coalesce(p_choice_keys, '{}'::text[])) key) normalized;
  if cardinality(v_choices) <> cardinality(coalesce(p_choice_keys, '{}'::text[]))
     or cardinality(v_choices) not between v_contract.min_selections and v_contract.max_selections
     or not v_choices <@ v_contract.allowed_choice_keys then
    raise exception 'founder_in_the_wild_choices_invalid' using errcode = '22023';
  end if;
  select * into v_existing from public.collaboration_experience_responses
  where prompt_assignment_id = p_prompt_assignment_id and respondent_user_id = v_user_id and response_type = p_response_type;
  if found then
    if v_existing.choice_keys = v_choices then return v_existing.id; end if;
    raise exception 'collaboration_response_is_locked' using errcode = '42501';
  end if;
  insert into public.collaboration_experience_responses (round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys)
  values (v_round.id, p_prompt_assignment_id, v_user_id, p_response_type, v_choices)
  returning id into v_response_id;
  return v_response_id;
exception when unique_violation then
  select * into v_existing from public.collaboration_experience_responses
  where prompt_assignment_id = p_prompt_assignment_id and respondent_user_id = v_user_id and response_type = p_response_type;
  if v_existing.choice_keys = v_choices then return v_existing.id; end if;
  raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

commit;
