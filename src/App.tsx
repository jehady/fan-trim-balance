import { useMemo, useState, type ReactNode } from "react";
import "./App.css";
import "./Safety.css";
import { buildPlotPoints } from "./features/trim-balance/calculations/buildPlotPoints";
import { buildThreeShotCircles, validateResultantSelection, type Point } from "./features/trim-balance/calculations/geometry";
import { buildSelectedBalancePoints, calculateSelectedPairwiseAnalysis, calculateSelectedResultMetrics, storeSelectedResultant, validateAllSelectedResultants, type SelectedResultants } from "./features/trim-balance/calculations/selectedResultants";
import { calculateFinalCorrectionFromPairwise, type FinalCorrectionResult } from "./features/trim-balance/calculations/finalCorrection";
import { RunInputTable } from "./features/trim-balance/components/RunInputTable";
import { FinalRunScreen } from "./features/trim-balance/components/FinalRunScreen";
import { Card } from "./features/trim-balance/components/Card";
import { Dashboard } from "./features/trim-balance/components/Dashboard";
import { Information } from "./features/trim-balance/components/Information";
import { Errors } from "./features/trim-balance/components/Errors";
import { PointTable } from "./features/trim-balance/components/PointTable";
import { PlotAnalysis } from "./features/trim-balance/components/PlotAnalysis";
import { Correction } from "./features/trim-balance/components/Correction";
import { FinalCorrectionPanel } from "./features/trim-balance/components/FinalCorrectionPanel";
import { Report } from "./features/trim-balance/components/Report";
import { validateThreeShotInput } from "./features/trim-balance/utils/validation";
import { createCalculation } from "./features/trim-balance/utils/calculationRecord";
import { loadSavedCalculations, persistSavedCalculations } from "./features/trim-balance/utils/storage";
import type { N1Speed, PlotPointLabel, TrimBalanceCalculation } from "./features/trim-balance/types/trimBalance";

const steps = ["Information", "Initial run", "First run", "Second run", "Third run", "Point selection", "3-shot plot", "Final correction", "Final run", "Report"];
type PlotPoint = ReturnType<typeof buildPlotPoints>[number];
type ResultantMetrics = Exclude<ReturnType<typeof calculateSelectedResultMetrics>, undefined>;
type UpdateCalculation = (change: (item: TrimBalanceCalculation) => TrimBalanceCalculation) => void;
type RunName = "initialRun" | "firstRun" | "secondRun" | "thirdRun" | "finalRun";
const emptyResultants: SelectedResultants = {};

function App() {
  const [savedState, setSavedState] = useState(loadSavedCalculations);
  const saved = savedState.calculations;
  const [storageWriteError, setStorageWriteError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<TrimBalanceCalculation | null>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<PlotPointLabel>("A");
  const selectedResultants = calculation?.selectedResultants ?? emptyResultants;

  const errors = useMemo(() => calculation ? validateThreeShotInput(calculation) : [], [calculation]);
  const points = useMemo(() => calculation && !errors.length ? buildPlotPoints(calculation.initialRun, calculation.firstRun, calculation.secondRun, calculation.thirdRun) : [], [calculation, errors]);
  const analyses = useMemo(() => calculation ? points.map((point) => ({ point, geometry: buildThreeShotCircles({ initialVibration: point.initialVibration, firstRunVibration: point.firstVibration, secondRunVibration: point.secondVibration, thirdRunVibration: point.thirdVibration, firstTestScrewPosition: calculation.testScrewPositions.first, secondTestScrewPosition: calculation.testScrewPositions.second, thirdTestScrewPosition: calculation.testScrewPositions.third }) })) : [], [calculation, points]);
  const active = analyses.find((item) => item.point.label === selected) ?? analyses[0];
  const circlesByLabel = useMemo(() => Object.fromEntries(analyses.map(({ point, geometry }) => [point.label, geometry])) as Partial<Record<PlotPointLabel, ReturnType<typeof buildThreeShotCircles>>>, [analyses]);
  const validatedResultants = useMemo(() => Object.fromEntries(points.flatMap((point) => {
    const selection = selectedResultants[point.label];
    const circles = circlesByLabel[point.label];
    return selection && circles && validateResultantSelection([circles.firstCircle, circles.secondCircle, circles.thirdCircle], selection).valid
      ? [[point.label, selection]]
      : [];
  })) as SelectedResultants, [points, selectedResultants, circlesByLabel]);
  const allResultantsValid = validateAllSelectedResultants(points, selectedResultants, circlesByLabel);
  const selectedMetrics = (point: PlotPoint, resultant = validatedResultants[point.label]): ResultantMetrics | undefined => calculateSelectedResultMetrics(point, resultant);
  const pairs = useMemo(() => allResultantsValid ? calculateSelectedPairwiseAnalysis(points, validatedResultants) : [], [points, validatedResultants, allResultantsValid]);
  const finalCorrection = useMemo(() => allResultantsValid ? calculateFinalCorrectionFromPairwise(buildSelectedBalancePoints(points, validatedResultants), pairs) : undefined, [points, validatedResultants, pairs, allResultantsValid]);

  const update: UpdateCalculation = (change) => setCalculation((item) => item ? { ...change(item), updatedAt: new Date().toISOString(), status: item.status === "Draft" ? "In Progress" : item.status } : item);
  const updateMeasurement = (run: RunName, speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => update((item) => ({ ...item, selectedResultants: run === "finalRun" ? item.selectedResultants : {}, [run]: { measurements: item[run].measurements.map((measurement) => measurement.n1Speed === speed ? { ...measurement, [field]: value } : measurement) } }));
  const save = () => {
    if (!calculation) return;

    const nextSaved = [calculation, ...saved.filter((item) => item.information.id !== calculation.information.id)];
    const result = persistSavedCalculations(nextSaved);
    if (!result.ok) {
      const message = `Calculation changes could not be saved in this browser: ${result.error}. The in-memory calculation remains available, but it is not yet confirmed to survive reload.`;
      setStorageWriteError(message);
      return;
    }

    setSavedState({ calculations: nextSaved, warning: savedState.warning });
    setStorageWriteError(null);
  };
  const start = (item = createCalculation()) => { setCalculation(item); setStep(0); };

  const storageWarning = storageWriteError ?? savedState.warning;
  if (!calculation) return <Dashboard saved={saved} onStart={start} storageWarning={storageWarning} />;
  const updatePlotConfiguration: UpdateCalculation = (change) => update((item) => ({ ...change(item), selectedResultants: {} }));
  const selectResultant = (point: Point) => {
    if (!active) return;
    update((item) => ({ ...item, selectedResultants: storeSelectedResultant(item.selectedResultants ?? {}, active.point.label, point) }));
  };
  const page = renderStep({ step, calculation, update, updatePlotConfiguration, updateMeasurement, errors, points, analyses, active, selected, setSelected, selectedResultants, selectResultant, pairs, allResultantsValid, finalCorrection, selectedMetrics });
  return <WorkflowShell calculation={calculation} step={step} setStep={setStep} save={save} onHome={() => { save(); setCalculation(null); }} storageWarning={storageWarning}>{page}</WorkflowShell>;
}

function renderStep({ step, calculation, update, updatePlotConfiguration, updateMeasurement, errors, points, analyses, active, selected, setSelected, selectedResultants, selectResultant, pairs, allResultantsValid, finalCorrection, selectedMetrics }: { step: number; calculation: TrimBalanceCalculation; update: UpdateCalculation; updatePlotConfiguration: UpdateCalculation; updateMeasurement: (run: RunName, speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => void; errors: string[]; points: ReturnType<typeof buildPlotPoints>; analyses: { point: PlotPoint; geometry: ReturnType<typeof buildThreeShotCircles> }[]; active: { point: PlotPoint; geometry: ReturnType<typeof buildThreeShotCircles> } | undefined; selected: PlotPointLabel; setSelected: (label: PlotPointLabel) => void; selectedResultants: SelectedResultants; selectResultant: (point: Point) => void; pairs: ReturnType<typeof calculateSelectedPairwiseAnalysis>; allResultantsValid: boolean; finalCorrection: FinalCorrectionResult | undefined; selectedMetrics: (point: PlotPoint) => ResultantMetrics | undefined }) {
  const runPage = (title: string, run: Exclude<RunName, "finalRun">, note: string) => <Card title={title} step={step}><p>{note}</p><RunInputTable run={calculation[run]} onChange={(speed, field, value) => updateMeasurement(run, speed, field, value)} /><p className="field-note">Enter measured vibration amplitudes in mils. The application does not transform or round your entries.</p></Card>;
  if (step === 0) return <Information calculation={calculation} update={update} />;
  if (step === 1) return runPage("Initial run", "initialRun", "Record both sensor outputs at each specified N1 target.");
  if (step === 2) return runPage("First run", "firstRun", "Record the run with the procedure’s first test-weight configuration installed.");
  if (step === 3) return runPage("Second run", "secondRun", "Record the run after repositioning test weights per approved maintenance data.");
  if (step === 4) return runPage("Third run", "thirdRun", "Record the third test-weight configuration at the same N1 targets.");
  if (step === 5) return <Card title="Automatic plot-point selection" step={step}><p>The three highest Initial Run amplitudes for each sensor are selected as A–F.</p>{errors.length ? <Errors errors={errors} /> : <PointTable points={points} />}</Card>;
  if (step === 6) return <PlotAnalysis calculation={calculation} update={updatePlotConfiguration} errors={errors} analyses={analyses} active={active} selected={selected} onSelect={setSelected} selectedResultants={selectedResultants} onSelectResultant={selectResultant} getMetrics={selectedMetrics} />;
  if (step === 7) return <Correction errors={errors} points={points} analyses={analyses} pairs={pairs} allResultantsValid={allResultantsValid} getMetrics={selectedMetrics} />;
  if (step === 8) return <FinalRunScreen initialRun={calculation.initialRun} finalRun={calculation.finalRun} limits={calculation.limits} limitSources={calculation.limitSources ?? {}} correction={finalCorrection ? <FinalCorrectionPanel result={finalCorrection} /> : <div className="todo-card"><strong>Final correction unavailable — six valid A–F resultants are required.</strong><p>Confirm every resultant inside its three-circle common area in Step 7. Current resultants are not complete and validated.</p></div>} onChange={(speed, field, value) => updateMeasurement("finalRun", speed, field, value)} onLimitChange={(sensor, value) => update((item) => ({ ...item, limits: { ...item.limits, [sensor]: value } }))} onLimitSourceChange={(sensor, field, value) => update((item) => ({ ...item, limitSources: { ...item.limitSources, [sensor]: { documentTitle: "", revisionOrDate: "", effectivity: "", sectionOrFigure: "", verificationStatus: "unverified", ...item.limitSources?.[sensor], [field]: value } } }))} />;
  return <Report calculation={calculation} points={points} selectedResultants={selectedResultants} inputErrors={errors} />;
}

function WorkflowShell({ calculation, step, setStep, save, onHome, storageWarning, children }: { calculation: TrimBalanceCalculation; step: number; setStep: (step: number) => void; save: () => void; onHome: () => void; storageWarning?: string; children: ReactNode }) {
  return <main className="workspace"><header className="app-header compact"><button className="brand" onClick={onHome}>FAN TRIM BALANCE <span>CFM56-7B · 3-SHOT PLOT</span></button><div><span className="badge">{calculation.status}</span><button className="secondary" onClick={save}>Save locally</button></div></header>{storageWarning && <div className="validation" role="alert">{storageWarning}</div>}<nav className="stepper">{steps.map((name, index) => <button key={name} className={index === step ? "current" : index < step ? "done" : ""} onClick={() => setStep(index)}><span>{index + 1}</span>{name}</button>)}</nav>{children}<footer className="wizard-actions"><button className="secondary" disabled={!step} onClick={() => setStep(step - 1)}>Back</button><span>Save to retain this calculation in this browser.</span><button className="primary" onClick={() => { save(); setStep(Math.min(steps.length - 1, step + 1)); }}>{step === steps.length - 1 ? "Save calculation" : "Save & continue"}</button></footer></main>;
}

export default App;
