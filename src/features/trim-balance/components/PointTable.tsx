import type { calculateThreeShotGeometry } from "../calculations/geometry";
import { sensorName } from "../utils/display";
import type { buildPlotPoints } from "../calculations/buildPlotPoints";
import type { ResultantMetrics, PlotPoint } from "./plotTypes";

const format = (value: number | undefined, digits = 1) => value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : "—";

type Geometry = ReturnType<typeof calculateThreeShotGeometry>;

export function PointTable({ points, analyses, getMetrics }: { points: ReturnType<typeof buildPlotPoints>; analyses?: { point: PlotPoint; geometry: Geometry }[]; getMetrics?: (point: PlotPoint) => ResultantMetrics | undefined }) {
  return <div className="table-wrap"><table><thead><tr><th>Point</th><th>Sensor</th><th>N1</th><th>Initial</th><th>First</th><th>Second</th><th>Third</th>{analyses && <><th>R1</th><th>Angle</th><th>W6</th><th>Sensitivity</th></>}</tr></thead><tbody>{points.map((point) => { const metrics = getMetrics?.(point); const geometry = analyses?.find((item) => item.point.label === point.label)?.geometry; return <tr key={point.label}><td><strong>{point.label}</strong></td><td>{sensorName(point.sensor)}</td><td>{point.n1Speed}</td><td>{format(point.initialVibration)}</td><td>{format(point.firstVibration)}</td><td>{format(point.secondVibration)}</td><td>{format(point.thirdVibration)}</td>{analyses && <><td>{metrics ? format(metrics.resultantAmplitude) : getMetrics ? "Select resultant" : format(geometry?.resultantAmplitude)}</td><td>{metrics ? `${format(metrics.resultantAngleDeg)}°` : getMetrics ? "Select resultant" : `${format(geometry?.resultantAngleDeg)}°`}</td><td>{metrics ? format(metrics.w6CmG, 0) : getMetrics ? "Select resultant" : format(geometry?.w6CmG, 0)}</td><td>{metrics ? format(metrics.sensitivity, 0) : getMetrics ? "Select resultant" : format(geometry?.sensitivity, 0)}</td></>}</tr>; })}</tbody></table></div>;
}
