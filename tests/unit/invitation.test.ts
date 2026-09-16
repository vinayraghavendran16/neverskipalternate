import assert from "node:assert/strict";
import test from "node:test";
import { parseInvitationFragment } from "../../lib/auth/invitation.ts";

test("extracts an invited user's session without retaining unrelated fragment data", () => {
  assert.deepEqual(parseInvitationFragment("#access_token=access&refresh_token=refresh&type=invite"), { kind: "session", accessToken: "access", refreshToken: "refresh" });
});

test("surfaces expired invitations before any existing browser session is used", () => {
  assert.deepEqual(parseInvitationFragment("#error=access_denied&error_code=otp_expired"), { kind: "error", code: "otp_expired" });
  assert.deepEqual(parseInvitationFragment(""), { kind: "none" });
});
