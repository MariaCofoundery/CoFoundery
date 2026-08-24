begin;

alter table public.commitment_lab_founder_entries
  add column difficult_situation text not null default '',
  add column desired_alternative text not null default '',
  add column discussion_markers text[] not null default '{}'::text[];

alter table public.commitment_lab_founder_entries
  add constraint commitment_lab_v11_text_lengths_check check (
    char_length(difficult_situation) <= 5000
    and char_length(desired_alternative) <= 5000
  ),
  add constraint commitment_lab_discussion_markers_check check (
    cardinality(discussion_markers) <= 3
    and discussion_markers <@ array[
      'commitment_meaning',
      'aspect:priority',
      'aspect:reliability',
      'aspect:transparency',
      'aspect:responsibility',
      'aspect:renegotiation',
      'scenario:motivation_progress',
      'scenario:time_circumstances',
      'scenario:attractive_alternative',
      'scenario:team_responsibility',
      'difficulty_wish'
    ]::text[]
  );

create or replace function public.save_commitment_lab_founder_entry_v11(
  p_relationship_id uuid,
  p_current_hours smallint,
  p_difficult_week_hours smallint,
  p_obligation_categories text[],
  p_change_note text,
  p_reality_fit text,
  p_commitment_meaning text,
  p_priority_reflection text,
  p_reliability_reflection text,
  p_transparency_reflection text,
  p_responsibility_reflection text,
  p_renegotiation_reflection text,
  p_scenario_answers jsonb,
  p_difficult_situation text,
  p_desired_alternative text,
  p_discussion_markers text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_markers text[] := coalesce(p_discussion_markers, '{}'::text[]);
begin
  if v_user_id is null then
    raise exception 'commitment_lab_auth_required' using errcode = '42501';
  end if;
  if char_length(coalesce(p_difficult_situation, '')) > 5000
     or char_length(coalesce(p_desired_alternative, '')) > 5000
     or cardinality(v_markers) > 3
     or cardinality(v_markers) <> (select count(distinct marker) from unnest(v_markers) marker)
     or not (v_markers <@ array[
       'commitment_meaning',
       'aspect:priority',
       'aspect:reliability',
       'aspect:transparency',
       'aspect:responsibility',
       'aspect:renegotiation',
       'scenario:motivation_progress',
       'scenario:time_circumstances',
       'scenario:attractive_alternative',
       'scenario:team_responsibility',
       'difficulty_wish'
     ]::text[]) then
    raise exception 'commitment_lab_v11_input_invalid' using errcode = '22023';
  end if;

  if ('commitment_meaning' = any(v_markers) and nullif(btrim(coalesce(p_commitment_meaning, '')), '') is null)
     or ('aspect:priority' = any(v_markers) and nullif(btrim(coalesce(p_priority_reflection, '')), '') is null)
     or ('aspect:reliability' = any(v_markers) and nullif(btrim(coalesce(p_reliability_reflection, '')), '') is null)
     or ('aspect:transparency' = any(v_markers) and nullif(btrim(coalesce(p_transparency_reflection, '')), '') is null)
     or ('aspect:responsibility' = any(v_markers) and nullif(btrim(coalesce(p_responsibility_reflection, '')), '') is null)
     or ('aspect:renegotiation' = any(v_markers) and nullif(btrim(coalesce(p_renegotiation_reflection, '')), '') is null)
     or ('difficulty_wish' = any(v_markers) and nullif(
       btrim(coalesce(p_difficult_situation, '') || coalesce(p_desired_alternative, '')), ''
     ) is null)
     or exists (
       select 1
       from unnest(v_markers) marker
       where marker like 'scenario:%'
         and nullif(btrim(
           coalesce(p_scenario_answers -> split_part(marker, ':', 2) ->> 'action', '')
           || coalesce(p_scenario_answers -> split_part(marker, ':', 2) ->> 'expectation', '')
         ), '') is null
     ) then
    raise exception 'commitment_lab_marker_answer_empty' using errcode = '22023';
  end if;

  perform public.save_commitment_lab_founder_entry(
    p_relationship_id,
    p_current_hours,
    p_difficult_week_hours,
    p_obligation_categories,
    p_change_note,
    p_reality_fit,
    p_commitment_meaning,
    p_priority_reflection,
    p_reliability_reflection,
    p_transparency_reflection,
    p_responsibility_reflection,
    p_renegotiation_reflection,
    p_scenario_answers
  );

  update public.commitment_lab_founder_entries entry
  set difficult_situation = btrim(coalesce(p_difficult_situation, '')),
      desired_alternative = btrim(coalesce(p_desired_alternative, '')),
      discussion_markers = v_markers
  where entry.relationship_id = p_relationship_id
    and entry.user_id = v_user_id;
end;
$$;

revoke all on function public.save_commitment_lab_founder_entry_v11(
  uuid, smallint, smallint, text[], text, text, text, text, text, text, text, text,
  jsonb, text, text, text[]
) from public, anon, authenticated, service_role;
grant execute on function public.save_commitment_lab_founder_entry_v11(
  uuid, smallint, smallint, text[], text, text, text, text, text, text, text, text,
  jsonb, text, text, text[]
) to authenticated;

comment on column public.commitment_lab_founder_entries.discussion_markers is
  'Up to three founder-selected discussion topics. Markers express conversation intent, never risk or evaluation.';
comment on function public.save_commitment_lab_founder_entry_v11(
  uuid, smallint, smallint, text[], text, text, text, text, text, text, text, text,
  jsonb, text, text, text[]
) is
  'Atomically saves the V1 personal entry plus founder-owned difficulty, wish, and up to three answer-bound discussion markers.';

commit;
