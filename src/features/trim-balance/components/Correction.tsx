import { Card } from "./Card";
import { Errors } from "./Errors";
import { PointTable } from "./PointTable";
import { format } from "../utils/display";
import type { PairwiseAnalysis } from "../calculations/pairwiseAnalysis";
import type { ThreeShotCircles } from "../calculations/geometry";
import type { buildPlotPoints } from "../calculations/buildPlotPoints";
import type { PlotPoint, ResultantMetrics } from "./plotTypes";

export function Correction({ errors, points, analyses, pairs, allResultantsValid, resultantErrors, calculationError, getMetrics }: { errors: string[]; points: ReturnType<typeof buildPlotPoints>; analyses: { point: PlotPoint; geometry: ThreeShotCircles }[]; pairs: PairwiseAnalysis[]; allResultantsValid: boolean; resultantErrors: string[]; calculationError: string | null; getMetrics: (point: PlotPoint) => ResultantMetrics | undefined }) {
  const confirmedCount = points.filter((point) => getMetrics(point)).length;
  return <Card title="Final correction review" step={7}><p>These A–F resultant values are manually confirmed Step 7 selections. Each must be inside the common area of its three run circles. Reference/example values are not used.</p>{errors.length ? <Errors errors={errors} /> : <><PointTable points={points} analyses={analyses} getMetrics={getMetrics} /><h3>Pairwise analysis from confirmed selections</h3>{allResultantsValid && !calculationError ? <div className="table-wrap"><table><thead><tr><th>Pair</th><th>Distance (cm·g)</th><th>Combined sensitivity</th><th>U</th></tr></thead><tbody>{pairs.map((pair) => <tr key={pair.pair}><td>{pair.pair}</td><td>{format(pair.distanceCmG, 0)}</td><td>{format(pair.combinedSensitivity, 0)}</td><td>{format(pair.amplitude, 3)}</td></tr>)}</tbody></table></div> : <div className="todo-card"><strong>Correction unavailable: {allResultantsValid ? "validated resultants could not produce a correction." : `${confirmedCount} of 6 valid resultants confirmed.`}</strong><p>{calculationError ?? "No partial maximum-U pair or correction vector is calculated."}</p>{resultantErrors.length > 0 && <ul>{resultantErrors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>}<div className="todo-card"><strong>PO weight selection and physical installation unavailable.</strong><p>The applicable, approved PO weight/location chart is not supplied or verified. No chart-derived hardware selection is made.</p></div></>}</Card>;
}
