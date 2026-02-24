import { Suspense } from "react";
import JoinClient from "./JoinClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-600">Lade Einladung…</div>}>
      <JoinClient />
    </Suspense>
  );
}
