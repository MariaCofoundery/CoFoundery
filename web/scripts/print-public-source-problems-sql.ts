import { PUBLIC_SOURCE_PROBLEMS } from "@/features/connect/publicSourceProblems";
import { buildPublicSourceProblemsSql } from "@/features/connect/publicSourceProblemsSql";

// Schreibt das SQL auf die Standardausgabe:
//   npm run public-problems:sql > ../supabase/scripts/public_source_problems.sql
process.stdout.write(buildPublicSourceProblemsSql(PUBLIC_SOURCE_PROBLEMS));
