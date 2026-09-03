import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const { data: eligible } = await client.rpc("is_network_member");
  if (eligible !== true) return new NextResponse(null, { status: 403 });

  const { data: profile, error: profileError } = await client
    .from("network_profiles")
    .select("photo_path,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError || !profile?.photo_path || (profile.status !== "active" && user.id !== userId)) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error } = await client.storage.from("network-profile-images").download(profile.photo_path);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
