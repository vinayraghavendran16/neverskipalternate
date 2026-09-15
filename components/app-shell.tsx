import Link from "next/link";
import type { ReactNode } from "react";
import type { UserContext } from "@/lib/auth/context";
import { logout } from "@/app/login/actions";

const nav = [
  ["WORKSPACE"], ["/dashboard", "⌂", "Command center"], ["/dashboard/teacher", "◈", "Teacher Today"], ["/dashboard/people", "◉", "People"], ["/dashboard/academics", "▦", "Academics"], ["/dashboard/attendance", "◫", "Attendance"], ["/dashboard/homework", "↗", "Homework"], ["/dashboard/assessments", "▤", "Assessments"],
  ["EXPERIENCE"], ["/dashboard/calendar", "□", "Calendar"], ["/dashboard/communication", "◇", "Communication"],
  ["OPERATIONS"], ["/dashboard/approvals", "✓", "Approvals"], ["/dashboard/finance", "₹", "Finance"], ["/dashboard/transport", "⌖", "Transport"],
];

export function AppShell({ context, children, activePath = "/dashboard", pageTitle = "Command center" }: { context: UserContext; children: ReactNode; activePath?: string; pageTitle?: string }) {
  const family = context.role === "parent" || context.role === "student";
  const visibleNav = family ? [["MY SCHOOL"], ["/dashboard/learning", "◎", "My learning"], ["/dashboard/calendar", "□", "Calendar"], ["/dashboard/communication", "◇", "Notices"], ["/dashboard/approvals", "✓", "Leave requests"], ["/dashboard/finance", "₹", "Fees"], ["/dashboard/transport", "⌖", "Transport"], ["/dashboard/people", "◉", "My records"]] : nav;
  const planned = new Set<string>();
  const initials = context.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
        <header className="topbar"><span className="breadcrumb">{context.role} / {pageTitle}</span><div className="user"><span className="avatar">{initials}</span><span><b>{context.fullName}</b><small>{context.email}</small></span></div></header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
