alter table public.invitation_modules enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_answers enable row level security;

drop policy if exists invitation_modules_select_members on public.invitation_modules;
create policy invitation_modules_select_members
on public.invitation_modules
for select to authenticated
using (
  exists (
    select 1
    from public.invitations i
    where i.id = invitation_modules.invitation_id
      and i.status = 'accepted'
      and i.revoked_at is null
      and i.expires_at > now()
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

drop policy if exists assessments_select_invitation_members_submitted on public.assessments;
create policy assessments_select_invitation_members_submitted
on public.assessments
for select to authenticated
using (
  submitted_at is not null
  and exists (
    select 1
    from public.invitations i
    where i.status = 'accepted'
      and i.revoked_at is null
      and i.expires_at > now()
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
      and assessments.user_id in (i.inviter_user_id, i.invitee_user_id)
  )
);

drop policy if exists assessment_answers_select_invitation_members_submitted on public.assessment_answers;
create policy assessment_answers_select_invitation_members_submitted
on public.assessment_answers
for select to authenticated
using (
  exists (
    select 1
    from public.assessments a
    join public.invitations i
      on a.user_id in (i.inviter_user_id, i.invitee_user_id)
    where a.id = assessment_answers.assessment_id
      and a.submitted_at is not null
      and i.status = 'accepted'
      and i.revoked_at is null
      and i.expires_at > now()
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);
