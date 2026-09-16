export function platformOwnerEmails(raw = process.env.PLATFORM_OWNER_EMAILS || "") {
  return new Set(raw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isPlatformOwnerEmail(email: string | null | undefined, raw?: string) {
  return Boolean(email && platformOwnerEmails(raw).has(email.trim().toLowerCase()));
}
