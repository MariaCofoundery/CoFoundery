-- Base-scale healthcheck (read-only)
-- Use before/after deploying base scale enforcement migration.

-- 1) Distribution of observed base choice values
select
  aa.choice_value,
  count(*) as occurrences
from public.assessment_answers aa
join public.assessments a on a.id = aa.assessment_id
where a.module = 'base'
group by aa.choice_value
order by aa.choice_value;

-- 2) Invalid base values (non 1..4 integer-string)
select
  aa.assessment_id,
  aa.question_id,
  aa.choice_value
from public.assessment_answers aa
join public.assessments a on a.id = aa.assessment_id
where a.module = 'base'
  and aa.choice_value !~ '^[1-4]$'
order by aa.assessment_id, aa.question_id;
