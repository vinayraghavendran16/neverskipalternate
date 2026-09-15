import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AnnouncementForm } from "@/components/communication/announcement-form";
import { acknowledgeAnnouncement } from "./actions";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function CommunicationPage() {
  const context = await getUserContext(); if (!context) redirect("/login?next=/dashboard/communication");
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const manager = ["owner","administrator","principal","staff"].includes(context.role);
  const [announcementsResult, receiptsResult, campusesResult] = await Promise.all([
    supabase.from("announcements").select("id,title,body,priority,status,requires_acknowledgement,published_at,expires_at,audience,campus_id").eq("organization_id",context.organizationId).order("published_at",{ascending:false}).limit(100),
    supabase.from("announcement_receipts").select("announcement_id,acknowledged_at").eq("organization_id",context.organizationId).eq("user_id",context.userId),
    supabase.from("campuses").select("id,name").eq("organization_id",context.organizationId).order("name")
  ]);
  if (announcementsResult.error || receiptsResult.error || campusesResult.error) throw new Error("Communication could not be loaded.");
  const receipts = new Map((receiptsResult.data||[]).map(r=>[r.announcement_id,r]));
  return <AppShell context={context} activePath="/dashboard/communication" pageTitle="Communication">
    <div className="page-head"><div><span className="eyebrow">SCHOOL COMMUNICATION</span><h1>One notice. The right audience.</h1><p>Publish clear updates and collect acknowledgement when action matters.</p></div></div>
    <div className={`workflow-layout ${manager?"":"workflow-single"}`}>
      <section className="card"><header className="card-header"><div><h2>Noticeboard</h2><p>Current announcements for your role and campus.</p></div><span className="status">{announcementsResult.data?.length||0}</span></header><div className="notice-list">{(announcementsResult.data||[]).map(item=>{const ack=receipts.get(item.id)?.acknowledged_at;return <article className={`notice notice-${item.priority}`} key={item.id}><header><div><span className="status">{item.priority}</span>{item.requires_acknowledgement&&<span className="status status-warning">Acknowledgement required</span>}</div><time>{item.published_at ? new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(item.published_at)) : "Draft"}</time></header><h3>{item.title}</h3><p>{item.body}</p>{item.requires_acknowledgement&&!ack&&<form action={acknowledgeAnnouncement}><input type="hidden" name="announcement_id" value={item.id}/><button className="secondary">Acknowledge</button></form>}{ack&&<p className="acknowledged" role="status">✓ Acknowledged</p>}</article>})}{!announcementsResult.data?.length&&<p className="empty-copy task-empty">No current announcements.</p>}</div></section>
      {manager&&<aside className="card"><header className="card-header"><div><h2>Publish announcement</h2><p>Visible immediately to selected roles.</p></div></header><div className="card-body"><AnnouncementForm campuses={campusesResult.data||[]} /></div></aside>}
    </div>
  </AppShell>;
}
