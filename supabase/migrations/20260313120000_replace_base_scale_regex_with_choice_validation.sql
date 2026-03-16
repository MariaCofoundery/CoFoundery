-- Replace legacy base answer regex validation (1..4) with choice-backed validation.
-- Base answers remain restricted, but valid values now come from public.choices.

do $$
declare
  v_invalid_count bigint;
  v_samples text;
begin
  select count(*)
    into v_invalid_count
  from public.assessment_answers aa
  join public.assessments a on a.id = aa.assessment_id
  left join public.choices c
    on c.question_id = aa.question_id
   and c.value = aa.choice_value
  where a.module = 'base'
    and c.id is null;

  if v_invalid_count > 0 then
    select string_agg(
      format('%s/%s="%s"', t.assessment_id, t.question_id, t.choice_value),
      ', '
      order by t.assessment_id, t.question_id
    )
      into v_samples
    from (
      select aa.assessment_id, aa.question_id, aa.choice_value
      from public.assessment_answers aa
      join public.assessments a on a.id = aa.assessment_id
      left join public.choices c
        on c.question_id = aa.question_id
       and c.value = aa.choice_value
      where a.module = 'base'
        and c.id is null
      order by aa.assessment_id, aa.question_id
      limit 20
    ) as t;

    raise exception
      'cannot enforce base choice validation: found % invalid base answers without matching choices. examples: %',
      v_invalid_count,
      coalesce(v_samples, 'n/a');
  end if;
end
$$;

drop trigger if exists trg_enforce_base_choice_value_1_to_4 on public.assessment_answers;
drop trigger if exists trg_enforce_base_choice_value_matches_choice on public.assessment_answers;

drop function if exists public.enforce_base_choice_value_1_to_4();

create or replace function public.enforce_base_choice_value_matches_choice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_module public.assessment_module;
  v_choice_exists boolean;
begin
  select a.module
    into v_module
  from public.assessments a
  where a.id = new.assessment_id;

  if v_module is null then
    raise exception 'assessment_not_found_for_answer';
  end if;

  if v_module = 'base' then
    select exists(
      select 1
      from public.choices c
      where c.question_id = new.question_id
        and c.value = new.choice_value
    )
      into v_choice_exists;

    if not v_choice_exists then
      raise exception 'base_choice_value_not_found_for_question';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_base_choice_value_matches_choice
before insert or update of assessment_id, question_id, choice_value
on public.assessment_answers
for each row
execute function public.enforce_base_choice_value_matches_choice();
