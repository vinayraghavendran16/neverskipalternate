import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getUserContext } from "@/lib/auth/context";

const modules = {
  academics: { title: "Academics", eyebrow: "PHASE 3", description: "Classes, sections, subjects, timetables and enrollment workflows.", items: ["Class and section setup", "Subject allocation", "Teacher timetables", "Student enrollment"] },
  transport: { title: "Transport", eyebrow: "PLANNED MODULE", description: "Routes, stops, vehicles, attendants and live exceptions.", items: ["Route planning", "Student allocation", "Vehicle roster", "Delay communication"] },
} as const;

export default async function PlannedModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: key } = await params;
  if (!Object.hasOwn(modules, key)) notFound();
  const moduleConfig = modules[key as keyof typeof modules];
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/${key}`);

  return (
    <AppShell context={context} activePath={`/dashboard/${key}`} pageTitle={moduleConfig.title}>
      <div className="planned-page"><span className="eyebrow">{moduleConfig.eyebrow}</span><h1>{moduleConfig.title} is not available yet.</h1><p>{moduleConfig.description}</p><div className="planned-list">{moduleConfig.items.map((item, index) => <div key={item}><span>0{index + 1}</span><b>{item}</b><small>Unavailable — planned</small></div>)}</div><Link className="secondary" href="/dashboard">Return to command center</Link></div>
    </AppShell>
  );
}
