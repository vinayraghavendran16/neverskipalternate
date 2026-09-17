import test from "node:test";
import assert from "node:assert/strict";
import { parseGradeScale, reportStatusLabel } from "../../lib/formal-reports.ts";

test("grade scales accept only complete text bands", () => {
  assert.deepEqual(parseGradeScale([{ grade: " A ", label: " Excellent " }, { grade: "", label: "Missing" }, null]), [{ grade: "A", label: "Excellent" }]);
  assert.deepEqual(parseGradeScale({ grade: "A" }), []);
});

test("formal workflow statuses have family-readable labels", () => {
  assert.equal(reportStatusLabel("submitted"), "Submitted for review");
  assert.equal(reportStatusLabel("published"), "Published");
});
