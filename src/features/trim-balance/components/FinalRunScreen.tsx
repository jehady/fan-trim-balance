import type { ReactNode } from "react";
import type { EngineRun, LimitSourceProvenance, N1Speed } from "../types/trimBalance";
import { buildFinalRunRows, evaluateFinalRun, type FinalRunEvaluation } from "../calculations/finalRunEvaluation";

interface FinalRunScreenProps {
  initialRun: EngineRun;
  finalRun: EngineRun;
  limits: { bearing?: number; ffccv?: number };
  limitSources: Partial<Record<"bearing" | "ffccv", LimitSourceProvenance>>;
  correction: ReactNode;
  onChange: (speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => void;
  onLimitChange: (sensor: "bearing" | "ffccv", value: number | undefined) => void;
  onLimitSourceChange: (sensor: "bearing" | "ffccv", field: "documentTitle" | "revisionOrDate" | "effectivity" | "sectionOrFigure", value: string) => void;
}

const display = (value: number, suffix = "") => Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : "—";
const inputValue = (value: number) => Number.isFinite(value) ? String(value) : "";
const targetName = (speed: N1Speed) => speed === "TO" ? "TO" : `${speed}%`;

export function FinalRunScreen({ initialRun, finalRun, limits, limitSources, correction, onChange, onLimitChange, onLimitSourceChange }: FinalRunScreenProps) {
  const evaluation = evaluateFinalRun(initialRun, finalRun, limits, limitSources);
  const rows = buildFinalRunRows(initialRun, finalRun);
  return <section className="card final-run-screen"><span className="eyebrow">STEP 10</span><h2>Final run and limit review</h2>{correction}<p>Record the final-run measurements after the applicable maintenance procedure is performed. Δ is Final Run minus Initial Run. Threshold comparison examines final vibration values, not Δ.</p><div className="limits"><label>N°1 Bearing threshold (mils)<input type="number" min="0" step="0.1" value={inputValue(limits.bearing ?? Number.NaN)} onChange={(event) => onLimitChange("bearing", event.target.value === "" ? undefined : Number(event.target.value))} /></label><label>FFCCV threshold (mils)<input type="number" min="0" step="0.1" value={inputValue(limits.ffccv ?? Number.NaN)} onChange={(event) => onLimitChange("ffccv", event.target.value === "" ? undefined : Number(event.target.value))} /></label></div><p className="field-note">1 AVM unit = 2 mils DA (3 units = 6 mils). Enter mils here, not cockpit units. 1.5 AVM units = 3 mils DA. This relationship comes from unverified training material; it is not an applicable maintenance limit.</p><p className="field-note">Thresholds are user-entered, unverified values. Software flags values strictly greater than a configured threshold; equality is not flagged. The applicable maintenance source and comparison rule have not been verified, so this is not an AMM compliance determination.</p><LimitSourceFields sensor="bearing" label="N°1 Bearing" source={limitSources.bearing} onChange={onLimitSourceChange} /><LimitSourceFields sensor="ffccv" label="FFCCV" source={limitSources.ffccv} onChange={onLimitSourceChange} /><FinalRunStatus evaluation={evaluation} /><FinalRunTable rows={rows} finalRun={finalRun} onChange={onChange} /></section>;
}

function FinalRunStatus({ evaluation }: { evaluation: FinalRunEvaluation }) {
  const message = evaluation.status === "PASS" ? "PASS — verified limits and comparison semantics were supplied." : evaluation.status === "FAIL" ? `FAIL — verified limit exceeded: ${evaluation.exceededLimits.join(", ")}.` : `NOT EVALUATED — ${evaluation.evaluationBlockers.join(" ")}`;
  return <div className={evaluation.status === "PASS" ? "success" : evaluation.status === "FAIL" ? "validation" : "todo-card"}><strong>Overall status: {evaluation.status}</strong><p>{message}</p><p>Configured-threshold screening only: {evaluation.configuredThresholdResult}{evaluation.exceededLimits.length ? ` — ${evaluation.exceededLimits.join(", ")}` : ""}.</p></div>;
}

function LimitSourceFields({ sensor, label, source, onChange }: { sensor: "bearing" | "ffccv"; label: string; source: LimitSourceProvenance | undefined; onChange: FinalRunScreenProps["onLimitSourceChange"] }) {
  const fields = [
    ["documentTitle", "Source document"],
    ["revisionOrDate", "Revision / date"],
    ["effectivity", "Effectivity"],
    ["sectionOrFigure", "Section / figure"],
  ] as const;
  return <fieldset className="limit-source"><legend>{label} threshold source — UNVERIFIED</legend><div className="form-grid">{fields.map(([field, fieldLabel]) => <label key={field}>{fieldLabel}<input value={source?.[field] ?? ""} onChange={(event) => onChange(sensor, field, event.target.value)} /></label>)}</div></fieldset>;
}

function FinalRunTable({ rows, finalRun, onChange }: { rows: ReturnType<typeof buildFinalRunRows>; finalRun: EngineRun; onChange: FinalRunScreenProps["onChange"] }) { return <div className="table-wrap"><table className="measurement-table final-run-table"><thead><tr><th>N1 target</th><th colSpan={3}>N°1 Bearing (mils)</th><th colSpan={3}>FFCCV (mils)</th></tr><tr><th></th><th>Initial</th><th>Final</th><th>Δ</th><th>Initial</th><th>Final</th><th>Δ</th></tr></thead><tbody>{rows.map((row) => { const measurement = finalRun.measurements.find((item) => item.n1Speed === row.n1Speed); return <tr key={row.n1Speed}><th scope="row">{targetName(row.n1Speed)}</th><td>{display(row.initialBearing)}</td><td><input aria-label={`${row.n1Speed} final bearing vibration`} inputMode="decimal" type="number" min="0" step="0.1" value={inputValue(row.finalBearing)} onChange={(event) => onChange(row.n1Speed, "bearingVibration", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></td><td className={row.deltaBearing < 0 ? "improved" : ""}>{display(row.deltaBearing, " mils")}</td><td>{display(row.initialFfccv)}</td><td><input aria-label={`${row.n1Speed} final FFCCV vibration`} inputMode="decimal" type="number" min="0" step="0.1" value={inputValue(measurement?.ffccvVibration ?? Number.NaN)} onChange={(event) => onChange(row.n1Speed, "ffccvVibration", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></td><td className={row.deltaFfccv < 0 ? "improved" : ""}>{display(row.deltaFfccv, " mils")}</td></tr>;})}</tbody></table></div>; }
