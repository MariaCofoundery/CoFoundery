import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ParticipantBPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/session/${sessionId}/b`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Legacy Session Flow deaktiviert</h1>
        <p className="mt-2 text-sm text-slate-700">
          TEMP: Die B-Teilnahme läuft nicht mehr über `sessions/participants/responses`.
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Zum Dashboard
        </a>
      </section>
    </main>
  );
}
