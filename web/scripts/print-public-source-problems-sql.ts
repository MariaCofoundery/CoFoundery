import { PUBLIC_SOURCE_PROBLEMS } from "@/features/connect/publicSourceProblems";
import { buildPublicSourceProblemsSql } from "@/features/connect/publicSourceProblemsSql";

// Schreibt das SQL auf die Standardausgabe:
//   npm run -s public-problems:sql > ../supabase/migrations/20270111130000_problem_public_source_seed.sql
process.stdout.write(buildPublicSourceProblemsSql(PUBLIC_SOURCE_PROBLEMS));
