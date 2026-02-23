import { Suspense } from "react";
import JoinClient from "./JoinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function JoinLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Einladung wird geprüft</h1>
        <p className="mt-2 text-sm text-slate-600">Wir bereiten deinen Einstieg vor.</p>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<JoinLoading />}>
      <JoinClient />
    </Suspense>
  );
}
