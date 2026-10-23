export const FEEDBACK_TABS = ["new", "all", "read"] as const;
export type FeedbackTab = (typeof FEEDBACK_TABS)[number];

export function parseFeedbackTab(value: string | undefined): FeedbackTab {
  return (FEEDBACK_TABS as readonly string[]).includes(value ?? "") ? (value as FeedbackTab) : "new";
}
