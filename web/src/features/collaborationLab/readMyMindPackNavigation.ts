import type { ReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import type { ReadMyMindRoundReadModel } from "@/features/collaborationLab/readMyMindModel";

export type ReadMyMindPackNavigationItem = {
  pack: ReadMyMindPack;
  isCurrent: boolean;
  canStart: boolean;
};

export function buildReadMyMindPackNavigation(
  packs: readonly ReadMyMindPack[],
  openRound: ReadMyMindRoundReadModel | null
): ReadMyMindPackNavigationItem[] {
  return packs.map((pack) => {
    const isCurrent = Boolean(
      openRound && openRound.pack.key === pack.key && openRound.pack.version === pack.version
    );
    return {
      pack,
      isCurrent,
      canStart: openRound === null,
    };
  });
}

export function hasReadMyMindOwnResponses(round: ReadMyMindRoundReadModel): boolean {
  return round.prompts.some((prompt) =>
    [prompt.self, prompt.guess, ...(prompt.need ? [prompt.need] : [])].some(
      (slot) => slot.lockedAt !== null
    )
  );
}

export function shouldShowReadMyMindIntro(
  round: ReadMyMindRoundReadModel,
  introDismissed: boolean
): boolean {
  return (
    !introDismissed &&
    round.ownParticipantState === "joined" &&
    (round.status === "forming" || round.status === "active") &&
    !hasReadMyMindOwnResponses(round)
  );
}
