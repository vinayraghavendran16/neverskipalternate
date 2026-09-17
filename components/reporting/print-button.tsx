"use client";

export function PrintButton({ label = "Print or save PDF" }: { label?: string }) {
  return <button type="button" className="primary compact print-action" onClick={()=>window.print()}><span>{label}</span><span>↗</span></button>;
}
