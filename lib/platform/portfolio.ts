export type BillingCycle = "monthly" | "quarterly" | "annual";

export function annualizeRecurringRevenue(amount: number, cycle: BillingCycle) {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount * (cycle === "monthly" ? 12 : cycle === "quarterly" ? 4 : 1);
}

export function normalizedWebsiteUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function countByOrganization(rows: { organization_id: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.organization_id, (counts.get(row.organization_id) || 0) + 1);
  return counts;
}
