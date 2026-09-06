import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAvatarSrc } from "@/features/profile/avatarLibrary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SLUG_PATTERN = /^(profile|listing)-[a-f0-9]{24}$/;

export async function GET(request: Request, { params }: { params: Promise<{ entityType: string; publicSlug: string }> }) {
  const { entityType, publicSlug } = await params;
  if ((entityType !== "profile" && entityType !== "listing") || !SLUG_PATTERN.test(publicSlug)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return new NextResponse(null, { status: 503 });
  const client = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc("resolve_public_network_photo", {
    p_entity_type: entityType,
    p_public_slug: publicSlug,
  });
  const photo = Array.isArray(data) ? data[0] : data;
  if (error || !photo) return new NextResponse(null, { status: 404 });

  if (photo.photo_source === "profile_avatar") {
    const src = getAvatarSrc(photo.photo_avatar_id);
    if (!src) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(new URL(src, request.url), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  if (photo.photo_source !== "network_upload" || !photo.photo_path) {
    return new NextResponse(null, { status: 404 });
  }
  const { data: image, error: imageError } = await client.storage
    .from("network-profile-images")
    .download(photo.photo_path);
  if (imageError || !image) return new NextResponse(null, { status: 404 });

  return new NextResponse(await image.arrayBuffer(), {
    headers: {
      "Content-Type": image.type || "image/jpeg",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noimageindex",
    },
  });
}
