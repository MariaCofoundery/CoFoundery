import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wer darf mich sehen - und was.
 *
 * DIE PERSON MUSS DAS SEHEN KÖNNEN, sonst ist die Einwilligung eine einmalige
 * Unterschrift statt einer Entscheidung, die man zurücknehmen kann. Deshalb
 * lesen beide Seiten dieselbe Zeile: die Person, um die es geht, und der
 * Advisor.
 *
 * ---------------------------------------------------------------------------
 * ERGÄNZT AM 26.09.2026: WER FRAGT DA EIGENTLICH?
 * ---------------------------------------------------------------------------
 *
 * Bis hierher gab dieser Leser nur `advisor_user_id` heraus - eine Kennung,
 * die niemandem etwas sagt - und die Anzeige zeigte sie nicht einmal. Eine
 * Founderin sah: den Umfang und eine freiwillige Notiz. Nicht, wer fragt.
 *
 * Sie KONNTE es auch nicht sehen: `person_core` ist owner-only. Deshalb liest
 * dieser Leser jetzt über `get_person_access_requests()` (Migration
 * 20261046120000) - eine enge Funktion, die ausschließlich über die
 * aufrufende Person antwortet.
 *
 * UND ER GRUPPIERT. Vorher stand je Umfang eine eigene Karte; wer nach vier
 * Bereichen gefragt wurde, sah vier zusammenhanglose Karten. Die Entscheidung
 * bleibt je Umfang - das ist der Unterschied zwischen "alles oder nichts" und
 * einer Entscheidung -, aber die Frage "wer will etwas von mir" wird einmal
 * beantwortet und nicht viermal.
 */

export const ADVISOR_SCOPES = [
  "base",
  "alignment_report",
  "capability",
  "capability_depth",
  "strengths",
  "direction",
] as const;
export type AdvisorScope = (typeof ADVISOR_SCOPES)[number];

export type PersonAccessGrant = {
  id: string;
  advisorUserId: string | null;
  scope: AdvisorScope;
  status: "requested" | "active" | "declined" | "revoked";
  requestNote: string | null;
  approvedAt: string | null;
};

export type AccessRequesterOrg = {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  focus: string[];
  locationRegion: string | null;
};

/**
 * Eine Partei, die etwas von mir will.
 *
 * `holder` ist nicht Beiwerk: Er sagt, WER den Zugang behält. Bei einer
 * Organisation bleibt er dort, auch wenn die Person, die gefragt hat, geht -
 * und beim Widerruf wird er ihr entzogen, nicht der Person. Eine Anzeige, die
 * daraus nur "Pia fragt" macht, wäre genau in dem Fall falsch, der zählt.
 */
export type AccessRequester = {
  key: string;
  holder: "org" | "person";
  askedByName: string | null;
  askedByHeadline: string | null;
  org: AccessRequesterOrg | null;
  requested: PersonAccessGrant[];
  active: PersonAccessGrant[];
};

type RequestRow = {
  id: string;
  holder: "org" | "person";
  advisor_user_id: string | null;
  org_id: string | null;
  asked_by_name: string | null;
  asked_by_headline: string | null;
  org_name: string | null;
  org_description: string | null;
  org_website_url: string | null;
  org_focus: string[] | null;
  org_location_region: string | null;
  scope: AdvisorScope;
  status: PersonAccessGrant["status"];
  request_note: string | null;
  approved_at: string | null;
};

/**
 * Was gerade gilt und was gefragt wurde - abgelehnte und widerrufene bleiben
 * weg.
 *
 * Nicht, weil sie unwichtig wären, sondern weil diese Liste eine Entscheidung
 * verlangt: Wer hier steht, ist entweder zu beantworten oder zurückzunehmen.
 * Eine Liste mit allem Vergangenen wäre ein Archiv, und darin übersieht man
 * die offene Anfrage. Die Einschränkung steht in der Funktion selbst.
 */
export async function getPersonAccessRequesters(
  client: SupabaseClient
): Promise<AccessRequester[]> {
  const { data, error } = await client.rpc("get_person_access_requests");
  if (error || !data) return [];

  const byKey = new Map<string, AccessRequester>();

  for (const row of data as RequestRow[]) {
    // Der Schlüssel ist der HALTER, nicht die fragende Person: Zwei Anfragen
    // derselben Organisation gehören zusammen, auch wenn zwei verschiedene
    // Menschen sie gestellt haben.
    const key = row.org_id ? `org:${row.org_id}` : `person:${row.advisor_user_id ?? row.id}`;

    const existing = byKey.get(key) ?? {
      key,
      holder: row.holder,
      askedByName: row.asked_by_name,
      askedByHeadline: row.asked_by_headline,
      org: row.org_id
        ? {
            id: row.org_id,
            name: row.org_name ?? "",
            description: row.org_description,
            websiteUrl: row.org_website_url,
            focus: row.org_focus ?? [],
            locationRegion: row.org_location_region,
          }
        : null,
      requested: [],
      active: [],
    };

    const grant: PersonAccessGrant = {
      id: row.id,
      advisorUserId: row.advisor_user_id,
      scope: row.scope,
      status: row.status,
      requestNote: row.request_note,
      approvedAt: row.approved_at,
    };

    if (row.status === "requested") existing.requested.push(grant);
    else if (row.status === "active") existing.active.push(grant);

    byKey.set(key, existing);
  }

  // Wer etwas will, steht oben. Eine offene Frage ist eine Aufgabe, ein
  // geltender Zugang nur eine Auskunft.
  return [...byKey.values()].sort(
    (a, b) => Number(b.requested.length > 0) - Number(a.requested.length > 0)
  );
}
