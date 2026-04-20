update public.relationship_advisors
set status = 'invited'::public.relationship_advisor_status,
    invited_at = coalesce(invited_at, approved_at, updated_at)
where invite_token_hash is not null
  and advisor_user_id is null
  and status = 'approved'::public.relationship_advisor_status;
