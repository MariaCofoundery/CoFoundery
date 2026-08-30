export function founderInTheWildEntryHref(teamId: string) {
  return `/teams/${encodeURIComponent(teamId)}/collaboration-lab/founder-in-the-wild`;
}

export function founderInTheWildRoundHref(teamId: string, roundId: string) {
  return `${founderInTheWildEntryHref(teamId)}/${encodeURIComponent(roundId)}`;
}

export function founderInTheWildRevealHref(teamId: string, roundId: string, position?: number) {
  return `${founderInTheWildRoundHref(teamId, roundId)}/reveal${position === undefined ? "" : `/${position}`}`;
}
