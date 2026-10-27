import type {
  EngineRun,
  SensorType,
} from "../types/trimBalance";
import { N1_SPEEDS } from "../types/trimBalance";

export interface CandidatePoint {
  sensor: SensorType;
  n1Speed: EngineRun["measurements"][number]["n1Speed"];
  initialVibration: number;
}

export interface PlotPointCutoffTie {
  sensor: SensorType;
  vibration: number;
  speeds: EngineRun["measurements"][number]["n1Speed"][];
}

function compareCandidateReadings(
  first: Pick<CandidatePoint, "initialVibration" | "n1Speed">,
  second: Pick<CandidatePoint, "initialVibration" | "n1Speed">
): number {
  return second.initialVibration - first.initialVibration ||
    N1_SPEEDS.indexOf(first.n1Speed) - N1_SPEEDS.indexOf(second.n1Speed);
}

export function findPlotPointCutoffTies(initialRun: EngineRun): PlotPointCutoffTie[] {
  return (["bearing", "ffccv"] as const).flatMap((sensor) => {
    const candidates = initialRun.measurements
      .map((measurement) => ({
        n1Speed: measurement.n1Speed,
        vibration: sensor === "bearing" ? measurement.bearingVibration : measurement.ffccvVibration,
      }))
      .sort((first, second) =>
        second.vibration - first.vibration ||
        N1_SPEEDS.indexOf(first.n1Speed) - N1_SPEEDS.indexOf(second.n1Speed)
      );
    if (candidates.length < 4 || !Number.isFinite(candidates[2].vibration) ||
      candidates[2].vibration !== candidates[3].vibration) {
      return [];
    }
    return [{
      sensor,
      vibration: candidates[2].vibration,
      speeds: candidates.filter(({ vibration }) => vibration === candidates[2].vibration).map(({ n1Speed }) => n1Speed),
    }];
  });
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
    .sort(compareCandidateReadings)
    .slice(0, 3);
}

export function selectInitialPlotPoints(
  initialRun: EngineRun
): CandidatePoint[] {
  const bearingPoints = getTopThree(initialRun, "bearing");
  const ffccvPoints = getTopThree(initialRun, "ffccv");

  return [...bearingPoints, ...ffccvPoints];
}
