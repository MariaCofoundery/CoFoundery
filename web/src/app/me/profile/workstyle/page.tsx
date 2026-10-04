import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import {
  getProductWorkstyle,
  getProductSnapshot,
} from "@/features/reporting/workstyle/data";
import { saveProductSnapshot } from "@/features/reporting/workstyle/actions";
import { IndividualWorkstyle } from "@/features/reporting/workstyle/IndividualWorkstyle";
import {
  PRODUCT_ITEMS,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import { getShareState } from "@/features/instruments/align/shareData";
import { ShareForm } from "@/features/instruments/align/ShareForm";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Wie du arbeitest",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string; error?: string }>;
}) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=%2Fme%2Fprofile%2Fworkstyle");
  const client = await createClient();
  const query = await searchParams;
  const [current, shares] = await Promise.all([
    getProductWorkstyle(client, user.id),
    getShareState(user.id, "workstyle", null),
  ]);
  const snapshot = query.snapshot
    ? await getProductSnapshot<ProductProfile>(client, query.snapshot)
    : null;
  if (query.snapshot && (!snapshot || snapshot.input.person_id !== user.id))
    notFound();
  const profile = snapshot?.input ?? current;
  return (
    <main className="ws-report mx-auto max-w-4xl px-5 py-10">
      <Link className="ws-no-print underline" href="/me/profile">
        Dein Gesamtprofil
      </Link>
      <h1 className="my-7 text-4xl font-semibold">Wie du arbeitest</h1>
      {profile ? (
        <>
          <div className="ws-no-print mb-7 flex flex-wrap gap-4">
            <PrintReportButton label="Drucken / als PDF speichern" />
            <form action={saveProductSnapshot.bind(null, null)}>
              <button className="min-h-11 rounded-lg border px-4">
                Diesen Stand festhalten
              </button>
            </form>
          </div>
          {query.error && (
            <p role="alert">
              Speichern nicht möglich. Bitte lade deinen Stand neu.
            </p>
          )}
          {snapshot && (
            <p className="mb-5 text-sm">
              Festgehalten am{" "}
              {new Date(snapshot.generated_at).toLocaleString("de-DE")}
            </p>
          )}
          <IndividualWorkstyle profile={profile} />
          <div className="ws-no-print mt-10">
            <ShareForm
              scope="workstyle"
              ventureId={null}
              recipients={shares.recipients}
              hiddenByRecipient={shares.hiddenByRecipient}
              items={PRODUCT_ITEMS.map((i) => ({
                itemId: i.item_key,
                prompt: i.prompt,
              }))}
              label="Dein Arbeitsprofil"
            />
          </div>
        </>
      ) : (
        <p>
          Dein aktuelles Arbeitsprofil ist noch nicht abgeschlossen.{" "}
          <Link className="underline" href="/research/workstyle-pretest">
            Arbeitsprofil kennenlernen
          </Link>
        </p>
      )}
    </main>
  );
}
