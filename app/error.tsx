"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error,reset }: { error:Error&{digest?:string};reset: () => void }) {
  useEffect(()=>{const route=window.location.pathname;void fetch("/api/incidents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({route,digest:error.digest||error.name}),keepalive:true}).catch(()=>undefined)},[error]);
  return <main className="content"><h1>We couldn’t load this page.</h1><p role="alert">Please try again. If the problem continues, your school administrator can review the incident in System health.</p><button className="secondary" onClick={reset}>Try again</button><Link className="back-link" href="/dashboard">Return to home</Link></main>;
}
