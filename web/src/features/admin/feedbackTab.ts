import { FEEDBACK_AREAS, FEEDBACK_KINDS, feedbackAreaOf, feedbackKindOf, type FeedbackArea, type FeedbackKind } from "@/features/feedback/feedbackModel";

export const FEEDBACK_TABS = ["new", "all", "read"] as const;
export type FeedbackTab = (typeof FEEDBACK_TABS)[number];

export function parseFeedbackTab(value: string | undefined): FeedbackTab {
  return (FEEDBACK_TABS as readonly string[]).includes(value ?? "") ? (value as FeedbackTab) : "new";
}

/** Die Filter im Admin-Bereich: nur bekannte Arten und Bereiche, alles andere heisst "kein Filter". */
export const parseFeedbackKind = (value: string | undefined): FeedbackKind | null => feedbackKindOf(value);
export const parseFeedbackArea = (value: string | undefined): FeedbackArea | null => feedbackAreaOf(value);
export { FEEDBACK_AREAS, FEEDBACK_KINDS };
