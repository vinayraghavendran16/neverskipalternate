/** Accept only local dashboard destinations, including their query string. */
export function safeNextPath(value: string): string {
  if (/[\\\x00-\x20]/.test(value) || /%2f|%5c|%0[0-9a-f]|%1[0-9a-f]/i.test(value)) return "/dashboard";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || !(url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"))) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch { return "/dashboard"; }
}
