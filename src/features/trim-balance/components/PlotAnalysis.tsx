import { useState } from "react";
import { PolarPlot } from "./PolarPlot";
import { Card } from "./Card";
import { Errors } from "./Errors";
import { sensorName } from "../utils/display";
import { format } from "../utils/display";
import { hasCommonArea, validateResultantSelection, type Point } from "../calculations/geometry";
import type { TrimBalanceCalculation, PlotPointLabel } from "../types/trimBalance";
import type { Analysis, ResultantMetrics, ResultantSelection, UpdateCalculation } from "./plotTypes";

export function PlotAnalysis({ calculation, update, errors, analyses, active, selected, onSelect, selectedResultants, onSelectResultant, getMetrics }: { calculation: TrimBalanceCalculation; update: UpdateCalculation; errors: string[]; analyses: Analysis[]; active: Analysis | undefined; selected: PlotPointLabel; onSelect: (label: PlotPointLabel) => void; selectedResultants: ResultantSelection; onSelectResultant: (point: Point) => void; getMetrics: (point: Analysis["point"]) => ResultantMetrics | undefined }) {
  const [selectionIssue, setSelectionIssue] = useState<{ label: PlotPointLabel; message: string } | null>(null);
  const metrics = active ? getMetrics(active.point) : undefined;
  const circles = active ? [active.geometry.firstCircle, active.geometry.secondCircle, active.geometry.thirdCircle] : [];
  const savedSelection = active ? selectedResultants[active.point.label] : undefined;
  const savedValidation = savedSelection ? validateResultantSelection(circles, savedSelection) : undefined;
  const canUseSavedSelection = Boolean(savedValidation?.valid);
  const handlePlotSelection = (point: Point, tolerance: number) => {
    const validation = active ? validateResultantSelection(circles, point, tolerance) : undefined;
    if (!validation?.valid) {
      setSelectionIssue({ label: active?.point.label ?? selected, message: validation?.reason ?? "Cannot determine a resultant; review the inputs and plot." });
      return;
    }
    setSelectionIssue(null);
    onSelectResultant(point);
  };

  const commonAreaExists = active ? hasCommonArea(circles) : false;
  return <Card title="3-shot plot analysis" step={6}><p>Confirm the three central screw positions against approved maintenance data. The defaults reproduce the training example only; applicability of that training data is unverified.</p><div className="position-inputs">{(["first", "second", "third"] as const).map((key) => <label key={key}>{key} central screw position<input type="number" min="1" max="36" value={calculation.testScrewPositions[key]} onChange={(event) => update((item) => ({ ...item, testScrewPositions: { ...item.testScrewPositions, [key]: Number(event.target.value) }, selectedResultants: {} }))} /></label>)}</div>{errors.length ? <Errors errors={errors} /> : <><div className="point-tabs">{analyses.map(({ point }) => <button className={point.label === selected ? "active" : ""} key={point.label} onClick={() => onSelect(point.label)}>{point.label}</button>)}</div>{active && <div className="analysis-grid"><div><p className="plot-instruction">Select the resultant in the shaded common overlap. The app validates overlap membership, not whether a point is the geometric center described by the training manual; that graphical judgment remains with the engineer. The selection is manual; no calculated point is substituted.</p>{!commonAreaExists && <div className="validation" role="alert"><strong>Cannot determine — review inputs/plot.</strong><p>The three run circles have no common area at the recorded values.</p></div>}{selectionIssue?.label === active.point.label && <div className="validation" role="alert">{selectionIssue.message} The rejected click did not replace any previously valid selection.</div>}{savedSelection && !canUseSavedSelection && <div className="validation" role="alert">The saved selection is outside the current common area and is not used. Review the run inputs and select it again.</div>}<PolarPlot initialCircle={active.geometry.initialCircle} runCircles={[{ circle: active.geometry.firstCircle, label: "First", color: "#0d7a69" }, { circle: active.geometry.secondCircle, label: "Second", color: "#b76e15" }, { circle: active.geometry.thirdCircle, label: "Third", color: "#7054b8" }]} resultant={canUseSavedSelection ? savedSelection : undefined} selectedIsValid={canUseSavedSelection} resultantAngleDeg={metrics?.resultantAngleDeg} onSelectResultant={handlePlotSelection} /><p className="field-note">Boundary allowance is one SVG viewBox unit, scaled to 1/192 of the plotted radius, or the greater floating-point allowance (32 machine epsilons or 1×10⁻⁹ of plot scale). This is geometric/pointer tolerance, not vibration-measurement tolerance. Click coordinates are retained at full precision.</p></div><div className="resultant-details"><h3>Point {active.point.label} · {sensorName(active.point.sensor)}</h3><dl><dt>U0 / initial</dt><dd>{format(active.point.initialVibration)} mils</dd><dt>First / second / third</dt><dd>{format(active.point.firstVibration)} / {format(active.point.secondVibration)} / {format(active.point.thirdVibration)} mils</dd><dt>Resultant R1</dt><dd>{metrics ? `${format(metrics.resultantAmplitude)} mils` : "Select a valid resultant"}</dd><dt>Resultant angle</dt><dd>{metrics ? `${format(metrics.resultantAngleDeg)}°` : "—"}</dd><dt>W6</dt><dd>{metrics ? `${format(metrics.w6CmG, 0)} cm·g` : "—"}</dd><dt>Sensitivity</dt><dd>{metrics ? format(metrics.sensitivity, 0) : "—"}</dd></dl></div></div>}</>}</Card>;
}
