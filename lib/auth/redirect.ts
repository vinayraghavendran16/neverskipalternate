/** Accept only known local destinations, including their query string. */
export function safeNextPath(value: string): string {
  if (/[\\\x00-\x20]/.test(value) || /%2f|%5c|%0[0-9a-f]|%1[0-9a-f]/i.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://local.invalid");
    const allowed = url.pathname === "/auth/complete" || url.pathname === "/platform" || url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/");
    if (url.origin !== "https://local.invalid" || !allowed) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch { return "/dashboard"; }
}
