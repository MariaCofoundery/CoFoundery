import {
  saveFounderDiscoveryProfileAction,
  unsaveFounderDiscoveryProfileAction,
} from "@/features/discovery/discoverySaveActions";

export function FounderDiscoverySaveButton({
  profileId,
  saved,
  saveLabel,
  savedLabel,
}: {
  profileId: string;
  saved: boolean;
  saveLabel: string;
  savedLabel: string;
}) {
  const action = saved
    ? unsaveFounderDiscoveryProfileAction.bind(null, profileId)
    : saveFounderDiscoveryProfileAction.bind(null, profileId);

  return (
    <form action={action}>
      <button
        type="submit"
        aria-pressed={saved}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7A1.75 1.75 0 0 1 17.25 4.75V21L12 17.75 6.75 21V4.75Z" />
        </svg>
        {saved ? savedLabel : saveLabel}
      </button>
    </form>
  );
}
