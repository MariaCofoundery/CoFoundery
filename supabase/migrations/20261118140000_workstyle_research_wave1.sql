-- Phase 11.6C - Welle 1: 29 Core + optional 8 Entwicklungsfragen (Set A oder B),
-- gemischt in EINEM Fragebogen. Forschungsdaten bleiben technisch getrennt.
--
-- - Drei sprachlich ueberarbeitete Forschungsitems als NEUE Zeilen (EVI-04r, EL-03r,
--   EL-06r, Positionen 53-55, definition.revision_of). Die Originale bleiben fuer die
--   full-23-Kohorte; das Core-Manifest 3.0.0 und alle Core-Items sind unberuehrt.
--   Quelle: web/docs/founder-workstyle-research-sets-1.0.0.json.
-- - Set-Definition research-sets/1.0.0 als unveraenderliche Funktion.
-- - Sitzung: research_set, research_set_version, item_order (gespeicherte
--   Reihenfolge). Zuteilung serverseitig, ausgeglichen, unter Sperre, einmalig.
-- - Reihenfolge: Core in fester relativer Reihenfolge; Set-Items zufaellig, je eins
--   in einer zufaelligen Luecke aus 8 gleich grossen Lueckengruppen. Gespeichert.
-- - Produktabschluss bleibt submitted_at bei 29 Core. Forschungsabschluss fuer
--   Welle 1 = alle 8 Set-Items; full-23 unveraendert.
-- - Widerruf loescht auch Set, Set-Version und Reihenfolge (Forschungsmetadaten).
-- Keine Aenderung an Core, Manifest, Freigaben, Berichten oder Einwilligungstext.
begin;

-- 1. Ueberarbeitete Forschungsitems (nur research_only, nie Produkt).
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition) values
 ('founder-workstyle-pretest-8-5a-v3','8.5a-v3','EVI-04r','8.4-v0.4',53,'{"item_key":"EVI-04r","item_version":"8.4-v0.4","assessment_version":"8.5a-v3","construct":"Evidenzorientierung","area_key":"EVI","area_status":"development_area","scientific_status":"core_research","facet":null,"facet_status":"not_specified","prompt":"Ein für euer Vorhaben wichtiges Ergebnis fällt deutlich anders aus als erwartet. Was tust du am ehesten zuerst?","stem":null,"response_format":"behavioral","missing_reasons":["cannot_assess"],"options":[{"option_id":"A","label":"Ich warte ab, ob sich das Ergebnis wiederholt – ein einzelner Ausreißer kann täuschen."},{"option_id":"B","label":"Ich gehe vom naheliegendsten Grund aus und arbeite damit weiter, damit wir nicht ins Stocken geraten."},{"option_id":"C","label":"Ich schaue mir an, wie das Ergebnis zustande gekommen ist, bevor ich es deute."},{"option_id":"D","label":"Ich überlege mir mehrere mögliche Erklärungen und wäge sie gegeneinander ab."},{"option_id":"E","label":"Ich frage mich zuerst, ob meine ursprüngliche Erwartung überhaupt stimmte."}],"alternatives":[],"rendered_order":null,"source_type":"adapted","source_status":"adapted","source_status_explicit":false,"source_note":"Sprachliche Überarbeitung von EVI-04 für research-sets/1.0.0; Konstrukt und Forschungsfrage unverändert; keine Gleichsetzung mit EVI-04","development_status":"candidate_for_pretest","usage":"research_only","research_only":true,"product_status":"excluded","form":null,"note":"Gleichwertige Vorgehensweisen statt Methodenleiter; jede Option mit eigenem nachvollziehbarem Grund.","revision_of":"EVI-04","research_set_version":"research-sets/1.0.0"}'::jsonb),
 ('founder-workstyle-pretest-8-5a-v3','8.5a-v3','EL-03r','8.4-v0.4',54,'{"item_key":"EL-03r","item_version":"8.4-v0.4","assessment_version":"8.5a-v3","construct":"Experimentelles Lernen","area_key":"EL","area_status":"development_area","scientific_status":"core_research","facet":null,"facet_status":"not_specified","prompt":"Du hast etwas ausprobiert, und das Ergebnis überrascht dich. Was machst du als Nächstes am ehesten?","stem":null,"response_format":"behavioral","missing_reasons":["cannot_assess"],"options":[{"option_id":"A","label":"Ich probiere es noch einmal genauso, um zu sehen, ob es sich bestätigt."},{"option_id":"B","label":"Ich ändere gezielt eine Sache und probiere es erneut."},{"option_id":"C","label":"Ich probiere einen deutlich anderen Ansatz aus."},{"option_id":"D","label":"Mir reicht das Ergebnis – ich entscheide damit, ohne noch einmal zu testen."}],"alternatives":[],"rendered_order":null,"source_type":"adapted","source_status":"adapted","source_status_explicit":false,"source_note":"Sprachliche Überarbeitung von EL-03 für research-sets/1.0.0; Konstrukt und Forschungsfrage unverändert; keine Gleichsetzung mit EL-03","development_status":"candidate_for_pretest","usage":"research_only","research_only":true,"product_status":"excluded","form":null,"note":"Vier klar unterschiedliche nächste Schritte; die EVI-nahe Option (Ursachen verstehen) entfällt.","revision_of":"EL-03","research_set_version":"research-sets/1.0.0"}'::jsonb),
 ('founder-workstyle-pretest-8-5a-v3','8.5a-v3','EL-06r','8.4-v0.4',55,'{"item_key":"EL-06r","item_version":"8.4-v0.4","assessment_version":"8.5a-v3","construct":"Experimentelles Lernen","area_key":"EL","area_status":"development_area","scientific_status":"research","facet":null,"facet_status":"not_specified","prompt":"Ein erster Versuch spricht gegen deine ursprüngliche Idee. Wie wahrscheinlich ist es, dass du dir überlegst, was du beim nächsten Versuch gezielt anders prüfst?","stem":null,"response_format":"likelihood","missing_reasons":["cannot_assess"],"options":[],"alternatives":[],"rendered_order":null,"source_type":"adapted","source_status":"adapted","source_status_explicit":false,"source_note":"Sprachliche Überarbeitung von EL-06 für research-sets/1.0.0; Konstrukt und Forschungsfrage unverändert; keine Gleichsetzung mit EL-06","development_status":"candidate_for_pretest","usage":"research_only","research_only":true,"product_status":"excluded","form":null,"note":"experimentelles Lernen vs. Beharrlichkeit/Persistenz; alltagsnähere Formulierung.","revision_of":"EL-06","research_set_version":"research-sets/1.0.0"}'::jsonb);

-- 2. Set-Definition. Eine neue Set-Version braucht eine neue Migration.
create function public.workstyle_research_set_items(p_version text,p_set text) returns text[]
language sql immutable set search_path='' as $$
 select case when p_version='research-sets/1.0.0' then case p_set
  when 'A' then array['ORG-06','EXP-05','EVI-R1','AMB-06','EL-03r','VOICE-R1','ORG-05','DEC-02']
  when 'B' then array['ORG-06','EXP-R1','VOICE-06','AMB-03','EVI-04r','EL-06r','AMB-R1','FS-R2'] end end
$$;
revoke all on function public.workstyle_research_set_items(text,text) from public,anon,authenticated;

-- 3. Sitzung: Set, Set-Version und gespeicherte Reihenfolge.
alter table public.workstyle_pretest_sessions
 add column research_set text check(research_set in ('A','B')),
 add column research_set_version text check(research_set_version='research-sets/1.0.0'),
 add column item_order jsonb;
alter table public.workstyle_pretest_sessions add constraint workstyle_session_research_set check (
 (research_set is null)=(research_set_version is null)
 and (research_set is null or (assessment_version='8.5a-v3' and consent_version is not null and withdrawn_at is null))
 and (item_order is null or (research_set is not null and jsonb_typeof(item_order)='array'))
);

-- 4. Reihenfolge einmalig erzeugen (intern).
create function public.workstyle_research_order(p_version text,p_set text,p_mixed boolean) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare research text[]; core text[]; gaps integer[]:='{}'; result text[]:='{}'; n integer; c integer; b integer; lo integer; hi integer; k integer; r integer:=1;
begin
 select array_agg(x order by random()) into research from unnest(public.workstyle_research_set_items(p_version,p_set)) x;
 if research is null then raise exception 'unknown_research_set' using errcode='22023'; end if;
 if not p_mixed then return to_jsonb(research); end if;
 select array_agg(item_key order by position) into core from public.workstyle_item_versions
  where instrument_id='founder-workstyle-pretest-8-5a-v3' and definition->>'usage'='core' and definition->>'scientific_status'='core';
 n:=cardinality(research); c:=cardinality(core);
 -- Luecke k = nach Core-Item k (1..c). Gruppe b deckt die Luecken (b*c/n, (b+1)*c/n].
 -- Je Gruppe genau ein Forschungsitem: nie zwei direkt hintereinander, nie am Anfang
 -- gehaeuft, nie alle am Ende; die erste Frage ist immer ein Core-Item.
 for b in 0..n-1 loop
  lo:=(b*c)/n+1; hi:=((b+1)*c)/n;
  gaps:=gaps||(lo+floor(random()*(hi-lo+1))::integer);
 end loop;
 for k in 1..c loop
  result:=result||core[k];
  while r<=n and gaps[r]=k loop result:=result||research[r]; r:=r+1; end loop;
 end loop;
 return to_jsonb(result);
end $$;
revoke all on function public.workstyle_research_order(text,text,boolean) from public,anon,authenticated;

-- 5. Abschluss je Teil: Welle 1 zaehlt die 8 Set-Items, full-23 die 23 Originale.
create or replace function public.workstyle_v3_sync_completion(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; done_at timestamptz:=clock_timestamp();
 core_total integer; core_n integer; research_keys text[]; research_n integer;
begin
 select * into s from public.workstyle_pretest_sessions where assessment_id=p_assessment_id and assessment_version='8.5a-v3';
 if not found then return; end if;
 select count(*) into core_total from public.workstyle_item_versions
  where instrument_id='founder-workstyle-pretest-8-5a-v3' and definition->>'usage'='core' and definition->>'scientific_status'='core';
 select count(*) into core_n from public.alignment_answers r join public.workstyle_item_versions i
  on i.instrument_id='founder-workstyle-pretest-8-5a-v3' and i.item_key=r.block_id and i.item_version=r.item_version
  where r.assessment_id=p_assessment_id and i.definition->>'usage'='core' and i.definition->>'scientific_status'='core';
 if core_n<>core_total then return; end if;
 update public.assessments set submitted_at=done_at where id=p_assessment_id and submitted_at is null;
 if s.consent_version is null or s.withdrawn_at is not null or s.completed_at is not null then return; end if;
 research_keys:=case when s.research_set is not null then public.workstyle_research_set_items(s.research_set_version,s.research_set)
  else (select array_agg(item_key) from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v3'
   and not (definition->>'usage'='core' and definition->>'scientific_status'='core') and definition->>'revision_of' is null) end;
 select count(*) into research_n from public.workstyle_research_responses where assessment_id=p_assessment_id and item_key=any(research_keys);
 if research_n=cardinality(research_keys) then
  update public.workstyle_pretest_sessions set completed_at=done_at where assessment_id=p_assessment_id;
 end if;
end $$;

-- 6. Forschung zusagen: zu Beginn (gemischt, 37) oder nach fertigem Arbeitsprofil (8).
-- Ohne Teilnahme legt der Aufruf die Teilnahme an. Nicht mitten im Arbeitsprofil.
create or replace function public.start_workstyle_research(p_consent_version text,p_context jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; product_done timestamptz; new_id uuid; a_n integer; b_n integer; chosen text;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_consent_version is distinct from 'workstyle_research_v3' then raise exception 'research_consent_required' using errcode='42501'; end if;
 if p_context is null or jsonb_typeof(p_context)<>'object'
   or (p_context - array['founder_experience','team_size','venture_phase'])<>'{}'
   or coalesce(p_context->>'founder_experience','') not in ('0','1','2-3','4-5','6_plus','prefer_not_to_say')
   or coalesce(p_context->>'team_size','') not in ('solo','two','larger','no_venture')
   or (p_context ? 'venture_phase' and coalesce(p_context->>'venture_phase','') not in ('idea','building','operating','')) then
   raise exception 'invalid_workstyle_context' using errcode='22023';
 end if;
 -- Dieselbe Sperre wie jeder v3-Start: serialisiert Teilnahme, Zuteilung und Ausgleich.
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-8.5a-v3',0));
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=auth.uid() and r.assessment_version='8.5a-v3' order by r.started_at desc,r.assessment_id limit 1 for update of r;
 if not found then
  insert into public.assessments(user_id,module,instrument_id) values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v3') returning id into new_id;
  insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position)
  values(new_id,'8.5a-v3',null,null,null,'{}','3.0.0',0) returning * into s;
 end if;
 if s.withdrawn_at is not null then raise exception 'research_withdrawn' using errcode='42501'; end if;
 if s.consent_version is not null then return public.get_my_workstyle_pretest_version('8.5a-v3'); end if;
 select submitted_at into product_done from public.assessments where id=s.assessment_id;
 if product_done is null and exists(select 1 from public.alignment_answers where assessment_id=s.assessment_id) then
  raise exception 'research_entry_unavailable' using errcode='23514'; end if;
 select count(*) filter(where research_set='A'),count(*) filter(where research_set='B') into a_n,b_n
 from public.workstyle_pretest_sessions where research_set_version='research-sets/1.0.0';
 chosen:=case when a_n<b_n then 'A' when b_n<a_n then 'B' when random()<0.5 then 'A' else 'B' end;
 update public.workstyle_pretest_sessions set consent_version=p_consent_version,consent_given_at=clock_timestamp(),context=p_context,
  research_set=chosen,research_set_version='research-sets/1.0.0',
  item_order=public.workstyle_research_order('research-sets/1.0.0',chosen,product_done is null)
 where assessment_id=s.assessment_id;
 return public.get_my_workstyle_pretest_version('8.5a-v3');
end $$;

-- 7. Speichern: Welle-1-Forschung nur aus dem Set, in gespeicherter Reihenfolge.
create or replace function public.save_workstyle_pretest_v3(
 p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,
 p_response_option text,p_missing_reason text,p_rendered_order jsonb,
 p_response_time_ms integer default null,p_finalize boolean default false
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb; item_position integer; previous jsonb; answer_time timestamptz;
 is_core boolean; product_done timestamptz; set_keys text[];
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.assessment_version<>'8.5a-v3' then
   raise exception 'workstyle_session_unavailable' using errcode='42501'; end if;
 select i.definition,i.position into item,item_position from public.workstyle_item_versions i
 where i.instrument_id='founder-workstyle-pretest-8-5a-v3' and i.item_key=p_item_key and i.item_version=p_item_version;
 if item is null or num_nonnulls(p_response_value,p_response_option,p_missing_reason)<>1
   or (p_missing_reason is not null and p_missing_reason<>'cannot_assess')
   or (p_response_time_ms is not null and p_response_time_ms not between 0 and 86400000)
   or p_rendered_order is distinct from nullif(item->'rendered_order','null'::jsonb)
   or p_finalize is null then
   raise exception 'invalid_workstyle_answer' using errcode='22023'; end if;
 if item->>'response_format' in ('comparative','behavioral') then
   if p_response_value is not null or (p_response_option is not null and not exists(
     select 1 from jsonb_array_elements(item->'options') o where o->>'option_id'=p_response_option)) then
     raise exception 'invalid_workstyle_choice' using errcode='22023'; end if;
 elsif p_response_option is not null or (p_response_value is not null and p_response_value not between 1 and 5) then
   raise exception 'invalid_workstyle_ordinal' using errcode='22023';
 end if;
 is_core:=item->>'usage'='core' and item->>'scientific_status'='core';
 if not is_core and s.consent_version is null then raise exception 'research_consent_required' using errcode='42501'; end if;
 -- Ueberarbeitete Items (revision_of) gibt es nur in Welle-1-Sets, nie in full-23.
 if not is_core and s.research_set is null and item->>'revision_of' is not null then
   raise exception 'research_item_not_in_set' using errcode='22023'; end if;
 select submitted_at into product_done from public.assessments where id=p_assessment_id;
 if (is_core and product_done is not null) or (not is_core and s.completed_at is not null) then
   -- Abgeschlossene Teile sind unveraenderlich; eine identische Wiederholung ist erlaubt.
   select a into previous from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key;
   if previous is null or previous->>'item_version' is distinct from p_item_version
     or (previous->>'response_value')::integer is distinct from p_response_value
     or previous->>'response_option' is distinct from p_response_option
     or previous->>'missing_reason' is distinct from p_missing_reason
     or nullif(previous->'rendered_order','null'::jsonb) is distinct from p_rendered_order then
     raise exception 'workstyle_completed_answer_immutable' using errcode='23514'; end if;
 else
   if not is_core and s.research_set is not null then
     -- Welle 1: nur Items des zugeteilten Sets, in der gespeicherten Reihenfolge.
     set_keys:=public.workstyle_research_set_items(s.research_set_version,s.research_set);
     if not (p_item_key=any(set_keys)) then raise exception 'research_item_not_in_set' using errcode='22023'; end if;
     if exists(select 1 from jsonb_array_elements_text(s.item_order) with ordinality o(k,i)
       where o.k=any(set_keys) and o.i<(select o2.i from jsonb_array_elements_text(s.item_order) with ordinality o2(k,i) where o2.k=p_item_key)
       and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=o.k)) then
       raise exception 'workstyle_previous_answer_required' using errcode='23514'; end if;
   elsif exists(select 1 from public.workstyle_item_versions i where i.instrument_id='founder-workstyle-pretest-8-5a-v3'
     and i.position<item_position and ((i.definition->>'usage'='core' and i.definition->>'scientific_status'='core')=is_core)
     and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)
     and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=i.item_key)) then
     raise exception 'workstyle_previous_answer_required' using errcode='23514'; end if;
   answer_time:=clock_timestamp();
   if is_core then
     insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,missing_code,workstyle_rendered_order,answered_at)
     values(p_assessment_id,p_item_key,p_item_version,case when item->>'response_format' in ('comparative','behavioral') then 'single_choice' else 'ordinal_choice' end,
       case when p_response_value is not null then jsonb_build_object('scale',p_response_value)
            when p_response_option is not null then jsonb_build_object('optionId',p_response_option) end,p_missing_reason,p_rendered_order,answer_time)
     on conflict(assessment_id,block_id) do update set value=excluded.value,missing_code=excluded.missing_code,answered_at=excluded.answered_at;
   else
     insert into public.workstyle_research_responses(assessment_id,instrument_id,item_key,item_version,response_value,response_option,missing_reason,rendered_order,answered_at)
     values(p_assessment_id,'founder-workstyle-pretest-8-5a-v3',p_item_key,p_item_version,p_response_value,p_response_option,p_missing_reason,p_rendered_order,answer_time)
     on conflict(assessment_id,item_key) do update set response_value=excluded.response_value,response_option=excluded.response_option,missing_reason=excluded.missing_reason,answered_at=excluded.answered_at;
   end if;
   update public.workstyle_pretest_sessions set resume_position=least(item_position,51),
     timings=case when p_response_time_ms is null or s.consent_version is null then timings
     else timings||jsonb_build_object(p_item_key,p_response_time_ms) end where assessment_id=p_assessment_id;
   perform public.workstyle_v3_sync_completion(p_assessment_id);
 end if;
 return jsonb_build_object('assessment_id',p_assessment_id,
   'submitted_at',(select submitted_at from public.assessments where id=p_assessment_id),
   'completed_at',(select completed_at from public.workstyle_pretest_sessions where assessment_id=p_assessment_id),
   'answer',(select a from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key));
end $$;

-- 8. Widerruf: zusaetzlich Set, Set-Version und Reihenfolge loeschen (Forschungsmetadaten).
create or replace function public.erase_workstyle_research(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s record;
begin
 for s in select r.assessment_id,a.submitted_at from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=p_user_id and r.withdrawn_at is null and r.consent_version is not null for update of r loop
   delete from public.workstyle_research_responses where assessment_id=s.assessment_id;
   if s.submitted_at is null then
     delete from public.alignment_answers where assessment_id=s.assessment_id;
     delete from public.assessments where id=s.assessment_id;
   else
     update public.workstyle_pretest_sessions set withdrawn_at=now(),context='{}',timings='{}',feedback=null,
       research_set=null,research_set_version=null,item_order=null where assessment_id=s.assessment_id;
   end if;
 end loop;
end $$;
revoke all on function public.erase_workstyle_research(uuid) from public,anon,authenticated,service_role;

-- 9. Export: Kohorte, Set, Set-Version, gezeigte Reihenfolge.
create or replace function public.get_workstyle_research_dataset_version(p_assessment_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if public.workstyle_instrument_for(p_assessment_version) is null then raise exception 'unknown_workstyle_version' using errcode='22023'; end if;
 if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'session_id',s.session_id,'form',s.form,'assessment_version',s.assessment_version,'consent_version',s.consent_version,
   'manifest_version',coalesce(s.manifest_version,'1.0.0'),'resume_position',s.resume_position,'started_at',s.started_at,
   'research_consent_given_at',s.consent_given_at,'completed_at',s.completed_at,'context',s.context,'feedback',s.feedback,'timings',s.timings,
   'research_cohort',case when s.assessment_version<>'8.5a-v3' then null when s.research_set is not null then 'wave-1' else 'full-23' end,
   'research_set',s.research_set,'research_set_version',s.research_set_version,'item_order',s.item_order,
   'answers',public.workstyle_answer_rows(s.assessment_id))) from public.workstyle_pretest_sessions s
   where s.withdrawn_at is null and s.consent_version is not null and s.assessment_version=p_assessment_version),'[]');
end $$;
commit;
