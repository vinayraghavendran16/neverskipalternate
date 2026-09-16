import assert from "node:assert/strict";
import test from "node:test";
import { isPlatformOwnerEmail, platformOwnerEmails } from "../../lib/auth/platform.ts";
import { annualizeRecurringRevenue, countByOrganization, normalizedWebsiteUrl } from "../../lib/platform/portfolio.ts";

test("platform owner allowlist normalizes comma-separated emails", () => {
  assert.deepEqual([...platformOwnerEmails(" Owner@Example.com, second@example.com ,")], ["owner@example.com", "second@example.com"]);
  assert.equal(isPlatformOwnerEmail("OWNER@example.com", "owner@example.com"), true);
  assert.equal(isPlatformOwnerEmail("other@example.com", "owner@example.com"), false);
});

test("portfolio metrics annualize each supported billing cycle", () => {
  assert.equal(annualizeRecurringRevenue(1000, "monthly"), 12000);
  assert.equal(annualizeRecurringRevenue(1000, "quarterly"), 4000);
  assert.equal(annualizeRecurringRevenue(1000, "annual"), 1000);
  assert.equal(annualizeRecurringRevenue(-1, "annual"), 0);
});

test("portfolio helpers normalize safe school websites and group tenant facts", () => {
  assert.equal(normalizedWebsiteUrl("school.edu.in"), "https://school.edu.in/");
  assert.equal(normalizedWebsiteUrl("javascript:alert(1)"), "");
  assert.deepEqual([...countByOrganization([{organization_id:"a"},{organization_id:"a"},{organization_id:"b"}])], [["a",2],["b",1]]);
});
