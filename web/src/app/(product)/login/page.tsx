import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/features/auth/MagicLinkForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        <p className="text-xs tracking-[0.14em] text-[color:var(--ink-soft)]">Login</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">CoFoundery Align</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          Melde dich per Magic Link an. Es gibt keine Passwoerter und keine anonymen Flows.
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          Wenn keine Mail ankommt, pruefe bitte auch deinen Spam-Ordner.
        </p>
        {params.error ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Callback-Fehler: {params.error}
          </p>
        ) : null}
        <div className="mt-6">
          <MagicLinkForm nextPath={params.next ?? "/dashboard"} />
        </div>
      </section>
    </main>
  );
}
