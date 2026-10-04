begin;
select no_plan();
-- Historical fixtures are inserted by the migration owner, never via a retired user API.
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('e9930000-0000-4000-8000-000000000001','history-a@example.invalid','{}','{}'),
 ('e9930000-0000-4000-8000-000000000002','history-b@example.invalid','{}','{}'),
 ('e9930000-0000-4000-8000-000000000003','history-other@example.invalid','{}','{}');
insert into public.invitations(id,inviter_user_id,invitee_user_id,invitee_email,status,token_hash,expires_at)
values ('e9930000-0000-4000-8000-000000000010','e9930000-0000-4000-8000-000000000001','e9930000-0000-4000-8000-000000000002','history-b@example.invalid','accepted',repeat('9',64),now()+interval '1 day');
insert into public.founder_alignment_workbooks(invitation_id,team_context,payload,created_by,updated_by)
values ('e9930000-0000-4000-8000-000000000010','pre_founder','{"steps":{"decision_rules":{"agreement":"Historical draft","founderAApproved":true,"founderBApproved":true,"workspaceV2":{"entries":[{"text":"Keep me"}]}}}}','e9930000-0000-4000-8000-000000000001','e9930000-0000-4000-8000-000000000001');
select ok(not has_table_privilege('authenticated','public.founder_alignment_workbooks','INSERT'),'no new workbook');
select ok(not has_table_privilege('authenticated','public.founder_alignment_workbooks','UPDATE'),'no workbook edit');
select ok(not has_table_privilege('authenticated','public.matching_workspaces','INSERT'),'no new workspace');
select ok(not has_table_privilege('authenticated','public.matching_workspace_agreements','UPDATE'),'no draft edit');
select ok(not has_function_privilege('authenticated','public.start_workspace_from_matching_session(uuid)','EXECUTE'),'workspace start retired');
select ok(not has_function_privilege('authenticated','public.create_or_get_matching_workspace_agreement(uuid)','EXECUTE'),'create-on-read retired');
select ok(not has_function_privilege('authenticated','public.handoff_workbook_deep_dive_note_if_empty(uuid,text,text)','EXECUTE'),'legacy handoff retired');
select ok(not has_function_privilege('anon','public.start_workspace_from_matching_session(uuid)','EXECUTE'),'anonymous cannot create');
select ok(has_table_privilege('service_role','public.founder_alignment_workbooks','UPDATE'),'privacy and advisor maintenance remains possible');
select ok(has_table_privilege('authenticated','public.founder_alignment_workbook_advisors','UPDATE'),'legacy advisor grant lifecycle retained');
select set_config('request.jwt.claims','{"sub":"e9930000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*) from public.founder_alignment_workbooks where invitation_id='e9930000-0000-4000-8000-000000000010'),1::bigint,'participant reads history');
select is((select payload#>>'{steps,decision_rules,workspaceV2,entries,0,text}' from public.founder_alignment_workbooks where invitation_id='e9930000-0000-4000-8000-000000000010'),'Keep me','old payload intact');
select throws_ok($$update public.founder_alignment_workbooks set payload='{}' where invitation_id='e9930000-0000-4000-8000-000000000010'$$,'42501',null,'even a participant cannot overwrite history');
select throws_ok($$select public.create_or_get_matching_workspace_agreement('e9930000-0000-4000-8000-000000000010')$$,'42501',null,'direct RPC cannot bypass retired UI');
reset role;
select set_config('request.jwt.claims','{"sub":"e9930000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*) from public.founder_alignment_workbooks where invitation_id='e9930000-0000-4000-8000-000000000010'),0::bigint,'outsider cannot read saved payload');
reset role;
select is((select count(*) from public.founder_team_setup_revisions r join public.founder_team_setup_items i on i.id=r.setup_item_id join public.founder_team_members m on m.team_id=i.team_id where m.user_id='e9930000-0000-4000-8000-000000000001'),0::bigint,'historical approvals never create Setup revisions');
select * from finish();
rollback;
