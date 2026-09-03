import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFounderDashboardTasks, type FounderDashboardTaskSignals } from "@/features/dashboard/founderDashboardTasks";
import { normalizeNetworkContactMessage } from "@/features/network/networkValidation";

function source(path: string) {
  return readFileSync(path, "utf8");
}

function messageKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

function dashboardSignals(): FounderDashboardTaskSignals {
  return {
    currentUserId: "recipient",
    now: "2026-09-03T12:00:00.000Z",
    invitations: [],
    personal: {
      founderAlignmentStarted: true,
      founderAlignmentSubmitted: true,
      valuesStarted: true,
      valuesSubmitted: true,
    },
    discoveryIntros: [],
    relationships: [],
    relationshipAdvisors: [],
    setupAdvisorAccess: [],
    setupItems: [],
    setupConfirmations: [],
    commitmentLabs: [],
    readMyMindRounds: [],
  };
}

test("contact request contract is additive, private, listing-scoped, and fail-closed", () => {
  const sql = source("../supabase/migrations/20260903210000_create_network_contact_requests.sql");
  assert.match(sql, /create table public\.network_contact_requests/);
  assert.match(sql, /listing_id uuid not null references public\.network_listings\(id\) on delete cascade/);
  assert.match(sql, /constraint network_contact_requests_sender_listing_unique unique\(sender_user_id, listing_id\)/);
  assert.match(sql, /public\.is_network_member\(\)/);
  assert.match(sql, /auth\.uid\(\) in \(sender_user_id, recipient_user_id\)/);
  assert.match(sql, /revoke insert, update, delete on public\.network_contact_requests from authenticated/);
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.doesNotMatch(sql, /network_connections|private_email|auth\.users[^;]+email/i);
});

test("request creation validates bounded plain text and uses pending feedback", () => {
  assert.equal(normalizeNetworkContactMessage("  A useful short introduction.  "), "A useful short introduction.");
  assert.equal(normalizeNetworkContactMessage("Too short"), null);
  assert.equal(normalizeNetworkContactMessage("x".repeat(501)), null);
  const create = source("src/app/(product)/network/listings/[listingId]/contact/page.tsx");
  const actions = source("src/features/network/networkActions.ts");
  assert.match(create, /minLength=\{10\}/);
  assert.match(create, /maxLength=\{500\}/);
  assert.match(create, /NetworkSubmitButton/);
  assert.match(create, /contact\.sending/);
  assert.match(actions, /request_network_contact/);
});

test("listing detail shows the correct contact state and never offers owners a request CTA", () => {
  const detail = source("src/app/(product)/network/listings/[listingId]/page.tsx");
  assert.match(detail, /!own \? <section/);
  assert.match(detail, /contact\.cta/);
  assert.match(detail, /contact\.listingStatus\.\$\{contactRequest\.status\}/);
  assert.match(detail, /getOwnContactRequestForListing/);
});

test("contacts keep pending lifecycle actions separate from accepted conversations", () => {
  const contacts = source("src/app/(product)/network/contacts/page.tsx");
  const controls = source("src/features/network/NetworkContactActions.tsx");
  assert.match(contacts, /contact\.incoming/);
  assert.match(contacts, /contact\.outgoing/);
  assert.match(contacts, /request\.status === "pending"/);
  assert.match(controls, /respondNetworkContactAction/);
  assert.match(controls, /cancelNetworkContactAction/);
  assert.match(controls, /fieldName="response" intent="accepted"/);
  assert.match(controls, /fieldName="response" intent="declined"/);
  assert.match(contacts, /request\.status !== "accepted"/);
  assert.match(contacts, /messages\.acceptedContacts/);
  assert.match(contacts, /network\/messages/);
});

test("incoming pending requests become NEEDS_YOU tasks while resolved and outgoing requests do not", () => {
  const incoming = buildFounderDashboardTasks({
    ...dashboardSignals(),
    networkContacts: [{ id: "request-1", senderLabel: "Ada", listingTitle: "B2B Sales", updatedAt: "2026-09-03T11:00:00.000Z" }],
  });
  assert.deepEqual(
    incoming.map(({ type, kind, href, personLabel, contextLabel }) => ({ type, kind, href, personLabel, contextLabel })),
    [{ type: "network_contact", kind: "NEEDS_YOU", href: "/network/contacts", personLabel: "Ada", contextLabel: "B2B Sales" }]
  );
  assert.equal(buildFounderDashboardTasks({ ...dashboardSignals(), networkContacts: [] }).length, 0);
  const data = source("src/features/dashboard/founderDashboardTaskData.ts");
  assert.match(data, /\.eq\("recipient_user_id", currentUserId\)\s*\.eq\("status", "pending"\)/);
  assert.doesNotMatch(data, /network_contact_requests[\s\S]{0,220}sender_user_id/);
});

test("Network-only and Advisor contact access remains capability-based", () => {
  const sql = source("../supabase/migrations/20260903210000_create_network_contact_requests.sql");
  const access = source("src/features/network/networkAccess.ts");
  assert.match(access, /is_network_member/);
  assert.doesNotMatch(sql, /network_roles[^;]+(permission|is_network_member)|has_profile_role/i);
  assert.doesNotMatch(sql, /insert into public\.(relationships|founder_team_members|discovery_intro_requests)/i);
});

test("messages stay outside listing and broad Network payloads", () => {
  const data = source("src/features/network/networkData.ts");
  const card = source("src/features/network/NetworkListingCard.tsx");
  assert.doesNotMatch(card, /contact|message/);
  assert.match(data, /network_contact_requests/);
  assert.doesNotMatch(data, /network_listings[^\n]+message/);
});

test("German and English contact UX have parity and avoid matching language", () => {
  const de = JSON.parse(source("messages/de/network.json"));
  const en = JSON.parse(source("messages/en/network.json"));
  assert.deepEqual(messageKeys(de.contact).sort(), messageKeys(en.contact).sort());
  assert.match(de.contact.cta, /Kontakt aufnehmen/);
  assert.match(en.contact.cta, /Get in touch/);
  assert.doesNotMatch(JSON.stringify(de.contact), /match|kompatibil/i);
  assert.doesNotMatch(JSON.stringify(en.contact), /match|compatib/i);
});

test("Network navigation exposes contacts without creating a global social graph", () => {
  const home = source("src/app/(product)/network/page.tsx");
  const contacts = source("src/app/(product)/network/contacts/page.tsx");
  assert.match(home, /href="\/network\/contacts"/);
  assert.match(contacts, /href="\/network"/);
  assert.doesNotMatch(source("../supabase/migrations/20260903210000_create_network_contact_requests.sql"), /create table public\.network_connections/);
});

test("Slice 2 adds neither contact email automation nor private contact-channel publication", () => {
  const changedSources = [
    source("src/features/network/networkActions.ts"),
    source("src/app/(product)/network/contacts/page.tsx"),
    source("../supabase/migrations/20260903210000_create_network_contact_requests.sql"),
  ].join("\n");
  assert.doesNotMatch(changedSources, /resend|sendEmail|linkedin_url|user\.email|auth\.email/i);
});
