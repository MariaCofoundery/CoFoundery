import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { connectPublicationVisibility, CONNECT_PUBLIC_ROLLOUT_ENABLED } from "@/features/connect/connectRollout";
import { connectPage, connectOffset, connectPageHref } from "@/features/connect/connectBrowsePage";
import { connectPublishError } from "@/features/connect/connectPublishError";
import { pickAcrossKinds, type ConnectHighlight } from "@/features/connect/connectHighlightData";

test("beta submissions never retain an anonymous publication intent", () => {
  assert.equal(CONNECT_PUBLIC_ROLLOUT_ENABLED, false);
  for (const value of [null, "public", "members_only", "unexpected"]) assert.equal(connectPublicationVisibility(value), "members_only");
});
test("bounded pages preserve criteria and reject malformed offsets", () => {
  for (const input of ["-1", "NaN", "1.5", "Infinity", "", undefined]) assert.equal(connectPage(input), 1);
  assert.equal(connectOffset("3"), 48); assert.equal(connectPage("999999"), 4000);
  const url = new URL(connectPageHref("/connect", { q: "100% & Design", direction: "seeking", page: "1", error: "save" }, 2), "https://example.invalid");
  assert.equal(url.searchParams.get("q"), "100% & Design"); assert.equal(url.searchParams.get("page"), "2"); assert.equal(url.searchParams.has("error"), false);
});
test("publication errors are useful and never expose raw DB content", () => {
  assert.equal(connectPublishError("listing_title_required"), "publish_title");
  assert.equal(connectPublishError("listing_summary_required"), "publish_summary");
  assert.equal(connectPublishError("active_network_profile_required"), "publish_profile");
  assert.equal(connectPublishError("lifecycle_conflict"), "publish_conflict");
  assert.equal(connectPublishError("constraint_private_email@example.invalid"), "save");
});
test("highlight diversity counts owners, preserves own marker and accepts problems", () => {
  const make = (owner: string, kind: ConnectHighlight["kind"], id: string) => ({ id, kind, title: id, text: "", href: "/connect", person: { user_id: owner }, isOwn: owner === "a", disclosure: "none", has: null }) as ConnectHighlight;
  const same = [make("a", "person", "a1"), make("a", "problem", "a2"), make("a", "offering", "a3")];
  assert.equal(pickAcrossKinds(same, 3).length, 1);
  for (let i = 0; i < 20; i++) { const result = pickAcrossKinds([...same, make("b", "venture", "b"), make("c", "seeking", "c")], 3); assert.equal(new Set(result.map(x => x.person?.user_id)).size, 3); assert.ok(result.find(x => x.person?.user_id === "a")?.isOwn); }
  assert.equal(pickAcrossKinds([make("d", "problem", "p")], 3)[0].kind, "problem");
});
test("closed beta has four areas, four discovery types and private management links", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  for (const key of ["beta.discover", "problemHub.nav", "suggestions.title", "beta.mine"]) assert.ok(shell.includes(key));
  const tabs = readFileSync("src/features/connect/ConnectTabs.tsx", "utf8"); assert.ok(!tabs.includes("/connect/workspaces"));
  const own = readFileSync("src/features/connect/ConnectMyNavigation.tsx", "utf8");
  for (const path of ["/connect/profile", "/connect/my", "/connect/workspaces", "/connect/searches", "/connect/ventures/mine"]) assert.ok(own.includes(path));
});
