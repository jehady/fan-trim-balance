import type { ReactNode } from "react";

export function Card({ title, step, children }: { title: string; step: number; children: ReactNode }) {
  return <section className="card"><span className="eyebrow">STEP {step + 1}</span><h2>{title}</h2>{children}</section>;
}
