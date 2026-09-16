export type InvitationFragment =
  | { kind: "error"; code: string }
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "none" };

export function parseInvitationFragment(hash: string): InvitationFragment {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const error = params.get("error_code") || params.get("error");
  if (error) return { kind: "error", code: error };
  const accessToken = params.get("access_token"), refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  return { kind: "none" };
}
