import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProductShell } from "@/features/navigation/ProductShell";
import { sanitizeFounderAlignmentWorkbookPayload } from "@/features/reporting/founderAlignmentWorkbook";
import {
  getInvitationDashboardRows,
  type InvitationDashboardRow,
} from "@/features/reporting/actions";
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
  title: "CoFoundery Align | Co-Founder Matching mit Werte-Fokus",
  description:
    "CoFoundery Align verbindet Mitgründer:innen nach Werten, Vision und Arbeitsstil. Werte zuerst – Fähigkeiten als Ergänzung.",
};

function buildWorkbookHref(
  invitationId: string,
  teamContext: InvitationDashboardRow["teamContext"] | null
) {
  const base = `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId)}`;
  return teamContext ? `${base}&teamContext=${encodeURIComponent(teamContext)}` : base;
}

function countWorkbookContentSignals(
  payload: ReturnType<typeof sanitizeFounderAlignmentWorkbookPayload>
) {
  let count = 0;

  for (const step of Object.values(payload.steps)) {
    if (step.founderA.trim()) count += 1;
    if (step.founderB.trim()) count += 1;
    if (step.agreement.trim()) count += 1;
    if (step.advisorNotes.trim()) count += 1;
  }

  if (payload.advisorClosing.observations.trim()) count += 1;
  if (payload.advisorClosing.questions.trim()) count += 1;
  if (payload.advisorClosing.nextSteps.trim()) count += 1;
  if (payload.founderReaction.status) count += 1;
  if (payload.founderReaction.comment.trim()) count += 1;

  return count;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [roleViews, profileData, workbookHref] = user
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
            return "/dashboard";
          }

          const reportRuns = (reportRunsResult.data ?? []) as ReportRunRow[];
          const invitationById = new Map(invitationRows.map((invitation) => [invitation.id, invitation]));
          const readyReportInvitationIds = new Set(reportRuns.map((run) => run.invitation_id));
          const relevantInvitationIds = [
            ...new Set([
              ...invitationRows.map((invitation) => invitation.id),
              ...reportRuns.map((run) => run.invitation_id),
            ]),
          ];

          if (relevantInvitationIds.length === 0) {
            return "/dashboard";
          }

          const workbookResult = await supabase
            .from("founder_alignment_workbooks")
            .select("invitation_id, updated_at, payload")
            .in("invitation_id", relevantInvitationIds)
            .order("updated_at", { ascending: false });

          if (workbookResult.error) {
            return "/dashboard";
          }

          const workbookRows = ((workbookResult.data ?? []) as WorkbookDashboardRow[]).map((row) => {
            const payload = sanitizeFounderAlignmentWorkbookPayload(row.payload);
            const invitation = invitationById.get(row.invitation_id) ?? null;
            return {
              href: buildWorkbookHref(row.invitation_id, invitation?.teamContext ?? null),
              hasStarted: countWorkbookContentSignals(payload) > 0,
              updatedAt: row.updated_at,
              invitationId: row.invitation_id,
            };
          });

          const latestActiveWorkbook = workbookRows.find((row) => row.hasStarted) ?? null;
          if (latestActiveWorkbook) {
            return latestActiveWorkbook.href;
          }

          const latestReadyReport = reportRuns.find((run) => readyReportInvitationIds.has(run.invitation_id)) ?? null;
          if (latestReadyReport) {
            const invitation = invitationById.get(latestReadyReport.invitation_id) ?? null;
            return buildWorkbookHref(latestReadyReport.invitation_id, invitation?.teamContext ?? null);
          }

          return "/dashboard";
        })(),
      ])
    : [
        {
          hasFounder: false,
          hasAdvisor: false,
          roles: [],
        },
        null,
        "/dashboard",
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
          workbookHref={workbookHref}
        >
          {children}
        </ProductShell>
      </body>
    </html>
  );
}
