import { Card } from "./Card";
import { Errors } from "./Errors";
import { PointTable } from "./PointTable";
import { format } from "../utils/display";
import type { calculatePairwiseAnalysis } from "../calculations/pairwiseAnalysis";
import type { calculateThreeShotGeometry } from "../calculations/geometry";
import type { buildPlotPoints } from "../calculations/buildPlotPoints";
import type { PlotPoint, ResultantMetrics } from "./plotTypes";

export function Correction({ errors, points, analyses, pairs, getMetrics }: { errors: string[]; points: ReturnType<typeof buildPlotPoints>; analyses: { point: PlotPoint; geometry: ReturnType<typeof calculateThreeShotGeometry> }[]; pairs: ReturnType<typeof calculatePairwiseAnalysis>; getMetrics: (point: PlotPoint) => ResultantMetrics | undefined }) {
  return <Card title="Final correction review" step={7}><p>These A–F resultant values are the engineer’s confirmed Step 7 selections. Reference/example values are not used here.</p>{errors.length ? <Errors errors={errors} /> : <><PointTable points={points} analyses={analyses} getMetrics={getMetrics} /><h3>Pairwise analysis from confirmed selections</h3>{pairs.length ? <div className="table-wrap"><table><thead><tr><th>Pair</th><th>Distance (cm·g)</th><th>Combined sensitivity</th><th>U</th></tr></thead><tbody>{pairs.map((pair) => <tr key={pair.pair}><td>{pair.pair}</td><td>{format(pair.distanceCmG, 0)}</td><td>{format(pair.combinedSensitivity, 0)}</td><td>{format(pair.amplitude, 3)}</td></tr>)}</tbody></table></div> : <div className="todo-card"><strong>Confirm all A–F resultants in Step 7.</strong><p>Pairwise analysis begins after the engineer confirms each resultant selection.</p></div>}<div className="todo-card"><strong>PO weight mapping not configured.</strong><p>The final-vector selection and physical PO chart require verified worksheet/AMM data. No final correction or screw combination is fabricated.</p></div></>}</Card>;
}
