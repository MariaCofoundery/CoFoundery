import { NextRequest } from "next/server";
import { completeAuthRedirectSession } from "@/features/auth/authRedirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  return completeAuthRedirectSession(request, supabase, {
    errorCode: "magic_link_failed",
  });
}
