import { notFound, redirect } from "next/navigation";
import { teamraumChatHref } from "@/features/advisor/teamraumRoutes";

const UUID = /^[0-9a-f-]{36}$/;

/** Alte Adresse eines Gespraechs (bis 05.11.2026) - steht noch in Push-Mitteilungen. Der Chat lebt jetzt im Teamraum. */
export default async function LegacyOrgChatPage({ searchParams }: { searchParams?: Promise<{ org?: string; chat?: string }> }) {
  const query = (await searchParams) ?? {};
  if (!UUID.test(query.org ?? "") || !UUID.test(query.chat ?? "")) notFound();
  redirect(teamraumChatHref(query.org as string, query.chat as string));
}
