import test from "node:test";
import assert from "node:assert/strict";
import { normalizeErrorDigest,normalizeIncidentRoute,releaseLabel } from "../../lib/operations.ts";

test("normalizes incident routes without retaining identifiers or queries",()=>{assert.equal(normalizeIncidentRoute("/dashboard/people/students/00000000-0000-0000-0000-000000000050?tab=private"),"/dashboard/people/students/:id");assert.equal(normalizeIncidentRoute("https://attacker.test/private"),"/dashboard/unknown")});
test("keeps incident digests opaque and bounded",()=>{assert.equal(normalizeErrorDigest("digest with secret / value"),"digestwithsecretvalue");assert.equal(normalizeErrorDigest(null),"client-error")});
test("uses a bounded deployment label",()=>{assert.equal(releaseLabel("daa8b67-long-build-value"),"daa8b67-long");assert.equal(releaseLabel(undefined),"local")});
