import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { AVATAR_LIBRARY, getAvatarSrc, isAvatarId } from "@/features/profile/avatarLibrary";

test("every avatar of the library has its picture file, including the 12 figures Mia, Alex, Sam and Robin", () => {
  assert.equal(AVATAR_LIBRARY.length, 42);
  for (const avatar of AVATAR_LIBRARY) assert.ok(existsSync(new URL(`../../../../public${avatar.src}`, import.meta.url)), avatar.id);
  for (const n of [31, 36, 42]) assert.ok(isAvatarId(`avatar-${n}`));
  assert.equal(getAvatarSrc("avatar-42"), "/avatars/library/avatar-42.png");
  assert.equal(isAvatarId("avatar-43"), false);
});
