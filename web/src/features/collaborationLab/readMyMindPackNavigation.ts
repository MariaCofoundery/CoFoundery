import type { ReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import type { ReadMyMindRoundReadModel } from "@/features/collaborationLab/readMyMindModel";

export type ReadMyMindPackNavigationItem = {
  pack: ReadMyMindPack;
  currentRound: ReadMyMindRoundReadModel | null;
  canStart: boolean;
};

export function buildReadMyMindPackNavigation(
  packs: readonly ReadMyMindPack[],
  openRounds: readonly ReadMyMindRoundReadModel[]
): ReadMyMindPackNavigationItem[] {
  const hasUnfinishedCreatorTurn = openRounds.some(
    (round) =>
      round.status === "forming" &&
      round.ownParticipantState === "joined" &&
      round.handoffReadyAt === null
  );
  return packs.map((pack) => {
    const currentRound = openRounds.find(
      (round) => round.pack.key === pack.key && round.pack.version === pack.version
    ) ?? null;
    return {
      pack,
      currentRound,
      canStart: currentRound === null && !hasUnfinishedCreatorTurn,
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
