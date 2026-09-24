import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import "./App.css";
import { buildPlotPoints } from "./features/trim-balance/calculations/buildPlotPoints";
import { calculateThreeShotGeometry } from "./features/trim-balance/calculations/geometry";
import { buildSelectedBalancePoints, calculateSelectedPairwiseAnalysis, calculateSelectedResultMetrics, storeSelectedResultant, type SelectedResultants } from "./features/trim-balance/calculations/selectedResultants";
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
import { createCalculation, restoreCalculation, storageKey } from "./features/trim-balance/utils/calculationRecord";
import type { N1Speed, PlotPointLabel, TrimBalanceCalculation } from "./features/trim-balance/types/trimBalance";

const steps = ["Information", "Initial run", "First run", "Second run", "Third run", "Point selection", "3-shot plot", "Final correction", "Final run", "Report"];
type PlotPoint = ReturnType<typeof buildPlotPoints>[number];
type ResultantMetrics = Exclude<ReturnType<typeof calculateSelectedResultMetrics>, undefined>;
type UpdateCalculation = (change: (item: TrimBalanceCalculation) => TrimBalanceCalculation) => void;
type RunName = "initialRun" | "firstRun" | "secondRun" | "thirdRun" | "finalRun";

function App() {
  const [saved, setSaved] = useState<TrimBalanceCalculation[]>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      return Array.isArray(stored) ? stored.map(restoreCalculation).filter((item): item is TrimBalanceCalculation => item !== null) : [];
    } catch { return []; }
  });
  const [calculation, setCalculation] = useState<TrimBalanceCalculation | null>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<PlotPointLabel>("A");
  const [selectedResultants, setSelectedResultants] = useState<SelectedResultants>({});

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(saved)); }, [saved]);

  const errors = useMemo(() => calculation ? validateThreeShotInput(calculation) : [], [calculation]);
  const points = useMemo(() => calculation && !errors.length ? buildPlotPoints(calculation.initialRun, calculation.firstRun, calculation.secondRun, calculation.thirdRun) : [], [calculation, errors]);
  const analyses = useMemo(() => calculation ? points.map((point) => ({ point, geometry: calculateThreeShotGeometry({ initialVibration: point.initialVibration, firstRunVibration: point.firstVibration, secondRunVibration: point.secondVibration, thirdRunVibration: point.thirdVibration, firstTestScrewPosition: calculation.testScrewPositions.first, secondTestScrewPosition: calculation.testScrewPositions.second, thirdTestScrewPosition: calculation.testScrewPositions.third }) })) : [], [calculation, points]);
  const active = analyses.find((item) => item.point.label === selected) ?? analyses[0];
  const selectedMetrics = (point: PlotPoint, resultant = selectedResultants[point.label]): ResultantMetrics | undefined => calculateSelectedResultMetrics(point, resultant);
  const pairs = useMemo(() => calculateSelectedPairwiseAnalysis(points, selectedResultants), [points, selectedResultants]);
  const finalCorrection = useMemo(() => calculateFinalCorrectionFromPairwise(buildSelectedBalancePoints(points, selectedResultants), pairs), [points, selectedResultants, pairs]);

  const update: UpdateCalculation = (change) => setCalculation((item) => item ? { ...change(item), updatedAt: new Date().toISOString(), status: item.status === "Draft" ? "In Progress" : item.status } : item);
  const updateMeasurement = (run: RunName, speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => update((item) => ({ ...item, [run]: { measurements: item[run].measurements.map((measurement) => measurement.n1Speed === speed ? { ...measurement, [field]: value } : measurement) } }));
  const save = () => calculation && setSaved((items) => [calculation, ...items.filter((item) => item.information.id !== calculation.information.id)]);
  const start = (item = createCalculation()) => { setCalculation(item); setSelectedResultants({}); setStep(0); };

  if (!calculation) return <Dashboard saved={saved} onStart={start} />;
  const page = renderStep({ step, calculation, update, updateMeasurement, errors, points, analyses, active, selected, setSelected, selectedResultants, setSelectedResultants, pairs, finalCorrection, selectedMetrics });
  return <WorkflowShell calculation={calculation} step={step} setStep={setStep} save={save} onHome={() => { save(); setCalculation(null); }}>{page}</WorkflowShell>;
}

function renderStep({ step, calculation, update, updateMeasurement, errors, points, analyses, active, selected, setSelected, selectedResultants, setSelectedResultants, pairs, finalCorrection, selectedMetrics }: { step: number; calculation: TrimBalanceCalculation; update: UpdateCalculation; updateMeasurement: (run: RunName, speed: N1Speed, field: "bearingVibration" | "ffccvVibration", value: number) => void; errors: string[]; points: ReturnType<typeof buildPlotPoints>; analyses: { point: PlotPoint; geometry: ReturnType<typeof calculateThreeShotGeometry> }[]; active: { point: PlotPoint; geometry: ReturnType<typeof calculateThreeShotGeometry> } | undefined; selected: PlotPointLabel; setSelected: (label: PlotPointLabel) => void; selectedResultants: SelectedResultants; setSelectedResultants: Dispatch<SetStateAction<SelectedResultants>>; pairs: ReturnType<typeof calculateSelectedPairwiseAnalysis>; finalCorrection: FinalCorrectionResult | undefined; selectedMetrics: (point: PlotPoint) => ResultantMetrics | undefined }) {
  const runPage = (title: string, run: Exclude<RunName, "finalRun">, note: string) => <Card title={title} step={step}><p>{note}</p><RunInputTable run={calculation[run]} onChange={(speed, field, value) => updateMeasurement(run, speed, field, value)} /><p className="field-note">Enter measured vibration amplitudes in mils. The application does not transform or round your entries.</p></Card>;
  if (step === 0) return <Information calculation={calculation} update={update} />;
  if (step === 1) return runPage("Initial run", "initialRun", "Record both sensor outputs at each specified N1 target.");
  if (step === 2) return runPage("First run", "firstRun", "Record the run with the procedure’s first test-weight configuration installed.");
  if (step === 3) return runPage("Second run", "secondRun", "Record the run after repositioning test weights per approved maintenance data.");
  if (step === 4) return runPage("Third run", "thirdRun", "Record the third test-weight configuration at the same N1 targets.");
  if (step === 5) return <Card title="Automatic plot-point selection" step={step}><p>The three highest Initial Run amplitudes for each sensor are selected as A–F.</p>{errors.length ? <Errors errors={errors} /> : <PointTable points={points} />}</Card>;
  if (step === 6) return <PlotAnalysis calculation={calculation} update={update} errors={errors} analyses={analyses} active={active} selected={selected} onSelect={setSelected} selectedResultants={selectedResultants} onSelectResultant={(point) => setSelectedResultants((items) => storeSelectedResultant(items, active?.point.label ?? selected, point))} getMetrics={selectedMetrics} />;
  if (step === 7) return <Correction errors={errors} points={points} analyses={analyses} pairs={pairs} getMetrics={selectedMetrics} />;
  if (step === 8) return <FinalRunScreen initialRun={calculation.initialRun} finalRun={calculation.finalRun} limits={calculation.limits} correction={finalCorrection ? <FinalCorrectionPanel result={finalCorrection} /> : <div className="todo-card"><strong>Confirm all A–F resultants in Step 7.</strong><p>Final correction is unavailable until all A–F resultants are confirmed.</p></div>} onChange={(speed, field, value) => updateMeasurement("finalRun", speed, field, value)} onLimitChange={(sensor, value) => update((item) => ({ ...item, limits: { ...item.limits, [sensor]: value } }))} />;
  return <Report calculation={calculation} points={points} />;
}

function WorkflowShell({ calculation, step, setStep, save, onHome, children }: { calculation: TrimBalanceCalculation; step: number; setStep: (step: number) => void; save: () => void; onHome: () => void; children: ReactNode }) {
  return <main className="workspace"><header className="app-header compact"><button className="brand" onClick={onHome}>FAN TRIM BALANCE <span>CFM56-7B · 3-SHOT PLOT</span></button><div><span className="badge">{calculation.status}</span><button className="secondary" onClick={save}>Save locally</button></div></header><nav className="stepper">{steps.map((name, index) => <button key={name} className={index === step ? "current" : index < step ? "done" : ""} onClick={() => setStep(index)}><span>{index + 1}</span>{name}</button>)}</nav>{children}<footer className="wizard-actions"><button className="secondary" disabled={!step} onClick={() => setStep(step - 1)}>Back</button><span>Save to retain this calculation in this browser.</span><button className="primary" onClick={() => { save(); setStep(Math.min(steps.length - 1, step + 1)); }}>{step === steps.length - 1 ? "Save calculation" : "Save & continue"}</button></footer></main>;
}

export default App;
