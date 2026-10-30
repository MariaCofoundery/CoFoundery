import { NextResponse } from "next/server";
import { PROGRAM_LOGO_BUCKET, programStorageClient } from "@/features/advisor/programPageStorage";

export const dynamic = "force-dynamic";

/**
 * Das Logo einer VEROEFFENTLICHTEN Programmseite. Der Bucket ist privat; hier
 * wird mit dem Dienstschluessel gelesen, aber nur, wenn die Organisation die
 * Seite veroeffentlicht hat und aktiv ist. Sonst 404 - kein Hinweis darauf,
 * ob es die Organisation gibt.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return new NextResponse(null, { status: 404 });
  const storage = programStorageClient();
  if (!storage) return new NextResponse(null, { status: 404 });

  const { data: org } = await storage
    .from("advisor_orgs")
    .select("program_logo_path")
    .eq("program_slug", slug)
    .eq("program_page_published", true)
    .eq("status", "active")
    .maybeSingle();
  const path = (org as { program_logo_path: string | null } | null)?.program_logo_path;
  if (!path) return new NextResponse(null, { status: 404 });

  const { data, error } = await storage.storage.from(PROGRAM_LOGO_BUCKET).download(path);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": data.type || "image/png",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
