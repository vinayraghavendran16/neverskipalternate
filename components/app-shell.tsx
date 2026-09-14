import Link from "next/link";
import type { ReactNode } from "react";
import type { UserContext } from "@/lib/auth/context";
import { logout } from "@/app/login/actions";

const nav = [
  ["WORKSPACE"], ["/dashboard", "⌂", "Command center"], ["/dashboard/people", "◉", "People"], ["/dashboard/academics", "▦", "Academics"], ["/dashboard/attendance", "◫", "Attendance"],
  ["OPERATIONS"], ["/dashboard/approvals", "✓", "Approvals"], ["/dashboard/finance", "₹", "Finance"], ["/dashboard/transport", "⌖", "Transport"], ["/dashboard/communication", "◇", "Communication"],
];

export function AppShell({ context, children, activePath = "/dashboard", pageTitle = "Command center" }: { context: UserContext; children: ReactNode; activePath?: string; pageTitle?: string }) {
  const initials = context.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>Northstar</span></div>
        <nav>{nav.map((item, index) => item.length === 1 ? <div className="nav-label" key={`${item[0]}-${index}`}>{item[0]}</div> : <Link className={`nav-item ${item[0] === activePath ? "active" : ""}`} href={item[0]} key={`${item[2]}-${index}`}><span className="nav-icon">{item[1]}</span><span>{item[2]}</span></Link>)}</nav>
        <div className="sidebar-footer">
          <div className="tenant-chip"><span className="tenant-avatar">{context.organizationName.slice(0, 2).toUpperCase()}</span><div><b>{context.organizationName}</b><small>{context.campusName || "All campuses"}</small></div></div>
          <form action={logout}><button className="signout" type="submit">↪ &nbsp; Sign out</button></form>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><span className="breadcrumb">{context.role} / {pageTitle}</span><div className="user"><span className="avatar">{initials}</span><span><b>{context.fullName}</b><small>{context.email}</small></span></div></header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
