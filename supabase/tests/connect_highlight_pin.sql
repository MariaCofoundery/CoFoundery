begin; select plan(7);
-- Anpinnen: nur Empfehlungen, hoechstens eine, und Mitglieder sehen die Marke.
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('a1c00000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pin-admin@example.invalid',now(),now(),now()),
 ('a1c00000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pin-owner@example.invalid',now(),now(),now()),
 ('a1c00000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pin-member@example.invalid',now(),now(),now());
insert into public.network_memberships(user_id,status) values
 ('a1c00000-0000-4000-8000-000000000001','active'),('a1c00000-0000-4000-8000-000000000002','active'),('a1c00000-0000-4000-8000-000000000003','active')
on conflict(user_id) do update set status='active';
insert into public.platform_admins(user_id) values ('a1c00000-0000-4000-8000-000000000001');
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at,suggestable,highlightable,expertise) values
 ('a1c00000-0000-4000-8000-000000000002','Owner','Synthetic headline','A complete synthetic biography for highlight verification.',array['founder'],'active',now(),true,true,array['software']);
insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
 ('a1c00000-0000-4000-8000-000000000100','a1c00000-0000-4000-8000-000000000002','offering','expertise','Erste','A sufficiently long synthetic description.','active',now(),now()+interval '40 days'),
 ('a1c00000-0000-4000-8000-000000000101','a1c00000-0000-4000-8000-000000000002','offering','expertise','Zweite','A sufficiently long synthetic description.','active',now(),now()+interval '40 days');

reset role; select set_config('request.jwt.claim.sub','a1c00000-0000-4000-8000-000000000001',true); set local role authenticated;
select public.admin_save_connect_highlight_placement('editorial','listing','a1c00000-0000-4000-8000-000000000100','Mein Satz',now()-interval '1 minute',now()+interval '7 days',true);
select is((select count(*) from public.admin_list_connect_highlight_placements() j where (j->>'pinned')::boolean),1::bigint,'eine Empfehlung ist angepinnt');

-- Eine Anzeige wird nie angepinnt, auch wenn es verlangt wird.
select public.admin_save_connect_highlight_placement('sponsored','listing','a1c00000-0000-4000-8000-000000000101',null,now()-interval '1 minute',now()+interval '7 days',true);
select is((select count(*) from public.admin_list_connect_highlight_placements() j where j->>'source'='sponsored' and (j->>'pinned')::boolean),0::bigint,'eine Anzeige bleibt ungepinnt');

-- Eine zweite angepinnte Empfehlung loest die erste ab.
select public.admin_save_connect_highlight_placement('editorial','listing','a1c00000-0000-4000-8000-000000000101','Anderer Satz',now()-interval '1 minute',now()+interval '7 days',true);
select is((select count(*) from public.admin_list_connect_highlight_placements() j where (j->>'pinned')::boolean),1::bigint,'es bleibt bei einer angepinnten');
select is((select j->>'note' from public.admin_list_connect_highlight_placements() j where (j->>'pinned')::boolean),'Anderer Satz','die neue loest die alte ab');

-- Ohne den Zusatz bleibt alles wie vorher (sechs Argumente gelten weiter).
select lives_ok($$select public.admin_save_connect_highlight_placement('editorial','listing','a1c00000-0000-4000-8000-000000000100','Ohne Pin',now()-interval '1 minute',now()+interval '7 days')$$,'der alte Aufruf mit sechs Argumenten geht weiter');

-- Mitglieder sehen die Marke, nicht mehr.
reset role; select set_config('request.jwt.claim.sub','a1c00000-0000-4000-8000-000000000003',true); set local role authenticated;
select is((select count(*) from public.list_connect_highlight_placements() j where (j->>'pinned')::boolean),1::bigint,'Mitglieder sehen genau eine angepinnte');
select throws_ok($$update public.connect_highlight_placements set pinned = true$$,'42501',null,'und koennen sie nicht selbst setzen');

select * from finish(); rollback;
