import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { NotificationPreferencesForm } from "@/components/communication/notification-preferences-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead,markNotificationRead } from "./actions";

const fmt=(value:string)=>new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(value));
export default async function NotificationsPage(){
  const context=await getUserContext();if(!context)redirect("/login?next=/dashboard/notifications");const supabase=await createClient();if(!supabase)redirect("/login");
  const[notificationsResult,preferencesResult]=await Promise.all([
    supabase.from("notifications").select("id,title,body,priority,href,read_at,created_at,expires_at").eq("organization_id",context.organizationId).eq("user_id",context.userId).eq("in_app_enabled",true).order("created_at",{ascending:false}).limit(100),
    supabase.from("notification_preferences").select("channel,enabled").eq("organization_id",context.organizationId).eq("user_id",context.userId)
  ]);
  if(notificationsResult.error||preferencesResult.error)throw new Error("Notifications could not be loaded.");
  const notifications=(notificationsResult.data||[]).filter(n=>!n.expires_at||new Date(n.expires_at)>new Date()),unread=notifications.filter(n=>!n.read_at).length;
  const preferences:Record<string,boolean>={in_app:true,email:false,sms:false};for(const row of preferencesResult.data||[])preferences[row.channel]=row.enabled;
  return <AppShell context={context} activePath="/dashboard/notifications" pageTitle="Notifications">
    <div className="page-head"><div><span className="eyebrow">NOTIFICATION CENTRE</span><h1>Every important update, in one place.</h1><p>Review school notices and choose how new messages may reach you.</p></div>{unread>0&&<form action={markAllNotificationsRead}><button className="secondary">Mark all read</button></form>}</div>
    <div className="workflow-layout"><section className="card"><header className="card-header"><div><h2>Inbox</h2><p>Up to 100 recent, active notifications.</p></div><span className={`status ${unread?"status-warning":""}`}>{unread} unread</span></header><div className="notification-list">{notifications.map(item=><article className={`notification-row ${item.read_at?"":"notification-unread"}`} key={item.id}><div className="notification-symbol" aria-hidden="true">{item.read_at?"✓":"●"}</div><div><div className="notification-meta"><span className={`status ${item.priority==="urgent"?"status-danger":item.priority==="important"?"status-warning":""}`}>{item.priority}</span><time>{fmt(item.created_at)}</time></div><h3>{item.title}</h3><p>{item.body}</p><div className="notification-actions"><Link className="secondary" href={item.href}>Open notice</Link>{!item.read_at&&<form action={markNotificationRead}><input type="hidden" name="notification_id" value={item.id}/><button className="secondary">Mark read</button></form>}</div></div></article>)}{!notifications.length&&<p className="empty-copy task-empty">No notifications yet. New school notices will appear here.</p>}</div></section>
    <aside className="card"><header className="card-header"><div><h2>Delivery preferences</h2><p>Your consent applies to future messages.</p></div></header><div className="card-body"><NotificationPreferencesForm preferences={preferences}/></div></aside></div>
  </AppShell>;
}

