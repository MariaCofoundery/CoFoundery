import {
  buildCommitmentLabSnapshot,
  type CommitmentLabDiscussionMarker,
  type CommitmentLabFounderEntry,
  type CommitmentLabObligation,
} from "@/features/commitmentLab/commitmentLabModel";

type Labels = {
  time: string;
  currentHours: (hours: number) => string;
  difficultHours: (hours: number) => string;
  framework: string;
  changes: string;
  meaning: string;
  difficult: string;
  desired: string;
  markers: string;
};

export function CommitmentLabSnapshotCard({
  entry,
  founderName,
  labels,
  obligationLabel,
  markerLabel,
}: {
  entry: CommitmentLabFounderEntry;
  founderName?: string;
  labels: Labels;
  obligationLabel: (obligation: CommitmentLabObligation) => string;
  markerLabel: (marker: CommitmentLabDiscussionMarker) => string;
}) {
  const snapshot = buildCommitmentLabSnapshot(entry);
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      {founderName ? <h3 className="font-semibold text-slate-950">{founderName}</h3> : null}
      <dl className={founderName ? "mt-4 grid gap-4" : "grid gap-4"}>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{labels.time}</dt>
          <dd className="mt-1 text-sm leading-6 text-slate-800">
            {snapshot.currentHours != null ? labels.currentHours(snapshot.currentHours) : null}
            {snapshot.currentHours != null && snapshot.difficultWeekHours != null ? " · " : null}
            {snapshot.difficultWeekHours != null ? labels.difficultHours(snapshot.difficultWeekHours) : null}
          </dd>
        </div>
        {snapshot.obligationCategories.length || snapshot.changeNote ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{labels.framework}</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-800">
              {snapshot.obligationCategories.length
                ? snapshot.obligationCategories.map(obligationLabel).join(" · ")
                : null}
              {snapshot.changeNote ? <p className="mt-2 whitespace-pre-wrap">{labels.changes}: {snapshot.changeNote}</p> : null}
            </dd>
          </div>
        ) : null}
        {snapshot.commitmentMeaning ? <SnapshotText label={labels.meaning} value={snapshot.commitmentMeaning} /> : null}
        {snapshot.difficultSituation ? <SnapshotText label={labels.difficult} value={snapshot.difficultSituation} /> : null}
        {snapshot.desiredAlternative ? <SnapshotText label={labels.desired} value={snapshot.desiredAlternative} /> : null}
        {snapshot.discussionMarkers.length ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{labels.markers}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {snapshot.discussionMarkers.map((marker) => (
                <span key={marker} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900">
                  {markerLabel(marker)}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function SnapshotText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  );
}
