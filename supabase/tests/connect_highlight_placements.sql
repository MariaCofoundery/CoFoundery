begin; select plan(14);
-- Highlight-Plaetze: nur die Verwaltung vergibt sie, und gezeigt wird nur,
-- was auch als Zufalls-Highlight erscheinen duerfte.
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('a1b00000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hl-admin@example.invalid',now(),now(),now()),
 ('a1b00000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hl-owner@example.invalid',now(),now(),now()),
 ('a1b00000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hl-member@example.invalid',now(),now(),now()),
 ('a1b00000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hl-outsider@example.invalid',now(),now(),now());
insert into public.network_memberships(user_id,status) values
 ('a1b00000-0000-4000-8000-000000000001','active'),
 ('a1b00000-0000-4000-8000-000000000002','active'),
 ('a1b00000-0000-4000-8000-000000000003','active')
on conflict(user_id) do update set status='active';
insert into public.platform_admins(user_id) values ('a1b00000-0000-4000-8000-000000000001');
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at,suggestable,expertise) values
 ('a1b00000-0000-4000-8000-000000000002','Owner','Synthetic headline','A complete synthetic biography for highlight verification.',array['founder'],'active',now(),true,array['software']);
insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at)
 values('a1b00000-0000-4000-8000-000000000100','a1b00000-0000-4000-8000-000000000002','offering','expertise','Placed listing','A sufficiently long synthetic description.','active',now(),now()+interval '40 days');

reset role; select set_config('request.jwt.claim.sub','a1b00000-0000-4000-8000-000000000003',true); set local role authenticated;
select throws_ok($$select public.admin_save_connect_highlight_placement('editorial','listing','a1b00000-0000-4000-8000-000000000100','x',now(),now()+interval '7 days')$$,'42501',null,'a member who is not admin cannot place');
select throws_ok($$select * from public.admin_list_connect_highlight_placements()$$,'42501',null,'a member who is not admin cannot list');
select throws_ok($$select * from public.connect_highlight_placements$$,'42501',null,'no direct table access');

reset role; select set_config('request.jwt.claim.sub','a1b00000-0000-4000-8000-000000000001',true); set local role authenticated;
select lives_ok($$select public.admin_save_connect_highlight_placement('editorial','listing','a1b00000-0000-4000-8000-000000000100','Gut gemacht',now()-interval '1 minute',now()+interval '7 days')$$,'admin can place');
select is((select count(*) from public.admin_list_connect_highlight_placements() j where j->>'title'='Placed listing'),1::bigint,'admin list resolves the title');
select lives_ok($$select public.admin_save_connect_highlight_placement('sponsored','listing','a1b00000-0000-4000-8000-000000000100','Werbetext in unserem Namen',now(),now()+interval '7 days')$$,'admin can place an ad');
select is((select count(*) from public.admin_list_connect_highlight_placements() j where j->>'source'='sponsored' and j->>'note' is not null),0::bigint,'an ad never carries our recommendation sentence');
select throws_ok($$select public.admin_save_connect_highlight_placement('editorial','listing','a1b00000-0000-4000-8000-0000000fffff','x',now(),now()+interval '7 days')$$,'P0002',null,'unknown target is refused');

reset role; select set_config('request.jwt.claim.sub','a1b00000-0000-4000-8000-000000000003',true); set local role authenticated;
select is((select count(*) from public.list_connect_highlight_placements() j where j->>'source'='editorial'),1::bigint,'a member sees a running placement');

reset role; update public.network_profiles set suggestable=false where user_id='a1b00000-0000-4000-8000-000000000002';
reset role; select set_config('request.jwt.claim.sub','a1b00000-0000-4000-8000-000000000003',true); set local role authenticated;
select is((select count(*) from public.list_connect_highlight_placements()),0::bigint,'opting out of suggestions also ends the placement');

reset role; update public.network_profiles set suggestable=true where user_id='a1b00000-0000-4000-8000-000000000002';
update public.connect_highlight_placements set ends_at=now()-interval '1 second', starts_at=now()-interval '2 days';
reset role; select set_config('request.jwt.claim.sub','a1b00000-0000-4000-8000-000000000003',true); set local role authenticated;
select is((select count(*) from public.list_connect_highlight_placements()),0::bigint,'an expired placement is not shown');

reset role; update public.connect_highlight_placements set ends_at=now()+interval '1 day';
reset role; select set_config('request.jwt.claim.sub','a1b00000-0000-4000-8000-000000000004',true); set local role authenticated;
select is((select count(*) from public.list_connect_highlight_placements()),0::bigint,'a non-member sees nothing');

reset role; delete from auth.users where id='a1b00000-0000-4000-8000-000000000002';
select is((select count(*) from public.connect_highlight_placements),0::bigint,'deleting the owner account removes the placement');

reset role; set local role anon;
select throws_ok($$select * from public.list_connect_highlight_placements()$$,'42501',null,'anon cannot call');
select * from finish(); rollback;
