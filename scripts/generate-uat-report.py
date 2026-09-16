from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/northstar-uat-release-readiness-2026-09-16.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#17221c")
MUTED = colors.HexColor("#58645c")
GREEN = colors.HexColor("#164e3c")
GREEN_2 = colors.HexColor("#26765c")
MINT = colors.HexColor("#d9f0e4")
PAPER = colors.HexColor("#f6f7f2")
LINE = colors.HexColor("#dde3dc")
YELLOW = colors.HexColor("#fff0bd")
RED = colors.HexColor("#a73c38")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Kicker", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=GREEN_2, spaceAfter=5, tracking=1.4))
styles.add(ParagraphStyle(name="TitleLarge", fontName="Helvetica-Bold", fontSize=29, leading=31, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle(name="Deck", fontName="Helvetica", fontSize=12, leading=18, textColor=MUTED, spaceAfter=18))
styles.add(ParagraphStyle(name="H1x", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=INK, spaceBefore=2, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=INK, spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle(name="Bodyx", fontName="Helvetica", fontSize=9, leading=14, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name="Smallx", fontName="Helvetica", fontSize=7.5, leading=10.5, textColor=MUTED))
styles.add(ParagraphStyle(name="Cellx", fontName="Helvetica", fontSize=7.2, leading=9.3, textColor=INK))
styles.add(ParagraphStyle(name="CellMuted", fontName="Helvetica", fontSize=7.2, leading=9.3, textColor=MUTED))
styles.add(ParagraphStyle(name="CellHead", fontName="Helvetica-Bold", fontSize=7.1, leading=9, textColor=colors.white))
styles.add(ParagraphStyle(name="Number", fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=GREEN, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="Callout", fontName="Helvetica-Bold", fontSize=10.5, leading=15, textColor=GREEN))


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def bullets(items):
    rows = []
    for item in items:
        rows.append(Table([[P("•", "H2x"), P(item)]], colWidths=[5*mm, 160*mm], style=[("VALIGN", (0,0), (-1,-1), "TOP")]))
    return rows


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=19*mm, bottomMargin=17*mm,
                         title="Northstar UAT and Release Readiness", author="Northstar School OS")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="main")
        self.addPageTemplates(PageTemplate(id="content", frames=frame, onPage=self.decorate))

    def decorate(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setFillColor(GREEN)
        canvas.rect(0, A4[1]-5*mm, A4[0], 5*mm, fill=1, stroke=0)
        if doc.page > 1:
            canvas.setFont("Helvetica-Bold", 7)
            canvas.setFillColor(GREEN)
            canvas.drawString(18*mm, A4[1]-12*mm, "NORTHSTAR · RELEASE READINESS")
            canvas.setStrokeColor(LINE)
            canvas.line(18*mm, 14*mm, A4[0]-18*mm, 14*mm)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(18*mm, 9*mm, "16 September 2026 · Internal release evidence")
        canvas.drawRightString(A4[0]-18*mm, 9*mm, f"{doc.page}")
        canvas.restoreState()


story = []
story += [Spacer(1, 12*mm), P("NORTHSTAR SCHOOL OS", "Kicker"), P("UAT & release<br/>readiness report", "TitleLarge"),
          P("A complete audit of the delivered Phase 1–8 workflows, covering navigation, module behaviour, usability, accessibility, security, database reliability and performance observations.", "Deck")]

meta = [
    [P("TEST DATE", "CellHead"), P("RELEASE CANDIDATE", "CellHead"), P("PRODUCTION BASELINE", "CellHead")],
    [P("16 September 2026", "Cellx"), P("codex/release-readiness-uat", "Cellx"), P("d7458922cc42", "Cellx")],
]
t = Table(meta, colWidths=[42*mm, 73*mm, 60*mm], rowHeights=[9*mm, 12*mm])
t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), GREEN), ("BACKGROUND", (0,1), (-1,1), colors.white), ("GRID", (0,0), (-1,-1), .5, LINE), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7)]))
story += [t, Spacer(1, 12*mm)]

decision = Table([[P("GO", "Callout"), P("The delivered scope is ready to deploy with the pilot controls and limitations documented in this report.", "Bodyx")]], colWidths=[24*mm, 151*mm])
decision.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), MINT), ("BOX", (0,0), (-1,-1), .75, GREEN_2), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10), ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9)]))
story += [decision, Spacer(1, 9*mm), P("Executive finding", "H1x"),
          P("The currently delivered product passed its automated quality gates, clean database migration and authorization regression, production health check, and signed-in owner route sweep. Five verified UX, accessibility and performance defects were fixed. No unresolved release-blocking defect remains in the audited scope."),
          P("Before a multi-school pilot, named teacher, parent, student and finance users should complete role-specific acceptance, and Supabase backup and point-in-time recovery settings should be verified by an administrator."),
          PageBreak()]

story += [P("01 · Scope and method", "Kicker"), P("What was tested", "H1x"),
          P("The review covered all visible navigation and the setup, people, academics, attendance, teaching, homework, assessment, family, calendar, communication, notification, approval, finance, transport and operations workflows.")]
story += bullets([
    "Signed-in production route sweep using the available owner account.",
    "Responsive inspection at desktop and tablet widths, including form containment and navigation behaviour.",
    "Semantic, keyboard-focus and accessible-name inspection on every audited route.",
    "Implementation, dependency, security-header and bounded-query review.",
    "Lint, strict TypeScript, unit tests and optimized production build.",
    "Clean disposable PostgreSQL migration and authorization/transaction regression.",
    "Production health response and safe operational-header verification.",
])
story += [Spacer(1, 5*mm), P("Performance method", "H2x"),
          P("The environment did not expose the required Chrome DevTools performance connector. No Lighthouse or Core Web Vitals values are claimed. Navigation observations measure wall-clock time until visible route content during browser automation and include network and tool overhead."),
          P("The live sweep did not create, submit, approve, invoice, pay, publish or otherwise alter production school records. Destructive and outbound communication actions were excluded."), PageBreak()]

uat_rows = [
    ("Command centre", "/dashboard", "PASS", "Live metrics, quick actions and release identity."),
    ("Teacher Today", "/dashboard/teacher", "PASS", "Timetable and task entry points."),
    ("People", "/dashboard/people", "PASS", "Directory, filters, tabs and create/import paths."),
    ("Academics", "/dashboard/academics", "PASS*", "Setup and catalogue; side-panel layout fixed."),
    ("Attendance", "/dashboard/attendance", "PASS", "Class register entry points and status."),
    ("Homework", "/dashboard/homework", "PASS", "Assignments, prerequisites and response paths."),
    ("Assessments", "/dashboard/assessments", "PASS", "Guided prerequisites and assessment register."),
    ("Calendar", "/dashboard/calendar", "PASS*", "Upcoming events; publishing overflow fixed."),
    ("Communication", "/dashboard/communication", "PASS*", "Targeting and acknowledgement; labels fixed."),
    ("Notifications", "/dashboard/notifications", "PASS", "Inbox, unread state and consent preferences."),
    ("Approvals", "/dashboard/approvals", "PASS", "Leave and attendance-correction queues."),
    ("Finance", "/dashboard/finance", "PASS", "Invoices, balances and controlled payment flow."),
    ("Transport", "/dashboard/transport", "PASS", "Vehicles, routes, riders, stops and alerts."),
    ("System health", "/dashboard/operations", "PASS", "Release, readiness, incidents and audit signals."),
]
data = [[P("WORKFLOW", "CellHead"), P("ROUTE", "CellHead"), P("RESULT", "CellHead"), P("EVIDENCE", "CellHead")]]
for a,b,c,d in uat_rows:
    data.append([P(a,"Cellx"),P(b,"CellMuted"),P(c,"Cellx"),P(d,"CellMuted")])
t = Table(data, colWidths=[37*mm, 46*mm, 18*mm, 74*mm], repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("GRID",(0,0),(-1,-1),.35,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)] + [("BACKGROUND",(0,r),(-1,r),colors.white if r%2 else colors.HexColor("#f0f3ee")) for r in range(1,len(data))]))
story += [P("02 · Full workflow UAT", "Kicker"), P("Module findings", "H1x"), t, Spacer(1, 5*mm), P("* Passed after a verified release-candidate fix. Every audited page exposed one main landmark and one page heading. No unnamed link or button, console error or console warning was found during the route sweep.", "Smallx"), PageBreak()]

fixes = [
    ("01", "Calendar containment", "Date/time controls could exceed the publishing card. Grid children and controls now shrink within their card."),
    ("02", "Academic setup readability", "The narrow create-class panel was difficult to scan. Side-panel setup now uses one clear column."),
    ("03", "Tablet sign out", "Text wrapped vertically in the compact sidebar. It now presents a stable icon while retaining its accessible name."),
    ("04", "Audience labels", "Generated plurals produced unnatural accessible output. Forms now use Teachers, Parents, Students and Staff."),
    ("05", "Shared request waterfall", "The shell opened another notification request after route data. Unread state now loads with the existing context queries."),
]
story += [P("03 · Verified defects", "Kicker"), P("Fixed in this release", "H1x")]
for n,title,desc in fixes:
    card = Table([[P(n,"Number"), P(f"<b>{title}</b><br/>{desc}","Bodyx")]], colWidths=[18*mm,157*mm])
    card.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.white),("BOX",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))
    story += [card, Spacer(1, 3*mm)]
story += [Spacer(1, 4*mm), P("Accessibility result", "H2x"), P("Visible keyboard focus, a skip link, named navigation, one main landmark per page, explicit form labels and readable compact layouts are present. Reduced-motion preferences are respected. Named user acceptance with assistive technology remains a pilot control."), PageBreak()]

timings = [("Attendance","2.394 s"),("Teacher Today","2.424 s"),("People","2.526 s"),("Notifications","2.540 s"),("Finance","2.582 s"),("Academics","2.607 s"),("System health","2.737 s"),("Assessments","2.950 s"),("Command centre","2.982 s"),("Approvals","3.004 s"),("Calendar","3.063 s"),("Transport","3.096 s"),("Homework","3.121 s"),("Communication","3.689 s")]
data=[[P("ROUTE", "CellHead"),P("CONTENT READY", "CellHead")]]+[[P(a,"Cellx"),P(b,"Cellx")] for a,b in timings]
t=Table(data,colWidths=[120*mm,55*mm],repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("GRID",(0,0),(-1,-1),.35,LINE),("BACKGROUND",(0,1),(-1,-1),colors.white),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
story += [P("04 · Performance", "Kicker"), P("Navigation observations", "H1x"), P("Observed range: <b>2.394–3.689 seconds</b>. These figures are qualitative content-ready observations, not LCP, INP or CLS. This release removes one shared database request from every authenticated page."), t, Spacer(1,5*mm),
          P("Production health", "H2x"), P("The health endpoint returned HTTP 200 with <b>configuration: ok</b> and <b>database: ok</b>. Internal database latency was <b>732 ms</b>; the external audit request completed in <b>2.021 seconds</b>. The response is correctly marked <b>cache-control: no-store</b>."),
          P("Recommended next measurement", "H2x"), P("Add trace-based LCP, INP and CLS budgets through a browser-performance runner in CI and capture representative cold and warm runs from India."), PageBreak()]

gates=[("ESLint","PASS"),("Strict TypeScript","PASS"),("Unit tests","7 / 7 PASS"),("Production build","PASS · all routes compiled"),("Isolated PostgreSQL regression","PASS"),("Production dependency audit","0 vulnerabilities"),("Production health","HTTP 200 · healthy")]
data=[[P("QUALITY GATE","CellHead"),P("RESULT","CellHead")]]+[[P(a,"Cellx"),P(b,"Cellx")] for a,b in gates]
t=Table(data,colWidths=[115*mm,60*mm],repeatRows=1)
t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("GRID",(0,0),(-1,-1),.35,LINE),("BACKGROUND",(0,1),(-1,-1),colors.white),("LEFTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
story += [P("05 · Security and reliability", "Kicker"), P("Release controls", "H1x"), t, Spacer(1,6*mm)]
story += bullets([
    "All 10 migrations applied cleanly to an empty disposable database before the regression suite ran.",
    "Tenant isolation, linked-family visibility, assigned-teacher access and suspended-user restrictions passed.",
    "Attendance, marks, payments, corrections, incident reporting and notification fan-out preserve atomicity and rollback invalid input.",
    "Transport capacity, timetable overlap, locked attendance, notification consent and anonymous RPC restrictions passed.",
    "HSTS, frame denial, MIME protection, restrictive referrer policy, cross-origin opener isolation and device-permission denial are active.",
    "CSP blocks objects, framing and non-self defaults. Inline script/style allowances remain until a tested Next.js nonce architecture is introduced.",
    "No environment value or secret is included in this report or the committed release files.",
])
story += [PageBreak()]

story += [P("06 · Limitations and pilot controls", "Kicker"), P("What remains to validate", "H1x")]
story += bullets([
    "The live signed-in session represented the owner role. Named teacher, parent, student, staff and finance users must complete role-specific acceptance before a multi-school pilot.",
    "Production UAT was read-only. Record creation, approvals, payments and outbound messages were excluded from the live sweep.",
    "Chrome DevTools performance tracing was unavailable, so no instrumented Core Web Vitals are reported.",
    "pgTAP files are present; the local disposable runner covered equivalent high-risk authorization and transaction paths. Hosted pgTAP remains part of staging release procedure.",
    "Email and SMS providers remain disabled. In-app notification delivery and channel consent storage are operational.",
    "Supabase backup and point-in-time recovery settings require console verification before pilot onboarding.",
])
story += [Spacer(1,6*mm), P("Release recommendation", "H2x"), P("Deploy the release candidate, require green CI and Vercel checks, then run a production smoke check for health, Help & releases, the PDF link, calendar containment and tablet navigation. Proceed to stakeholder pilot UAT only after those checks pass."), PageBreak()]

roadmap=[("09","Payments and reconciliation","Gateway orders, signed webhooks, idempotent settlement, refunds and finance reconciliation."),("10","Reliable offline work","Offline attendance and teacher queues with safe retries and conflict resolution."),("11","Admissions","Applications, document verification, decisions and enrolled-student conversion."),("12","Academic reporting","Report cards, transcripts, progress analysis and exportable school reports.")]
story += [P("07 · Product roadmap", "Kicker"), P("Prioritized next phases", "H1x"), P("The sequence favors complete financial control, operational resilience and the next highest-value school workflows.")]
for n,title,desc in roadmap:
    card=Table([[P(n,"Number"),P(f"<b>{title}</b><br/>{desc}","Bodyx")]],colWidths=[20*mm,155*mm])
    card.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.white),("BOX",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
    story += [card,Spacer(1,4*mm)]
parked=Table([[P("PARKED", "CellHead"),P("Ask Northstar, voice input, ElevenLabs and automated voice announcements remain outside the active roadmap until privacy, consent, retention, provider and cost decisions are approved.","Bodyx")]],colWidths=[28*mm,147*mm])
parked.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),YELLOW),("BOX",(0,0),(-1,-1),.6,colors.HexColor("#d6bd6f")),("BACKGROUND",(0,0),(0,0),GREEN),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),9)]))
story += [Spacer(1,5*mm),parked,Spacer(1,12*mm),P("Northstar School OS · release evidence", "Kicker"),P("Production: northstar-school-os-nu.vercel.app", "Smallx")]

ReportDoc(str(OUTPUT)).build(story)
print(OUTPUT)
