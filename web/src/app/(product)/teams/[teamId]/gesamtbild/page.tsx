import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { Gesamtbild } from "@/features/gesamtbild/Gesamtbild";
import { getGesamtbild } from "@/features/gesamtbild/gesamtbildData";
import { normalizeLocale } from "@/i18n/config";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("align.report");
  return { title: t("pageTitle") };
}

/**
 * Das Gesamtbild „Ich, Du, Unser Startup“ - für Mitglieder des Teams.
 *
 * Es wird bei jedem Aufruf frisch gelesen und nichts davon gespeichert: Zieht jemand eine Freigabe zurück,
 * verschwindet der Teil sofort. Jeder Teil kommt über seinen eigenen, schon vorhandenen Lesepfad
 * (siehe `gesamtbildData.ts`); die Seite setzt nichts über Menschen zusammen, was dort nicht freigegeben ist.
 * Advisor erreichen sie nicht - sie sind keine Mitglieder.
 */
export default async function GesamtbildPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const pathname = `/teams/${encodeURIComponent(teamId)}/gesamtbild`;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const [client, rawLocale, t] = await Promise.all([createClient(), getLocale(), getTranslations("align.overview")]);
  const locale = normalizeLocale(rawLocale);
  const data = await getGesamtbild({ client, teamId, userId: auth.user.id, locale, unnamed: t("unnamed") });
  if (!data) return <TeamUnavailable teamId={teamId} />;

  return <Gesamtbild data={data} locale={locale} />;
}
