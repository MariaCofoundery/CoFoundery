\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(19);

-- ---------------------------------------------------------------------------
-- Hinweise in der Anwendung
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 21.09.2026: "Sobald eine Person in dem Verbindungsbereich
-- irgendwas ausgefuellt hat, sollte eine Nachricht an die andere Person
-- rausgehen."
--
-- Der dritte Weg neben Mail und Mitteilung. Geprueft wird die Grenze, auf die
-- es ankommt - und die ist NICHT "wir kennen uns irgendwie", sondern: der
-- genannte Vorgang zeigt wirklich von der handelnden Person zu dieser
-- Empfaengerin. Die Vorgangs-ID kommt vom Aufrufer; wuerde sie nicht
-- nachgerechnet, koennte jeder mit beliebigen IDs beliebig viele Zeilen in
-- eine fremde Liste schreiben.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','41000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','41000000-0000-4000-8000-000000000002','authenticated','authenticated','bea@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','41000000-0000-4000-8000-000000000003','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','41000000-0000-4000-8000-000000000004','authenticated','authenticated','blockiert@example.com','',now(),'{}','{}',now(),now());

-- Eine ERSTE Kontaktanfrage, noch offen. Genau der haeufigste Anlass - und
-- genau der, den eine Regel "nur bei angenommener Beziehung" verworfen haette.
insert into public.network_contact_requests(
  id, sender_user_id, recipient_user_id, message,
  sender_display_name_snapshot, recipient_display_name_snapshot, status)
values ('44000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000002',
  'Hallo, ich wuerde mich gern unterhalten.','Anna','Bea','pending');

-- Eine Anfrage, mit der die handelnde Person nichts zu tun hat.
insert into public.network_contact_requests(
  id, sender_user_id, recipient_user_id, message,
  sender_display_name_snapshot, recipient_display_name_snapshot, status)
values ('44000000-0000-4000-8000-000000000002',
  '41000000-0000-4000-8000-000000000003','41000000-0000-4000-8000-000000000002',
  'Auch hallo.','Fremd','Bea','pending');

-- Eine Align-Runde, in der Anna und die blockierende Person beide stehen.
insert into public.founder_teams(id, name, team_context)
values ('42000000-0000-4000-8000-000000000001','Zwei im Team','pre_founder');
insert into public.founder_team_members(team_id, user_id) values
('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001'),
('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000004');
insert into public.collaboration_experience_rounds(
  id, founder_team_id, experience_key, pack_key, pack_version,
  created_by_user_id, rotation_offset)
values ('45000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001',
  'founder_in_the_wild','under_pressure_v1',1,'41000000-0000-4000-8000-000000000001',0);
insert into public.collaboration_experience_round_participants(round_id, founder_user_id, position) values
('45000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001',1),
('45000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000002',2);

-- Eine zweite Runde fuer die Blockierung: Eine Runde hat genau zwei Plaetze,
-- also kann die blockierende Person nicht in derselben sitzen wie Bea. Und sie
-- braucht ein anderes Pack, weil je Team und Pack nur eine Runde offen sein
-- darf (`collaboration_experience_one_open_round_per_team_pack_idx`).
insert into public.collaboration_experience_rounds(
  id, founder_team_id, experience_key, pack_key, pack_version,
  created_by_user_id, rotation_offset)
values ('45000000-0000-4000-8000-000000000002','42000000-0000-4000-8000-000000000001',
  'founder_in_the_wild','when_it_gets_personal_v1',1,'41000000-0000-4000-8000-000000000001',0);
insert into public.collaboration_experience_round_participants(round_id, founder_user_id, position) values
('45000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000001',1),
('45000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000004',2);

insert into public.founder_team_members(team_id, user_id)
values ('42000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000002');

insert into public.collaboration_experience_round_prompts(
  id, round_id, experience_key, pack_key, pack_version, prompt_key, prompt_version, position)
values ('46000000-0000-4000-8000-000000000001','45000000-0000-4000-8000-000000000001',
  'founder_in_the_wild','under_pressure_v1',1,'pitch_shifts',1,0),
('46000000-0000-4000-8000-000000000002','45000000-0000-4000-8000-000000000001',
  'founder_in_the_wild','under_pressure_v1',1,'customer_by_friday',1,1);

-- Anna hat den ersten Punkt markiert, Bea den zweiten.
insert into public.collaboration_experience_conversation_markers(round_id, round_prompt_id, participant_user_id) values
('45000000-0000-4000-8000-000000000001','46000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001'),
('45000000-0000-4000-8000-000000000001','46000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000002');

insert into public.network_blocks(blocker_user_id, blocked_user_id)
values ('41000000-0000-4000-8000-000000000004','41000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Der echte Vorgang geht durch
-- ---------------------------------------------------------------------------
select extensions.ok(
  public.create_in_app_notice(
    'contact_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-000000000001','/connect/contacts'
  ),
  'a real contact request from me to you leaves a notice'
);

-- ... und zwar auch ohne vorher angenommene Beziehung: Eine erste Anfrage ist
-- der haeufigste Anlass ueberhaupt.
-- Nachgesehen wird mit Datenbankrechten: Die ABSENDERIN darf ihren eigenen
-- Hinweis nicht lesen, das ist die Zusage weiter unten.
set local role postgres;
select extensions.ok(
  (select actor_user_id = '41000000-0000-4000-8000-000000000001'
     and path = '/connect/contacts'
   from public.in_app_notices
   where subject_id = '44000000-0000-4000-8000-000000000001'),
  'a first contact request counts - no accepted relationship needed'
);
set local role authenticated;

-- EIN ANLASS, EINE ZEILE.
select extensions.ok(
  not public.create_in_app_notice(
    'contact_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-000000000001','/connect/contacts'
  ),
  'the same event does not create a second notice'
);

-- ---------------------------------------------------------------------------
-- Eine erfundene Vorgangs-ID ist wertlos
-- ---------------------------------------------------------------------------
-- Das ist die eigentliche Zusage. Ohne sie waere die Eindeutigkeit je
-- (Empfaenger, Art, Vorgang) kein Schutz - sie zaehlt dieselbe erfundene ID
-- nur einmal, aber tausend verschiedene tausendmal.
select extensions.ok(
  not public.create_in_app_notice(
    'contact_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-00000000ffff','/connect/contacts'
  ),
  'an invented subject id leaves nothing behind'
);

-- Und ein FREMDER Vorgang auch nicht, obwohl er echt ist: Er geht nicht von
-- mir aus.
select extensions.ok(
  not public.create_in_app_notice(
    'contact_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-000000000002','/connect/contacts'
  ),
  'somebody else event is not mine to notify about'
);

-- ---------------------------------------------------------------------------
-- Der Pfad fuehrt ins Produkt, nicht nach draussen
-- ---------------------------------------------------------------------------
-- `//fremde-seite.de` liest ein Browser als Adresse mit weggelassenem
-- Protokoll. Der Vorgang hier ist echt, die Beziehung stimmt - abgelehnt wird
-- allein wegen des Pfades. Ein Hinweis darf nicht der Weg sein, auf dem
-- jemand nach draussen geschickt wird, weil er dem Hinweis vertraut.
select extensions.ok(
  not public.create_in_app_notice(
    'contact_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-000000000001','//fremde-seite.example/abholen'
  ),
  'a protocol-relative path is not a path in this product'
);

-- Die Art muss zum Vorgang passen: dieselbe echte ID unter falscher Art.
select extensions.ok(
  not public.create_in_app_notice(
    'discovery_intro_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-000000000001','/discovery/intros'
  ),
  'a contact request cannot pose as an intro request'
);

-- Sich selbst benachrichtigen ist kein Hinweis, sondern Rauschen.
select extensions.ok(
  not public.create_in_app_notice(
    'founder_in_the_wild_handoff','41000000-0000-4000-8000-000000000001',
    '45000000-0000-4000-8000-000000000001','/teams/42000000-0000-4000-8000-000000000001'
  ),
  'nobody notifies themselves'
);

-- ---------------------------------------------------------------------------
-- Eine Blockierung gilt - auch in einer gemeinsamen Runde
-- ---------------------------------------------------------------------------
-- Der Vorgang ist echt, beide stehen in derselben Runde, und trotzdem nicht:
-- Wer blockiert hat, will von dieser Person nichts mehr.
select extensions.ok(
  not public.create_in_app_notice(
    'founder_in_the_wild_handoff','41000000-0000-4000-8000-000000000004',
    '45000000-0000-4000-8000-000000000002','/teams/42000000-0000-4000-8000-000000000001'
  ),
  'a block holds even inside a shared round'
);

-- ---------------------------------------------------------------------------
-- "Darüber möchte ich sprechen" erreicht die andere Seite
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 21.09.2026: "Ich habe auch markiert, darüber möchte ich
-- sprechen, aber da kam jetzt bei dem anderen Profil noch keine Nachricht an."
-- Die Markierung stand nur auf der Reveal-Seite - damit war ihr einziger Zweck
-- verfehlt.
select extensions.ok(
  public.create_in_app_notice(
    'collaboration_conversation_marker','41000000-0000-4000-8000-000000000002',
    '46000000-0000-4000-8000-000000000001',
    '/teams/42000000-0000-4000-8000-000000000001/collaboration-lab/founder-in-the-wild/45000000-0000-4000-8000-000000000001/reveal/0'
  ),
  'my own marker reaches the other side in the round'
);

-- Eine erfundene Prompt-Kennung ist auch hier wertlos.
select extensions.ok(
  not public.create_in_app_notice(
    'collaboration_conversation_marker','41000000-0000-4000-8000-000000000002',
    '46000000-0000-4000-8000-00000000ffff','/teams/42000000-0000-4000-8000-000000000001'
  ),
  'an invented prompt id leaves nothing behind'
);

-- UND FREMDE MARKIERUNGEN GEHOEREN MIR NICHT. Bea hat den zweiten Punkt
-- markiert, nicht Anna. Ohne diese Grenze koennte man im Namen der anderen
-- Person Gespraechswuensche anmelden, die sie nie geaeussert hat.
select extensions.ok(
  not public.create_in_app_notice(
    'collaboration_conversation_marker','41000000-0000-4000-8000-000000000002',
    '46000000-0000-4000-8000-000000000002','/teams/42000000-0000-4000-8000-000000000001'
  ),
  'a marker set by somebody else is not mine to notify about'
);

-- ---------------------------------------------------------------------------
-- Und sie wird zurückgenommen
-- ---------------------------------------------------------------------------
-- Wer die Markierung entfernt, will nicht mehr darüber sprechen. Ein Hinweis,
-- der stehen bleibt, schickt die andere Person zu einem Punkt, den es nicht
-- mehr gibt.
select extensions.ok(
  public.withdraw_in_app_notice(
    'collaboration_conversation_marker','41000000-0000-4000-8000-000000000002',
    '46000000-0000-4000-8000-000000000001'
  ),
  'withdrawing my own notice removes it'
);

-- Aber nur die eigene: Sonst waere das der Weg, jemandem unsichtbar zu machen,
-- dass er dran ist. Anna versucht hier, den Hinweis aus ihrer EIGENEN
-- Kontaktanfrage-Zeile zu entfernen, indem sie sich als Empfaengerin ausgibt -
-- geprueft wird `actor_user_id`, nicht der Empfaenger.
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.ok(
  not public.withdraw_in_app_notice(
    'contact_request','41000000-0000-4000-8000-000000000002',
    '44000000-0000-4000-8000-000000000001'
  ),
  'nobody withdraws a notice they did not cause'
);
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Niemand schreibt selbst hinein
-- ---------------------------------------------------------------------------
select extensions.ok(
  not has_table_privilege('authenticated', 'public.in_app_notices', 'insert'),
  'the application cannot write notices past the check'
);

select extensions.ok(
  has_column_privilege('authenticated', 'public.in_app_notices', 'read_at', 'update')
    and not has_column_privilege('authenticated', 'public.in_app_notices', 'kind', 'update'),
  'a reader can mark as read, not rewrite the notice'
);

-- ---------------------------------------------------------------------------
-- Jeder sieht nur seine eigenen
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.in_app_notices),
  0,
  'the sender does not see the notice they caused'
);

set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.in_app_notices),
  1,
  'the recipient sees their notice'
);

-- ---------------------------------------------------------------------------
-- Kein Text in der Zeile
-- ---------------------------------------------------------------------------
-- Was dasteht, entsteht beim Anzeigen aus der Art und dem Namen. Eine
-- gespeicherte Formulierung waere in der falschen Sprache, sobald jemand seine
-- Sprache aendert - genau der Fehler, der bei den Mails am 18.09.2026 behoben
-- wurde.
set local role postgres;
select extensions.set_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'in_app_notices'$$,
  $$values ('id'), ('recipient_user_id'), ('actor_user_id'), ('kind'),
           ('subject_id'), ('path'), ('created_at'), ('read_at')$$,
  'the notice holds no wording - only what it is about'
);

select * from extensions.finish();
rollback;
