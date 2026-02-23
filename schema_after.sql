


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."assessment_module" AS ENUM (
    'base',
    'values'
);


ALTER TYPE "public"."assessment_module" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'sent',
    'opened',
    'accepted',
    'expired',
    'revoked'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."report_run_status" AS ENUM (
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."report_run_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "text") RETURNS TABLE("invitation_id" "uuid", "relationship_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
  v_rel_id uuid;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_inv
  from public.invitations
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  -- Expiry check
  if v_inv.expires_at < now() then
    update public.invitations
      set status='expired', updated_at=now()
    where id=v_inv.id;
    raise exception 'expired';
  end if;

  if v_inv.status in ('revoked') then
    raise exception 'revoked';
  end if;

  -- Create / upsert relationship
  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_uid)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_rel_id;

  if v_rel_id is null then
    select id into v_rel_id
    from public.relationships
    where user_low = least(v_inv.inviter_user_id, v_uid)
      and user_high = greatest(v_inv.inviter_user_id, v_uid);
  end if;

  -- Mark invitation accepted (idempotent)
  update public.invitations
    set status='accepted',
        invitee_user_id=v_uid,
        accepted_at=coalesce(accepted_at, now()),
        updated_at=now()
  where id=v_inv.id;

  return query select v_inv.id, v_rel_id;
end;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_modifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'immutable';
end;
$$;


ALTER FUNCTION "public"."block_modifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_report_run_modules_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'report_run_modules_are_immutable';
end;
$$;


ALTER FUNCTION "public"."block_report_run_modules_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_report_runs_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'report_runs_are_immutable';
end;
$$;


ALTER FUNCTION "public"."block_report_runs_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_relationship_for_users"("p_user_a_id" "uuid", "p_user_b_id" "uuid", "p_source_session_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_relationship_id uuid;
  v_pair_in_session boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_user_a_id is null or p_user_b_id is null or p_source_session_id is null then
    raise exception 'invalid_pair';
  end if;

  if p_user_a_id = p_user_b_id then
    raise exception 'invalid_pair';
  end if;

  -- Caller must be one of the two users in the requested relationship.
  if v_uid not in (p_user_a_id, p_user_b_id) then
    raise exception 'forbidden';
  end if;

  -- Harden against arbitrary pair creation: both users must belong to the same source session.
  select exists (
    select 1
    from public.participants pa
    join public.participants pb
      on pb.session_id = pa.session_id
    where pa.session_id = p_source_session_id
      and pa.user_id = p_user_a_id
      and pb.user_id = p_user_b_id
  ) into v_pair_in_session;

  if not v_pair_in_session then
    raise exception 'pair_not_in_session';
  end if;

  insert into public.relationships (user_a_id, user_b_id, status)
  values (p_user_a_id, p_user_b_id, 'active')
  on conflict (pair_user_low, pair_user_high)
  do update set updated_at = now()
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;


ALTER FUNCTION "public"."ensure_relationship_for_users"("p_user_a_id" "uuid", "p_user_b_id" "uuid", "p_source_session_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assessment_answers" (
    "assessment_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "choice_value" "text" NOT NULL
);


ALTER TABLE "public"."assessment_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module" "public"."assessment_module" NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."choices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "value" "text" NOT NULL,
    "sort_order" integer NOT NULL
);


ALTER TABLE "public"."choices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation_modules" (
    "invitation_id" "uuid" NOT NULL,
    "module" "public"."assessment_module" NOT NULL
);


ALTER TABLE "public"."invitation_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_user_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "invitee_user_id" "uuid",
    "label" "text",
    "status" "public"."invitation_status" DEFAULT 'sent'::"public"."invitation_status" NOT NULL,
    "token_hash" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opened_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitations_invitee_email_check" CHECK (("invitee_email" = "lower"("btrim"("invitee_email"))))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "display_name" "text",
    "focus_skill" "text",
    "intention" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "text" NOT NULL,
    "dimension" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "type" "text" DEFAULT 'single_choice'::"text" NOT NULL,
    "category" "text" DEFAULT 'basis'::"text" NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_a_id" "uuid" NOT NULL,
    "user_b_id" "uuid" NOT NULL,
    "user_low" "uuid" GENERATED ALWAYS AS (LEAST("user_a_id", "user_b_id")) STORED,
    "user_high" "uuid" GENERATED ALWAYS AS (GREATEST("user_a_id", "user_b_id")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "relationships_check" CHECK (("user_a_id" <> "user_b_id"))
);


ALTER TABLE "public"."relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "relationship_id" "uuid" NOT NULL,
    "invitation_id" "uuid" NOT NULL,
    "modules" "public"."assessment_module"[] NOT NULL,
    "input_assessment_ids" "uuid"[] NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_runs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("assessment_id", "question_id");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."choices"
    ADD CONSTRAINT "choices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_modules"
    ADD CONSTRAINT "invitation_modules_pkey" PRIMARY KEY ("invitation_id", "module");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_low_user_high_key" UNIQUE ("user_low", "user_high");



ALTER TABLE ONLY "public"."report_runs"
    ADD CONSTRAINT "report_runs_invitation_id_key" UNIQUE ("invitation_id");



ALTER TABLE ONLY "public"."report_runs"
    ADD CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "assessments_user_module_submitted_uidx" ON "public"."assessments" USING "btree" ("user_id", "module") WHERE ("submitted_at" IS NOT NULL);



CREATE INDEX "choices_question_id_idx" ON "public"."choices" USING "btree" ("question_id");



CREATE INDEX "invitations_expires_idx" ON "public"."invitations" USING "btree" ("expires_at") WHERE ("status" = ANY (ARRAY['sent'::"public"."invitation_status", 'opened'::"public"."invitation_status"]));



CREATE INDEX "invitations_invitee_email_status_idx" ON "public"."invitations" USING "btree" ("lower"("invitee_email"), "status");



CREATE INDEX "invitations_inviter_status_idx" ON "public"."invitations" USING "btree" ("inviter_user_id", "status");



CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "questions_category_idx" ON "public"."questions" USING "btree" ("category");



CREATE OR REPLACE TRIGGER "trg_report_runs_immutable_d" BEFORE DELETE ON "public"."report_runs" FOR EACH ROW EXECUTE FUNCTION "public"."block_modifications"();



CREATE OR REPLACE TRIGGER "trg_report_runs_immutable_u" BEFORE UPDATE ON "public"."report_runs" FOR EACH ROW EXECUTE FUNCTION "public"."block_modifications"();



ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."choices"
    ADD CONSTRAINT "choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_modules"
    ADD CONSTRAINT "invitation_modules_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relationships"
    ADD CONSTRAINT "relationships_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_runs"
    ADD CONSTRAINT "report_runs_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_runs"
    ADD CONSTRAINT "report_runs_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE CASCADE;



CREATE POLICY "Users can insert/update own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."assessment_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_answers_insert_owner" ON "public"."assessment_answers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assessments" "a"
  WHERE (("a"."id" = "assessment_answers"."assessment_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "assessment_answers_select_owner" ON "public"."assessment_answers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assessments" "a"
  WHERE (("a"."id" = "assessment_answers"."assessment_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "assessment_answers_update_owner" ON "public"."assessment_answers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assessments" "a"
  WHERE (("a"."id" = "assessment_answers"."assessment_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assessments" "a"
  WHERE (("a"."id" = "assessment_answers"."assessment_id") AND ("a"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessments_insert_owner" ON "public"."assessments" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "assessments_select_owner" ON "public"."assessments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "assessments_update_owner" ON "public"."assessments" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."choices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "choices_select_authenticated" ON "public"."choices" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."invitation_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitation_modules_insert_inviter" ON "public"."invitation_modules" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."invitations" "i"
  WHERE (("i"."id" = "invitation_modules"."invitation_id") AND ("i"."inviter_user_id" = "auth"."uid"())))));



CREATE POLICY "invitation_modules_select_inviter" ON "public"."invitation_modules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."invitations" "i"
  WHERE (("i"."id" = "invitation_modules"."invitation_id") AND ("i"."inviter_user_id" = "auth"."uid"())))));



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations_insert_self" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK (("inviter_user_id" = "auth"."uid"()));



CREATE POLICY "invitations_select_invitee" ON "public"."invitations" FOR SELECT TO "authenticated" USING ((("lower"("invitee_email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))) OR ("invitee_user_id" = "auth"."uid"())));



CREATE POLICY "invitations_select_inviter" ON "public"."invitations" FOR SELECT TO "authenticated" USING (("inviter_user_id" = "auth"."uid"()));



CREATE POLICY "invitations_update_inviter" ON "public"."invitations" FOR UPDATE TO "authenticated" USING (("inviter_user_id" = "auth"."uid"())) WITH CHECK (("inviter_user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_select_authenticated" ON "public"."questions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."relationships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "relationships_select_members" ON "public"."relationships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_a_id") OR ("auth"."uid"() = "user_b_id")));



ALTER TABLE "public"."report_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_runs_select_members" ON "public"."report_runs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."relationships" "r"
  WHERE (("r"."id" = "report_runs"."relationship_id") AND (("auth"."uid"() = "r"."user_a_id") OR ("auth"."uid"() = "r"."user_b_id"))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."block_modifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_modifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_modifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_report_run_modules_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_report_run_modules_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_report_run_modules_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_report_runs_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_report_runs_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_report_runs_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_relationship_for_users"("p_user_a_id" "uuid", "p_user_b_id" "uuid", "p_source_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_relationship_for_users"("p_user_a_id" "uuid", "p_user_b_id" "uuid", "p_source_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_relationship_for_users"("p_user_a_id" "uuid", "p_user_b_id" "uuid", "p_source_session_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."assessment_answers" TO "anon";
GRANT ALL ON TABLE "public"."assessment_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_answers" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."choices" TO "anon";
GRANT ALL ON TABLE "public"."choices" TO "authenticated";
GRANT ALL ON TABLE "public"."choices" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_modules" TO "anon";
GRANT ALL ON TABLE "public"."invitation_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_modules" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."relationships" TO "anon";
GRANT ALL ON TABLE "public"."relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."relationships" TO "service_role";



GRANT ALL ON TABLE "public"."report_runs" TO "anon";
GRANT ALL ON TABLE "public"."report_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."report_runs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







