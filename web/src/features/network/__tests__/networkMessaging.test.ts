import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getNetworkAttentionCount } from "@/features/network/networkPresentation";
import { normalizeNetworkMessageBody } from "@/features/network/networkValidation";

function source(path: string) {
  return readFileSync(path, "utf8");
}

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

test("accepted contact request is the only conversation authority", () => {
  const migration = source("../supabase/migrations/20260903220000_create_network_messaging_v01.sql");
  assert.match(migration, /contact_request_id uuid not null unique references public\.network_contact_requests\(id\) on delete cascade/);
  assert.match(migration, /v_request\.status <> 'accepted'/);
  assert.match(migration, /request\.status = 'accepted'/);
  assert.match(migration, /on conflict \(contact_request_id\) do nothing/);
  assert.doesNotMatch(migration, /create table public\.network_connections|group_id|channel_id/);
});

test("message model is bounded plain text without messenger expansion", () => {
  assert.equal(normalizeNetworkMessageBody("  Hello there.  "), "Hello there.");
  assert.equal(normalizeNetworkMessageBody("   "), null);
  assert.equal(normalizeNetworkMessageBody("x".repeat(2001)), null);
  const migration = source("../supabase/migrations/20260903220000_create_network_messaging_v01.sql");
  assert.match(migration, /char_length\(btrim\(body\)\) between 1 and 2000/);
  assert.doesNotMatch(migration, /attachment|reaction|edited_at|deleted_at|typing|presence|reply_to/);
});

test("message access uses narrow participant-aware RPCs and hides read receipts", () => {
  const migration = source("../supabase/migrations/20260903220000_create_network_messaging_v01.sql");
  assert.match(migration, /revoke all on public\.network_conversations, public\.network_messages from anon, authenticated/);
  for (const name of ["list_network_conversations", "list_network_messages", "send_network_message", "mark_network_conversation_read", "get_unread_network_message_count"]) {
    assert.match(migration, new RegExp(`function public\\.${name}`));
  }
  const projection = migration.match(/create or replace function public\.list_network_messages[\s\S]*?create or replace function public\.send_network_message/)?.[0] ?? "";
  assert.doesNotMatch(projection, /read_at/);
  assert.match(migration, /public\.is_network_member\(v_user_id\)/);
  assert.match(migration, /v_user_id in \([\s\S]*participant_a_user_id,[\s\S]*participant_b_user_id/);
});

test("contacts remains the compact inbox and only accepted contacts receive chat CTA", () => {
  const contacts = source("src/app/(product)/network/contacts/page.tsx");
  assert.match(contacts, /request\.status !== "accepted"/);
  assert.match(contacts, /getNetworkConversations/);
  assert.match(contacts, /href=\{`\/network\/messages\/\$\{conversation\.conversation_id\}`\}/);
  assert.match(contacts, /conversation\.unread_count > 0/);
  assert.match(contacts, /prefetch=\{false\}/);
});

test("chat has listing context, chronological messages, empty state, pending send and back navigation", () => {
  const page = source("src/app/(product)/network/messages/[conversationId]/page.tsx");
  const actions = source("src/features/network/networkActions.ts");
  assert.match(page, /href="\/network\/contacts"/);
  assert.match(page, /network\/listings\/\$\{conversation\.listing_id\}/);
  assert.match(page, /messages\.map/);
  assert.match(page, /messages\.emptyText/);
  assert.match(page, /message\.sender_user_id === user\.id/);
  assert.match(page, /maxLength=\{2000\}/);
  assert.match(page, /NetworkSubmitButton/);
  assert.match(page, /messages\.sending/);
  assert.match(actions, /send_network_message/);
});

test("opening a mounted chat marks incoming messages read without render-time or prefetch side effects", () => {
  const marker = source("src/features/network/NetworkMarkConversationRead.tsx");
  const contacts = source("src/app/(product)/network/contacts/page.tsx");
  assert.match(marker, /useEffect/);
  assert.match(marker, /unreadCount < 1/);
  assert.match(marker, /markNetworkConversationReadAction/);
  assert.match(marker, /router\.refresh\(\)/);
  assert.match(contacts, /prefetch=\{false\}/);
});

test("combined Network attention count preserves separate request and message signals", () => {
  assert.equal(getNetworkAttentionCount(0, 0), 0);
  assert.equal(getNetworkAttentionCount(1, 0), 1);
  assert.equal(getNetworkAttentionCount(0, 2), 2);
  assert.equal(getNetworkAttentionCount(1, 2), 3);
  const layout = source("src/app/layout.tsx");
  const shell = source("src/features/navigation/ProductShell.tsx");
  assert.match(layout, /getIncomingPendingNetworkContactCount/);
  assert.match(layout, /getUnreadNetworkMessageCount/);
  assert.match(shell, /getNetworkAttentionCount\(incomingNetworkContactCount, unreadNetworkMessageCount\)/);
  assert.match(shell, /networkAttentionCount >? 0|count < 1/);
});

test("contact request badge source counts only incoming pending requests", () => {
  const data = source("src/features/network/networkData.ts");
  const countFunction = data.match(/export async function getIncomingPendingNetworkContactCount[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(countFunction, /eq\("recipient_user_id", userId\)/);
  assert.match(countFunction, /eq\("status", "pending"\)/);
  assert.doesNotMatch(countFunction, /sender_user_id|accepted|declined|canceled/);
});

test("Dashboard keeps contact decisions as tasks but message bodies stay out of tasks and navigation", () => {
  const dashboard = source("src/features/dashboard/founderDashboardTaskData.ts");
  const shell = source("src/features/navigation/ProductShell.tsx");
  assert.match(dashboard, /network_contact_requests/);
  assert.doesNotMatch(dashboard, /network_messages|message\.body|select\([^)]*body/);
  assert.doesNotMatch(shell, /network_messages|message\.body|last_message_body/);
});

test("message bodies do not enter browse, listing, Discovery, reporting or logs", () => {
  const broadSources = [
    "src/app/(product)/network/page.tsx",
    "src/features/network/NetworkListingCard.tsx",
    "src/app/(product)/network/listings/[listingId]/page.tsx",
    "src/features/dashboard/founderDashboardTaskData.ts",
    "src/features/navigation/ProductShell.tsx",
    "src/features/network/networkActions.ts",
  ].map(source).join("\n");
  assert.doesNotMatch(broadSources, /console\.(log|info|debug)\([^)]*(body|message)/i);
  assert.doesNotMatch(source("src/features/discovery/discoveryIntroData.ts"), /network_messages/);
  assert.doesNotMatch(source("src/features/reporting/actions.ts"), /network_messages/);
  assert.doesNotMatch(source("src/features/network/networkData.ts"), /from\("network_messages"\)/);
});

test("account deletion is data-minimizing and leaves no messaging orphan path", () => {
  const migration = source("../supabase/migrations/20260903220000_create_network_messaging_v01.sql");
  assert.match(migration, /contact_request_id[^\n]+on delete cascade/);
  assert.match(migration, /conversation_id[^\n]+on delete cascade/);
  assert.match(migration, /participant_a_user_id[^\n]+on delete cascade/);
  assert.match(migration, /participant_b_user_id[^\n]+on delete cascade/);
  assert.match(migration, /sender_user_id[^\n]+on delete cascade/);
});

test("Messaging V0.1 deliberately uses refresh-after-send and no realtime infrastructure", () => {
  const files = [
    source("src/app/(product)/network/messages/[conversationId]/page.tsx"),
    source("src/features/network/NetworkMarkConversationRead.tsx"),
    source("src/features/network/networkActions.ts"),
  ].join("\n");
  assert.doesNotMatch(files, /channel\(|postgres_changes|setInterval|WebSocket|realtime/i);
  assert.match(files, /router\.refresh\(\)|redirect\(`\/network\/messages/);
});

test("German and English messaging copy has exact parity and no read receipts", () => {
  const de = JSON.parse(source("messages/de/network.json"));
  const en = JSON.parse(source("messages/en/network.json"));
  assert.deepEqual(keys(de.messages).sort(), keys(en.messages).sort());
  assert.match(de.messages.send, /Nachricht senden/);
  assert.match(en.messages.open, /Open chat/);
  assert.doesNotMatch(JSON.stringify(de.messages), /gelesen um|zugestellt|Häkchen/i);
  assert.doesNotMatch(JSON.stringify(en.messages), /read at|delivered|checkmark/i);
});
