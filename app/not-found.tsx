import Link from "next/link";
export default function NotFound() {
 return <main className="content"><h1>Page not found</h1><p>This page or record is unavailable, or you don’t have access.</p><Link className="secondary" href="/dashboard">Return to home</Link></main>;
}
