import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "../../lib/auth/redirect.ts";

test("keeps local dashboard paths and their query strings", () => {
  assert.equal(safeNextPath("/dashboard/attendance?id=1"), "/dashboard/attendance?id=1");
});

test("rejects external, protocol-relative, encoded, and non-dashboard redirects", () => {
  for (const path of [
    "https://attacker.example/dashboard",
    "//attacker.example/dashboard",
    "/dashboard%2f%2fattacker.example",
    "/login",
    "/dashboard\\\\attacker.example",
  ]) {
    assert.equal(safeNextPath(path), "/dashboard");
  }
});
