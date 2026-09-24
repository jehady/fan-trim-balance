import { Card } from "./Card";
import type { buildPlotPoints } from "../calculations/buildPlotPoints";
import type { TrimBalanceCalculation } from "../types/trimBalance";

export function Report({ calculation, points }: { calculation: TrimBalanceCalculation; points: ReturnType<typeof buildPlotPoints> }) {
  return <Card title="Calculation summary / report" step={9}><dl className="report-list"><dt>Reference</dt><dd>{calculation.information.id}</dd><dt>Aircraft</dt><dd>{calculation.information.aircraftRegistration || "Not recorded"}</dd><dt>Engine</dt><dd>{calculation.information.engineModel} {calculation.information.engineSerialNumber && `· ${calculation.information.engineSerialNumber}`}</dd><dt>Plot points</dt><dd>{points.length === 6 ? "A–F selected" : "Incomplete"}</dd><dt>Final correction</dt><dd>Not calculated — verified final-vector and PO chart data required.</dd></dl><div className="safety-note"><strong>Not an approved maintenance instruction.</strong> Review this record, current AMM data, applicable limits, and the physical weight chart before maintenance action.</div></Card>;
}
