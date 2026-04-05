import { NextRequest, NextResponse } from "next/server";
import {
  completeAuthRedirectSession,
  normalizeNextPath,
} from "@/features/auth/authRedirects";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  return completeAuthRedirectSession(request, supabase, {
    errorCode: "auth_callback_failed",
    onSuccessRedirect: async (nextPath) => {
      const destination = await resolvePostAuthRedirectPath(supabase, normalizeNextPath(nextPath));
      return NextResponse.redirect(new URL(destination, request.url));
    },
  });
}
