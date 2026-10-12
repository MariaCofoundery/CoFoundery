/** English display copy only; no scoring, classification or selection rules. */
export const AREAS_EN = {
  EVI: { title: "How you review decisions", team: "Reviewing decisions" },
  EXP: { title: "How you draw on experience", team: "Drawing on experience" },
  EL: { title: "How you learn by trying things out", team: "Learning by trying things out" },
  VOICE: { title: "How you raise concerns", team: "Raising concerns" },
  AMB: { title: "How you feel when things are unclear", team: "Feeling uncertain" },
  ORG: { title: "How you organize your work", team: "Organizing work" },
};
export const SITUATIONS_EN: Record<string, string> = {
  "EVI-01": "looking for counterarguments when one option immediately appeals to you",
  "EVI-02": "checking an uncertain assumption before deciding",
  "EVI-03": "reconsidering a decision when clear contrary information emerges",
  "EVI-05": "reviewing your assessment when someone raises a counterpoint you can understand",
  "EVI-06": "investigating a disagreement between reliable sources",
  "EXP-01": "taking a familiar impression seriously before you can explain it",
  "EXP-02": "drawing on experience when a solution looks convincing on paper",
  "EXP-03": "drawing on experience when two options look equally good",
  "EXP-04": "drawing on experience with a problem you have encountered repeatedly",
  "EXP-06": "drawing on experience when information is missing but you know the subject well",
  "EL-01": "testing something before choosing between two approaches",
  "EL-02": "suggesting a test when a discussion is not moving forward",
  "EL-04": "showing or letting others try a simple version early",
  "EL-05": "deliberately changing something and trying again after an inconclusive attempt",
  "VOICE-01": "raising a counterpoint after the group has agreed",
  "VOICE-02": "raising something uncomfortable soon",
  "VOICE-03": "bringing up a postponed, unresolved topic yourself",
  "VOICE-04": "saying that you assess a decision differently from a professional perspective",
  "VOICE-05": "saying you are not ready when the group wants to close a topic",
  "AMB-01": "receiving contradictory feedback on the same idea",
  "AMB-02": "having several plausible explanations that cannot currently be resolved",
  "AMB-04": "receiving new information that leaves even more possibilities open",
  "AMB-05": "continuing work with an important question still open",
  "ORG-01": "clarifying next steps before starting a larger venture",
  "ORG-02": "setting your own checkpoints for longer tasks",
};
export const PREFERENCES_EN: Record<string, { context: string; A: string; B: string }> = {
  "ORG-03": { context: "When several important tasks compete", A: "you {preference} keep several moving in parallel", B: "you {preference} focus on fewer tasks and let others wait" },
  "ORG-04": { context: "When a task takes longer than expected", A: "you {preference} finish it as planned first", B: "you {preference} adjust your remaining plan early" },
  "ORG-07": { context: "When an important new request arrives during focused work", A: "you {preference} interrupt your work and take care of it", B: "you {preference} stay with your current work" },
  "ORG-08": { context: "When several small things turn out differently than planned", A: "you {preference} change your plan only when the deviations matter", B: "you {preference} adjust your plan even for smaller changes" },
};
export const POLES_EN = {
  EVI: { left: "keep the first assessment", right: "take another close look" },
  EXP: { left: "assess with fresh eyes", right: "draw on experience" },
  EL: { left: "clarify first", right: "try it first" },
  VOICE: { left: "wait first", right: "raise it right away" },
  AMB: { left: "uncertainty feels okay", right: "uncertainty feels uncomfortable" },
  ORG: { left: "get started", right: "clarify the steps first" },
};
export const COPY_EN = {
  EVI: {
    direction: { upper: "When a decision is coming up, you prefer to take another close look: you look for counterarguments, check uncertain assumptions, and investigate information that points against it.", lower: "You tend to let an established assessment stand. In these situations, deliberately looking for counterarguments or investigating contrary information is less likely to be your next step.", middle: "In most situations, you leave it open whether you would review an assessment again: sometimes yes, sometimes no." },
    mixed: "It depends on the situation: you let some assessments stand and take another close look at others.",
    short: { upper: "You prefer another close look.", lower: "You tend to keep the first assessment.", middle: "Usually somewhere in between.", mixed: "It depends on the situation." },
    bands: { upper: "Here you tend to check again", middle: "Here it depends", lower: "Here you tend to let it stand" },
    question: { upper: "How do you recognize when you have checked enough to decide?", lower: "What new information would give you a good reason to revisit a decision?", open: "When is a decision worth revisiting, and when do you deliberately let it stand?" },
  },
  EXP: {
    direction: { upper: "When a situation feels familiar, you draw strongly on past experience, even when a solution looks convincing on paper or information is missing.", lower: "Past experience plays a smaller part in your assessment. You prefer to look at a situation with fresh eyes, even when it feels familiar.", middle: "Past experience plays some part for you: it is one source of guidance among others." },
    mixed: "Experience is one source of guidance among others. You rely on it strongly in some situations and less in others.",
    short: { upper: "You draw on experience.", lower: "You prefer a fresh assessment.", middle: "Experience plays some part.", mixed: "It depends on the situation." },
    bands: { upper: "Experience matters strongly here", middle: "Experience plays some part here", lower: "Experience matters less here" },
    question: { upper: "How do you recognize whether a past experience applies to the current situation?", lower: "In which situations would you want to ask specifically about past experience?", open: "When do you draw on experience, and when do you prefer to look with fresh eyes?" },
  },
  EL: {
    direction: { upper: "When something can be tested with little effort, you prefer trying it on a small scale to discussing it at length.", lower: "Even when something could be tested on a small scale, you prefer to clarify things before trying it.", middle: "In most situations, you leave it open whether you would try something first or clarify things first." },
    mixed: "Whether you test first or clarify first depends on the situation.",
    short: { upper: "You prefer trying it first.", lower: "You prefer clarifying first.", middle: "Usually somewhere in between.", mixed: "It depends on the situation." },
    bands: { upper: "Here you tend to try it", middle: "Here it depends", lower: "Here you tend to clarify first" },
    question: { upper: "When would a test tell you more than another discussion, and what would you do with the result?", lower: "Which questions would you consider testing on a small scale, and which would you not?", open: "When do you prefer to try something, and when do you want to know more first?" },
  },
  VOICE: {
    direction: { upper: "When you notice something important, you raise it, even when others have already agreed or are almost finished.", lower: "You tend not to raise concerns or unresolved points straight away yourself when the group has already agreed or wants to close a topic.", middle: "In most situations, you leave it open whether you would raise a concern straight away." },
    mixed: "You raise some concerns straight away and wait with others. It depends on the situation.",
    short: { upper: "You raise things straight away.", lower: "You tend to wait first.", middle: "Usually somewhere in between.", mixed: "It depends on the situation." },
    bands: { upper: "Here you tend to raise it", middle: "Here it depends", lower: "Here you tend to wait" },
    question: { upper: "How would you like to handle a late concern when a decision has already been made?", lower: "In which situations would you want to raise a concern straight away anyway?", open: "When do you raise a concern straight away, and when do you prefer to wait?" },
  },
  AMB: {
    direction: { upper: "You tend to find unresolved questions uncomfortable, such as contradictory feedback or several possible explanations.", lower: "You tend not to find unresolved questions uncomfortable, even with contradictory feedback or several possible explanations.", middle: "You find some unclear situations uncomfortable and others not." },
    mixed: "You find some unclear situations uncomfortable and others not. It depends on the situation.",
    short: { upper: "Uncertainty tends to feel uncomfortable.", lower: "Uncertainty feels okay to you.", middle: "Sometimes uncomfortable, sometimes okay.", mixed: "It depends on the situation." },
    bands: { upper: "You tend to find this uncomfortable", middle: "You sometimes feel this way", lower: "You tend not to find this uncomfortable" },
    question: { upper: "What do you need to keep working well while an important question remains open?", lower: "How do you respond when unresolved questions feel more uncomfortable to others than to you?", open: "Which kinds of unresolved questions feel uncomfortable to you, and which do not?" },
    note: "This describes how you feel, not how you act in the situation.",
  },
  ORG: {
    direction: { upper: "For larger tasks, you first clarify the next steps and set your own checkpoints.", lower: "For larger tasks, you tend to get started rather than first setting out the next steps and checkpoints.", middle: "You usually leave it open whether you would clarify the steps before starting larger tasks." },
    mixed: "For larger tasks, you sometimes set out the steps first and sometimes get started and organize things along the way. It depends on the task.",
    short: { upper: "You clarify the steps first.", lower: "You prefer getting started.", middle: "Usually somewhere in between.", mixed: "It depends on the task." },
    bands: { upper: "Here you tend to clarify the steps first", middle: "Here it depends", lower: "Here you tend to get started" },
    question: { upper: "How much structure do you need in advance, and when does it become too much?", lower: "How much shared planning helps before you start something larger with others?", open: "When does a plan help you, and when do you prefer working without one?" },
  },
};
export const TEAM_EN = {
  EVI: {
    similar: { upper: { text: "You {all} prefer another close look before a decision is final.", question: "How do you decide when information remains incomplete, and who starts putting the decision into practice?" }, lower: { text: "You {all} tend to let the first assessment stand rather than deliberately look for counterarguments.", question: "How do you recognize when a decision should be revisited?" } },
    differs: { summary: "In some situations your responses are close, and in others you would respond differently. This is particularly visible in when you would revisit a decision.", text: "When deciding together, one person may want to check an assessment again while another wants to move forward. You may see the point at which a decision is final differently. These approaches could complement each other if you agree in advance when to revisit a decision.", question: "What new information would lead you to revisit a decision, and who can initiate that?" },
    card: { label: "Decisions", question: "When do we revisit a decision, and when do we deliberately let it stand?" },
  },
  EXP: {
    similar: { upper: { text: "You {all} draw strongly on past experience. It becomes interesting when your experiences point in different directions.", question: "What is different about a new situation compared with your past experiences?" }, lower: { text: "Past experience plays a smaller part for {all} of you. You prefer a fresh assessment.", question: "What do you already know from similar situations that could help here?" } },
    differs: { summary: "You draw on experience to a similar extent in some situations and to different extents in others, such as when information is missing or a solution looks convincing on paper.", text: "When assessing a situation, one person may rely more strongly on experience than another. You may assess the same situation differently. These approaches could complement each other if you explain the experience and check together whether it applies to the current case.", question: "How do you recognize whether a past experience applies to the current situation?" },
    card: { label: "Experience", question: "Whose experience guides us when our experiences point in different directions?" },
  },
  EL: {
    similar: { upper: { text: "When something can be tested on a small scale, you {all} prefer trying it to discussing it at length.", question: "When does a test tell you enough, and who reviews the result?" }, lower: { text: "You {all} prefer to clarify things before trying something on a small scale.", question: "Which unresolved question would you consider testing on a small scale?" } },
    differs: { summary: "When something could be tested on a small scale, you would sometimes take different approaches: one person would prefer trying it, another would prefer clarifying things first.", text: "With unresolved questions, one person may want to try something early while another prefers to clarify things first. You may differ on when a test is the next step. Agreeing in advance when to move from discussion to testing may help.", question: "How do you proceed when one person wants to test and another still wants to clarify open questions?" },
    card: { label: "Trying things out", question: "When do we test on a small scale, and when do we keep clarifying things first?" },
  },
  VOICE: {
    similar: { upper: { text: "You {all} raise what you notice, even shortly before a discussion closes.", question: "When is a decision final for you, and what happens with a late concern?" }, lower: { text: "You {all} tend to wait rather than raise concerns straight away when the group has already agreed.", question: "When do you explicitly ask about concerns before closing a topic?" } },
    differs: { summary: "In some situations you would raise concerns at similar points, and in others at different points, such as when the group wants to close a topic.", text: "In discussions, one person may raise concerns sooner than another, so concerns may become visible at different times. Regular opportunities for questions before closing a topic may help.", question: "How can someone raise a concern when the group is ready to decide?" },
    card: { label: "Concerns", question: "How do we leave room for doubts even when we are almost finished?" },
  },
  AMB: {
    similar: { upper: { text: "Unresolved questions tend to feel uncomfortable to {all} of you. This describes how you feel, not how you act.", question: "How do you keep track of unresolved questions so that you can still keep working?" }, lower: { text: "Unresolved questions tend not to feel uncomfortable to {all} of you. This describes how you feel, not how you act.", question: "How do you keep track of unresolved questions even when they do not bother you much?" } },
    differs: { summary: "Unresolved questions feel different to you: what feels uncomfortable to one person may feel okay to another. This describes how you feel, not how you act.", text: "When much remains unclear, unresolved situations may feel more uncomfortable to one person than another. You may need different amounts of clarification before continuing. This describes feelings, not actions. Recording open questions and the next step separately may help.", question: "What do you need to keep working while an important question remains open?" },
    card: { label: "Open questions", question: "How long do we leave an important question open before continuing anyway?" },
  },
  ORG: {
    similar: { upper: { text: "For larger tasks, you {all} like to clarify next steps and set checkpoints first.", question: "Who adjusts your shared plan when circumstances change?" }, lower: { text: "For larger tasks, you {all} tend to get started rather than first setting out the next steps.", question: "How much shared planning do you need before starting?" } },
    differs: { summary: "For larger tasks, you would sometimes take different approaches: one person wants to clarify the steps first, another would prefer getting started.", text: "For larger ventures, one person may clarify next steps first while another prefers getting started. You may expect different amounts of shared planning before starting.", question: "How much shared planning do you need before starting?" },
    card: { label: "Organizing work", question: "How much planning do we need before starting, and when do we adjust it?" },
  },
};
export const ORG_DIFFERS_EN: Record<string, { summary: string; text: string; question: string }> = {
  "ORG-03": { summary: "When several important tasks compete, you would take different approaches: keep several moving in parallel or focus on fewer tasks.", text: "When tasks compete, one person may keep several moving while another prefers to focus on fewer. You may have different expectations about priorities and response times.", question: "How do you recognize what takes priority, and when can someone be interrupted?" },
  "ORG-07": { summary: "When something new comes in during focused work, you would respond differently: interrupt straight away or first stay with the current task.", text: "When new requests arrive during focused work, one person may interrupt while another stays with the current task. You may differ on what needs immediate attention.", question: "What counts as urgent enough to interrupt ongoing work?" },
  "ORG-04": { summary: "When a task takes longer than expected, you would take different approaches: finish it as planned first or adjust the plan early.", text: "When a task takes longer than expected, one person may finish it as planned first while another adjusts the remaining plan early. You may differ on when to rearrange the shared plan.", question: "When do you rearrange a shared plan if a task takes longer, and who raises this?" },
  "ORG-08": { summary: "When smaller things turn out differently than planned, you would adjust the plan at different points.", text: "With smaller deviations, one person may adjust the plan early while another waits until the deviations matter. You may differ on when a change affects the shared plan.", question: "At what point does a deviation affect your shared plan, and who raises it?" },
};
