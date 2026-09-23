import type {
  EngineRun,
  SensorType,
} from "../types/trimBalance";

export interface CandidatePoint {
  sensor: SensorType;
  n1Speed: EngineRun["measurements"][number]["n1Speed"];
  initialVibration: number;
}

function getTopThree(
  run: EngineRun,
  sensor: SensorType
): CandidatePoint[] {
  const candidates: CandidatePoint[] = run.measurements.map(
    (measurement) => ({
      sensor,
      n1Speed: measurement.n1Speed,
      initialVibration:
        sensor === "bearing"
          ? measurement.bearingVibration
          : measurement.ffccvVibration,
    })
  );

  return [...candidates]
    .sort((a, b) => b.initialVibration - a.initialVibration)
    .slice(0, 3);
}

export function selectInitialPlotPoints(
  initialRun: EngineRun
): CandidatePoint[] {
  const bearingPoints = getTopThree(initialRun, "bearing");
  const ffccvPoints = getTopThree(initialRun, "ffccv");

  return [...bearingPoints, ...ffccvPoints];
}
