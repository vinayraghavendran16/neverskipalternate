import { z } from "zod";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DiaryForm } from "@/components/teaching/diary-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function schoolDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ allocation?: string; period?: string; date?: string }> }) {
  const context = await getUserContext(); if (!context) redirect("/login?next=/dashboard/teacher/diary");
  if (!['owner','administrator','principal','teacher','staff'].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient(); if (!supabase) redirect("/login"); const query = await searchParams;
  const date = z.iso.date().safeParse(query.date).success ? query.date! : schoolDate();
  const [staffResult, classResult, subjectResult, allocationsResult, diaryResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("lesson_diary_entries").select("id, class_subject_id, timetable_entry_id, entry_date, topic, summary, learning_objective, status, updated_at").eq("organization_id", context.organizationId).order("entry_date", { ascending: false }).limit(40),
  ]);
  if ([staffResult, classResult, subjectResult, allocationsResult, diaryResult].some((result) => result.error)) throw new Error("School data could not be loaded. Please retry.");
  const manager = ["owner","administrator","principal","staff"].includes(context.role);
  const allocations = (allocationsResult.data || []).filter((item) => manager || item.teacher_staff_id === staffResult.data?.id);
  const allowedIds = new Set(allocations.map((item) => item.id)); const classes = new Map((classResult.data || []).map((item) => [item.id,item])); const subjects = new Map((subjectResult.data || []).map((item) => [item.id,item]));
  const options = allocations.map((item) => ({ id: item.id, label: `${classes.get(item.class_id)?.grade || "Class"} ${classes.get(item.class_id)?.section || ""} · ${subjects.get(item.subject_id)?.name || "Subject"}` }));
  const selected = query.allocation && allowedIds.has(query.allocation) ? query.allocation : options[0]?.id;
  const current = (diaryResult.data || []).find((entry) => entry.class_subject_id === selected && entry.entry_date === date && (entry.timetable_entry_id || "") === (query.period || ""));
  const previousRecord = (diaryResult.data || []).find((entry) => entry.class_subject_id === selected && entry.entry_date < date);
  const previous = previousRecord ? { topic: previousRecord.topic, summary: previousRecord.summary, learningObjective: previousRecord.learning_objective || "" } : null;
  return <AppShell context={context} activePath="/dashboard/teacher" pageTitle="Class diary"><Link className="back-link" href="/dashboard/teacher">← Teacher Today</Link><div className="page-head compact-head"><div><span className="eyebrow">CLASS DIARY</span><h1>Record the lesson once.</h1><p>Reuse useful context, save a draft or publish the final classroom record.</p></div></div><div className="diary-layout"><section className="card"><div className="card-header"><div><h2>Lesson entry</h2><p>Drafts remain private to staff until published.</p></div></div><div className="card-body"><DiaryForm key={`${selected}:${date}:${query.period || ""}`} current={current ? { topic: current.topic, summary: current.summary, learningObjective: current.learning_objective || "" } : null} allocations={options} date={date} selectedAllocation={selected} timetableEntryId={query.period || ""} previous={previous} /></div></section><aside className="card"><div className="card-header"><div><h2>Recent entries</h2><p>The latest 40 diary records.</p></div></div><div className="diary-history">{(diaryResult.data || []).filter((entry) => allowedIds.has(entry.class_subject_id)).map((entry) => <div key={entry.id}><span className={`status ${entry.status === "draft" ? "status-warning" : ""}`}>{entry.status}</span><div><b>{entry.topic}</b><small>{options.find((item) => item.id === entry.class_subject_id)?.label} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(`${entry.entry_date}T12:00:00+05:30`))}</small></div></div>)}{!diaryResult.data?.length && <p className="empty-copy task-empty">No diary entries yet.</p>}</div></aside></div></AppShell>;
}
