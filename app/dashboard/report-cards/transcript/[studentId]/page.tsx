import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/reporting/print-button";
import { getUserContext } from "@/lib/auth/context";
import { dateLabel } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/server";

export default async function TranscriptPage({ params }: { params: Promise<{ studentId: string }> }) {
  const context = await getUserContext(); if (!context) redirect("/login");
  const { studentId } = await params, supabase = await createClient(); if (!supabase) redirect("/login");
  const [studentResult, cardsResult] = await Promise.all([
    supabase.from("students").select("id,first_name,last_name,preferred_name,admission_number").eq("id", studentId).maybeSingle(),
    supabase.from("report_cards").select("id,period_id,class_id,published_at").eq("student_id", studentId).eq("status", "published").order("published_at"),
  ]);
  if (studentResult.error || !studentResult.data || cardsResult.error) notFound();
  const cards = cardsResult.data || [], cardIds = cards.map((row) => row.id);
  const [periodsResult, classesResult, rowsResult] = await Promise.all([
    cards.length ? supabase.from("reporting_periods").select("id,name,starts_on,ends_on").in("id", cards.map((row) => row.period_id)) : Promise.resolve({ data: [], error: null }),
    cards.length ? supabase.from("classes").select("id,grade,section").in("id", cards.map((row) => row.class_id)) : Promise.resolve({ data: [], error: null }),
    cardIds.length ? supabase.from("report_card_subjects").select("report_card_id,class_subject_id,grade,percentage").in("report_card_id", cardIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (periodsResult.error || classesResult.error || rowsResult.error) throw new Error("Transcript records could not be loaded.");
  const allocationIds = (rowsResult.data || []).map((row) => row.class_subject_id);
  const allocationsResult = allocationIds.length ? await supabase.from("class_subjects").select("id,subject_id").in("id", allocationIds) : { data: [], error: null };
  const subjectIds = (allocationsResult.data || []).map((row) => row.subject_id);
  const subjectsResult = subjectIds.length ? await supabase.from("subjects").select("id,name").in("id", subjectIds) : { data: [], error: null };
  if (allocationsResult.error || subjectsResult.error) throw new Error("Transcript subjects could not be loaded.");
  const periods = new Map((periodsResult.data || []).map((row) => [row.id, row])), classes = new Map((classesResult.data || []).map((row) => [row.id, row])), allocations = new Map((allocationsResult.data || []).map((row) => [row.id, row])), subjects = new Map((subjectsResult.data || []).map((row) => [row.id, row]));
  const student = studentResult.data, name = `${student.preferred_name || student.first_name} ${student.last_name}`;
  return <main className="print-page transcript-page"><div className="print-toolbar"><Link href={`/dashboard/report-cards?student=${studentId}`}>← Report cards</Link><PrintButton/></div><article className="report-card-paper"><header className="report-card-brand"><div><span className="brand-mark"><i/><i/><i/></span><div><b>{context.organizationName}</b><small>Cumulative academic record</small></div></div><span>Verified published records</span></header><section className="report-card-title"><span>STUDENT TRANSCRIPT</span><h1>{name}</h1><p>Admission number {student.admission_number}</p></section>{cards.map((card) => { const period = periods.get(card.period_id), schoolClass = classes.get(card.class_id), rows = (rowsResult.data || []).filter((row) => row.report_card_id === card.id); return <section className="transcript-period" key={card.id}><header><div><h2>{period?.name || "Reporting period"}</h2><p>{schoolClass ? `${schoolClass.grade} · Section ${schoolClass.section}` : "Class"}</p></div><small>{period ? `${dateLabel(period.starts_on)} - ${dateLabel(period.ends_on)}` : ""}</small></header><table className="report-card-table"><thead><tr><th>Subject</th><th>Grade</th><th>Percentage</th></tr></thead><tbody>{rows.map((row) => { const allocation = allocations.get(row.class_subject_id), subject = allocation ? subjects.get(allocation.subject_id) : null; return <tr key={row.class_subject_id}><td>{subject?.name || "Subject"}</td><td>{row.grade || "-"}</td><td>{row.percentage === null ? "-" : `${Number(row.percentage)}%`}</td></tr>; })}</tbody></table></section>; })}{!cards.length && <section className="report-empty"><span>◎</span><b>No published records</b><p>The transcript will grow as school leaders publish report cards.</p></section>}<footer><span>Student ID {student.id}</span><span>{cards.length} published reporting period{cards.length === 1 ? "" : "s"}</span></footer></article></main>;
}
