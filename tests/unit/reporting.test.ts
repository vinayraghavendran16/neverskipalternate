import assert from "node:assert/strict";
import test from "node:test";
import { attendanceSummary, average, percentage, reportingBand, scorePercent } from "../../lib/reporting.ts";

test("percentages and averages stay empty when there is no evidence", () => {
  assert.equal(percentage(0, 0), null);
  assert.equal(average([]), null);
  assert.equal(scorePercent(null, 20), null);
});

test("attendance treats late as attended and keeps the breakdown", () => {
  assert.deepEqual(attendanceSummary(["present", "late", "absent", "excused"]), {
    total: 4, present: 1, late: 1, absent: 1, excused: 1, rate: 50,
  });
});

test("reporting bands use visible, deterministic evidence", () => {
  assert.equal(reportingBand({ attendanceRate: 72, averageScore: 48, missingWork: 3 }).key, "review");
  assert.equal(reportingBand({ attendanceRate: 82, averageScore: 72, missingWork: 0 }).key, "watch");
  assert.equal(reportingBand({ attendanceRate: 94, averageScore: 81, missingWork: 0 }).key, "on_track");
});
