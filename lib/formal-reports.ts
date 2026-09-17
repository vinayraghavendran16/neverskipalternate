export type GradeBand = { grade: string; label: string };

export function parseGradeScale(value: unknown): GradeBand[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const grade = "grade" in item && typeof item.grade === "string" ? item.grade.trim() : "";
    const label = "label" in item && typeof item.label === "string" ? item.label.trim() : "";
    return grade && label ? [{ grade, label }] : [];
  });
}

export function reportStatusLabel(status: string) {
  return ({ draft: "Draft", submitted: "Submitted for review", approved: "Approved", published: "Published" } as Record<string, string>)[status] || status;
}
