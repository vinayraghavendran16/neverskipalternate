import assert from "node:assert/strict";
import test from "node:test";
import { isPlatformOwnerEmail, platformOwnerEmails } from "../../lib/auth/platform.ts";

test("platform owner allowlist normalizes comma-separated emails", () => {
  assert.deepEqual([...platformOwnerEmails(" Owner@Example.com, second@example.com ,")], ["owner@example.com", "second@example.com"]);
  assert.equal(isPlatformOwnerEmail("OWNER@example.com", "owner@example.com"), true);
  assert.equal(isPlatformOwnerEmail("other@example.com", "owner@example.com"), false);
});
