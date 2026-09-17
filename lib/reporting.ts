export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number | null;
};

export function percentage(numerator: number, denominator: number, precision = 0) {
  if (!denominator) return null;
  const multiplier = 10 ** precision;
  return Math.round((numerator / denominator) * 100 * multiplier) / multiplier;
}

export function attendanceSummary(statuses: string[]): AttendanceSummary {
  const summary = { total: statuses.length, present: 0, absent: 0, late: 0, excused: 0 };
  for (const status of statuses) {
    if (status === "present" || status === "absent" || status === "late" || status === "excused") summary[status] += 1;
  }
  return { ...summary, rate: percentage(summary.present + summary.late, summary.total) };
}

export function average(values: number[], precision = 1) {
  if (!values.length) return null;
  const multiplier = 10 ** precision;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * multiplier) / multiplier;
}

export function scorePercent(mark: number | null, maximum: number) {
  if (mark === null || maximum <= 0) return null;
  return percentage(mark, maximum, 1);
}

export function periodStart(period: string, now = new Date()) {
  if (period === "all") return null;
  const days = period === "30" ? 30 : period === "180" ? 180 : 90;
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

export function reportingBand({ attendanceRate, averageScore, missingWork }: { attendanceRate: number | null; averageScore: number | null; missingWork: number }) {
  if (attendanceRate === null && averageScore === null && missingWork === 0) return { key: "no_data", label: "No evidence", reasons: [] } as const;
  const reasons: string[] = [];
  if (attendanceRate !== null && attendanceRate < 75) reasons.push(`attendance ${attendanceRate}%`);
  if (averageScore !== null && averageScore < 50) reasons.push(`average ${averageScore}%`);
  if (missingWork >= 2) reasons.push(`${missingWork} overdue tasks`);
  if (reasons.length) return { key: "review", label: "Needs review", reasons } as const;
  if ((attendanceRate !== null && attendanceRate < 85) || (averageScore !== null && averageScore < 60) || missingWork === 1) return { key: "watch", label: "Watch", reasons: reasons.length ? reasons : [missingWork ? "1 overdue task" : "below the school view threshold"] } as const;
  return { key: "on_track", label: "On track", reasons: [] } as const;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value));
}
