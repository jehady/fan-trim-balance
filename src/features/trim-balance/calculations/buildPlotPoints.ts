import type { EngineRun, PlotPointData, SensorType } from "../types/trimBalance";
import { selectInitialPlotPoints } from "./selectPlotPoints";

const labelsBySensor: Record<SensorType, readonly PlotPointData["label"][]> = {
  bearing: ["A", "B", "C"],
  ffccv: ["D", "E", "F"],
};

function vibrationFor(run: EngineRun, n1Speed: PlotPointData["n1Speed"], sensor: SensorType): number {
  const measurement = run.measurements.find((item) => item.n1Speed === n1Speed);
  if (!measurement) {
    throw new Error(`Missing ${n1Speed} measurement required for plot point.`);
  }
  return sensor === "bearing" ? measurement.bearingVibration : measurement.ffccvVibration;
}

/** Builds the manual A–F plot-point rows from the four recorded runs. */
export function buildPlotPoints(
  initialRun: EngineRun,
  firstRun: EngineRun,
  secondRun: EngineRun,
  thirdRun: EngineRun
): PlotPointData[] {
  const selected = selectInitialPlotPoints(initialRun);
  const sensorIndexes: Record<SensorType, number> = { bearing: 0, ffccv: 0 };

  return selected.map((point) => {
    const label = labelsBySensor[point.sensor][sensorIndexes[point.sensor]++];
    return {
      ...point,
      label,
      firstVibration: vibrationFor(firstRun, point.n1Speed, point.sensor),
      secondVibration: vibrationFor(secondRun, point.n1Speed, point.sensor),
      thirdVibration: vibrationFor(thirdRun, point.n1Speed, point.sensor),
    };
  });
}
