import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { loadTeamMap, type AlignTeamView } from "@/features/align/alignOverviewData";
import { getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import { getTeamCapabilityForTeam } from "@/features/capability/capabilityTeamData";
import { getPersonStrengths } from "@/features/capability/strengthData";
import { getDirectionStatements } from "@/features/direction/directionStatementData";
import { sharedParts, talkingPoints, type SharedPart, type TalkingPoint } from "@/features/gesamtbild/gesamtbildModel";
import { loadBetaReadiness } from "@/features/modules/ventureBeta/teamData";
import { getProductTeam, getProductWorkstyle } from "@/features/reporting/workstyle/data";
import { AREAS, isOlderWorkstyleProfile, validProductTeam, type AreaKey } from "@/features/reporting/workstyle/model";
import { areaNarrative, teamAreaFinding, type TeamAreaFinding } from "@/features/reporting/workstyle/narrative";
import { workstyleSetupHandoff } from "@/features/reporting/workstyle/setupHandoff";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { getTeamStrengthsOverview } from "@/features/teams/teamStrengthsData";
import { domainOfTheme, type StrengthDomain } from "@/features/strengths/strengthThemes";
import type { AppLocale } from "@/i18n/config";

/**
 * Alles, was das Gesamtbild zeigt - frisch gelesen, nichts gespeichert.
 *
 * JEDER TEIL KOMMT UEBER SEINEN EIGENEN, SCHON VORHANDENEN LESEWEG:
 *   - eigene Daten: mit dem Client der Person, ohne Freigabe (sie liest sich selbst);
 *   - Arbeitsweise des Teams: `get_workstyle_product_team` (nur, wenn alle freigegeben haben);
 *   - Faehigkeiten anderer: `get_team_capability` (teamgenau);
 *   - Staerken und Richtung anderer: `get_team_strengths_overview` (eigene Freigabe);
 *   - Vereinbarungen: das Founder Setup, mit den aktuellen Mitgliedern bestaetigt.
 * Zieht jemand eine Freigabe zurueck, verschwindet der Teil beim naechsten Aufruf. Es gibt keinen
 * Zwischenspeicher, der etwas Zurueckgezogenes noch zeigen koennte, und keinen Weg zu Find.
 */

export type OwnStrength = { id: string; label: string | null; statement: string; domain: StrengthDomain | null };

export type GesamtbildData = {
  teamId: string;
  teamName: string;
  viewerName: string;
  generatedAt: Date;
  ich: {
    workstyle: { state: "ready" | "older" | "missing"; areas: { key: AreaKey; title: string; core: string }[] };
    capability: { areaId: string; ownershipWish: string | null }[];
    direction: { facet: string; statement: string }[];
    strengths: OwnStrength[];
  };
  du: {
    others: { userId: string; name: string; shared: SharedPart[] }[];
    workstyle: {
      state: "ready" | "waiting";
      similar: { key: AreaKey; title: string; summary: string }[];
      different: { key: AreaKey; title: string; summary: string; groups: TeamAreaFinding["situations"][number]["groups"]; label: string | null; question: string | null }[];
    };
    strengths: { userId: string; name: string; isViewer: boolean; items: { label: string | null; statement: string }[] }[];
  };
  startup: {
    teamMap: AlignTeamView["teamMap"];
    venture: "ready" | "waiting" | "unknown";
    agreedKeys: string[];
    awaitingConfirmation: number;
    talking: TalkingPoint[];
  };
};

export async function getGesamtbild(params: {
  client: SupabaseClient;
  teamId: string;
  userId: string;
  locale: AppLocale;
  unnamed: string;
  now?: Date;
}): Promise<GesamtbildData | null> {
  const { client, teamId, userId, locale, unnamed } = params;

  const [capabilityTeam, productProfile, productTeam, strengthsOverview, ownStrengths, ownDirection, ownEntries, setup, teamMap, ventureReadiness, teamRow] =
    await Promise.all([
      getTeamCapabilityForTeam(client, teamId, userId, unnamed).catch(() => null),
      getProductWorkstyle(client, userId).catch(() => null),
      getProductTeam(client, teamId).catch(() => null),
      getTeamStrengthsOverview(client, teamId).catch(() => null),
      getPersonStrengths(client).catch(() => []),
      getDirectionStatements(client).catch(() => []),
      getOwnCapabilityEntries(client, userId).catch(() => []),
      getFounderSetup(teamId, userId, client).catch(() => null),
      loadTeamMap(client, teamId, userId, unnamed),
      loadBetaReadiness(client, teamId).catch(() => null),
      client.from("founder_teams").select("name").eq("id", teamId).maybeSingle(),
    ]);

  // Kein aktuelles Mitglied (oder nicht lesbar): nichts ueber das Team verraten.
  if (!capabilityTeam) return null;

  const viewer = capabilityTeam.people.find((person) => person.person_id === userId);
  const viewerName = viewer?.name ?? unnamed;
  const teamName = (teamRow.data?.name as string | null)?.trim() || capabilityTeam.people.map((person) => person.name).join(" + ");

  // ---- Ich ------------------------------------------------------------------------------------
  const ownWorkstyle: GesamtbildData["ich"]["workstyle"] = !productProfile
    ? { state: "missing", areas: [] }
    : {
        state: isOlderWorkstyleProfile(productProfile) ? "older" : "ready",
        areas: AREAS.map((area) => ({ key: area.key, title: area.title, core: areaNarrative(productProfile, area.key, locale).core })),
      };

  // ---- Du -------------------------------------------------------------------------------------
  const readyTeam = productTeam && productTeam !== "not_ready" && validProductTeam(productTeam) ? productTeam : null;
  const findings = readyTeam
    ? AREAS.map((area) => ({
        area,
        finding: teamAreaFinding(readyTeam.people.map((person) => ({ person_id: person.person_id, name: person.name, profile: person.workstyle })), area.key, locale),
      }))
    : [];
  const strengthPeople = strengthsOverview?.people ?? [];

  const others = capabilityTeam.people
    .filter((person) => person.person_id !== userId)
    .map((person) => ({
      userId: person.person_id,
      name: person.name,
      shared: sharedParts({
        workstyle: Boolean(readyTeam),
        capability: person.capabilities.length > 0,
        strengths: strengthPeople.some((entry) => entry.personId === person.person_id && !entry.isViewer),
      }),
    }));

  // ---- Unser Startup --------------------------------------------------------------------------
  const freeFamilies = (teamMap?.tiles ?? []).flatMap((tile) => (tile.kind === "free" ? [tile.familyId] : []));
  const talking = talkingPoints(
    findings.map(({ area, finding }) => ({ area: area.key, kind: finding.kind, question: finding.question })),
    freeFamilies,
  );

  return {
    teamId,
    teamName,
    viewerName,
    generatedAt: params.now ?? new Date(),
    ich: {
      workstyle: ownWorkstyle,
      capability: ownEntries.map((entry) => ({ areaId: entry.area_id as string, ownershipWish: (entry.ownership_wish as string | null) ?? null })),
      direction: ownDirection.map((statement) => ({ facet: statement.facet, statement: statement.statement })),
      strengths: ownStrengths.map((strength) => ({
        id: strength.id,
        label: strength.label,
        statement: strength.statement,
        domain: strength.theme ? domainOfTheme(strength.theme) : null,
      })),
    },
    du: {
      others,
      workstyle: {
        state: readyTeam ? "ready" : "waiting",
        similar: findings
          .filter(({ finding }) => finding.kind === "similar")
          .map(({ area, finding }) => ({ key: area.key, title: area.team, summary: finding.summary })),
        different: findings
          .filter(({ finding }) => finding.kind === "opposite" || finding.kind === "nuance")
          .map(({ area, finding }) => ({
            key: area.key,
            title: area.team,
            summary: finding.summary,
            groups: finding.situations[0]?.groups ?? [],
            label: finding.situations[0]?.label ?? null,
            question: finding.question ?? workstyleSetupHandoff(area.key)?.question ?? null,
          })),
      },
      strengths: strengthPeople.map((person) => ({ userId: person.personId, name: person.name, isViewer: person.isViewer, items: person.strengths })),
    },
    startup: {
      teamMap,
      venture: ventureReadiness ? (ventureReadiness.status === "ready" ? "ready" : "waiting") : "unknown",
      agreedKeys: (setup?.items ?? []).filter((item) => item.stage === "settled" && !item.rosterConfirmationMissing).map((item) => item.key),
      awaitingConfirmation: (setup?.items ?? []).filter((item) => item.stage === "awaiting_confirmation").length,
      talking,
    },
  };
}

