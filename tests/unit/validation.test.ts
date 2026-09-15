import assert from "node:assert/strict";
import test from "node:test";
import { databaseId } from "../../lib/validation.ts";

test("accepts deterministic PostgreSQL UUID seed identifiers", () => {
  assert.equal(databaseId.safeParse("30000000-0000-0000-0000-000000000001").success, true);
});

test("rejects malformed database identifiers", () => {
  for (const value of ["", "30000000", "not-a-uuid", "30000000-0000-0000-0000-00000000000z"]) {
    assert.equal(databaseId.safeParse(value).success, false);
  }
});
