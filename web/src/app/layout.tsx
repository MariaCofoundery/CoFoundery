import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProductShell } from "@/features/navigation/ProductShell";
import {
  sanitizeFounderAlignmentWorkbookPayload,
} from "@/features/reporting/founderAlignmentWorkbook";
import {
  getInvitationDashboardRows,
} from "@/features/reporting/actions";
import {
  deriveWorkbookNavigationState,
  buildWorkbookHref,
  buildWorkbookIntroHref,
} from "@/features/reporting/workbookNavigation";
import { DEFAULT_PUBLIC_APP_ORIGIN, getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

type ReportRunRow = {
  invitation_id: string;
  created_at: string;
};

type WorkbookDashboardRow = {
  invitation_id: string;
  updated_at: string;
  payload: unknown;
};

type ProductNavigationTargets = {
  matchingHref: string;
  workbookHref: string;
  matchingItems: ProductNavigationContextItem[];
  workbookItems: ProductNavigationContextItem[];
};

type ProductNavigationContextItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  avatarLabel: string;
  avatarUrl: string | null;
  statusKind: "ready" | "in_progress" | "completed";
  sortDate: string;
};

type ProfileListRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function teamContextLabel(value: "pre_founder" | "existing_team") {
  return value === "existing_team" ? "Bestehendes Team" : "Pre-Founder";
}

function formatNavigationTimestamp(value: string | null) {
  if (!value) return "ohne Datum";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function fallbackNameFromEmail(value: string | null | undefined) {
  const localPart = value?.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "Founder";
}

function buildAvatarLabel(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "F";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const spectral = localFont({
  src: [
    { path: "./fonts/spectral-v15-latin-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/spectral-v15-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/spectral-v15-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-spectral",
  display: "swap",
});

const unbounded = localFont({
  src: [
    { path: "./fonts/unbounded-v12-latin-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/unbounded-v12-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/unbounded-v12-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicAppOrigin() || DEFAULT_PUBLIC_APP_ORIGIN),
  title: "CoFoundery Align | Co-Founder Matching mit Werte-Fokus",
  description:
    "CoFoundery Align verbindet Mitgründer:innen nach Werten, Vision und Arbeitsstil. Werte zuerst – Fähigkeiten als Ergänzung.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [roleViews, profileData, navigationTargets] = user
    ? await Promise.all([
        getDashboardRoleViews(user.id).catch(() => ({
          hasFounder: false,
          hasAdvisor: false,
          roles: [],
        })),
        getProfileBasicsRow(supabase, user.id).catch(() => null),
        (async () => {
          const invitationRows = await getInvitationDashboardRows().catch(() => []);
          const reportRunsResult = await supabase
            .from("report_runs")
            .select("invitation_id, created_at")
            .order("created_at", { ascending: false })
            .limit(20);

          if (reportRunsResult.error) {
            return {
              matchingHref: "/dashboard#dashboard-block-active",
              workbookHref: "/dashboard",
              matchingItems: [],
              workbookItems: [],
            } satisfies ProductNavigationTargets;
          }

          const reportRuns = (reportRunsResult.data ?? []) as ReportRunRow[];
          const latestReport = reportRuns[0] ?? null;
          const matchingHref = latestReport
            ? `/report/${encodeURIComponent(latestReport.invitation_id)}`
            : "/dashboard#dashboard-block-active";
          const invitationById = new Map(invitationRows.map((invitation) => [invitation.id, invitation]));
          const relevantInvitationIds = [
            ...new Set([
              ...invitationRows.map((invitation) => invitation.id),
              ...reportRuns.map((run) => run.invitation_id),
            ]),
          ];

          if (relevantInvitationIds.length === 0) {
            return {
              matchingHref,
              workbookHref: "/dashboard",
              matchingItems: [],
              workbookItems: [],
            } satisfies ProductNavigationTargets;
          }

          const relevantUserIds = [
            ...new Set(
              invitationRows
                .flatMap((invitation) => [invitation.inviterUserId, invitation.inviteeUserId])
                .filter((value): value is string => Boolean(value))
            ),
          ];

          const [workbookResult, profilesResult] = await Promise.all([
            supabase
              .from("founder_alignment_workbooks")
              .select("invitation_id, updated_at, payload")
              .in("invitation_id", relevantInvitationIds)
              .order("updated_at", { ascending: false }),
            relevantUserIds.length > 0
              ? supabase
                  .from("profiles")
                  .select("user_id, display_name, avatar_url")
                  .in("user_id", relevantUserIds)
              : Promise.resolve({ data: [], error: null }),
          ]);

          if (workbookResult.error) {
            return {
              matchingHref,
              workbookHref: "/dashboard",
              matchingItems: [],
              workbookItems: [],
            } satisfies ProductNavigationTargets;
          }

          const profileByUserId = new Map(
            (((profilesResult.data ?? []) as ProfileListRow[]) ?? []).map((row) => [
              row.user_id,
              {
                displayName: row.display_name?.trim() ?? "",
                avatarUrl: row.avatar_url?.trim() ?? "",
              },
            ])
          );
          const workbookRows = ((workbookResult.data ?? []) as WorkbookDashboardRow[]).map((row) => {
            const payload = sanitizeFounderAlignmentWorkbookPayload(row.payload);
            const invitation = invitationById.get(row.invitation_id) ?? null;
            const state = deriveWorkbookNavigationState(payload, invitation?.teamContext ?? null);
            return {
              href: buildWorkbookHref(row.invitation_id, invitation?.teamContext ?? null),
              hasStarted: state.hasStarted,
              updatedAt: row.updated_at,
              invitationId: row.invitation_id,
              state,
            };
          });
          const workbookByInvitationId = new Map(workbookRows.map((row) => [row.invitationId, row]));

          const matchingItems = invitationRows
            .filter((invitation) => reportRuns.some((run) => run.invitation_id === invitation.id))
            .map((invitation) => {
              const reportRun =
                reportRuns.find((run) => run.invitation_id === invitation.id) ?? null;
              const counterpartProfile =
                invitation.direction === "sent"
                  ? invitation.inviteeUserId
                    ? profileByUserId.get(invitation.inviteeUserId)
                    : null
                  : profileByUserId.get(invitation.inviterUserId) ?? null;
              const fallbackCounterpartName =
                invitation.direction === "sent"
                  ? invitation.label?.trim() || fallbackNameFromEmail(invitation.inviteeEmail)
                  : invitation.inviterDisplayName?.trim() ||
                    fallbackNameFromEmail(invitation.inviterEmail);
              const counterpartName =
                counterpartProfile?.displayName || fallbackCounterpartName || "Founder";

              return {
                id: invitation.id,
                href: `/report/${encodeURIComponent(invitation.id)}`,
                title: counterpartName,
                subtitle: `${teamContextLabel(invitation.teamContext)} · ${formatNavigationTimestamp(
                  reportRun?.created_at ?? invitation.createdAt
                )}`,
                statusLabel: "Report bereit",
                avatarLabel: buildAvatarLabel(counterpartName),
                avatarUrl: counterpartProfile?.avatarUrl || null,
                statusKind: "ready" as const,
                sortDate: reportRun?.created_at ?? invitation.createdAt,
                _sortDate: reportRun?.created_at ?? invitation.createdAt,
              } satisfies ProductNavigationContextItem & { _sortDate: string };
            })
            .sort((left, right) => right._sortDate.localeCompare(left._sortDate, "de"))
            .map((item) => {
              const { _sortDate: _ignoredSortDate, ...navigationItem } = item;
              void _ignoredSortDate;
              return navigationItem satisfies ProductNavigationContextItem;
            });

          const workbookItems = invitationRows
            .filter((invitation) => {
              const workbook = workbookByInvitationId.get(invitation.id) ?? null;
              const reportReady = reportRuns.some((run) => run.invitation_id === invitation.id);
              return Boolean(workbook || reportReady);
            })
            .map((invitation) => {
              const workbook = workbookByInvitationId.get(invitation.id) ?? null;
              const reportRun =
                reportRuns.find((run) => run.invitation_id === invitation.id) ?? null;
              const counterpartProfile =
                invitation.direction === "sent"
                  ? invitation.inviteeUserId
                    ? profileByUserId.get(invitation.inviteeUserId)
                    : null
                  : profileByUserId.get(invitation.inviterUserId) ?? null;
              const fallbackCounterpartName =
                invitation.direction === "sent"
                  ? invitation.label?.trim() || fallbackNameFromEmail(invitation.inviteeEmail)
                  : invitation.inviterDisplayName?.trim() ||
                    fallbackNameFromEmail(invitation.inviterEmail);
              const counterpartName =
                counterpartProfile?.displayName || fallbackCounterpartName || "Founder";
              const workbookState =
                workbook?.state ?? {
                  statusKind: "ready" as const,
                  statusLabel: "Workbook bereit",
                };
              const hasStarted = workbookState.statusKind !== "ready";
              const workbookHrefForItem = hasStarted
                ? buildWorkbookHref(invitation.id, invitation.teamContext)
                : buildWorkbookIntroHref(invitation.id, invitation.teamContext);

              return {
                id: invitation.id,
                href: workbookHrefForItem,
                title: counterpartName,
                subtitle: `${teamContextLabel(invitation.teamContext)} · ${formatNavigationTimestamp(
                  workbook?.updatedAt ?? reportRun?.created_at ?? invitation.createdAt
                )}`,
                statusLabel: workbookState.statusLabel,
                avatarLabel: buildAvatarLabel(counterpartName),
                avatarUrl: counterpartProfile?.avatarUrl || null,
                statusKind: workbookState.statusKind,
                sortDate: workbook?.updatedAt ?? reportRun?.created_at ?? invitation.createdAt,
                _sortDate: workbook?.updatedAt ?? reportRun?.created_at ?? invitation.createdAt,
              } satisfies ProductNavigationContextItem & { _sortDate: string };
            })
            .sort((left, right) => right._sortDate.localeCompare(left._sortDate, "de"))
            .map((item) => {
              const { _sortDate: _ignoredSortDate, ...navigationItem } = item;
              void _ignoredSortDate;
              return navigationItem satisfies ProductNavigationContextItem;
            });

          const latestActiveWorkbook = workbookRows.find((row) => row.hasStarted) ?? null;
          if (latestActiveWorkbook) {
            return {
              matchingHref,
              workbookHref: latestActiveWorkbook.href,
              matchingItems,
              workbookItems,
            } satisfies ProductNavigationTargets;
          }

          if (latestReport) {
            const invitation = invitationById.get(latestReport.invitation_id) ?? null;
            return {
              matchingHref,
              workbookHref: buildWorkbookIntroHref(
                latestReport.invitation_id,
                invitation?.teamContext ?? null
              ),
              matchingItems,
              workbookItems,
            } satisfies ProductNavigationTargets;
          }

          return {
            matchingHref,
            workbookHref: "/dashboard",
            matchingItems,
            workbookItems,
          } satisfies ProductNavigationTargets;
        })(),
      ])
    : [
        {
          hasFounder: false,
          hasAdvisor: false,
          roles: [],
        },
        null,
        {
          matchingHref: "/dashboard#dashboard-block-active",
          workbookHref: "/dashboard",
          matchingItems: [],
          workbookItems: [],
        } satisfies ProductNavigationTargets,
      ];
  const displayName =
    profileData?.display_name?.trim() ||
    user?.user_metadata?.display_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <html lang="de" className={`${spectral.variable} ${unbounded.variable}`}>
      <body>
        <ProductShell
          hasFounder={roleViews.hasFounder}
          hasAdvisor={roleViews.hasAdvisor}
          displayName={displayName}
          matchingHref={navigationTargets.matchingHref}
          workbookHref={navigationTargets.workbookHref}
          matchingItems={navigationTargets.matchingItems}
          workbookItems={navigationTargets.workbookItems}
        >
          {children}
        </ProductShell>
      </body>
    </html>
  );
}
