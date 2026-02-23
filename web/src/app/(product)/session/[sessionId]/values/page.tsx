import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ValuesQuestionnairePage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/session/${sessionId}/values`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h1 className="text-xl font-semibold text-slate-900">Values-Flow wird umgestellt</h1>
        <p className="mt-3 text-sm text-slate-700">
          TEMP: Die Session-basierte Values-Seite ist deaktiviert. Antworten laufen über Assessments
          (latest-per-user-per-module).
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
