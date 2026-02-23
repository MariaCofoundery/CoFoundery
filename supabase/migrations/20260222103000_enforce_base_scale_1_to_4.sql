-- Enforce base assessment answer scale to integer strings 1..4.
-- Values module remains unrestricted.

do $$
declare
  v_invalid_count bigint;
  v_samples text;
begin
  select count(*)
    into v_invalid_count
  from public.assessment_answers aa
  join public.assessments a on a.id = aa.assessment_id
  where a.module = 'base'
    and aa.choice_value !~ '^[1-4]$';

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
      where a.module = 'base'
        and aa.choice_value !~ '^[1-4]$'
      order by aa.assessment_id, aa.question_id
      limit 20
    ) as t;

    raise exception
      'cannot enforce base scale 1..4: found % invalid base answers. examples: %',
      v_invalid_count,
      coalesce(v_samples, 'n/a');
  end if;
end
$$;

create or replace function public.enforce_base_choice_value_1_to_4()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_module public.assessment_module;
begin
  select a.module
    into v_module
  from public.assessments a
  where a.id = new.assessment_id;

  if v_module is null then
    raise exception 'assessment_not_found_for_answer';
  end if;

  if v_module = 'base' and new.choice_value !~ '^[1-4]$' then
    raise exception 'base_choice_value_out_of_range';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_base_choice_value_1_to_4 on public.assessment_answers;

create trigger trg_enforce_base_choice_value_1_to_4
before insert or update of assessment_id, choice_value
on public.assessment_answers
for each row
execute function public.enforce_base_choice_value_1_to_4();
