import { buildThreeShotCircles, validateResultantSelection } from "../calculations/geometry";
import { calculateSelectedPairwiseAnalysis, calculateSelectedResultMetrics, validateSelectedResultants, type SelectedResultants } from "../calculations/selectedResultants";
import { evaluateFinalRun } from "../calculations/finalRunEvaluation";
import { poChartStatus, suppliedScrewFigureSource, testWeightConstantSource, trainingManualSource } from "../calculations/sourceProvenance";
import { calculateFinalCorrection } from "../calculations/finalCorrection";
import { CalculationValidationError } from "../calculations/calculationValidation";
import { findPlotPointCutoffTies } from "../calculations/selectPlotPoints";
import type { PairwiseAnalysis } from "../calculations/pairwiseAnalysis";
import type { buildPlotPoints } from "../calculations/buildPlotPoints";
import type { EngineRun, PlotPointLabel, TrimBalanceCalculation } from "../types/trimBalance";
import { reportPersistenceState } from "../utils/reportPersistence";
import { testScrewSpacingWarning } from "../utils/validation";

const number = (value: number) => Number.isFinite(value) ? String(value) : "—";
const speedLabel = (speed: string) => speed === "TO" ? "TO" : `${speed}%`;

export function Report({ calculation, points, selectedResultants, inputErrors, persistedSnapshot }: {
  calculation: TrimBalanceCalculation;
  points: ReturnType<typeof buildPlotPoints>;
  selectedResultants: SelectedResultants;
  inputErrors: string[];
  persistedSnapshot: TrimBalanceCalculation | null;
}) {
  const persistenceState = reportPersistenceState(calculation, persistedSnapshot);
  const spacingWarning = testScrewSpacingWarning(calculation.testScrewPositions);
  const cutoffTies = findPlotPointCutoffTies(calculation.initialRun);
  const evaluation = evaluateFinalRun(calculation.initialRun, calculation.finalRun, calculation.limits, calculation.limitSources);
  const currentCircles = Object.fromEntries(points.map((point) => [point.label, buildThreeShotCircles({
    initialVibration: point.initialVibration,
    firstRunVibration: point.firstVibration,
    secondRunVibration: point.secondVibration,
    thirdRunVibration: point.thirdVibration,
    firstTestScrewPosition: calculation.testScrewPositions.first,
    secondTestScrewPosition: calculation.testScrewPositions.second,
    thirdTestScrewPosition: calculation.testScrewPositions.third,
  })]));
  const validatedSelections = Object.fromEntries(points.flatMap((point) => {
    const selected = selectedResultants[point.label];
    const circles = currentCircles[point.label];
    if (!selected || !circles) {
      return [];
    }
    return validateResultantSelection([circles.firstCircle, circles.secondCircle, circles.thirdCircle], selected).valid
      ? [[point.label, selected]]
      : [];
  })) as SelectedResultants;
  const resultantValidation = validateSelectedResultants(points, validatedSelections, calculation.testScrewPositions);
  const resultantsComplete = !inputErrors.length && resultantValidation.valid;
  let currentPairs: PairwiseAnalysis[] = [];
  let currentCorrection: ReturnType<typeof calculateFinalCorrection> | undefined;
  let correctionError: string | null = null;
  if (resultantsComplete) {
    try {
      currentPairs = calculateSelectedPairwiseAnalysis(points, validatedSelections, calculation.testScrewPositions);
      currentCorrection = calculateFinalCorrection(points, validatedSelections, calculation.testScrewPositions, currentPairs);
    } catch (error) {
      if (!(error instanceof CalculationValidationError)) {
        throw error;
      }
      correctionError = error.message;
    }
  }
  const validSelection = (label: PlotPointLabel) => {
    const point = points.find((candidate) => candidate.label === label);
    const selected = selectedResultants[label];
    if (!point || !selected) return false;
    const circles = buildThreeShotCircles({
      initialVibration: point.initialVibration,
      firstRunVibration: point.firstVibration,
      secondRunVibration: point.secondVibration,
      thirdRunVibration: point.thirdVibration,
      firstTestScrewPosition: calculation.testScrewPositions.first,
      secondTestScrewPosition: calculation.testScrewPositions.second,
      thirdTestScrewPosition: calculation.testScrewPositions.third,
    });
    return validateResultantSelection([circles.firstCircle, circles.secondCircle, circles.thirdCircle], selected).valid;
  };
  return <section className="card"><span className="eyebrow">ENGINEERING CALCULATION RECORD</span><h2>Calculation report</h2>
    <div className="safety-note"><strong>Decision support only — not approved maintenance instructions or a release-to-service record.</strong><p>Source applicability, test-weight configuration, and limits remain unverified. Do not use this report alone to perform maintenance or claim compliance.</p></div>
    <h3>Run input validation</h3>{inputErrors.length ? <div className="validation"><strong>Input issues — calculation points are unavailable.</strong><ul>{inputErrors.map((error) => <li key={error}>{error}</li>)}</ul></div> : <p>All required initial and three-shot run readings and test screw positions passed software input checks.</p>}
    <h3>Record identity and configuration</h3>
    <dl className="report-list">
      <dt>Calculation ID</dt><dd>{calculation.information.id || "Not recorded"}</dd>
      <dt>Recorded date / technician</dt><dd>{calculation.information.date || "Not recorded"} / {calculation.information.technician || "Not recorded"}</dd>
      <dt>Last updated</dt><dd>{calculation.updatedAt}</dd>
      <dt>Aircraft type / registration</dt><dd>{calculation.information.aircraftType || "Not recorded"} / {calculation.information.aircraftRegistration || "Not recorded"}</dd>
      <dt>Aircraft effectivity</dt><dd>{calculation.information.aircraftEffectivity || "Not recorded"}</dd>
      <dt>Engine model / serial</dt><dd>{calculation.information.engineModel || "Not recorded"} / {calculation.information.engineSerialNumber || "Not recorded"}</dd>
      <dt>Initial installed screw configuration</dt><dd>{calculation.information.initialScrewConfiguration || "Not recorded"}</dd>
      <dt>Applicability status</dt><dd>UNVERIFIED — the supplied Airbus AMM figure does not establish CFM56-7B applicability.</dd>
      <dt>Calculation completeness</dt><dd>{resultantsComplete ? "Six valid A–F resultants confirmed" : "Incomplete — final correction is unavailable"}</dd>
      <dt>Report state</dt><dd>{reportStateLabel(persistenceState, calculation, persistedSnapshot)}</dd>
      <dt>Test screw positions (first / second / third)</dt><dd>{calculation.testScrewPositions.first} / {calculation.testScrewPositions.second} / {calculation.testScrewPositions.third} — recorded values, applicability unverified</dd>
      <dt>Test-weight spacing check</dt><dd>{spacingWarning ?? "Recorded positions are equally spaced by 12 screw intervals; training-data applicability remains unverified."}</dd>
      <dt>Common-area interpretation</dt><dd>Selections are checked for overlap membership. A computed best-fit point is available as a convenience; it does not establish an approved resultant or enforce the training manual's graphical "center of common area" instruction.</dd>
    </dl>
    <h3>Source documents and calculation basis</h3>
    <div className="table-wrap"><table><thead><tr><th>Document / source</th><th>Revision / date</th><th>Effectivity</th><th>Section / figure</th><th>Status / use</th></tr></thead><tbody>
      <tr><td>{trainingManualSource.documentTitle}</td><td>{trainingManualSource.revisionOrDate}</td><td>{trainingManualSource.effectivity}</td><td>{trainingManualSource.sectionOrFigure}</td><td>Unverified training material; not current approved maintenance data</td></tr>
      <tr><td>{suppliedScrewFigureSource.documentTitle}</td><td>{suppliedScrewFigureSource.revisionOrDate}</td><td>{suppliedScrewFigureSource.effectivity}</td><td>{suppliedScrewFigureSource.sectionOrFigure}</td><td>Not applicable to established target configuration; not used for hardware instructions</td></tr>
    </tbody></table></div>
    <dl className="report-list">
      <dt>W6 / sensitivity constant</dt><dd>{testWeightConstantSource.valueCmG} cm·g — source: {trainingManualSource.documentTitle}, {trainingManualSource.revisionOrDate}, {trainingManualSource.sectionOrFigure}; target applicability unverified</dd>
      <dt>PO chart / hardware mapping</dt><dd>{poChartStatus}</dd>
      <dt>Limit comparison semantics</dt><dd>Software screens strictly greater-than configured thresholds; equality is not flagged. This rule is unverified against applicable approved maintenance data.</dd>
    </dl>
    <h3>Recorded run measurements (mils)</h3>
    <MeasurementTable runs={[
      ["Initial", calculation.initialRun],
      ["First", calculation.firstRun],
      ["Second", calculation.secondRun],
      ["Third", calculation.thirdRun],
    ]} />
    <h3>A–F point selections and resultants</h3>
    {cutoffTies.map((tie) => <div className="validation" role="alert" key={tie.sensor}><strong>Review the {tie.sensor} plot-point selection tie.</strong><p>The third and fourth ranked readings are both {tie.vibration} mils ({tie.speeds.join(", ")}). The deterministic higher-N1-first tie order is used for reproducibility; no tie rule is established by the training manual.</p></div>)}
    <div className="table-wrap"><table><thead><tr><th>Point</th><th>Sensor / N1</th><th>Initial</th><th>First / second / third</th><th>Selected resultant (x, y)</th><th>R1 / angle</th><th>W6 / sensitivity</th><th>Validation</th></tr></thead><tbody>
      {points.map((point) => {
        const selected = selectedResultants[point.label];
        const valid = validSelection(point.label);
        const metrics = valid ? calculateSelectedResultMetrics(point, selected) : undefined;
        return <tr key={point.label}><td>{point.label}</td><td>{point.sensor} / {speedLabel(point.n1Speed)}</td><td>{number(point.initialVibration)}</td><td>{number(point.firstVibration)} / {number(point.secondVibration)} / {number(point.thirdVibration)}</td><td>{valid && selected ? `(${number(selected.x)}, ${number(selected.y)})` : selected ? "Stored but invalid; not used" : "Not selected"}</td><td>{metrics ? `${number(metrics.resultantAmplitude)} / ${number(metrics.resultantAngleDeg)}°` : "—"}</td><td>{metrics ? `${number(metrics.w6CmG)} cm·g / ${number(metrics.sensitivity)}` : "—"}</td><td>{valid ? "Valid manual selection" : selected ? "Invalid for current geometry" : "Missing"}</td></tr>;
      })}
    </tbody></table></div>
    <h3>Pairwise analysis</h3>
    {resultantsComplete && !correctionError ? <div className="table-wrap"><table><thead><tr><th>Pair</th><th>Distance (cm·g)</th><th>Sensitivity sum</th><th>U</th></tr></thead><tbody>{currentPairs.map((pair) => <PairRow key={pair.pair} pair={pair} />)}</tbody></table></div> : <p>{correctionError ?? "Not calculated: all six resultants are not currently confirmed and valid for the current run inputs."}</p>}
    <dl className="report-list"><dt>Maximum-U pair</dt><dd>{resultantsComplete && !correctionError ? currentPairs.reduce<PairwiseAnalysis | undefined>((max, pair) => !max || pair.amplitude > max.amplitude ? pair : max, undefined)?.pair ?? "Unavailable" : "Unavailable — correction inputs are incomplete or invalid"}</dd>
      <dt>Final correction magnitude / angle</dt><dd>{currentCorrection ? `${number(currentCorrection.finalWeightCmG)} cm·g @ ${number(currentCorrection.finalAngleDeg)}°` : "Unavailable — six valid resultants required"}</dd>
      <dt>PO weight selection / physical installation</dt><dd>Unavailable — no applicable approved PO chart was supplied or verified. No hardware mapping is inferred.</dd></dl>
    <h3>Final run and configured limits</h3>
    <dl className="report-list">
      <dt>N°1 Bearing threshold</dt><dd>{number(calculation.limits.bearing ?? Number.NaN)} mils; source: {sourceSummary(calculation.limitSources?.bearing)}</dd>
      <dt>FFCCV threshold</dt><dd>{number(calculation.limits.ffccv ?? Number.NaN)} mils; source: {sourceSummary(calculation.limitSources?.ffccv)}</dd>
      <dt>Configured-threshold screening</dt><dd>{evaluation.configuredThresholdResult}; exceeded readings: {evaluation.exceededLimits.length ? evaluation.exceededLimits.join(", ") : "none identified"}</dd>
      <dt>Final evaluation</dt><dd>{evaluation.status} — no AMM compliance claim; {evaluation.evaluationBlockers.join(" ")}</dd>
    </dl>
    <FinalMeasurementTable rows={evaluation.rows} />
    {calculation.information.notes && <><h3>Notes</h3><p>{calculation.information.notes}</p></>}
  </section>;
}

function reportStateLabel(
  state: ReturnType<typeof reportPersistenceState>,
  calculation: TrimBalanceCalculation,
  persistedSnapshot: TrimBalanceCalculation | null
): string {
  if (state === "saved-record") {
    return `Saved record ${calculation.information.id}; report matches the current persisted record.`;
  }
  if (state === "unsaved-edits") {
    return `Unsaved edits; report reflects the current in-memory calculation, not saved record ${persistedSnapshot?.information.id ?? "—"}.`;
  }
  return "Live draft; this calculation has not been confirmed as persisted.";
}

function MeasurementTable({ runs }: { runs: [string, EngineRun][] }) {
  const speeds = runs[0][1].measurements.map((measurement) => measurement.n1Speed);
  return <div className="table-wrap"><table><thead><tr><th>N1</th>{runs.map(([name]) => <th key={name} colSpan={2}>{name}</th>)}</tr><tr><th></th>{runs.flatMap(([name]) => [<th key={`${name}-bearing`}>Bearing</th>, <th key={`${name}-ffccv`}>FFCCV</th>])}</tr></thead><tbody>{speeds.map((speed) => <tr key={speed}><th>{speedLabel(speed)}</th>{runs.flatMap(([name, run]) => { const measurement = run.measurements.find((item) => item.n1Speed === speed); return [<td key={`${name}-bearing`}>{number(measurement?.bearingVibration ?? Number.NaN)}</td>, <td key={`${name}-ffccv`}>{number(measurement?.ffccvVibration ?? Number.NaN)}</td>]; })}</tr>)}</tbody></table></div>;
}

function PairRow({ pair }: { pair: PairwiseAnalysis }) {
  return <tr><td>{pair.pair}</td><td>{number(pair.distanceCmG)}</td><td>{number(pair.combinedSensitivity)}</td><td>{number(pair.amplitude)}</td></tr>;
}

function FinalMeasurementTable({ rows }: { rows: ReturnType<typeof evaluateFinalRun>["rows"] }) {
  return <div className="table-wrap"><table><thead><tr><th>N1</th><th>Initial bearing</th><th>Final bearing</th><th>Δ bearing</th><th>Initial FFCCV</th><th>Final FFCCV</th><th>Δ FFCCV</th></tr></thead><tbody>{rows.map((row) => <tr key={row.n1Speed}><th>{speedLabel(row.n1Speed)}</th><td>{number(row.initialBearing)}</td><td>{number(row.finalBearing)}</td><td>{number(row.deltaBearing)}</td><td>{number(row.initialFfccv)}</td><td>{number(row.finalFfccv)}</td><td>{number(row.deltaFfccv)}</td></tr>)}</tbody></table></div>;
}

function sourceSummary(source: TrimBalanceCalculation["limitSources"] extends infer T ? NonNullable<T>[keyof NonNullable<T>] : never) {
  if (!source) return "not recorded; unverified";
  return [source.documentTitle, source.revisionOrDate, source.effectivity, source.sectionOrFigure, source.verificationStatus].filter(Boolean).join("; ");
}
