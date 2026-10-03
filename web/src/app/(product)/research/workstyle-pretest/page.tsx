import type { Metadata } from "next";
import Link from "next/link";
import { getRequestUser } from "@/lib/supabase/server";
import { getMyWorkstylePretest } from "@/features/instruments/workstyle/data";
import { WorkstylePretest } from "@/features/instruments/workstyle/WorkstylePretest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Founder Workstyle – Research-Pretest", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function WorkstylePretestPage() {
  const { data: { user } } = await getRequestUser();
  return <main lang="de" className="mx-auto max-w-3xl px-4 py-10 text-slate-900">
    <p className="text-sm font-semibold text-violet-700">Forschung · Entwicklungsfassung 8.5a-v1</p>
    <h1 className="mt-2 text-3xl font-semibold">Wie arbeitest du als Founder?</h1>
    <p className="mt-4 leading-7">20 gemeinsame Fragen zu deiner Arbeitsweise, danach 5–6 zusätzliche Forschungsfragen. Es gibt keine richtigen oder falschen Antworten und keinen Matchscore.</p>
    {user ? <WorkstylePretest initialSession={await getMyWorkstylePretest()} /> : <p className="mt-6"><Link className="underline" href="/login?next=/research/workstyle-pretest">Anmelden und den Pretest kennenlernen</Link>. Vor der Teilnahme entscheidest du separat über die Forschungseinwilligung.</p>}
  </main>;
}
