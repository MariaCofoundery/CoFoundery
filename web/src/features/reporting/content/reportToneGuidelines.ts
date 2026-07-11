export const REPORT_TONE_GUIDELINES = [
  {
    key: "no_diagnostic_language",
    rule: "Avoid diagnostic or clinical language.",
    rationale: "Cofoundery reports describe collaboration patterns, not psychological conditions.",
  },
  {
    key: "no_hard_fit_claims",
    rule: "Avoid hard suitability statements.",
    rationale: "Do not call a team a perfect match, bad match, or objectively unsuitable.",
  },
  {
    key: "no_fake_precision",
    rule: "Avoid fake precision and hard percentage promises.",
    rationale: "Scores can orient a conversation, but should not imply certainty.",
  },
  {
    key: "no_raw_answers",
    rule: "Never expose raw assessment answers in report prose.",
    rationale: "Report content should summarize patterns without leaking private inputs.",
  },
  {
    key: "conversation_oriented",
    rule: "Keep the copy conversational and oriented toward shared clarification.",
    rationale: "The report should help founders talk, decide, and write down agreements.",
  },
  {
    key: "actionable_next_step",
    rule: "Prefer concrete next-step language over broad judgment.",
    rationale: "Good report copy helps the team decide what to discuss or test next.",
  },
  {
    key: "careful_psychological_terms",
    rule: "Use psychological terms sparingly and only in non-diagnostic phrasing.",
    rationale: "The product is not a clinical or personality assessment.",
  },
] as const;

export const REPORT_COPY_QUALITY_PRINCIPLES = {
  audience: "Founders and advisors using the report as a shared working document.",
  stance: "Careful, practical, and non-diagnostic.",
  englishStyle: "Natural product English, not literal German translation.",
  contentBoundary: "UI chrome can be localized at render time; generated report content should be created in the target locale and stored with payload.locale.",
} as const;
