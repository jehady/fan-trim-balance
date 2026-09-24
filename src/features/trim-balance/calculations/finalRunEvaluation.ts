import { N1_SPEEDS, type EngineRun, type N1Speed } from "../types/trimBalance";

export type FinalRunStatus = "PASS" | "FAIL" | "NOT EVALUATED";
export type FinalRunSensor = "bearing" | "ffccv";

export interface FinalRunRow {
  n1Speed: N1Speed;
  initialBearing: number;
  finalBearing: number;
  deltaBearing: number;
  initialFfccv: number;
  finalFfccv: number;
  deltaFfccv: number;
}

export interface FinalRunEvaluation {
  rows: FinalRunRow[];
  status: FinalRunStatus;
  missingMeasurements: string[];
  exceededLimits: string[];
}

function valueFor(run: EngineRun, speed: N1Speed, sensor: FinalRunSensor): number {
  const measurement = run.measurements.find((item) => item.n1Speed === speed);
  return sensor === "bearing" ? measurement?.bearingVibration ?? Number.NaN : measurement?.ffccvVibration ?? Number.NaN;
}

function delta(initial: number, final: number): number {
  return Number.isFinite(initial) && Number.isFinite(final) ? final - initial : Number.NaN;
}

export function buildFinalRunRows(initialRun: EngineRun, finalRun: EngineRun): FinalRunRow[] {
  return N1_SPEEDS.map((n1Speed) => {
    const initialBearing = valueFor(initialRun, n1Speed, "bearing");
    const finalBearing = valueFor(finalRun, n1Speed, "bearing");
    const initialFfccv = valueFor(initialRun, n1Speed, "ffccv");
    const finalFfccv = valueFor(finalRun, n1Speed, "ffccv");
    return { n1Speed, initialBearing, finalBearing, deltaBearing: delta(initialBearing, finalBearing), initialFfccv, finalFfccv, deltaFfccv: delta(initialFfccv, finalFfccv) };
  });
}

export function evaluateFinalRun(
  initialRun: EngineRun,
  finalRun: EngineRun,
  limits: { bearing?: number; ffccv?: number }
): FinalRunEvaluation {
  const rows = buildFinalRunRows(initialRun, finalRun);
  const missingMeasurements: string[] = [];
  const exceededLimits: string[] = [];
  const hasBearingLimit = Number.isFinite(limits.bearing);
  const hasFfccvLimit = Number.isFinite(limits.ffccv);

  for (const row of rows) {
    const target = row.n1Speed === "TO" ? "TO" : `${row.n1Speed}%`;
    if (!Number.isFinite(row.initialBearing)) missingMeasurements.push(`${target} initial N°1 Bearing`);
    if (!Number.isFinite(row.finalBearing)) missingMeasurements.push(`${target} final N°1 Bearing`);
    if (!Number.isFinite(row.initialFfccv)) missingMeasurements.push(`${target} initial FFCCV`);
    if (!Number.isFinite(row.finalFfccv)) missingMeasurements.push(`${target} final FFCCV`);
    if (hasBearingLimit && Number.isFinite(row.finalBearing) && row.finalBearing > limits.bearing!) exceededLimits.push(`${target} final N°1 Bearing`);
    if (hasFfccvLimit && Number.isFinite(row.finalFfccv) && row.finalFfccv > limits.ffccv!) exceededLimits.push(`${target} final FFCCV`);
  }

  const status = missingMeasurements.length || !hasBearingLimit || !hasFfccvLimit ? "NOT EVALUATED" : exceededLimits.length ? "FAIL" : "PASS";
  return { rows, status, missingMeasurements, exceededLimits };
}
