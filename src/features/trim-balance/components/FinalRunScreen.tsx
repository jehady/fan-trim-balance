import type { ReactNode } from "react";
import type { EngineRun, N1Speed } from "../types/trimBalance";
import { buildFinalRunRows, evaluateFinalRun, type FinalRunEvaluation } from "../calculations/finalRunEvaluation";

interface FinalRunScreenProps {
  initialRun: EngineRun;
  finalRun: EngineRun;
  limits: { bearing?: number; ffccv?: number };
  correction: ReactNode;
  onChange: (speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => void;
  onLimitChange: (sensor: "bearing" | "ffccv", value: number | undefined) => void;
}

const display = (value: number, suffix = "") => Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : "—";
const inputValue = (value: number) => Number.isFinite(value) ? String(value) : "";
const targetName = (speed: N1Speed) => speed === "TO" ? "TO" : `${speed}%`;

export function FinalRunScreen({ initialRun, finalRun, limits, correction, onChange, onLimitChange }: FinalRunScreenProps) {
  const evaluation = evaluateFinalRun(initialRun, finalRun, limits);
  const rows = buildFinalRunRows(initialRun, finalRun);
  return <section className="card final-run-screen"><span className="eyebrow">STEP 10</span><h2>Final run and applicable limits</h2>{correction}<p>After the engineer physically applies the calculated correction, enter the final engine-run measurements below. Delta is defined as final vibration minus initial vibration. Pass/fail compares FINAL vibration only with the configured limit.</p><div className="limits"><label>N°1 Bearing limit <small>TEST or applicable AMM, mils</small><input type="number" min="0" step="0.1" value={inputValue(limits.bearing ?? Number.NaN)} onChange={(event) => onLimitChange("bearing", event.target.value === "" ? undefined : Number(event.target.value))} /></label><label>FFCCV limit <small>TEST or applicable AMM, mils</small><input type="number" min="0" step="0.1" value={inputValue(limits.ffccv ?? Number.NaN)} onChange={(event) => onLimitChange("ffccv", event.target.value === "" ? undefined : Number(event.target.value))} /></label></div><p className="field-note">Enter approved/applicable AMM 71-00-00 limits when available. TEST limits must be identified as TEST values and are not approved AMM limits.</p><FinalRunStatus evaluation={evaluation} /><FinalRunTable rows={rows} finalRun={finalRun} onChange={onChange} /></section>;
}

function FinalRunStatus({ evaluation }: { evaluation: FinalRunEvaluation }) {
  const message = evaluation.status === "PASS" ? "PASS — every entered final vibration is within its configured limit." : evaluation.status === "FAIL" ? `FAIL — final vibration exceeds the configured limit: ${evaluation.exceededLimits.join(", ")}.` : evaluation.missingMeasurements.length ? `NOT EVALUATED — missing: ${evaluation.missingMeasurements.join(", ")}.` : "NOT EVALUATED — applicable maintenance limits are not configured. No pass/fail claim is made.";
  return <div className={evaluation.status === "PASS" ? "success" : evaluation.status === "FAIL" ? "validation" : "todo-card"}><strong>Overall status: {evaluation.status}</strong><p>{message}</p></div>;
}

function FinalRunTable({ rows, finalRun, onChange }: { rows: ReturnType<typeof buildFinalRunRows>; finalRun: EngineRun; onChange: FinalRunScreenProps["onChange"] }) { return <div className="table-wrap"><table className="measurement-table final-run-table"><thead><tr><th>N1 target</th><th colSpan={3}>N°1 Bearing (mils)</th><th colSpan={3}>FFCCV (mils)</th></tr><tr><th></th><th>Initial</th><th>Final</th><th>Δ</th><th>Initial</th><th>Final</th><th>Δ</th></tr></thead><tbody>{rows.map((row) => { const measurement = finalRun.measurements.find((item) => item.n1Speed === row.n1Speed); return <tr key={row.n1Speed}><th scope="row">{targetName(row.n1Speed)}</th><td>{display(row.initialBearing)}</td><td><input aria-label={`${row.n1Speed} final bearing vibration`} inputMode="decimal" type="number" min="0" step="0.1" value={inputValue(row.finalBearing)} onChange={(event) => onChange(row.n1Speed, "bearingVibration", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></td><td className={row.deltaBearing < 0 ? "improved" : ""}>{display(row.deltaBearing, " mils")}</td><td>{display(row.initialFfccv)}</td><td><input aria-label={`${row.n1Speed} final FFCCV vibration`} inputMode="decimal" type="number" min="0" step="0.1" value={inputValue(measurement?.ffccvVibration ?? Number.NaN)} onChange={(event) => onChange(row.n1Speed, "ffccvVibration", event.target.value === "" ? Number.NaN : Number(event.target.value))} /></td><td className={row.deltaFfccv < 0 ? "improved" : ""}>{display(row.deltaFfccv, " mils")}</td></tr>;})}</tbody></table></div>; }
