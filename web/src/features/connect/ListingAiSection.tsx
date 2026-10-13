import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ProposalWatcher } from "@/features/capability/ProposalWatcher";
import { requestListingResourceProposalsAction } from "@/features/connect/connectAiActions";
import type { ListingAiJobState } from "@/features/connect/connectAiData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die freiwillige KI-Hilfe auf der eigenen Eintragsseite.
 *
 * GETRENNT VOM VEROEFFENTLICHEN: Der Eintrag steht schon, bevor hier irgendetwas
 * passiert, und er aendert sich dadurch nicht. Erst dieser Knopf schickt Titel
 * und Beschreibung an das Modell - und der Satz davor sagt, was dann passiert.
 *
 * Die Seite rendert den Abschnitt nur fuer den eigenen, aktiven Eintrag und
 * nur bei erreichbarer KI; die Aktion prueft dasselbe noch einmal.
 */
export async function ListingAiSection({
  listingId,
  jobState,
}: {
  listingId: string;
  jobState: ListingAiJobState;
}) {
  const t = await getTranslations("connect.resources");

  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-lg font-semibold text-slate-950">{t("askTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("askText")}</p>

      {jobState === "open" ? (
        <ProposalWatcher>
          <p role="status" className="mt-4 text-sm leading-6 text-violet-900">
            {t("askRunning")}
          </p>
        </ProposalWatcher>
      ) : (
        <>
          {jobState === "done" ? (
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {t("askDone")}{" "}
              <Link href="/connect/profile" className="font-semibold text-violet-800 hover:underline">
                {t("askDoneLink")}
              </Link>
            </p>
          ) : null}
          {jobState === "failed" ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">{t("askFailed")}</p>
          ) : null}
          <form action={requestListingResourceProposalsAction} className="mt-4">
            <input type="hidden" name="listingId" value={listingId} />
            <SubmitButton
              label={t("ask")}
              pendingLabel={t("askPending")}
              className="inline-flex min-h-11 items-center rounded-full border border-violet-300 bg-white px-5 text-sm font-semibold text-violet-900"
            />
          </form>
        </>
      )}
    </section>
  );
}
