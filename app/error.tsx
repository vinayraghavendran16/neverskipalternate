"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="content"><h1>We couldn’t load this page.</h1><p role="alert">Please try again. If the problem continues, contact your school administrator.</p><button className="secondary" onClick={reset}>Try again</button><Link className="back-link" href="/dashboard">Return to home</Link></main>;
}
