import { describe, expect, it } from "vitest";
import { calculateBalanceWeight, calculateSensitivity } from "./balanceWeight";
import { buildPlotPoints } from "./buildPlotPoints";
import { calculatePairwiseAnalysis } from "./pairwiseAnalysis";
import { calculateSelectedPairwiseAnalysis, calculateSelectedResultMetrics, storeSelectedResultant, type SelectedResultants } from "./selectedResultants";
import { calculateFinalCorrection, calculateFinalCorrectionFromPairwise, selectMaximumUPair } from "./finalCorrection";
import { selectInitialPlotPoints } from "./selectPlotPoints";
import { validateEngineRun } from "../utils/validation";
import type { EngineRun } from "../types/trimBalance";

const initial: EngineRun = { measurements: [
  { n1Speed: "TO", bearingVibration: 6, ffccvVibration: 1 },
  { n1Speed: "93.7", bearingVibration: 5, ffccvVibration: 6 },
  { n1Speed: "85", bearingVibration: 4, ffccvVibration: 2 },
  { n1Speed: "81", bearingVibration: 3, ffccvVibration: 5 },
  { n1Speed: "66", bearingVibration: 2, ffccvVibration: 4 },
  { n1Speed: "54", bearingVibration: 1, ffccvVibration: 3 },
] };
const laterRun: EngineRun = { measurements: initial.measurements.map((item) => ({ ...item, bearingVibration: item.bearingVibration + 1, ffccvVibration: item.ffccvVibration + 1 })) };

describe("workflow calculation primitives", () => {
  it("reports missing and invalid N1 measurements", () => {
    expect(validateEngineRun({ measurements: [{ n1Speed: "TO", bearingVibration: -1, ffccvVibration: Number.NaN }] }, "Initial")).toHaveLength(7);
  });

  it("selects the top three initial amplitudes for each sensor", () => {
    expect(selectInitialPlotPoints(initial).map((point) => point.n1Speed)).toEqual(["TO", "93.7", "85", "93.7", "81", "66"]);
  });

  it("labels the three highest initial amplitudes independently for each sensor", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    expect(points.map((point) => point.label)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(points.map((point) => point.n1Speed)).toEqual(["TO", "93.7", "85", "93.7", "81", "66"]);
    expect(points.slice(0, 3).every((point) => point.sensor === "bearing")).toBe(true);
    expect(points.slice(3).every((point) => point.sensor === "ffccv")).toBe(true);
    expect(points[0]).toMatchObject({ n1Speed: "TO", initialVibration: 6, firstVibration: 7, secondVibration: 7, thirdVibration: 7 });
    expect(points[3]).toMatchObject({ sensor: "ffccv", n1Speed: "93.7", initialVibration: 6, firstVibration: 7, secondVibration: 7, thirdVibration: 7 });
  });

  it("calculates W6 and sensitivity from the documented constants", () => {
    expect(calculateBalanceWeight(6.5, 2.7)).toBeCloseTo(2002, 0);
    expect(calculateSensitivity(2.7)).toBeCloseTo(308, 0);
  });

  it("calculates pairwise distance, combined sensitivity, and U", () => {
    const result = calculatePairwiseAnalysis([
      { label: "A", point: { x: 0, y: 0 }, sensitivity: 10 },
      { label: "B", point: { x: 30, y: 40 }, sensitivity: 15 },
    ]);
    expect(result).toEqual([{ pair: "AB", distanceCmG: 50, combinedSensitivity: 25, amplitude: 2 }]);
  });

  it("stores each A-F selection and uses the confirmed selections for Step 8", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    let selections: SelectedResultants = {};
    const pointA = { x: 0.25, y: 2.59 };
    const pointB = { x: 1.35, y: 1.86 };

    selections = storeSelectedResultant(selections, "A", pointA);
    selections = storeSelectedResultant(selections, "B", pointB);

    expect(selections).toEqual({ A: pointA, B: pointB });
    expect(calculateSelectedResultMetrics(points[0], selections.A)).toMatchObject({ resultantPoint: pointA });
    expect(calculateSelectedResultMetrics(points[1], selections.B)).toMatchObject({ resultantPoint: pointB });
    expect(calculateSelectedResultMetrics(points[2], selections.C)).toBeUndefined();
  });

  it("changes Step 8 pairwise results when a confirmed A-F selection changes", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    const firstSelections = ["A", "B", "C", "D", "E", "F"].reduce((current, label, index) => storeSelectedResultant(current, label as keyof SelectedResultants, { x: index + 1, y: index + 2 }), {} as SelectedResultants);
    const changedSelections = storeSelectedResultant(firstSelections, "A", { x: 20, y: 2 });
    const firstPairwise = calculateSelectedPairwiseAnalysis(points, firstSelections);
    const changedPairwise = calculateSelectedPairwiseAnalysis(points, changedSelections);

    expect(changedPairwise.find((pair) => pair.pair === "AB")?.distanceCmG).not.toBe(firstPairwise.find((pair) => pair.pair === "AB")?.distanceCmG);
    expect(changedPairwise.find((pair) => pair.pair === "AB")?.combinedSensitivity).not.toBe(firstPairwise.find((pair) => pair.pair === "AB")?.combinedSensitivity);
  });

  it("does not use automatic/reference geometry when user selections are valid", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    const selections = ["A", "B", "C", "D", "E", "F"].reduce((current, label, index) => storeSelectedResultant(current, label as keyof SelectedResultants, { x: index + 1, y: index + 2 }), {} as SelectedResultants);
    const pairwise = calculateSelectedPairwiseAnalysis(points, selections);
    const pointA = calculateSelectedResultMetrics(points[0], selections.A);
    const pointB = calculateSelectedResultMetrics(points[1], selections.B);
    const expectedDistance = Math.hypot(pointA!.w6CmG * Math.sin(pointA!.resultantAngleDeg * Math.PI / 180) - pointB!.w6CmG * Math.sin(pointB!.resultantAngleDeg * Math.PI / 180), pointA!.w6CmG * Math.cos(pointA!.resultantAngleDeg * Math.PI / 180) - pointB!.w6CmG * Math.cos(pointB!.resultantAngleDeg * Math.PI / 180));

    expect(pairwise.find((pair) => pair.pair === "AB")?.distanceCmG).toBeCloseTo(expectedDistance);
    expect(pairwise).toHaveLength(15);
  });

  it("selects the maximum-U pair for final correction", () => {
    const pairs = [
      { pair: "AB", distanceCmG: 10, combinedSensitivity: 10, amplitude: 1 },
      { pair: "AD", distanceCmG: 25, combinedSensitivity: 10, amplitude: 2.5 },
      { pair: "BC", distanceCmG: 20, combinedSensitivity: 20, amplitude: 1 },
    ];

    expect(selectMaximumUPair(pairs)?.pair).toBe("AD");
  });

  it("calculates final vector, correction weight, and angle from the selected pair", () => {
    const result = calculateFinalCorrection(
      { label: "A", point: { x: 0, y: 0 }, sensitivity: 1 },
      { label: "B", point: { x: 3, y: 4 }, sensitivity: 1 },
      { pair: "AB", distanceCmG: 5, combinedSensitivity: 2, amplitude: 2.5 }
    );

    expect(result.finalPoint.x).toBeCloseTo(1.5);
    expect(result.finalPoint.y).toBeCloseTo(2);
    expect(result.finalWeightCmG).toBeCloseTo(2.5);
    expect(result.finalAngleDeg).toBeCloseTo(36.8699);
    expect(result.distanceFromFirst).toBeCloseTo(2.5);
  });

  it("uses the actual confirmed A-F selections for the final correction", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    const selections = ["A", "B", "C", "D", "E", "F"].reduce((current, label, index) => storeSelectedResultant(current, label as keyof SelectedResultants, { x: index + 1, y: index + 2 }), {} as SelectedResultants);
    const firstResult = calculateFinalCorrectionFromPairwise(
      points.flatMap((point) => {
        const metrics = calculateSelectedResultMetrics(point, selections[point.label]);
        return metrics ? [{ label: point.label, point: { x: metrics.w6CmG * Math.sin(metrics.resultantAngleDeg * Math.PI / 180), y: metrics.w6CmG * Math.cos(metrics.resultantAngleDeg * Math.PI / 180) }, sensitivity: metrics.sensitivity }] : [];
      }),
      calculateSelectedPairwiseAnalysis(points, selections)
    );
    const changedSelections = storeSelectedResultant(selections, "A", { x: 20, y: 2 });
    const changedResult = calculateFinalCorrectionFromPairwise(
      points.flatMap((point) => {
        const metrics = calculateSelectedResultMetrics(point, changedSelections[point.label]);
        return metrics ? [{ label: point.label, point: { x: metrics.w6CmG * Math.sin(metrics.resultantAngleDeg * Math.PI / 180), y: metrics.w6CmG * Math.cos(metrics.resultantAngleDeg * Math.PI / 180) }, sensitivity: metrics.sensitivity }] : [];
      }),
      calculateSelectedPairwiseAnalysis(points, changedSelections)
    );

    expect(firstResult?.finalWeightCmG).not.toBe(1550);
    expect(firstResult?.finalAngleDeg).not.toBe(26);
    expect(changedResult?.finalWeightCmG).not.toBe(firstResult?.finalWeightCmG);
  });
});
