-- Raw assessment answers are private to their owner. Shared founder reports are
-- generated in the trusted server context and expose only derived snapshots.
drop policy if exists assessment_answers_select_invitation_members_submitted
on public.assessment_answers;

