import type { FinalCorrectionResult } from "../calculations/finalCorrection";
import type { Point } from "../calculations/geometry";
import { format } from "../utils/display";

export function FinalCorrectionPanel({ result }: { result: FinalCorrectionResult }) {
  return <section className="card"><span className="eyebrow">STEP 9</span><h2>Final correction</h2><p>Calculated from the confirmed A–F resultants. No manual example values are used.</p><dl className="report-list"><dt>Calculated correction</dt><dd>{format(result.finalWeightCmG, 1)} cm·g @ {format(result.finalAngleDeg, 1)}°</dd><dt>Selected pair</dt><dd>{result.selectedPair}</dd><dt>Maximum U</dt><dd>{format(result.u, 3)}</dd><dt>First point</dt><dd>({format(result.firstPoint.x, 3)}, {format(result.firstPoint.y, 3)})</dd><dt>Pair distance</dt><dd>{format(result.pairDistance, 3)} cm·g</dd><dt>Distance from first point</dt><dd>{format(result.distanceFromFirst, 3)} cm·g</dd><dt>PO weight selected from chart</dt><dd>Unavailable</dd><dt>Physical installation</dt><dd>Unavailable</dd></dl><FinalCorrectionPlot result={result} /><div className="todo-card"><strong>PO weight mapping unavailable — verified PO weight chart required.</strong><p>No complete PO weight chart or angle-bin data is present in the repository. The training example is not used as a fallback.</p></div></section>;
}

function FinalCorrectionPlot({ result }: { result: FinalCorrectionResult }) {
  const size = 320;
  const center = size / 2;
  const max = Math.max(Math.hypot(result.firstPoint.x, result.firstPoint.y), Math.hypot(result.secondPoint.x, result.secondPoint.y), Math.hypot(result.finalPoint.x, result.finalPoint.y)) * 1.2;
  const scale = (size / 2 - 24) / max;
  const x = (point: Point) => center + point.x * scale;
  const y = (point: Point) => center - point.y * scale;
  return <svg className="polar-plot" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Final correction vector ${result.finalWeightCmG.toFixed(1)} cm.g at ${result.finalAngleDeg.toFixed(1)} degrees`}><line x1={center} y1={center} x2={x(result.firstPoint)} y2={y(result.firstPoint)} className="test-ray" /><line x1={center} y1={center} x2={x(result.secondPoint)} y2={y(result.secondPoint)} className="test-ray" /><line x1={center} y1={center} x2={x(result.finalPoint)} y2={y(result.finalPoint)} className="resultant-line" /><circle cx={x(result.firstPoint)} cy={y(result.firstPoint)} r="4" className="origin-dot" /><circle cx={x(result.secondPoint)} cy={y(result.secondPoint)} r="4" className="origin-dot" /><circle cx={x(result.finalPoint)} cy={y(result.finalPoint)} r="5" className="resultant-dot" /><circle cx={center} cy={center} r="3" className="origin-dot" /></svg>;
}
