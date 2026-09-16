import assert from "node:assert/strict";
import test from "node:test";
import { activityFilter, activityHref, nextDate, validDate } from "../../lib/dashboard.ts";

test("activity routes point to the affected workflow", () => {
  assert.equal(activityHref("attendance.submitted", "attendance_sessions"), "/dashboard/attendance");
  assert.equal(activityHref("students.insert", "students"), "/dashboard/people");
  assert.equal(activityHref("fee_invoices.update", "fee_invoices"), "/dashboard/finance");
  assert.equal(activityHref("memberships.update", "memberships"), "/dashboard#school-administration");
});

test("activity filters reject untrusted values", () => {
  assert.equal(activityFilter("attendance"), "attendance");
  assert.equal(activityFilter("action.eq.anything"), "all");
});

test("activity dates are validated and incremented safely", () => {
  assert.equal(validDate("2026-09-16"), "2026-09-16");
  assert.equal(validDate("2026-02-31"), "");
  assert.equal(nextDate("2026-12-31"), "2027-01-01");
});
