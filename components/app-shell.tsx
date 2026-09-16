import Link from "next/link";
import type { ReactNode } from "react";
import type { UserContext } from "@/lib/auth/context";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

const nav = [
  ["WORKSPACE"], ["/dashboard", "⌂", "Command center"], ["/dashboard/teacher", "◈", "Teacher Today"], ["/dashboard/people", "◉", "People"], ["/dashboard/academics", "▦", "Academics"], ["/dashboard/attendance", "◫", "Attendance"], ["/dashboard/homework", "↗", "Homework"], ["/dashboard/assessments", "▤", "Assessments"],
  ["EXPERIENCE"], ["/dashboard/calendar", "□", "Calendar"], ["/dashboard/communication", "◇", "Communication"], ["/dashboard/notifications", "●", "Notifications"],
  ["OPERATIONS"], ["/dashboard/approvals", "✓", "Approvals"], ["/dashboard/finance", "₹", "Finance"], ["/dashboard/transport", "⌖", "Transport"], ["/dashboard/operations", "◌", "System health"],
];

export async function AppShell({ context, children, activePath = "/dashboard", pageTitle = "Command center" }: { context: UserContext; children: ReactNode; activePath?: string; pageTitle?: string }) {
  const family = context.role === "parent" || context.role === "student";
  const visibleNav = family ? [["MY SCHOOL"], ["/dashboard/learning", "◎", "My learning"], ["/dashboard/calendar", "□", "Calendar"], ["/dashboard/communication", "◇", "Notices"], ["/dashboard/notifications", "●", "Notifications"], ["/dashboard/approvals", "✓", "Leave requests"], ["/dashboard/finance", "₹", "Fees"], ["/dashboard/transport", "⌖", "Transport"], ["/dashboard/people", "◉", "My records"]] : ["owner","administrator"].includes(context.role) ? nav : nav.filter((item)=>item[0]!=="/dashboard/operations");
  const planned = new Set<string>();
  const initials = context.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const supabase=await createClient();
  const unreadResult=supabase?await supabase.from("notifications").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("user_id",context.userId).eq("in_app_enabled",true).is("read_at",null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`):null;
  const unread=unreadResult?.count||0;
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>Northstar</span></div>
        <nav aria-label="Main navigation">{visibleNav.map((item, index) => item.length === 1 ? <div className="nav-label" key={`${item[0]}-${index}`}>{item[0]}</div> : <Link className={`nav-item ${item[0] === activePath ? "active" : ""}`} href={item[0]} aria-label={`${item[2]}${planned.has(item[0]) ? " (unavailable)" : ""}`} aria-current={item[0] === activePath ? "page" : undefined} title={item[2]} key={`${item[2]}-${index}`}><span className="nav-icon">{item[1]}</span><span>{item[2]}{planned.has(item[0]) && <small className="nav-unavailable">Unavailable</small>}</span></Link>)}</nav>
        <div className="sidebar-footer">
          <div className="tenant-chip"><span className="tenant-avatar">{context.organizationName.slice(0, 2).toUpperCase()}</span><div><b>{context.organizationName}</b><small>{context.campusName || "All campuses"}</small></div></div>
          <form action={logout}><button className="signout" type="submit">↪ &nbsp; Sign out</button></form>
        </div>
      </aside>
      <main className="main" id="main-content" tabIndex={-1}>
        <header className="topbar"><span className="breadcrumb">{context.role} / {pageTitle}</span><div className="topbar-actions"><Link className="notification-button" href="/dashboard/notifications" aria-label={`${unread} unread notification${unread===1?"":"s"}`}><span aria-hidden="true">●</span>{unread>0&&<b>{unread>99?"99+":unread}</b>}</Link><div className="user"><span className="avatar">{initials}</span><span><b>{context.fullName}</b><small>{context.email}</small></span></div></div></header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
