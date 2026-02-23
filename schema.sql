


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


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."choices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "value" "text" NOT NULL,
    "sort_order" integer NOT NULL
);


ALTER TABLE "public"."choices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."free_text" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "text" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."free_text" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "token" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "invited_email" "text",
    "display_name" "text",
    "requested_scope" "text" DEFAULT 'basis'::"text",
    "invite_consent_at" timestamp with time zone,
    "invite_consent_by_user_id" "uuid",
    CONSTRAINT "participants_invited_email_normalized_check" CHECK ((("invited_email" IS NULL) OR ("invited_email" = "lower"("btrim"("invited_email"))))),
    CONSTRAINT "participants_requested_scope_check" CHECK ((("requested_scope" IS NULL) OR ("requested_scope" = ANY (ARRAY['basis'::"text", 'basis_plus_values'::"text"])))),
    CONSTRAINT "participants_role_check" CHECK (("role" = ANY (ARRAY['A'::"text", 'B'::"text", 'partner'::"text"])))
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants_backup_dupes" (
    "id" "uuid",
    "session_id" "uuid",
    "role" "text",
    "token" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "user_id" "uuid",
    "invited_email" "text",
    "display_name" "text",
    "requested_scope" "text",
    "invite_consent_at" timestamp with time zone,
    "invite_consent_by_user_id" "uuid"
);


ALTER TABLE "public"."participants_backup_dupes" OWNER TO "postgres";


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
    "type" "text" DEFAULT 'scale'::"text",
    "category" "text" DEFAULT 'basis'::"text"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "choice_value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "participant_id" "uuid",
    "source_session_id" "uuid",
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'waiting'::"text", 'ready'::"text", 'match_ready'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."choices"
    ADD CONSTRAINT "choices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."free_text"
    ADD CONSTRAINT "free_text_participant_id_key" UNIQUE ("participant_id");



ALTER TABLE ONLY "public"."free_text"
    ADD CONSTRAINT "free_text_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_participant_id_question_id_key" UNIQUE ("participant_id", "question_id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "choices_question_id_idx" ON "public"."choices" USING "btree" ("question_id");



CREATE INDEX "idx_participants_user_id" ON "public"."participants" USING "btree" ("user_id");



CREATE INDEX "participants_invite_consent_by_user_id_idx" ON "public"."participants" USING "btree" ("invite_consent_by_user_id");



CREATE INDEX "participants_requested_scope_idx" ON "public"."participants" USING "btree" ("requested_scope");



CREATE INDEX "participants_session_id_idx" ON "public"."participants" USING "btree" ("session_id");



CREATE UNIQUE INDEX "participants_session_invited_email_open_lower_uidx" ON "public"."participants" USING "btree" ("session_id", "lower"("invited_email")) WHERE (("invited_email" IS NOT NULL) AND ("user_id" IS NULL));



CREATE UNIQUE INDEX "participants_session_role_idx" ON "public"."participants" USING "btree" ("session_id", "role");



CREATE UNIQUE INDEX "participants_session_secondary_uidx" ON "public"."participants" USING "btree" ("session_id") WHERE ("role" = ANY (ARRAY['B'::"text", 'partner'::"text"]));



CREATE UNIQUE INDEX "participants_session_user_uidx" ON "public"."participants" USING "btree" ("session_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "participants_user_id_idx" ON "public"."participants" USING "btree" ("user_id");



CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "responses_session_participant_idx" ON "public"."responses" USING "btree" ("session_id", "participant_id");



CREATE INDEX "sessions_source_session_id_idx" ON "public"."sessions" USING "btree" ("source_session_id");



ALTER TABLE ONLY "public"."choices"
    ADD CONSTRAINT "choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."free_text"
    ADD CONSTRAINT "free_text_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."free_text"
    ADD CONSTRAINT "free_text_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_source_session_id_fkey" FOREIGN KEY ("source_session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



CREATE POLICY "Enable update for sessions" ON "public"."sessions" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Users can insert/update own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."choices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "choices_select_authenticated" ON "public"."choices" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."free_text" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "free_text_insert_owner_participant" ON "public"."free_text" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "free_text"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "free_text_select_member_session" ON "public"."free_text" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."session_id" = "free_text"."session_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "free_text_update_owner_participant" ON "public"."free_text" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "free_text"."participant_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "free_text"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participants_insert_owned_or_invite" ON "public"."participants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (("user_id" IS NULL) AND ("invited_email" IS NOT NULL))));



CREATE POLICY "participants_select_member_session" ON "public"."participants" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("invited_email" = "lower"(("auth"."jwt"() ->> 'email'::"text")))));



CREATE POLICY "participants_update_self" ON "public"."participants" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("user_id" IS NULL) AND ("invited_email" = "lower"(("auth"."jwt"() ->> 'email'::"text")))))) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_select_authenticated" ON "public"."questions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "responses_insert_owner_participant" ON "public"."responses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "responses"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "responses_select_member_session" ON "public"."responses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."session_id" = "responses"."session_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "responses_update_owner_participant" ON "public"."responses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "responses"."participant_id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "responses"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_insert_authenticated" ON "public"."sessions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "sessions_select_member" ON "public"."sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."session_id" = "sessions"."id") AND (("p"."user_id" = "auth"."uid"()) OR ("p"."invited_email" = "lower"(("auth"."jwt"() ->> 'email'::"text"))))))));



CREATE POLICY "sessions_update_member" ON "public"."sessions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."session_id" = "sessions"."id") AND ("p"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."session_id" = "sessions"."id") AND ("p"."user_id" = "auth"."uid"())))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."choices" TO "anon";
GRANT ALL ON TABLE "public"."choices" TO "authenticated";
GRANT ALL ON TABLE "public"."choices" TO "service_role";



GRANT ALL ON TABLE "public"."free_text" TO "anon";
GRANT ALL ON TABLE "public"."free_text" TO "authenticated";
GRANT ALL ON TABLE "public"."free_text" TO "service_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT ALL ON TABLE "public"."participants_backup_dupes" TO "anon";
GRANT ALL ON TABLE "public"."participants_backup_dupes" TO "authenticated";
GRANT ALL ON TABLE "public"."participants_backup_dupes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."responses" TO "anon";
GRANT ALL ON TABLE "public"."responses" TO "authenticated";
GRANT ALL ON TABLE "public"."responses" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



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







