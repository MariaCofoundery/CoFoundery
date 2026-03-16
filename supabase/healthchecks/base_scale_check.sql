-- Base-answer choice validation healthcheck (read-only)
-- Use before/after deploying the base choice validation migration.

-- 1) Distribution of observed base choice values
select
  aa.choice_value,
  count(*) as occurrences
from public.assessment_answers aa
join public.assessments a on a.id = aa.assessment_id
where a.module = 'base'
group by aa.choice_value
order by aa.choice_value;

-- 2) Invalid base values (no matching choice for the question/value pair)
select
  aa.assessment_id,
  aa.question_id,
  aa.choice_value
from public.assessment_answers aa
join public.assessments a on a.id = aa.assessment_id
left join public.choices c
  on c.question_id = aa.question_id
 and c.value = aa.choice_value
where a.module = 'base'
  and c.id is null
order by aa.assessment_id, aa.question_id;
