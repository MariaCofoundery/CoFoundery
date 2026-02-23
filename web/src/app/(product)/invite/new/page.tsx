import { redirect } from "next/navigation";
import { CoFounderInviteForm } from "@/features/dashboard/CoFounderInviteForm";
import { createClient } from "@/lib/supabase/server";

export default async function NewInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/invite/new");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <div className="mb-6">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück zum Dashboard
        </a>
      </div>
      <CoFounderInviteForm />
    </main>
  );
}
